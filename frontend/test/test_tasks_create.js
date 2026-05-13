'use strict';

const request = require('supertest');
const { expect } = require('chai');
const { DateTime, Settings } = require('luxon');

const { buildApp, extractCsrfToken } = require('./helpers/build_app');

// Pin "now" so the "today or in the future" rule has a stable answer
// across CI runs and DST boundaries. The fixture dates below were
// picked relative to this anchor.
const FIXED_NOW_MILLIS = DateTime.fromISO('2026-05-13T10:00:00', {
  zone: 'Europe/London',
}).toMillis();

describe('/tasks create flow', () => {
  before(() => { Settings.now = () => FIXED_NOW_MILLIS; });
  after(() => { Settings.now = () => Date.now(); });

  describe('GET /tasks/new', () => {
    it('renders the form with a CSRF token', async () => {
      const app = buildApp();
      const res = await request(app).get('/tasks/new');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('name="title"');
      expect(res.text).to.include('name="description"');
      expect(res.text).to.include('name="status"');
      expect(res.text).to.include('name="due-day"');
      // CSRF hidden input is present.
      expect(extractCsrfToken(res.text)).to.have.length.greaterThan(10);
    });

    it('marks the form as novalidate so the server owns validation messages', async () => {
      const app = buildApp();
      const res = await request(app).get('/tasks/new');
      expect(res.text).to.match(/<form[^>]+action="\/tasks"[^>]+novalidate/);
    });

    it('links each input to its hint via aria-describedby', async () => {
      const app = buildApp();
      const res = await request(app).get('/tasks/new');
      // Title input → title-hint.
      expect(res.text).to.match(/id="title"[^>]*aria-describedby="[^"]*\btitle-hint\b/);
      // Description textarea → description-hint.
      expect(res.text).to.match(/id="description"[^>]*aria-describedby="[^"]*\bdescription-hint\b/);
      // Each hint id is actually present in the document.
      expect(res.text).to.include('id="title-hint"');
      expect(res.text).to.include('id="description-hint"');
    });

    it('renders the field hints verbatim per the handoff microcopy', async () => {
      const app = buildApp();
      const res = await request(app).get('/tasks/new');
      // Hints with quote marks come through Nunjucks autoescaped as &quot;.
      expect(res.text).to.include(
        'Use a short, specific description, for example &quot;Review bundle for CR-2026-0142&quot;.',
      );
      expect(res.text).to.include('Add any context that will help future you. You can leave this blank.');
      expect(res.text).to.include('New tasks usually start as &quot;To do&quot;.');
      expect(res.text).to.include('For example, 20 5 2026 at 09 00. Leave blank if there is no deadline.');
    });
  });

  describe('POST /tasks', () => {
    it('rejects POST without a CSRF token', async () => {
      const app = buildApp();
      const res = await request(app)
        .post('/tasks')
        .type('form')
        .send({ title: 'x', status: 'todo' });
      expect(res.status).to.equal(403);
    });

    it('calls createTask with the normalised payload and redirects to the new task', async () => {
      const createdId = 'CR-2026-9999';
      const captured = {};
      const app = buildApp({
        createTask: async (payload) => {
          captured.payload = payload;
          return { id: createdId };
        },
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/new');
      const token = extractCsrfToken(formRes.text);

      const postRes = await agent
        .post('/tasks')
        .type('form')
        .send({
          _csrf: token,
          title: '  Review case bundle  ',
          description: 'Cross-check the index',
          status: 'todo',
          'due-day': '20',
          'due-month': '5',
          'due-year': '2026',
          'due-hour': '09',
          'due-minute': '00',
        });

      expect(postRes.status).to.equal(303);
      expect(postRes.headers.location).to.equal(`/tasks/${createdId}`);
      expect(captured.payload).to.deep.equal({
        title: 'Review case bundle',
        description: 'Cross-check the index',
        status: 'todo',
        // 20 May 2026 09:00 London (BST, +1) → 08:00 UTC.
        due_at: '2026-05-20T08:00:00.000Z',
      });

      // The redirect target now reads flash.created and renders the
      // success banner. We can't follow the redirect to /tasks/:id
      // because the detail route is stubbed at this milestone, but we
      // can assert that flash.created survived the round-trip by
      // observing it on the list page if we redirect there ourselves.
      // The detail-route test in test_tasks_detail.js exercises the
      // banner-render path end-to-end.
    });

    it('re-renders with errors and preserves submitted values on validation failure', async () => {
      const app = buildApp({
        createTask: async () => { throw new Error('createTask should not be called on validation failure'); },
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/new');
      const token = extractCsrfToken(formRes.text);

      const postRes = await agent
        .post('/tasks')
        .type('form')
        .send({
          _csrf: token,
          title: '',
          description: 'I typed this and want it back',
          status: '',
          'due-day': '20',
          'due-month': '5',
          'due-year': '',
          'due-hour': '',
          'due-minute': '',
        });

      expect(postRes.status).to.equal(200);
      // GOV.UK error summary at the top of the page.
      expect(postRes.text).to.include('There is a problem');
      // Per-field messages.
      expect(postRes.text).to.include('Enter a title');
      expect(postRes.text).to.include('Select a status');
      expect(postRes.text).to.include('Enter a complete date and time');
      // Error summary links point at the right anchors.
      expect(postRes.text).to.match(/href="#title"[^>]*>Enter a title/);
      expect(postRes.text).to.match(/href="#status"[^>]*>Select a status/);
      expect(postRes.text).to.match(/href="#due-day"[^>]*>Enter a complete date and time/);
      // Page title prefixed with "Error:" for assistive tech announcement.
      expect(postRes.text).to.match(/<title>Error:/);
      // Description value is preserved.
      expect(postRes.text).to.include('I typed this and want it back');
      // Partially filled date values are preserved.
      expect(postRes.text).to.match(/name="due-day"\s+type="text"\s+value="20"/);
    });

    it('marks errored fields with the GOV.UK error class and links the error message id', async () => {
      const app = buildApp({
        createTask: async () => { throw new Error('createTask should not be called on validation failure'); },
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/new');
      const token = extractCsrfToken(formRes.text);

      const postRes = await agent
        .post('/tasks')
        .type('form')
        .send({
          _csrf: token,
          title: '',
          description: '',
          status: '',
          'due-day': '', 'due-month': '', 'due-year': '', 'due-hour': '', 'due-minute': '',
        });

      expect(postRes.status).to.equal(200);
      // GOV.UK Frontend renders the class before id and does not emit
      // aria-invalid; the error class + aria-describedby pointing at the
      // error message id are the documented signal for screen readers.
      expect(postRes.text).to.match(/class="[^"]*govuk-input--error[^"]*"\s+id="title"/);
      expect(postRes.text).to.match(/id="title"[^>]*aria-describedby="[^"]*\btitle-error\b/);
      // The error message element itself is present and addressable.
      expect(postRes.text).to.include('id="title-error"');
    });

    it('prefixes inline error messages with a visually-hidden "Error:" span', async () => {
      const app = buildApp({
        createTask: async () => { throw new Error('createTask should not be called on validation failure'); },
      });
      const agent = request.agent(app);
      const formRes = await agent.get('/tasks/new');
      const token = extractCsrfToken(formRes.text);

      const postRes = await agent
        .post('/tasks')
        .type('form')
        .send({
          _csrf: token,
          title: '',
          description: '',
          status: '',
          'due-day': '', 'due-month': '', 'due-year': '', 'due-hour': '', 'due-minute': '',
        });

      // Each inline error message includes a visually-hidden "Error:" prefix.
      expect(postRes.text).to.match(/<span class="govuk-visually-hidden">Error:<\/span>\s*Enter a title/);
      expect(postRes.text).to.match(/<span class="govuk-visually-hidden">Error:<\/span>\s*Select a status/);
    });
  });
});
