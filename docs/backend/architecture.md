# Backend architecture

A snapshot of how the FastAPI service is assembled. Read this before changing the layering.

The companion documents:

- [`request-flow.md`](request-flow.md) — what happens during a single HTTP request.
- [`data-model.md`](data-model.md) — the Task entity, validation rules, schema.
- [`decisions.md`](decisions.md) — short ADRs explaining why we picked each major piece.

## File tree

```text
backend/
├── alembic.ini                  Alembic config; sqlalchemy.url is left blank
│                                because migrations/env.py injects it from Settings.
├── pyproject.toml               Tool config: pytest discovery, ruff rules.
├── requirements.txt             Runtime deps (FastAPI, SQLAlchemy, psycopg, etc.).
├── requirements-dev.txt         Adds pytest, httpx, ruff for local dev and CI.
├── app/
│   ├── __init__.py              Marks app/ as a package.
│   ├── main.py                  FastAPI app instance + /healthz. Mounts routers
│   │                            from app/routers (added in backend-3).
│   ├── config.py                pydantic-settings Settings class. Reads
│   │                            DATABASE_URL from env (+ .env file).
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py           SQLAlchemy engine, SessionLocal factory, and
│   │                            get_session FastAPI dependency.
│   ├── routers/                 (backend-3) HTTP layer. One file per resource.
│   ├── services/                (backend-3) Domain logic. Pure functions over
│   │                            session + Pydantic schemas.
│   └── schemas/                 (backend-2) Pydantic schemas used at the API edge.
├── migrations/                  Alembic. env.py reads URL from Settings.
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                Generated migration files (none yet).
└── tests/
    ├── test_healthz.py          Pins the /healthz contract.
    └── test_config.py           Verifies env var loading.
```

## Layers

The backend is split into four layers. Each layer has a single responsibility, and imports flow strictly downward — never up.

```text
┌───────────────────────────────────────────────────────────┐
│  HTTP layer                                               │
│  app/main.py + app/routers/*                              │
│  - Receives the request, validates body+params (Pydantic) │
│  - Calls the service layer                                │
│  - Maps domain errors to HTTP responses                   │
│  - Never imports SQLAlchemy models                        │
└───────────────────────────────────────────────────────────┘
                          │ calls
                          ▼
┌───────────────────────────────────────────────────────────┐
│  Service layer                                            │
│  app/services/*                                           │
│  - Domain logic (status transitions, due-date rules)      │
│  - Owns the unit of work (decides when to commit)         │
│  - Calls the persistence layer                            │
│  - Raises domain errors that the HTTP layer translates    │
└───────────────────────────────────────────────────────────┘
                          │ calls
                          ▼
┌───────────────────────────────────────────────────────────┐
│  Persistence layer                                        │
│  app/db/* (session, models, repositories)                 │
│  - SQLAlchemy models                                      │
│  - Query functions (get_by_id, list_all, save, delete)    │
│  - Does not know about HTTP or Pydantic                   │
└───────────────────────────────────────────────────────────┘
                          │ talks to
                          ▼
┌───────────────────────────────────────────────────────────┐
│  Database                                                 │
│  PostgreSQL 16 via docker-compose                         │
│  Schema managed exclusively by Alembic.                   │
└───────────────────────────────────────────────────────────┘
```

## Layering rules

These are the rules the codebase enforces by convention. They are simple, and breaking them is the most common way a small backend turns into a tangle:

1. **Routers never import SQLAlchemy models.** Routers take Pydantic schemas in and return Pydantic schemas out. The service layer translates.
2. **ORM objects never leak into HTTP responses.** Always pass through a `Read` schema before serialising. This stops accidental lazy-loading at response time and keeps the public contract decoupled from the storage schema.
3. **Services don't know about FastAPI.** They take a session + plain data, do their work, and return plain data or raise domain errors. This makes them trivially unit-testable without a TestClient.
4. **Migrations are the only path that touches schema.** No `Base.metadata.create_all()` in startup, ever. If a model changes, generate a migration. Production and dev stay byte-identical that way.
5. **The session is request-scoped.** `get_session` yields a new session per request and closes it in a `finally`. Don't pass sessions across requests, and don't hold module-level sessions.

## What lives where, fast lookup

| Concern                              | File / module                       |
|--------------------------------------|-------------------------------------|
| Where does `DATABASE_URL` come from? | `app/config.py` (Settings)          |
| Where is the engine built?           | `app/db/session.py`                 |
| How do routes get a session?         | `Depends(get_session)`              |
| Where do Pydantic schemas live?      | `app/schemas/*` (backend-2)         |
| Where is the Task ORM model?         | `app/db/models.py` (backend-2)      |
| Where do queries live?               | `app/db/repositories/*` (backend-3) |
| Where does domain logic live?        | `app/services/*` (backend-3)        |
| Where are HTTP routes?               | `app/routers/*` (backend-3)         |
| Where does `/healthz` live?          | `app/main.py`                       |

## Out of scope

These are deliberately not in the architecture because the brief doesn't need them:

- Authentication and sessions (no users in scope).
- Background jobs / queues.
- Caching layer.
- Multi-tenancy.
- Audit logging.
- Soft deletes.
