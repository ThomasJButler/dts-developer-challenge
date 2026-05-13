# Prompt: backend-3

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` - the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/backend.md` - focus on `backend-3`. Note the layering rules in the Notes section.
4. `docs/api.md` - the contract is authoritative. Endpoints must match it exactly.
5. `CLAUDE.md` if present locally.

Prerequisite: `backend-2` merged.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/backend-endpoints
```

## Scope

Exactly the checklist in `plans/backend.md` under `backend-3`:

- `POST /tasks` - create. Returns 201 with the created task.
- `GET /tasks/{id}` - read one. 404 if missing.
- `GET /tasks` - list. No pagination.
- `PATCH /tasks/{id}/status` - status update only. 404 if missing. 422 on bad status value.
- `DELETE /tasks/{id}` - returns 204. 404 if missing.
- Single, consistent error response shape (RFC 7807 or FastAPI default - pick one, document it in `docs/api.md` if you change it).
- OpenAPI tags and summaries on every route.

Strict layering: routers in `app/routers/` only handle HTTP + validation. Services in `app/services/` hold domain logic. Persistence (SQLAlchemy queries) in `app/db/`. Routers don't import models; ORM objects don't leak into responses.

## TDD discipline

This task is the heart of the TDD work. One endpoint at a time:

1. Write the test first. For `POST /tasks` start with: happy path (201, body matches), missing title (422), title too long (422). Use `httpx.AsyncClient` or FastAPI `TestClient`. Run pytest; tests fail because the route doesn't exist.
2. Implement the router → service → repository chain for that endpoint. Watch the tests turn green.
3. Commit at green.
4. Next endpoint: `GET /tasks/{id}` - happy path, 404 on unknown id, 400 on malformed UUID.
5. Continue for `GET /tasks`, `PATCH /tasks/{id}/status`, `DELETE /tasks/{id}`.

Each endpoint gets at least: happy path, validation failure (where applicable), not-found (where applicable).

Cross-reference each request and response against `docs/api.md`. If the implementation needs to drift from the contract, update `docs/api.md` first in the same commit and call it out in the PR description.

## Anonymity

No personal names anywhere.

## Stop condition

1. Tick the `backend-3` boxes in `plans/backend.md`.
2. Commit, push, open PR into `main`.
3. Stop. The deeper test coverage (edge cases, transitions) lives in `backend-4`.
