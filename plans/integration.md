# Integration

Wiring that sits between the two services: the compose file, environment configuration, the API contract both sides code against, and the end-to-end smoke test.

## integration-1, shared scaffolding and API contract

Branch: `feature/integration-scaffold`. Depends on nothing. Start here.

- [ ] `docker-compose.yml` with a `db` service (Postgres 16, named volume, healthcheck).
- [ ] `.env.example` documenting `DATABASE_URL`, `API_BASE_URL`, `PORT`.
- [x] `.gitignore` covering Python, Node, venv, and `.env`.
- [ ] `docs/api.md`: endpoint table, request/response examples, status codes. This is the contract; both sides code against it.

Done when `docker compose up -d db` brings up Postgres and `docs/api.md` lists all five endpoints from the brief with example payloads.

## integration-2, end-to-end smoke

Branch: `feature/integration-smoke`. Depends on backend-3 and frontend-3.

- [ ] `docker compose up` brings up db + backend + frontend, with the frontend reaching the backend over the compose network.
- [ ] `docs/smoke.md` with a manual checklist: create, list, update, delete.

Done when a fresh clone followed by `docker compose up` lets you create a task in the browser and see it persist after a restart.

## Notes

The API contract is the seam. Once `docs/api.md` is in, the backend and frontend can move independently. If a route changes, update the contract first, then both sides. Don't let them drift.

The compose file should have the database healthcheck so the backend service can wait on it properly. Otherwise the backend container races Postgres on startup and fails on the first migration.
