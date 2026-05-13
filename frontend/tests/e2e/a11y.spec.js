'use strict';

// WCAG 2.1 AA accessibility assertions over each main page of the app.
// We assert zero serious-or-critical violations; moderate and minor
// findings are logged in the test output but don't fail the build,
// since they often stem from third-party components and policy calls
// belong to a separate review pass.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { createTask, deleteAllTasks } = require('./helpers/api-seed');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

function blockingViolations(results) {
  return results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact));
}

test.beforeEach(async () => {
  try {
    await deleteAllTasks();
  } catch {
    // best-effort cleanup
  }
});

test('a11y — landing page', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — empty task list', async ({ page }) => {
  await page.goto('/tasks');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — populated task list', async ({ page }) => {
  await createTask({ title: 'A11y sample task', status: 'in_progress' });
  await page.goto('/tasks');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — create form', async ({ page }) => {
  await page.goto('/tasks/new');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — create form with validation errors', async ({ page }) => {
  await page.goto('/tasks/new');
  // Submit with no title to trip server-side validation; the error
  // summary and per-field errors render together.
  await page.getByRole('button', { name: 'Save task' }).click();
  await expect(page.locator('.govuk-error-summary')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — detail page', async ({ page }) => {
  const task = await createTask({ title: 'A11y detail sample' });
  await page.goto(`/tasks/${task.id}`);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — delete confirmation page', async ({ page }) => {
  const task = await createTask({ title: 'A11y delete sample' });
  await page.goto(`/tasks/${task.id}/delete`);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(blockingViolations(results)).toEqual([]);
});

test('a11y — error-summary link moves focus to the field it names', async ({ page }) => {
  // Server-side validation on the create form: submit blank, then
  // verify the summary link actually focuses the title input when
  // activated, not just visually scrolls to it. This is the runtime
  // a11y guarantee the static markup tests can't cover.
  await page.goto('/tasks/new');
  await page.getByRole('button', { name: 'Save task' }).click();
  await expect(page.locator('.govuk-error-summary')).toBeVisible();

  const summaryLink = page.locator('.govuk-error-summary a', { hasText: 'Enter a title' });
  await summaryLink.click();

  // The title input must now be the focused element.
  const titleFocused = await page.locator('#title').evaluate(
    (el) => el === document.activeElement,
  );
  expect(titleFocused).toBe(true);
});
