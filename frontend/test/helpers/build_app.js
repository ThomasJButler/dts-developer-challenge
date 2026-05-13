'use strict';

const { createApp } = require('../../app/app');

// Shared builder for route tests. Each test passes a per-test stubbed
// API client so we never hit a live backend, and an explicit session
// secret so the suite never depends on the developer's local .env.
function buildApp(stubMethods = {}) {
  process.env.SESSION_SECRET = 'test-session-secret';
  const apiClient = {
    createTask: async () => { throw new Error('createTask stub not configured'); },
    listTasks: async () => { throw new Error('listTasks stub not configured'); },
    getTask: async () => { throw new Error('getTask stub not configured'); },
    updateTaskStatus: async () => { throw new Error('updateTaskStatus stub not configured'); },
    deleteTask: async () => { throw new Error('deleteTask stub not configured'); },
    ...stubMethods,
  };
  return createApp({ apiClient });
}

// Pull the synchroniser token out of a rendered form. The CSRF middleware
// puts it in a hidden input on every form; tests that POST need the value
// so we can submit a request that survives verifyOnPost.
function extractCsrfToken(html) {
  const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
  if (!match) throw new Error('CSRF token not found in response body');
  return match[1];
}

module.exports = { buildApp, extractCsrfToken };
