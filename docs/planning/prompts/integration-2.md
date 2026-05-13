# Prompt: integration-2

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` - the original brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/integration.md` - focus on `integration-2`.
4. `docs/api.md` - the API contract.
5. `CLAUDE.md` if present locally.

Then implement `integration-2`. Prerequisites: `backend-3` and `frontend-3` must already be merged. If they aren't, stop and report.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/integration
```

## Scope

Exactly the checklist in `plans/integration.md` under `integration-2`:

- Extend `docker-compose.yml` with `backend` and `frontend` services. Both depend on the database healthcheck.
- Wire the frontend to the backend via the compose network (`API_BASE_URL` resolves to the backend service name, not `localhost`).
- `docs/smoke.md` with a manual smoke checklist: create, list, update status, delete, restart and confirm persistence.

## TDD note

End-to-end task. Verify by running:

```bash
docker compose up --build
```

Then walk the checklist in `docs/smoke.md` in a browser: create a task, see it on the list, update its status, delete it. Bring the stack down, bring it back up, confirm a created task survives.

If you want an automated layer on top of the manual checklist, a single Mocha or pytest "creates a task end-to-end via HTTP" test is fine, but keep it small. Don't build a full e2e harness for this task.

## Anonymity

No personal names anywhere in committed files or the commit message.

## Stop condition

1. Tick the `integration-2` boxes in `plans/integration.md`.
2. Commit, push, open PR into `main`.
3. Stop.
