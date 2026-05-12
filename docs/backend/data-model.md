# Data model

Live as of `backend-2`. The `Task` SQLAlchemy model is in [`backend/app/db/models.py`](../../backend/app/db/models.py); the first migration (`1ecce90525da_create_tasks_table`) is in [`backend/migrations/versions/`](../../backend/migrations/versions/). This document is the human-readable companion: shape, rationale, and the conventions that aren't obvious from the code.

## Tables (current)

Only one table for this brief. The system has no users, no audit log, no soft delete, and no separate status table — the status enum lives in code and in the Postgres type system.

### `tasks`

```text
┌──────────────────────────────────────────────────────────────────────┐
│  tasks                                                               │
├──────────────────┬────────────┬──────────────────────────────────────┤
│  id              │  uuid PK   │  Server-assigned (uuid4).            │
│  title           │  varchar   │  NOT NULL, length 1..255, trimmed.   │
│                  │   (255)    │                                      │
│  description     │  text      │  NULL allowed.                       │
│  status          │  task_status                                      │
│                  │  ENUM      │  NOT NULL, default 'todo'.           │
│                  │            │  Values: todo, in_progress, done.    │
│  due_at          │  timestamptz                                      │
│                  │            │  NULL allowed. Stored in UTC.        │
│                  │            │  Naive datetimes rejected at API.    │
│  created_at      │  timestamptz                                      │
│                  │            │  NOT NULL, default now() at UTC.     │
│  updated_at      │  timestamptz                                      │
│                  │            │  NOT NULL, refreshed on each update. │
└──────────────────┴────────────┴──────────────────────────────────────┘
```

Indexes:

- Primary key on `id`.
- No secondary indexes are needed for the brief. If list-by-status or list-by-due-date queries appear later, add a btree index on `status` and on `due_at`.

## Status enum

A Postgres `ENUM` type defined alongside the table:

```sql
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
```

Why a DB-level enum rather than a `varchar` + application-level check:

- Defence in depth. The API layer validates via Pydantic, but if anything else writes to the DB (psql shell, an admin script, an Alembic data migration), the column rejects bad values.
- It makes the schema self-documenting. A psql `\d tasks` shows the legal values without grepping the codebase.

The Python side mirrors this enum:

```python
class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
```

Inheriting from `str` so JSON serialisation produces the lowercase string directly.

## Validation rules

These are enforced at the API edge (Pydantic) and the persistence edge (column constraints). Listed here so both sides stay aligned.

| Field         | Rule                                                            | Where                                |
|---------------|-----------------------------------------------------------------|--------------------------------------|
| `title`       | Required, length 1..255 after trim.                             | Pydantic + DB `NOT NULL` + length.   |
| `description` | Optional. No length cap (Postgres `text`).                      | Pydantic optional.                   |
| `status`      | Must be one of the three enum values.                           | Pydantic enum + DB enum.             |
| `due_at`      | Optional. If present, must carry a UTC offset.                  | Pydantic field validator.            |
| `created_at`  | Set by server, never accepted from a client.                    | DB default; not in `TaskCreate`.     |
| `updated_at`  | Set by server, never accepted from a client.                    | DB trigger or ORM `onupdate`.        |

## Time handling

Everything UTC, end to end:

- DB columns are `timestamptz`.
- The Python ORM uses `datetime` objects with `tzinfo=UTC`.
- The API accepts and returns ISO 8601 strings with explicit offsets (`Z` or `+00:00`).
- The frontend formats for Europe/London on render. That's the only place a timezone conversion happens.

Naive datetimes (no offset) are rejected at the API edge with 422. This stops a class of "looks-right-locally, breaks-in-prod" bugs.

## Future shape

Out of scope for this brief but listed here so the model decisions don't paint anyone into a corner:

- **Assigned-to user** — adding a `users` table and an FK on `tasks` is straightforward; the `id` columns would migrate cleanly.
- **Multiple statuses per task** — would need a join table. Current single-column status is fine for the brief.
- **Soft delete** — add a nullable `deleted_at` column. Routes would filter it out. Not done because the brief asks for hard delete.
