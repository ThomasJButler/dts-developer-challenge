'use strict';

// Walks the full CRUD flow in a real browser, mirroring docs/smoke.md.
// One test, ordered steps — Playwright test isolation is at the file
// level, so we keep the flow in one block to avoid re-seeding state
// between every step. If any step regresses, the file fails fast.

const { test, expect } = require('@playwright/test');
const { deleteAllTasks } = require('./helpers/api-seed');

test.beforeEach(async () => {
  // The full CRUD flow leaves no rows behind, but a flaky prior run
  // might. Best-effort cleanup; ignores network errors.
  try {
    await deleteAllTasks();
  } catch {
    // The backend may not be reachable in some isolated runs; the
    // navigation below will fail loudly if so.
  }
});

test('golden path — create, list, update status, update due, delete', async ({ page }) => {
  // 1. Landing
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Manage your tasks' })).toBeVisible();
  await page.getByRole('link', { name: 'View your tasks' }).click();

  // 2. Empty list
  await expect(page).toHaveURL(/\/tasks\/?$/);
  await expect(page.getByText('You have no tasks yet')).toBeVisible();
  await page.getByRole('link', { name: 'Create your first task' }).click();

  // 3. Create form
  await expect(page).toHaveURL(/\/tasks\/new$/);
  await page.getByLabel('Title').fill('Golden-path task');
  await page.getByLabel('Description').fill('Created by Playwright.');
  await page.getByLabel('In progress').check();
  await page.getByRole('button', { name: 'Save task' }).click();

  // 4. Detail page — created
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Task created')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Golden-path task' })).toBeVisible();
  // Status was set to "In progress" at create time.
  await expect(page.locator('.govuk-tag', { hasText: 'In progress' })).toBeVisible();

  // 5. Update status: in_progress → done
  await page.getByLabel('Done').check();
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(page.getByText('Status updated')).toBeVisible();
  await expect(page.locator('.govuk-tag', { hasText: 'Done' })).toBeVisible();

  // 6. Update due date
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
  await page.getByLabel('Day').fill(String(future.getDate()));
  await page.getByLabel('Month').fill(String(future.getMonth() + 1));
  await page.getByLabel('Year').fill(String(future.getFullYear()));
  await page.getByLabel('Hour').fill('09');
  await page.getByLabel('Minute').fill('00');
  await page.getByRole('button', { name: 'Save due date' }).click();
  await expect(page.getByText('Due date updated')).toBeVisible();

  // 7. Delete confirmation
  // The GOV.UK button macro with `href` renders an `<a role="button">`,
  // so it's exposed to assistive tech as a button. The selector matches
  // the accessible role, not the underlying tag.
  await page.getByRole('button', { name: 'Delete this task' }).click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}\/delete$/);
  await expect(page.getByRole('heading', { name: /Are you sure/i })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, delete this task' }).click();

  // 8. Empty again
  await expect(page).toHaveURL(/\/tasks\/?$/);
  await expect(page.getByText('Task deleted')).toBeVisible();
  await expect(page.getByText('You have no tasks yet')).toBeVisible();
});

test('validation — partial due date keeps focus on the form and renders error summary', async ({ page }) => {
  // Seed a task so the detail-page due-date form is reachable.
  await page.goto('/');
  await page.getByRole('link', { name: 'View your tasks' }).click();
  await page.getByRole('link', { name: 'Create your first task' }).click();
  await page.getByLabel('Title').fill('Validation probe');
  await page.getByRole('button', { name: 'Save task' }).click();

  // Submit only the day filled — server-side validator should reject.
  await page.getByLabel('Day').fill('15');
  await page.getByRole('button', { name: 'Save due date' }).click();

  // Error summary present, page title prefixed.
  await expect(page).toHaveTitle(/^Error:/);
  await expect(page.locator('.govuk-error-summary')).toBeVisible();
  await expect(
    page.locator('.govuk-error-summary a', { hasText: /complete date and time/i }),
  ).toBeVisible();

  // Cleanup so the next test starts clean.
  await deleteAllTasks();
});
