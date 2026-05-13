# Prompt: testing-1

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` - the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/testing.md` - focus on `testing-1`.
4. `CLAUDE.md` if present locally.

Prerequisites: `backend-4` and `frontend-4` merged. Both test suites must exist and be green locally.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/testing-ci
```

## Scope

Exactly the checklist in `plans/testing.md` under `testing-1`:

- `.github/workflows/ci.yml` with two parallel jobs:
  - **backend**: ruff check, ruff format check, pytest. Postgres service container with a healthcheck.
  - **frontend**: eslint, mocha.
- Cache `~/.cache/pip` (or whatever cache path the action recommends) and `~/.npm` (or use `actions/setup-node` cache option).
- Status badge in `README.md` linking to the workflow.

## TDD note

CI config has no unit-test surface. Verify by pushing the branch and watching the workflow on GitHub:

1. Push the branch.
2. Open the PR.
3. CI runs. Both jobs should be green on the first push that's actually correct; iterate on the yaml if not.

If you want a fast local check before pushing, run `act` (the local-actions runner) - but if it's not already installed, don't add a dependency just for this.

## Anonymity

No personal names in the workflow file. The status badge URL points to the anonymous GitHub repo path; if the repo owner is a personal handle, flag it and ask before continuing.

## Stop condition

1. Tick the `testing-1` boxes in `plans/testing.md`.
2. Commit, push, open PR into `main`.
3. Wait for the CI run to be green on the PR.
4. Stop.
