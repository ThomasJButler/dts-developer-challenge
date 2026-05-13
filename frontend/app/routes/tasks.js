'use strict';

const express = require('express');

const { NotFoundError, ValidationError } = require('../lib/api-client');
const { presentTask, sortForList } = require('../lib/task-presenter');
const { validateTaskForm, buildErrorSummary } = require('../lib/task-form');

const router = express.Router();

const EMPTY_DUE = { day: '', month: '', year: '', hour: '', minute: '' };

function readDueFromBody(body) {
  return {
    day:    (body['due-day']    || '').trim(),
    month:  (body['due-month']  || '').trim(),
    year:   (body['due-year']   || '').trim(),
    hour:   (body['due-hour']   || '').trim(),
    minute: (body['due-minute'] || '').trim(),
  };
}

function renderCreateForm(res, { values, errors, status = 200 } = {}) {
  res.status(status).render('tasks/new', {
    pageTitle: (errors ? 'Error: ' : '') + 'Create a task',
    values: values || { title: '', description: '', status: 'todo', due: EMPTY_DUE },
    errors: errors || null,
    errorSummary: errors ? buildErrorSummary(errors) : [],
  });
}

router.get('/', async (req, res, next) => {
  try {
    const tasks = await req.app.locals.apiClient.listTasks();
    const presented = sortForList(tasks).map(presentTask);
    res.render('tasks/list', { tasks: presented, pageTitle: 'Your tasks' });
  } catch (err) {
    next(err);
  }
});

router.get('/new', (_req, res) => {
  renderCreateForm(res);
});

router.post('/', async (req, res, next) => {
  const submittedValues = {
    title: req.body.title || '',
    description: req.body.description || '',
    status: req.body.status || '',
    due: readDueFromBody(req.body),
  };

  const { errors, value } = validateTaskForm(submittedValues);
  if (Object.keys(errors).length > 0) {
    return renderCreateForm(res, { values: submittedValues, errors });
  }

  try {
    const payload = { title: value.title, description: value.description, status: value.status };
    if (value.dueIso) payload.due_at = value.dueIso;
    const created = await req.app.locals.apiClient.createTask(payload);
    req.session.flash = { created: true };
    return res.redirect(303, `/tasks/${encodeURIComponent(created.id)}`);
  } catch (err) {
    // The backend may catch a corner case our client validator missed
    // (e.g. a server-side rule that diverges from the form rules). Map
    // ValidationError back to a per-field render so the user sees the
    // same error-summary pattern.
    if (err instanceof ValidationError) {
      const apiErrors = {};
      for (const fieldError of err.errors || []) {
        apiErrors[fieldError.field] = fieldError.message;
      }
      return renderCreateForm(res, { values: submittedValues, errors: apiErrors });
    }
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await req.app.locals.apiClient.getTask(req.params.id);
    res.render('tasks/detail', {
      task: presentTask(task),
      pageTitle: task.title,
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      req.session.flash = { notFound: true };
      return res.redirect(303, '/tasks');
    }
    next(err);
  }
});

router.get('/:id/delete', async (req, res, next) => {
  try {
    const task = await req.app.locals.apiClient.getTask(req.params.id);
    res.render('tasks/delete', {
      task,
      pageTitle: 'Are you sure you want to delete this task?',
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      req.session.flash = { notFound: true };
      return res.redirect(303, '/tasks');
    }
    next(err);
  }
});

router.post('/:id/delete', async (req, res, next) => {
  const { id } = req.params;
  try {
    await req.app.locals.apiClient.deleteTask(id);
    req.session.flash = { deleted: true };
    return res.redirect(303, '/tasks');
  } catch (err) {
    if (err instanceof NotFoundError) {
      // Treat "already gone" as success from the caseworker's point of
      // view — the post-condition (no such task) holds either way.
      req.session.flash = { deleted: true };
      return res.redirect(303, '/tasks');
    }
    next(err);
  }
});

router.post('/:id/status', async (req, res, next) => {
  const { id } = req.params;
  const status = req.body.status;
  try {
    await req.app.locals.apiClient.updateTaskStatus(id, status);
    req.session.flash = { statusUpdated: true };
    return res.redirect(303, `/tasks/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof NotFoundError) {
      req.session.flash = { notFound: true };
      return res.redirect(303, '/tasks');
    }
    // A ValidationError here means an invalid status value somehow made
    // it through the radios (e.g. devtools tampering). Redirect back to
    // the detail with no flash; the user simply sees the unchanged state.
    if (err instanceof ValidationError) {
      return res.redirect(303, `/tasks/${encodeURIComponent(id)}`);
    }
    next(err);
  }
});

module.exports = router;
