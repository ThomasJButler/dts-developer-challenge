# Prompt: frontend-4

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/frontend.md` — focus on `frontend-4`.
4. `CLAUDE.md` if present locally.

Prerequisite: `frontend-3` merged.

## Branch

```bash
git checkout master
git pull
git checkout -b feature/frontend-tests
```

## Scope

Exactly the checklist in `plans/frontend.md` under `frontend-4`:

- Supertest route tests with the API client mocked (no real backend hit).
- Render assertions on at least: list page (empty and populated), create form (initial and error states), error-summary state with field links.

## TDD note

This is a test-completion task. The routes already exist (`frontend-3`). Workflow:

1. Run the existing mocha suite. Note which render states are uncovered.
2. For each gap, write the assertion: load the HTML, parse it (or grep with a regex if the state is small), assert the right elements are present.
3. Each error-summary test should also confirm the link `href` points at the right input id (`for`/`id` pairing).

If you find a real rendering bug, fix it on this branch.

## Anonymity

No personal names anywhere.

## Stop condition

1. Tick the `frontend-4` boxes in `plans/frontend.md`.
2. Commit, push, open PR into `master`.
3. Stop.
