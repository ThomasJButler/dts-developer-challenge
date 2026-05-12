# Overview

The DTS task-management build, split across four trunks of work. Each trunk has its own file in this folder. This page covers the stack, the dependency order, and how the branches relate.

## Stack

- Backend: Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2
- Frontend: Node.js, Express, Nunjucks, GOV.UK Frontend (HMCTS-style, server-rendered)
- DB: PostgreSQL 16, run via Docker Compose
- Tests: pytest + httpx for the API, Mocha + Supertest + Chai for the frontend
- Layout: monorepo with `backend/`, `frontend/`, and `docker-compose.yml` at the root
- Python tooling: plain `pip` + `venv` + `requirements.txt`. No uv, no Poetry.

## Trunks

```text
master
├── integration/  docker-compose, OpenAPI contract, end-to-end wiring   → plans/integration.md
├── backend/      API, DB, migrations, validation, tests                → plans/backend.md
├── frontend/     Express+Nunjucks UI, GOV.UK styling, API client       → plans/frontend.md
└── testing/      coverage, edge cases, CI                              → plans/testing.md
```

## Order of work

1. `integration-1` first. It's the contract and the compose file, and it unblocks everything else.
2. Once that's in, `backend-*` and `frontend-*` can run in parallel.
3. `integration-2` joins them up end-to-end. It needs `backend-3` and `frontend-3` finished.
4. `testing-1` (CI) goes last because it needs both test suites to exist.
5. `testing-2` is polish: a11y, README, edge cases.

## Branch naming

One branch per task, `feature/<trunk>-<slug>`. Merge into `master` via PR. Tick the task in its trunk file as it lands.

## Whole project, done when

- [ ] All five backend endpoints implemented, tested, and documented.
- [ ] Frontend covers create, view, update-status, and delete with GOV.UK styling.
- [ ] `docker compose up` brings up the full stack from a clean clone.
- [ ] CI green on `master`.
- [ ] README explains how to run, how to test, and what was built.
