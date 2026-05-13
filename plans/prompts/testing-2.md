# Prompt: testing-2

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/testing.md` — focus on `testing-2`.
4. `CLAUDE.md` if present locally.

Prerequisite: `testing-1` merged with CI green.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/testing-polish
```

## Scope

Exactly the checklist in `plans/testing.md` under `testing-2`:

- Backend edges: malformed UUID returns 400 not 500; oversized title rejected; past due-date allowed by the API but flagged on the frontend.
- Frontend a11y: axe-core (programmatic) or a manual checklist covering focus order, `for`/`id` pairing on labels, error summary links jumping to the right inputs.
- README: how to run the stack locally, screenshots of the three main pages (list, create, detail), a short architecture diagram (text or simple image).

## TDD discipline

For backend edges, TDD applies: write the failing test, fix the handler. For a11y, write the assertions (axe-core), watch them fail, fix the markup.

For README polish there's no test, just a review pass. Read the README cold and ask: could a fresh assessor clone this and have it running in five minutes?

## Anonymity

No personal names in the README. Screenshots must not show any personal info in the browser chrome (bookmarks, profile name, extensions). Crop tightly to the page content.

## Stop condition

1. Tick the `testing-2` boxes in `plans/testing.md`.
2. Tick any remaining boxes in the "Whole project, done when" section of `plans/overview.md`.
3. Commit, push, open PR into `main`.
4. Stop. This is the last task.
