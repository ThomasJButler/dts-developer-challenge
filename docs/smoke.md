# Smoke test

Manual end-to-end check that `docker compose up --build` brings up a working caseworker stack from a fresh clone, and that the full CRUD flow round-trips against the live backend.

This is the manual layer on top of the test suites (Mocha + Supertest on the frontend, pytest on the backend). Both suites stub their integration boundaries; this checklist exercises the real Postgres, the real FastAPI server, and the real Express server over the compose network.

## Prerequisites

- Docker Desktop running.
- Repo cloned, no local services already on ports 3000, 5432, or 8000 (otherwise compose port-publish will fail with "address already in use").
- `cp .env.example .env`. Defaults are fine; compose only reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `SESSION_SECRET` from it (each with a fallback), so an empty `.env` works too.

## Bring the stack up

```bash
docker compose up --build
```

Expect, in order:

1. `dts-tasks-db` reaches `(healthy)` (Postgres's `pg_isready`).
2. `dts-tasks-backend` runs `alembic upgrade head`, then `uvicorn` reports `Application startup complete` on port 8000. Healthcheck flips to `(healthy)`.
3. `dts-tasks-frontend` logs `Manage your tasks listening on http://localhost:3000`.

`docker compose ps` should show three containers, two `(healthy)` (the third has no healthcheck on purpose - the backend dependency is the gate).

## Walk the CRUD flow

Open http://localhost:3000 in a browser.

1. **Landing.** GOV.UK-styled page with the service name "Manage your tasks". Click "View your tasks".
2. **Empty list.** `/tasks` shows the GOV.UK inset "You have no tasks yet." and a primary "Create your first task" button. Click it.
3. **Create form.** `/tasks/new`. Fill in:
   - Title: "Review case bundle"
   - Description: anything
   - Status: To do
   - Due: leave all five date fields blank.

   Click "Save task". 303 redirects to `/tasks/<uuid>` with a "Task created" success banner.

4. **Detail page.** Three sections render: Update status (radio group), Update due date (five blank date inputs), Delete this task (warning button). The summary list shows "Not set" for both Due and (if you left it blank) Description.
5. **Update status.** Change the radio to "In progress" and click "Save status". 303 back to the same detail page with a "Status updated" banner; the Status row in the summary list now shows the blue "In progress" tag.
6. **Update due date.** Fill in a future date (e.g. day=20, month=6, year=2026, hour=09, minute=00) and click "Save due date". 303 back with a "Due date updated" banner. The Due row now reads "20 June 2026, 09:00" (Europe/London).
7. **Validation.** Click "Save due date" with only the day filled. The page re-renders with the GOV.UK error summary at the top, the page `<title>` prefixed with "Error:", and a summary link pointing at `#due-day`. The day value is preserved.
8. **Clear due.** Blank all five date fields and submit. 303 back to detail; the Due row returns to "Not set".
9. **Delete confirmation.** Click "Delete this task". You land on the confirmation page (`/tasks/<id>/delete`) with the warning H1 and two buttons. Click "Yes, delete this task". 303 to `/tasks` with a "Task deleted" banner.
10. **Empty again.** The list returns to the empty-state inset.

## Persistence

11. With the stack still up, create one task (any title, any settings).
12. Stop the stack without destroying volumes:
    ```bash
    docker compose down
    ```
13. Bring it back up:
    ```bash
    docker compose up
    ```
14. Browse to `/tasks`. The task you created in step 11 is still there. (If it is not, the `db_data` named volume has been clobbered - re-check that `docker compose down -v` was not run.)

## Health checks

15. ```bash
    curl http://localhost:8000/healthz
    ```
    returns `{"status":"ok"}`.
16. ```bash
    curl -I http://localhost:3000/
    ```
    returns `HTTP/1.1 200 OK`.
17. Swagger UI at http://localhost:8000/docs renders all six task endpoints (`POST /tasks`, `GET /tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}/status`, `PATCH /tasks/{id}/due`, `DELETE /tasks/{id}`) plus the `/healthz` liveness check.

## Tear down

```bash
docker compose down       # keeps the db_data volume
docker compose down -v    # removes the db_data volume too
```

## Common smoke failures

- **`address already in use` on `docker compose up`.** A local Postgres on 5432, a local uvicorn on 8000, or `npm run dev` on 3000 is still running. Stop them or change the host-side port mapping in `docker-compose.yml`.
- **Backend container exits immediately with `connection refused` against `db:5432`.** The healthcheck on `db` did not pass before `backend` started. Check `docker compose logs db` - the disk volume may be corrupt; `docker compose down -v` and retry.
- **Frontend renders but `/tasks` shows a generic error.** The frontend cannot reach `http://backend:8000`. Confirm `docker compose ps` shows the backend `(healthy)` and that `API_BASE_URL` in the frontend service is `http://backend:8000`, not `http://localhost:8000`.
- **`Module not found` on frontend startup.** Image was built before `package.json` changed. Force-rebuild: `docker compose build --no-cache frontend`.
