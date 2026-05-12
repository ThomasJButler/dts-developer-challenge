# Prompts

One paste-ready prompt per branch in the plan. Use these to start fresh Claude Code sessions, one per task.

## How to use

1. Pick the next task per `plans/overview.md` (start with `integration-1`).
2. Open the matching file in this folder.
3. Copy everything below the `---` divider.
4. Open a new Claude Code session at the repo root and paste.

Each prompt is self-contained: it tells the new session which files to read first, what to build, and when to stop. The prompts do not re-state the plan content; they point at the trunk file in `plans/`. That way the plan stays the single source of truth and prompts don't drift.

## Order

1. [`integration-1.md`](integration-1.md) — scaffolding and API contract. Start here.
2. [`backend-1.md`](backend-1.md) and [`frontend-1.md`](frontend-1.md) — skeletons. Can run in parallel after integration-1.
3. [`backend-2.md`](backend-2.md), [`backend-3.md`](backend-3.md), [`backend-4.md`](backend-4.md) — model, endpoints, tests.
4. [`frontend-2.md`](frontend-2.md), [`frontend-3.md`](frontend-3.md), [`frontend-4.md`](frontend-4.md) — API client, UI, tests.
5. [`integration-2.md`](integration-2.md) — end-to-end smoke. Needs backend-3 and frontend-3.
6. [`testing-1.md`](testing-1.md) — CI. Needs both test suites.
7. [`testing-2.md`](testing-2.md) — polish, a11y, README.

## TDD discipline

For every task that produces behaviour: write the failing test first, run it and watch it fail with a clear "feature missing" message, implement the minimum code to make it pass, commit at green, refactor only after green. Each prompt encodes this, calibrated for what's testable. Config-only tasks (compose files, gitignores, CI yaml) verify by running the thing instead.

## Anonymity

This is an assessed submission. No personal names, emails, or GitHub handles in any committed file, comment, or commit message. Repo-local git config is already set to an anonymous identity; don't override it.
