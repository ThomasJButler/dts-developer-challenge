# Prompt: backend-4

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` - the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/backend.md` - focus on `backend-4`.
4. `docs/api.md` - the contract.
5. `CLAUDE.md` if present locally.

Prerequisite: `backend-3` merged. By this point each endpoint already has a small set of TDD-driven tests. This task fills coverage gaps that couldn't sensibly be written before the whole router existed.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/backend-tests
```

## Scope

Exactly the checklist in `plans/backend.md` under `backend-4`:

- Pytest fixtures: ephemeral DB schema per session, transactional rollback per test. Refactor existing per-test setup if it isn't already this clean.
- For every endpoint: happy path, validation failure, 404.
- Reject unknown status values on `PATCH /tasks/{id}/status` (and any other transition rules the brief implies).
- Due-date timezone test: UTC stored, naive datetimes rejected at the API edge.
- Add `pytest --cov=app` if not already present. Target `app/routers` and `app/services` at 85% or better.

## TDD note

This task is allowed to be test-led without a one-test-then-one-feature cycle, because the features already exist. Workflow:

1. Run existing pytest suite. Note which paths are uncovered (via coverage report).
2. For each gap, write the test, watch it pass (or fail and reveal a real bug - fix the bug, then green).
3. Commit in small chunks per logical group of tests.

If a test reveals a bug, fix it on this branch and call it out in the PR description.

## Anonymity

No personal names anywhere.

## Stop condition

1. Tick the `backend-4` boxes in `plans/backend.md`.
2. Commit, push, open PR into `main`.
3. Stop.
