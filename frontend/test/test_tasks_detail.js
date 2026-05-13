'use strict';

const request = require('supertest');
const { expect } = require('chai');

const { buildApp, extractCsrfToken } = require('./helpers/build_app');
const { NotFoundError } = require('../app/lib/api-client');

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
});
