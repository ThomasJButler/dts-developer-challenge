'use strict';

const { expect } = require('chai');

const {
  createApiClient,
  ApiError,
  ValidationError,
  NotFoundError,
} = require('../app/lib/api-client');

// Stub helpers. A 20-line inline alternative to pulling in sinon for a
// 14-case test surface.
function fakeResponse({ status, body, contentType = 'application/json' }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? contentType : null;
      },
    },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function recordingFetch(response) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    return response;
  };
  fn.calls = calls;
  return fn;
}

describe('api-client', () => {
  describe('createTask', () => {
    it('POSTs to /tasks and returns the parsed 201 body', async () => {
      const created = {
        id: '8b1c9d3e-7f2a-4d6b-9e5c-1a2b3c4d5e6f',
        title: 'Review case bundle',
        status: 'todo',
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 201, body: created }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      const result = await client.createTask({ title: 'Review case bundle' });

      expect(result).to.deep.equal(created);
      expect(fetchFn.calls).to.have.length(1);
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks');
      expect(fetchFn.calls[0].options.method).to.equal('POST');
      expect(fetchFn.calls[0].options.headers['Content-Type']).to.equal('application/json');
      expect(JSON.parse(fetchFn.calls[0].options.body)).to.deep.equal({
        title: 'Review case bundle',
      });
    });

    it('throws ValidationError on 422 carrying the response body', async () => {
      const errBody = {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Request validation failed',
        errors: [{ field: 'title', message: 'field required' }],
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 422, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.createTask({});
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(ValidationError);
      expect(thrown).to.be.an.instanceof(ApiError);
      expect(thrown.status).to.equal(422);
      expect(thrown.body).to.deep.equal(errBody);
      expect(thrown.errors).to.deep.equal(errBody.errors);
    });

    it('throws ApiError on 500', async () => {
      const errBody = {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Boom',
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 500, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.createTask({ title: 'x' });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(ApiError);
      expect(thrown).to.not.be.an.instanceof(ValidationError);
      expect(thrown.status).to.equal(500);
      expect(thrown.body).to.deep.equal(errBody);
    });
  });

  describe('listTasks', () => {
    it('GETs /tasks and returns the parsed array', async () => {
      const tasks = [
        { id: 'CR-2026-0142', title: 'Review bundle', status: 'in_progress' },
        { id: 'CR-2026-0138', title: 'Schedule hearing', status: 'todo' },
      ];
      const fetchFn = recordingFetch(fakeResponse({ status: 200, body: tasks }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      const result = await client.listTasks();

      expect(result).to.deep.equal(tasks);
      expect(fetchFn.calls).to.have.length(1);
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks');
      expect(fetchFn.calls[0].options.method).to.equal('GET');
      expect(fetchFn.calls[0].options.body).to.equal(undefined);
    });
  });

  describe('getTask', () => {
    it('GETs /tasks/:id and returns the parsed task', async () => {
      const task = { id: 'task-abc', title: 'Read', status: 'todo' };
      const fetchFn = recordingFetch(fakeResponse({ status: 200, body: task }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      const result = await client.getTask('task-abc');

      expect(result).to.deep.equal(task);
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks/task-abc');
      expect(fetchFn.calls[0].options.method).to.equal('GET');
    });

    it('throws NotFoundError on 404', async () => {
      const errBody = {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Task task-abc not found',
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 404, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.getTask('task-abc');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(NotFoundError);
      expect(thrown).to.be.an.instanceof(ApiError);
      expect(thrown.status).to.equal(404);
      expect(thrown.body).to.deep.equal(errBody);
    });

    it('throws ApiError (not NotFoundError) on 400', async () => {
      const errBody = {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: "Path parameter 'id' is not a valid UUID",
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 400, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.getTask('not-a-uuid');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(ApiError);
      expect(thrown).to.not.be.an.instanceof(NotFoundError);
      expect(thrown.status).to.equal(400);
    });
  });

  describe('updateTaskStatus', () => {
    it('PATCHes /tasks/:id/status with the new status and returns the task', async () => {
      const updated = { id: 'task-abc', title: 'Read', status: 'in_progress' };
      const fetchFn = recordingFetch(fakeResponse({ status: 200, body: updated }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      const result = await client.updateTaskStatus('task-abc', 'in_progress');

      expect(result).to.deep.equal(updated);
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks/task-abc/status');
      expect(fetchFn.calls[0].options.method).to.equal('PATCH');
      expect(JSON.parse(fetchFn.calls[0].options.body)).to.deep.equal({
        status: 'in_progress',
      });
    });

    it('throws ValidationError on 422 for an unknown status', async () => {
      const errBody = {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Request validation failed',
        errors: [{ field: 'status', message: 'value is not a valid enumeration member' }],
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 422, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.updateTaskStatus('task-abc', 'bogus');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(ValidationError);
      expect(thrown.errors).to.deep.equal(errBody.errors);
    });

    it('throws NotFoundError on 404', async () => {
      const errBody = { type: 'about:blank', title: 'Not Found', status: 404, detail: 'gone' };
      const fetchFn = recordingFetch(fakeResponse({ status: 404, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.updateTaskStatus('task-abc', 'todo');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(NotFoundError);
    });
  });

  describe('updateTaskDue', () => {
    it('PATCHes /tasks/:id/due with the new ISO and returns the task', async () => {
      const updated = { id: 'task-abc', title: 'Read', status: 'todo', due_at: '2026-05-20T08:00:00Z' };
      const fetchFn = recordingFetch(fakeResponse({ status: 200, body: updated }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      const result = await client.updateTaskDue('task-abc', '2026-05-20T08:00:00Z');

      expect(result).to.deep.equal(updated);
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks/task-abc/due');
      expect(fetchFn.calls[0].options.method).to.equal('PATCH');
      expect(JSON.parse(fetchFn.calls[0].options.body)).to.deep.equal({
        due_at: '2026-05-20T08:00:00Z',
      });
    });

    it('sends due_at: null to clear', async () => {
      const updated = { id: 'task-abc', title: 'Read', status: 'todo', due_at: null };
      const fetchFn = recordingFetch(fakeResponse({ status: 200, body: updated }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      await client.updateTaskDue('task-abc', null);

      expect(JSON.parse(fetchFn.calls[0].options.body)).to.deep.equal({ due_at: null });
    });

    it('throws ValidationError on 422 for a naive datetime', async () => {
      const errBody = {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Request validation failed',
        errors: [{ field: 'due_at', message: 'datetime must include a timezone offset' }],
      };
      const fetchFn = recordingFetch(fakeResponse({ status: 422, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.updateTaskDue('task-abc', '2026-05-20T08:00:00');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(ValidationError);
      expect(thrown.errors).to.deep.equal(errBody.errors);
    });

    it('throws NotFoundError on 404', async () => {
      const errBody = { type: 'about:blank', title: 'Not Found', status: 404, detail: 'gone' };
      const fetchFn = recordingFetch(fakeResponse({ status: 404, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.updateTaskDue('task-abc', '2026-05-20T08:00:00Z');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(NotFoundError);
    });
  });

  describe('deleteTask', () => {
    it('DELETEs /tasks/:id and returns null on 204', async () => {
      const fetchFn = recordingFetch(fakeResponse({ status: 204, body: null }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      const result = await client.deleteTask('task-abc');

      expect(result).to.equal(null);
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks/task-abc');
      expect(fetchFn.calls[0].options.method).to.equal('DELETE');
      expect(fetchFn.calls[0].options.body).to.equal(undefined);
    });

    it('throws NotFoundError on 404', async () => {
      const errBody = { type: 'about:blank', title: 'Not Found', status: 404, detail: 'gone' };
      const fetchFn = recordingFetch(fakeResponse({ status: 404, body: errBody }));
      const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: fetchFn });

      let thrown;
      try {
        await client.deleteTask('task-abc');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(NotFoundError);
    });
  });

  describe('configuration', () => {
    it('uses process.env.API_BASE_URL when no baseUrl option is provided', async () => {
      const originalEnv = process.env.API_BASE_URL;
      process.env.API_BASE_URL = 'http://env.test';
      try {
        const fetchFn = recordingFetch(fakeResponse({ status: 200, body: [] }));
        const client = createApiClient({ fetchImpl: fetchFn });
        await client.listTasks();
        expect(fetchFn.calls[0].url).to.equal('http://env.test/tasks');
      } finally {
        if (originalEnv === undefined) delete process.env.API_BASE_URL;
        else process.env.API_BASE_URL = originalEnv;
      }
    });

    it('strips a trailing slash from the baseUrl', async () => {
      const fetchFn = recordingFetch(fakeResponse({ status: 200, body: [] }));
      const client = createApiClient({ baseUrl: 'http://api.test/', fetchImpl: fetchFn });
      await client.listTasks();
      expect(fetchFn.calls[0].url).to.equal('http://api.test/tasks');
    });
  });

  describe('malformed responses', () => {
    it('throws ApiError (not SyntaxError) on a non-OK response with JSON content-type but empty body', async () => {
      // Models an upstream surprise: Content-Type says application/json but
      // the body is empty (truncating proxy, misconfigured 502). The native
      // Response.json() rejects with SyntaxError in this case; the client
      // must read the body as text first so route handlers still receive a
      // typed ApiError rather than having to catch SyntaxError separately.
      const stub = {
        status: 500,
        ok: false,
        headers: {
          get: name => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
        },
        json: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
        text: async () => '',
      };
      const client = createApiClient({
        baseUrl: 'http://api.test',
        fetchImpl: async () => stub,
      });

      let thrown;
      try {
        await client.listTasks();
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.be.an.instanceof(ApiError);
      expect(thrown).to.not.be.an.instanceof(SyntaxError);
      expect(thrown.status).to.equal(500);
      expect(thrown.body).to.equal('');
      expect(thrown.message).to.equal('HTTP 500');
    });
  });
});
