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
    ],
  },
  js.configs.recommended,
  {
    files: ['app/**/*.js', 'bin/**', 'test/**/*.js'],
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
];
