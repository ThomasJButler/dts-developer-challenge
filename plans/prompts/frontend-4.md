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
git checkout main
git pull
git checkout -b feature/frontend-tests
```

## Scope

Exactly the checklist in `plans/frontend.md` under `frontend-4`:

- Supertest route tests with the API client mocked (no real backend hit).
- Render assertions on at least: list page (empty and populated), create form (initial and error states), error-summary state with field links.

### Stretch addition (folded into this branch)

A smoke walk-through after `frontend-3` revealed a UX gap: a task created without a due date can only get one by being deleted and recreated. The design handoff explicitly puts "editing due date after creation" out of scope (status is the only mutable field per the brief), so this is a deliberate, documented widening.

Folded into this PR rather than spun out into a separate branch because the user requested it and `frontend-4` is the last frontend trunk. Decisions taken before the work began:

- **Fold into this branch.** Same PR as the render-coverage tests, not a separate one.
- **Separate form on the detail page, parallel to status.** Three sections on the detail page: Update status, Update due date, Delete this task. Each posts independently. Mirrors the handoff's "two forms so a misclick can't trigger destruction" rationale.
- **Submit all blank to clear.** No separate "Clear" button. Reuses the existing "all-blank or all-filled" validation rule from the create form.

What lands:

- Backend: new `PATCH /tasks/{id}/due` endpoint accepting `{ "due_at": ISO 8601 UTC | null }`. Mirrors the existing status endpoint pattern: new `TaskUpdateDue` schema (re-uses the `_require_aware` naive-datetime guard), new `update_due` service method, new router handler, full test class mirroring `TestPatchTaskStatus`.
- Frontend: new `updateTaskDue` API-client method; `validateDue` exported from `task-form.js`; new `splitDueParts` presenter helper for pre-filling the form; new `POST /tasks/:id/due` route; new "Update due date" form section on the detail page; new `flash.dueUpdated` banner.
- Docs: new `PATCH /tasks/{id}/due` section in `docs/api.md`, including a `null` clear example and a naive-datetime 422 example. New row in the endpoint summary table.
- Plan: `plans/frontend.md` gains two new checkboxes under `frontend-4` for the stretch work.

## TDD note

This is a test-completion task. The routes already exist (`frontend-3`). Workflow:

1. Run the existing mocha suite. Note which render states are uncovered.
2. For each gap, write the assertion: load the HTML, parse it (or grep with a regex if the state is small), assert the right elements are present.
3. Each error-summary test should also confirm the link `href` points at the right input id (`for`/`id` pairing).

If you find a real rendering bug, fix it on this branch.

For the stretch work, follow the existing TDD pattern: write the test first (red → green → commit at green). Backend tests mirror `TestPatchTaskStatus`; frontend tests extend `test_tasks_detail.js`.

## Anonymity

No personal names anywhere.

## Stop condition

1. Tick the `frontend-4` boxes in `plans/frontend.md`.
2. Commit, push, open PR into `main`.
3. Stop.
