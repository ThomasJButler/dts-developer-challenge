# Prompt: backend-1

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md` — project shape, stack, branch naming.
3. `plans/backend.md` — focus on `backend-1`.
4. `docs/api.md` — the API contract you'll need to honour.
5. `CLAUDE.md` if present locally — especially the layering rules.

Prerequisite: `integration-1` must be merged. If it isn't, stop and report.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/backend-skeleton
```

## Scope

Exactly the checklist in `plans/backend.md` under `backend-1`:

- `backend/requirements.txt` (FastAPI, uvicorn, SQLAlchemy, psycopg[binary], Alembic, Pydantic, python-dotenv) and `backend/requirements-dev.txt` (pytest, httpx, ruff).
- `app/main.py` exposing `GET /healthz` returning `{"status": "ok"}`.
- `app/db/session.py` with engine and session factory; `app/config.py` reading `DATABASE_URL`.
- Alembic initialised under `backend/migrations/` — empty initial migration is fine, just prove the wiring.

## TDD discipline

Write the failing test first.

1. Create `backend/tests/test_healthz.py` with one test: `GET /healthz` returns 200 and the body `{"status": "ok"}`. Use FastAPI's `TestClient` (httpx-backed).
2. Run `pytest`. It should fail because `app.main` doesn't exist yet. Confirm the failure message is clear.
3. Implement `app/main.py` with the minimum needed to make the test pass.
4. Run `pytest` again. Green.
5. Repeat for any other testable behaviour you add (e.g. that `DATABASE_URL` is read from env).

For Alembic, verify by running:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

against the compose Postgres. That's a runtime check, not a unit test.

## Anonymity

No personal names anywhere. Repo-local git config is already anonymous.

## Stop condition

1. Tick the `backend-1` boxes in `plans/backend.md`.
2. Commit, push, open PR into `main`.
3. Stop.
