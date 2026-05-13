'use strict';

// Tiny helper that POSTs a task straight to the backend so e2e specs
// can drive flows that need a pre-existing task without manually
// walking through the create form first.

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

// Hosts the destructive helpers are willing to talk to. Anything else
// is assumed to be a shared or production backend, and the helper
// refuses rather than enumerate-and-delete every task on it. The
// list mirrors the two contexts these specs ever legitimately run
// against: a developer's local compose stack (localhost / 127.0.0.1)
// and the compose-network hostname the e2e CI job uses (`backend`).
const ALLOWED_DESTRUCTIVE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'backend',
]);

function assertDestructiveAllowed() {
  const host = new URL(API_BASE_URL).hostname;
  if (!ALLOWED_DESTRUCTIVE_HOSTS.has(host)) {
    throw new Error(
      `api-seed refusing destructive operation against non-local backend ` +
        `(API_BASE_URL=${API_BASE_URL}). Point it at http://localhost:8000 ` +
        `or http://backend:8000 to run e2e helpers.`,
    );
  }
}

async function createTask({ title, description = null, status = 'todo', dueAt = null }) {
  const body = { title, description, status };
  if (dueAt) body.due_at = dueAt;
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`api-seed createTask failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function deleteTask(id) {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`api-seed deleteTask failed: ${res.status}`);
  }
}

async function deleteAllTasks() {
  assertDestructiveAllowed();
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) throw new Error(`api-seed list failed: ${res.status}`);
  const tasks = await res.json();
  await Promise.all(tasks.map((t) => deleteTask(t.id)));
}

module.exports = { createTask, deleteTask, deleteAllTasks };
