'use strict';

const request = require('supertest');
const { expect } = require('chai');

const { buildApp } = require('./helpers/build_app');

describe('GET /tasks', () => {
  it('returns 200 with an empty-state inset when the API returns no tasks', async () => {
    const app = buildApp({ listTasks: async () => [] });
    const res = await request(app).get('/tasks');
    expect(res.status).to.equal(200);
    expect(res.text).to.include('You have no tasks yet.');
    expect(res.text).to.include('Create your first task');
  });

  it('renders each task title, status tag, and due date when the API returns tasks', async () => {
    const tasks = [
      {
        id: 'CR-2026-0142',
        title: 'Review case bundle',
        description: '',
        status: 'in_progress',
        due_at: '2026-05-20T08:00:00Z', // 09:00 London (BST)
        created_at: '2026-05-08T09:12:00Z',
        updated_at: '2026-05-11T14:02:00Z',
      },
      {
        id: 'CR-2026-0138',
        title: 'Schedule directions hearing',
        description: '',
        status: 'todo',
        due_at: '2026-05-22T12:30:00Z',
        created_at: '2026-05-07T11:30:00Z',
        updated_at: '2026-05-07T11:30:00Z',
      },
      {
        id: 'CR-2026-0119',
        title: 'File acknowledgement of service',
        description: '',
        status: 'done',
        due_at: null,
        created_at: '2026-04-29T15:20:00Z',
        updated_at: '2026-05-09T09:05:00Z',
      },
    ];
    const app = buildApp({ listTasks: async () => tasks });
    const res = await request(app).get('/tasks');
    expect(res.status).to.equal(200);
    expect(res.text).to.include('Review case bundle');
    expect(res.text).to.include('Schedule directions hearing');
    expect(res.text).to.include('File acknowledgement of service');
    // GOV.UK tag classes — one per status.
    expect(res.text).to.include('govuk-tag--blue');
    expect(res.text).to.include('govuk-tag--grey');
    expect(res.text).to.include('govuk-tag--green');
    // Europe/London label for the BST due date.
    expect(res.text).to.include('20 May 2026, 09:00');
    // No-date row shows the "Not set" placeholder.
    expect(res.text).to.include('Not set');
    // The "Create a task" button (not the empty-state CTA) is present
    // because tasks exist.
    expect(res.text).to.include('Create a task');
    expect(res.text).to.not.include('You have no tasks yet.');
  });

  it('renders rows in the handoff sort order (not-done first, due asc, done last)', async () => {
    const tasks = [
      { id: 'older-done', title: 'Done long ago', status: 'done', due_at: '2026-05-01T00:00:00Z', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z', description: '' },
      { id: 'todo-no-due', title: 'No deadline', status: 'todo', due_at: null, created_at: '2026-05-10T00:00:00Z', updated_at: '2026-05-10T00:00:00Z', description: '' },
      { id: 'in-prog-soon', title: 'Soonest', status: 'in_progress', due_at: '2026-05-15T00:00:00Z', created_at: '2026-05-07T00:00:00Z', updated_at: '2026-05-07T00:00:00Z', description: '' },
    ];
    const app = buildApp({ listTasks: async () => tasks });
    const res = await request(app).get('/tasks');
    expect(res.status).to.equal(200);
    const soonestPos = res.text.indexOf('Soonest');
    const noDeadlinePos = res.text.indexOf('No deadline');
    const doneLongAgoPos = res.text.indexOf('Done long ago');
    expect(soonestPos).to.be.greaterThan(-1);
    expect(soonestPos).to.be.lessThan(noDeadlinePos);
    expect(noDeadlinePos).to.be.lessThan(doneLongAgoPos);
  });

  it('renders the "task could not be found" message when flash.notFound is set on redirect', async () => {
    const app = buildApp({ listTasks: async () => [] });
    const agent = request.agent(app);

    // Prime the session with a getTask 404, which the detail route will
    // turn into a redirect carrying flash.notFound. The list page then
    // consumes the flash on the follow-up GET.
    const appWithMissing = buildApp({
      listTasks: async () => [],
      getTask: async () => {
        const { NotFoundError } = require('../app/lib/api-client');
        throw new NotFoundError({ detail: 'gone' });
      },
    });
    const agentWithMissing = request.agent(appWithMissing);
    const redirectRes = await agentWithMissing.get('/tasks/missing-id');
    expect(redirectRes.status).to.equal(303);
    const listRes = await agentWithMissing.get('/tasks');
    expect(listRes.text).to.include('This task could not be found');

    // The original empty-state app stays untouched; the assertion above
    // does not leak into other tests.
    void agent;
  });
});
