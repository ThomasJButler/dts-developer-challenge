'use strict';

const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: 'tests/e2e',

  // Each spec gets 30s by default. The longest single navigation we drive
  // is the create→detail redirect, which is well under one second locally;
  // the headroom is for CI cold starts.
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    // Visual snapshot tolerance. Sub-pixel anti-aliasing differs across
    // operating systems (macOS vs Linux); 2% absorbs that without hiding
    // real regressions.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },

  // Locally: fail fast on first error. In CI: retry once so a flake on
  // a slow runner doesn't fail an otherwise-green PR.
  retries: process.env.CI ? 2 : 0,
  // Single worker everywhere. The suite shares one backend database, so
  // tests across projects race if they run in parallel — `beforeEach`
  // wipes tasks that another project just created. The suite is small;
  // we trade some wall-clock for determinism.
  workers: 1,

  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Caseworker GOV.UK pages have no animations of their own, but
    // emulating reduced-motion neutralises any future regressions in
    // snapshot stability.
    reducedMotion: 'reduce',
    // Test against headless Chrome — matches the CI image.
    headless: true,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
