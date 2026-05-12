# Architecture decisions

Short records of the load-bearing choices in the backend. Each entry is small on purpose; the goal is "what did we pick and why" not a debate transcript.

Format: status, decision, rationale, consequences.

---

## ADR-001: FastAPI for the HTTP layer

**Status:** accepted.

**Decision:** Use FastAPI as the web framework, served by uvicorn.

**Rationale:**

- Native Pydantic validation at the router edge means request/response schemas are the same objects as the OpenAPI spec. Less ceremony than Flask + marshmallow.
- Auto-generated OpenAPI at `/docs` and `/redoc` satisfies the brief's "document API endpoints" requirement without manual upkeep.
- Built on Starlette + uvicorn, so the path to async (if we ever need it) is short.
- Smaller surface area than Django; we don't need an ORM-coupled web framework for five endpoints.

**Consequences:**

- We commit to Pydantic v2 as the data contract layer everywhere — schemas, settings, config. Worth it; Pydantic v2 is fast and battle-tested.
- FastAPI's dependency injection is the only DI mechanism we use; no `wired`, no manual factories.

---

## ADR-002: SQLAlchemy 2.x + psycopg 3, synchronous

**Status:** accepted.

**Decision:** Use SQLAlchemy 2.x in synchronous mode with the psycopg 3 driver. No `asyncpg`, no `asyncio`-flavoured SQLAlchemy.

**Rationale:**

- Async buys us nothing for a CRUD app with five endpoints. The benefit comes from concurrent I/O, and we have one DB.
- Synchronous code is easier to read, easier to test, easier to debug. Stack traces are real.
- Alembic works the same either way, but the sync path has fewer edge cases.
- psycopg 3 is the current driver. psycopg2 is in maintenance mode.

**Consequences:**

- If a future feature needs async (long-polling, server-sent events), we revisit. For now everything is sync.
- We don't expose `async def` routes — they would silently block the event loop without async I/O underneath.

---

## ADR-003: Problem-Details error responses (RFC 7807-ish)

**Status:** accepted.

**Decision:** Override FastAPI's default error format with a Problem-Details body. The shape is documented in [`../api.md`](../api.md): `type`, `title`, `status`, `detail`, optional `errors[]`.

**Rationale:**

- Both backend and frontend code against one error contract. The frontend's API client can map errors by HTTP status _and_ by the typed body fields.
- RFC 7807 is the standard for HTTP problem details. Using a recognisable shape costs nothing.
- FastAPI's default error format puts validation details under `detail`, which is *also* the human-readable field. Splitting these into `detail` (string) and `errors[]` (structured) lets the frontend render either.

**Consequences:**

- A custom exception handler in `app.main` translates `RequestValidationError` and `HTTPException` to this shape.
- Domain errors (e.g. `TaskNotFound`) are mapped centrally so routes don't repeat themselves.

---

## ADR-004: Alembic is the only path that touches schema

**Status:** accepted.

**Decision:** All DDL goes through an Alembic migration. No `Base.metadata.create_all()` at startup. The `tasks` table is created by migration, not by importing the model.

**Rationale:**

- Production and dev have the same schema history. Reviewing migrations means reviewing the actual change a deployment will apply.
- `create_all` skips columns that already exist with different types. That's a class of silent data-loss bugs we don't want.
- Migrations are git-tracked, peer-reviewed artefacts. Schema changes get the same attention as code.

**Consequences:**

- Local dev requires running `alembic upgrade head` after pulling. Documented in CLAUDE.md and the prompt for `backend-1`.
- The test suite uses a fixture that runs migrations once per session against an ephemeral DB (lands in `backend-4`), not `create_all`.

---

## ADR-005: pydantic-settings for environment configuration

**Status:** accepted.

**Decision:** Read all environment-driven configuration through a `Settings` class from `pydantic-settings`, not by reading `os.environ` directly in app code.

**Rationale:**

- Settings get typed and validated at startup. Missing or malformed values fail loudly when the app boots, not when the request hits the buggy code path.
- One place to look for "what's configurable". Future settings (log level, feature flags) drop in without scattering reads.
- Native `.env` file support means local dev doesn't need a shell wrapper.

**Consequences:**

- The dependency `pydantic-settings` is added to `requirements.txt`. Small. Worth it.
- Tests that need different settings override via `monkeypatch.setenv` or FastAPI's `app.dependency_overrides[get_settings]`.

---

## ADR-006: Synchronous, request-scoped sessions

**Status:** accepted.

**Decision:** One SQLAlchemy `Session` per HTTP request, yielded by the `get_session` FastAPI dependency. The session is created at request start and closed in a `finally`.

**Rationale:**

- Sessions aren't thread-safe and carrying them across requests is a recipe for stale state.
- `Depends(get_session)` is the idiomatic FastAPI pattern and trivially overridable in tests.
- A session-per-request matches the natural transaction boundary: one HTTP call, one unit of work.

**Consequences:**

- Service-layer functions take a `Session` parameter. Routers obtain it via `Depends`.
- `expire_on_commit=False` on `SessionLocal`: attribute access still works after commit, which avoids re-querying during response serialisation.
