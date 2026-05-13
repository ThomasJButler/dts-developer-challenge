'use strict';

const request = require('supertest');
const { expect } = require('chai');
const { DateTime, Settings } = require('luxon');

const { buildApp, extractCsrfToken } = require('./helpers/build_app');
const { NotFoundError } = require('../app/lib/api-client');

// Pin Luxon's "now" so the validateDue past-or-future rule is
// deterministic across CI clocks and DST boundaries.
const FIXED_NOW_MILLIS = DateTime.fromISO('2026-05-13T10:00:00', {
  zone: 'Europe/London',
}).toMillis();

const SAMPLE_TASK = {
  id: 'CR-2026-0142',
  title: 'Review case bundle',
  description: 'Cross-check the index',
  status: 'in_progress',
  due_at: '2026-05-20T08:00:00Z',
  created_at: '2026-05-08T09:12:00Z',
  updated_at: '2026-05-11T14:02:00Z',
};

describe('/tasks/:id', () => {
  describe('GET /tasks/:id', () => {
    it('renders the detail page with title, status tag, and summary list', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142');
      expect(res.status).to.equal(200);
      expect(res.text).to.include(SAMPLE_TASK.title);
      // GOV.UK summary list rows.
      expect(res.text).to.include('Reference');
      expect(res.text).to.include('Status');
      expect(res.text).to.include('Due');
      expect(res.text).to.include('Description');
      expect(res.text).to.include('Created');
      expect(res.text).to.include('Last updated');
      // Status tag for in_progress.
      expect(res.text).to.include('govuk-tag--blue');
      expect(res.text).to.include('In progress');
      // Europe/London formatted due date (08:00Z = 09:00 BST).
      expect(res.text).to.include('20 May 2026, 09:00');
      // The update-status form and the delete entry point are present
      // as separate elements.
      expect(res.text).to.include('Update status');
      expect(res.text).to.include('Delete this task');
    });

    it('renders the summary list rows in the documented order', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142');
      // The govuk-summary-list macro wraps each key in its own row;
      // checking the order via indexOf is enough.
      const order = ['Reference', 'Status', 'Due', 'Description', 'Created', 'Last updated'];
      const positions = order.map((label) => res.text.indexOf(label));
      // No -1s (every label present).
      expect(positions.every((p) => p >= 0)).to.equal(true);
      // Strictly increasing.
      for (let i = 1; i < positions.length; i += 1) {
        expect(positions[i]).to.be.greaterThan(positions[i - 1]);
      }
    });

    it('renders "Not set" for a missing due date', async () => {
      const app = buildApp({
        getTask: async () => ({ ...SAMPLE_TASK, due_at: null }),
      });
      const res = await request(app).get('/tasks/CR-2026-0142');
      expect(res.text).to.include('Not set');
    });

    it('renders "Not set" for an empty description', async () => {
      const app = buildApp({
        getTask: async () => ({ ...SAMPLE_TASK, description: '' }),
      });
      const res = await request(app).get('/tasks/CR-2026-0142');
      expect(res.text).to.include('Not set');
    });

    it('pre-selects the status radio matching the current task status', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142');
      // GOV.UK radio macro emits `checked` on the matching option.
      expect(res.text).to.match(/value="in_progress"[^>]*checked/);
      expect(res.text).to.not.match(/value="todo"[^>]*checked/);
      expect(res.text).to.not.match(/value="done"[^>]*checked/);
    });

    it('renders the "Delete this task" warning button linking to the delete confirmation page', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142');
      // GOV.UK button macro with href + warning class.
      expect(res.text).to.match(
        /<a[^>]+href="\/tasks\/CR-2026-0142\/delete"[^>]+govuk-button--warning/,
      );
    });

    it('renders the "Task created" banner when flash.created is set', async () => {
      const app = buildApp({
        getTask: async () => SAMPLE_TASK,
        createTask: async () => SAMPLE_TASK,
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/new');
      const token = extractCsrfToken(formRes.text);
      await agent
        .post('/tasks')
        .type('form')
        .send({
          _csrf: token,
          title: 'x',
          description: '',
          status: 'todo',
          'due-day': '', 'due-month': '', 'due-year': '', 'due-hour': '', 'due-minute': '',
        });
      const detailRes = await agent.get('/tasks/CR-2026-0142');
      expect(detailRes.text).to.include('Task created');
      // GOV.UK notification banner with type=success.
      expect(detailRes.text).to.match(/govuk-notification-banner--success/);
    });

    it('redirects to /tasks with flash.notFound when the API returns 404', async () => {
      const app = buildApp({
        getTask: async () => { throw new NotFoundError({ detail: 'gone' }); },
        listTasks: async () => [],
      });
      const agent = request.agent(app);
      const redirectRes = await agent.get('/tasks/00000000-0000-0000-0000-000000000000');
      expect(redirectRes.status).to.equal(303);
      expect(redirectRes.headers.location).to.equal('/tasks');
      const listRes = await agent.get('/tasks');
      expect(listRes.text).to.include('This task could not be found');
    });

    it('renders the success banner after a status update flash', async () => {
      const app = buildApp({
        getTask: async () => ({ ...SAMPLE_TASK, status: 'done' }),
        updateTaskStatus: async () => ({ ...SAMPLE_TASK, status: 'done' }),
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/CR-2026-0142');
      const token = extractCsrfToken(formRes.text);

      const updateRes = await agent
        .post('/tasks/CR-2026-0142/status')
        .type('form')
        .send({ _csrf: token, status: 'done' });
      expect(updateRes.status).to.equal(303);
      expect(updateRes.headers.location).to.equal('/tasks/CR-2026-0142');

      const detailAfter = await agent.get('/tasks/CR-2026-0142');
      expect(detailAfter.text).to.include('Status updated');
    });
  });

  describe('POST /tasks/:id/status', () => {
    it('calls updateTaskStatus with the new status and redirects', async () => {
      let captured;
      const app = buildApp({
        getTask: async () => SAMPLE_TASK,
        updateTaskStatus: async (id, status) => {
          captured = { id, status };
          return { ...SAMPLE_TASK, status };
        },
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/CR-2026-0142');
      const token = extractCsrfToken(formRes.text);

      const updateRes = await agent
        .post('/tasks/CR-2026-0142/status')
        .type('form')
        .send({ _csrf: token, status: 'done' });
      expect(updateRes.status).to.equal(303);
      expect(captured).to.deep.equal({ id: 'CR-2026-0142', status: 'done' });
    });

    it('rejects POST without a CSRF token', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app)
        .post('/tasks/CR-2026-0142/status')
        .type('form')
        .send({ status: 'done' });
      expect(res.status).to.equal(403);
    });
  });

  describe('POST /tasks/:id/due', () => {
    before(() => { Settings.now = () => FIXED_NOW_MILLIS; });
    after(() => { Settings.now = () => Date.now(); });

    it('renders an empty "Update due date" form when the task has no due date', async () => {
      const app = buildApp({
        getTask: async () => ({ ...SAMPLE_TASK, due_at: null }),
      });
      const res = await request(app).get('/tasks/CR-2026-0142');
      expect(res.text).to.include('Update due date');
      expect(res.text).to.match(/name="due-day"\s+type="text"\s+value=""/);
      expect(res.text).to.include('Leave all five fields blank to clear the due date.');
    });

    it('pre-fills the form with the existing due date in Europe/London', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142');
      // 2026-05-20T08:00Z → 09:00 BST → day=20, month=05, year=2026, hour=09, minute=00.
      expect(res.text).to.match(/name="due-day"\s+type="text"\s+value="20"/);
      expect(res.text).to.match(/name="due-month"\s+type="text"\s+value="05"/);
      expect(res.text).to.match(/name="due-year"\s+type="text"\s+value="2026"/);
      expect(res.text).to.match(/name="due-hour"\s+type="text"\s+value="09"/);
      expect(res.text).to.match(/name="due-minute"\s+type="text"\s+value="00"/);
    });

    it('calls updateTaskDue with a UTC ISO and redirects with flash.dueUpdated', async () => {
      let captured;
      const app = buildApp({
        getTask: async () => ({ ...SAMPLE_TASK, due_at: null }),
        updateTaskDue: async (id, dueIso) => {
          captured = { id, dueIso };
          return { ...SAMPLE_TASK, due_at: dueIso };
        },
      });
      const agent = request.agent(app);
      const detailRes = await agent.get('/tasks/CR-2026-0142');
      const token = extractCsrfToken(detailRes.text);

      const updateRes = await agent
        .post('/tasks/CR-2026-0142/due')
        .type('form')
        .send({
          _csrf: token,
          'due-day': '20', 'due-month': '5', 'due-year': '2026',
          'due-hour': '09', 'due-minute': '00',
        });
      expect(updateRes.status).to.equal(303);
      expect(updateRes.headers.location).to.equal('/tasks/CR-2026-0142');
      expect(captured).to.deep.equal({
        id: 'CR-2026-0142',
        dueIso: '2026-05-20T08:00:00.000Z',
      });

      // Flash banner renders on the follow-up detail GET.
      const followRes = await agent.get('/tasks/CR-2026-0142');
      expect(followRes.text).to.include('Due date updated');
    });

    it('sends null when the five inputs are blank (clear-due flow)', async () => {
      let captured;
      const app = buildApp({
        getTask: async () => SAMPLE_TASK,
        updateTaskDue: async (id, dueIso) => {
          captured = { id, dueIso };
          return { ...SAMPLE_TASK, due_at: null };
        },
      });
      const agent = request.agent(app);
      const detailRes = await agent.get('/tasks/CR-2026-0142');
      const token = extractCsrfToken(detailRes.text);

      const updateRes = await agent
        .post('/tasks/CR-2026-0142/due')
        .type('form')
        .send({
          _csrf: token,
          'due-day': '', 'due-month': '', 'due-year': '',
          'due-hour': '', 'due-minute': '',
        });
      expect(updateRes.status).to.equal(303);
      expect(captured).to.deep.equal({ id: 'CR-2026-0142', dueIso: null });
    });

    it('re-renders the detail page with an error summary on a partial date', async () => {
      const app = buildApp({
        getTask: async () => SAMPLE_TASK,
        updateTaskDue: async () => { throw new Error('updateTaskDue should not be called'); },
      });
      const agent = request.agent(app);
      const detailRes = await agent.get('/tasks/CR-2026-0142');
      const token = extractCsrfToken(detailRes.text);

      const updateRes = await agent
        .post('/tasks/CR-2026-0142/due')
        .type('form')
        .send({
          _csrf: token,
          'due-day': '20', 'due-month': '5', 'due-year': '',
          'due-hour': '', 'due-minute': '',
        });

      expect(updateRes.status).to.equal(200);
      // GOV.UK error summary at the top.
      expect(updateRes.text).to.include('There is a problem');
      expect(updateRes.text).to.include('Enter a complete date and time');
      // Link to the first date input.
      expect(updateRes.text).to.match(/href="#due-day"[^>]*>Enter a complete date and time/);
      // Page title prefixed with "Error:" for assistive tech announcement.
      expect(updateRes.text).to.match(/<title>Error:/);
      // Submitted partial values are preserved.
      expect(updateRes.text).to.match(/name="due-day"\s+type="text"\s+value="20"/);
      expect(updateRes.text).to.match(/name="due-month"\s+type="text"\s+value="5"/);
    });

    it('rejects a past date with the GOV.UK error message', async () => {
      const app = buildApp({
        getTask: async () => SAMPLE_TASK,
        updateTaskDue: async () => { throw new Error('updateTaskDue should not be called'); },
      });
      const agent = request.agent(app);
      const detailRes = await agent.get('/tasks/CR-2026-0142');
      const token = extractCsrfToken(detailRes.text);

      const updateRes = await agent
        .post('/tasks/CR-2026-0142/due')
        .type('form')
        .send({
          _csrf: token,
          'due-day': '1', 'due-month': '1', 'due-year': '2026',
          'due-hour': '09', 'due-minute': '00',
        });
      expect(updateRes.status).to.equal(200);
      expect(updateRes.text).to.include('Due date must be today or in the future');
    });

    it('rejects POST without a CSRF token', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app)
        .post('/tasks/CR-2026-0142/due')
        .type('form')
        .send({});
      expect(res.status).to.equal(403);
    });
  });
});
