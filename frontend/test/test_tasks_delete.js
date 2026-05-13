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

describe('/tasks/:id/delete', () => {
  describe('GET /tasks/:id/delete', () => {
    it('renders a confirmation page with both buttons', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142/delete');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('Are you sure you want to delete this task?');
      expect(res.text).to.include('Yes, delete this task');
      expect(res.text).to.include('No, keep this task');
      // Hidden CSRF token in the destructive form.
      expect(extractCsrfToken(res.text)).to.have.length.greaterThan(10);
    });

    it('renders the verbatim H1, both buttons with the right styling, and the back-link target', async () => {
      const app = buildApp({ getTask: async () => SAMPLE_TASK });
      const res = await request(app).get('/tasks/CR-2026-0142/delete');
      // Verbatim H1 microcopy.
      expect(res.text).to.match(/<h1[^>]*>Are you sure you want to delete this task\?<\/h1>/);
      // Destructive button carries the warning class.
      expect(res.text).to.match(
        /<button[^>]*class="[^"]*govuk-button--warning[^"]*"[^>]*>\s*Yes, delete this task/,
      );
      // The "No, keep" link points at the detail page, not the list.
      expect(res.text).to.match(/<a[^>]+href="\/tasks\/CR-2026-0142"[^>]*>No, keep this task<\/a>/);
      // The back link also points at the detail page. GOV.UK renders
      // href before class, so the regex tolerates either order.
      expect(res.text).to.match(
        /<a[^>]+href="\/tasks\/CR-2026-0142"[^>]*class="[^"]*govuk-back-link[^"]*"[^>]*>\s*Back to task/,
      );
    });

    it('redirects to /tasks with flash.notFound when the task does not exist', async () => {
      const app = buildApp({
        getTask: async () => { throw new NotFoundError({ detail: 'gone' }); },
        listTasks: async () => [],
      });
      const agent = request.agent(app);
      const redirectRes = await agent.get('/tasks/missing/delete');
      expect(redirectRes.status).to.equal(303);
      expect(redirectRes.headers.location).to.equal('/tasks');
    });
  });

  describe('POST /tasks/:id/delete', () => {
    it('calls deleteTask and redirects to /tasks with flash.deleted', async () => {
      let capturedId;
      const app = buildApp({
        getTask: async () => SAMPLE_TASK,
        deleteTask: async (id) => { capturedId = id; return null; },
        listTasks: async () => [],
      });
      const agent = request.agent(app);
      const confirmRes = await agent.get('/tasks/CR-2026-0142/delete');
      const token = extractCsrfToken(confirmRes.text);

      const deleteRes = await agent
        .post('/tasks/CR-2026-0142/delete')
        .type('form')
        .send({ _csrf: token });
      expect(deleteRes.status).to.equal(303);
      expect(deleteRes.headers.location).to.equal('/tasks');
      expect(capturedId).to.equal('CR-2026-0142');

      const listRes = await agent.get('/tasks');
      expect(listRes.text).to.include('Task deleted');
    });

    it('rejects POST without a CSRF token', async () => {
      const app = buildApp({ deleteTask: async () => null });
      const res = await request(app)
        .post('/tasks/CR-2026-0142/delete')
        .type('form')
        .send({});
      expect(res.status).to.equal(403);
    });
  });
});
