import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'public/**',
      'coverage/**',
      // Design-reference bundle: handed off from design as throw-away HTML/JS.
      // It runs in a browser, not Node, so the CJS/Node rules below don't apply.
      'design_handoff_manage_your_tasks/**',
      // Playwright artefacts. The HTML report contains generated JS that
      // lints noisily and shouldn't be inspected.
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['app/**/*.js', 'bin/**', 'test/**/*.js', 'tests/e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
  },
  {
    // Playwright's test runner injects `test` and `expect` per file scope,
    // so they're imported explicitly — no globals needed. Just add browser
    // globals (window, document) for inline page.evaluate() bodies that
    // may reference them.
    files: ['tests/e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];
