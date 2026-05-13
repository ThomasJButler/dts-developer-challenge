'use strict';

// Captures the desktop and mobile screenshots embedded in README.md.
// Skipped by default; runs only when UPDATE_SCREENSHOTS=1 so a normal
// e2e run does not accidentally overwrite the committed PNGs.
//
// Refresh procedure:
//   docker compose up -d --build
//   cd frontend && npm run e2e:screenshots
//   cd .. && git status   # docs/screenshots/{desktop,mobile}.png

const path = require('node:path');
const { test } = require('@playwright/test');
const { createTask, deleteAllTasks } = require('./helpers/api-seed');

const ENABLED = process.env.UPDATE_SCREENSHOTS === '1';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/screenshots');

test.beforeEach(async () => {
  await deleteAllTasks();
});

test.describe('README screenshot capture', () => {
  test.skip(!ENABLED, 'Set UPDATE_SCREENSHOTS=1 to regenerate README images.');

  test('list page with a representative task', async ({ page }, testInfo) => {
    // Seed two tasks so the list looks alive but not crowded. Choose
    // titles that read naturally for a caseworker reviewer.
    await createTask({
      title: 'Review case bundle for CR-2026-0142',
      description: 'Confirm exhibits and notes before the hearing.',
      status: 'in_progress',
      dueAt: '2026-06-20T08:00:00Z',
    });
    await createTask({
      title: 'File order for HM-2026-0098',
      status: 'todo',
      dueAt: '2026-06-22T16:30:00Z',
    });

    await page.goto('/tasks');

    const slug = testInfo.project.name; // 'desktop' or 'mobile'
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${slug}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  });
});
