'use strict';

// Tiny helper that POSTs a task straight to the backend so e2e specs
// can drive flows that need a pre-existing task without manually
// walking through the create form first.

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

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
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) throw new Error(`api-seed list failed: ${res.status}`);
  const tasks = await res.json();
  await Promise.all(tasks.map((t) => deleteTask(t.id)));
}

module.exports = { createTask, deleteTask, deleteAllTasks };
