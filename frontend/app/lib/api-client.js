'use strict';

// Thin client over fetch. Callers inject `fetchImpl` (so tests pass a stub
// without monkey-patching globals); production uses `globalThis.fetch`,
// which Node 22 ships in core via undici. Base URL precedence:
// explicit option > API_BASE_URL env > localhost:8000 fallback.
//
// Errors map to a small typed hierarchy so route handlers in frontend-3
// can branch on identity rather than raw status codes. Bodies are the
// RFC 7807 Problem-Details payload from docs/api.md when JSON; non-JSON
// upstream surprises (e.g. a misconfigured reverse proxy) fall back to
// the response text rather than crashing on res.json().

class ApiError extends Error {
  constructor(message, { status, body }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

class ValidationError extends ApiError {
  constructor(body) {
    super(body?.detail || 'Validation failed', { status: 422, body });
    this.name = 'ValidationError';
    // Hoist the field-error array so the GOV.UK error-summary renderer
    // in frontend-3 can read `.errors` without inspecting `.body`.
    this.errors = body?.errors || [];
  }
}

class NotFoundError extends ApiError {
  constructor(body) {
    super(body?.detail || 'Not found', { status: 404, body });
    this.name = 'NotFoundError';
  }
}

function createApiClient({ baseUrl, fetchImpl } = {}) {
  const base = (
    baseUrl
    || process.env.API_BASE_URL
    || 'http://localhost:8000'
  ).replace(/\/$/, '');
  const fetchFn = fetchImpl || globalThis.fetch;

  async function request(path, { method, body } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetchFn(base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // 204 No Content carries no body. Surfacing null is friendlier than
    // letting res.json() throw on an empty stream.
    if (res.status === 204) return null;

    // Read the body as text first so a JSON content-type with an empty or
    // malformed payload (a truncating proxy, a misconfigured 502) doesn't
    // throw SyntaxError out of res.json() and skip the typed-error mapping
    // below. The non-JSON branch already used res.text(); this generalises
    // the same defence to every response.
    const contentType = (res.headers.get && res.headers.get('content-type')) || '';
    const raw = await res.text().catch(() => null);
    let parsed = raw;
    if (raw && contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    if (res.ok) return parsed;
    if (res.status === 404) throw new NotFoundError(parsed);
    if (res.status === 422) throw new ValidationError(parsed);
    throw new ApiError(
      (parsed && parsed.detail) || `HTTP ${res.status}`,
      { status: res.status, body: parsed }
    );
  }

  return {
    createTask(task) {
      return request('/tasks', { method: 'POST', body: task });
    },
    listTasks() {
      return request('/tasks', { method: 'GET' });
    },
    getTask(id) {
      return request(`/tasks/${encodeURIComponent(id)}`, { method: 'GET' });
    },
    updateTaskStatus(id, status) {
      return request(
        `/tasks/${encodeURIComponent(id)}/status`,
        { method: 'PATCH', body: { status } }
      );
    },
    deleteTask(id) {
      return request(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
}

module.exports = { createApiClient, ApiError, ValidationError, NotFoundError };
