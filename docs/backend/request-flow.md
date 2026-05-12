# Request flow

ASCII sequence diagrams for each endpoint, showing how a single HTTP request travels through the layers described in [`architecture.md`](architecture.md). Endpoints not yet implemented are listed here so the intended flow is the same when the code arrives.

Legend:

- `→` synchronous call.
- `↩︎` return value.
- `‼` error path (exception raised, mapped to an HTTP response by the router or a global handler).

## `GET /healthz` (implemented)

The simplest path. No DB, no validation, no service layer.

```text
Client                Router (main.py)
  │                         │
  │  GET /healthz           │
  │ ───────────────────────►│
  │                         │  return {"status": "ok"}
  │ ◄───────────────────────│
  │  200 OK + JSON          │
```

## `POST /tasks`

The most involved path. Validates the body, persists a new row, returns the created resource.

```text
Client      Router            Service              Repository           DB
  │  POST /tasks │                │                     │                 │
  │ ────────────►│                │                     │                 │
  │              │ TaskCreate     │                     │                 │
  │              │ (Pydantic      │                     │                 │
  │              │  validates)    │                     │                 │
  │              │                │                     │                 │
  │              │ create_task(   │                     │                 │
  │              │   session,     │                     │                 │
  │              │   data)        │                     │                 │
  │              │ ──────────────►│                     │                 │
  │              │                │ insert(session,     │                 │
  │              │                │        task)        │                 │
  │              │                │ ────────────────────│                 │
  │              │                │                     │ INSERT ...      │
  │              │                │                     │ ───────────────►│
  │              │                │                     │ ◄───────────────│
  │              │                │                     │ Task row        │
  │              │                │ ◄───────────────────│                 │
  │              │                │ session.commit()    │                 │
  │              │                │ ───────────────────────────────────  ►│
  │              │ TaskRead       │                     │                 │
  │              │ ◄──────────────│                     │                 │
  │ 201 + JSON   │                │                     │                 │
  │ ◄────────────│                │                     │                 │
  │              │                │                     │                 │
  │ ‼ on Pydantic failure: router returns 422 with the                    │
  │   Problem-Details body (see docs/api.md, error shape).                │
```

## `GET /tasks/{id}`

```text
Client      Router            Service              Repository           DB
  │  GET /tasks/{id}          │                     │                 │
  │ ────────────►│            │                     │                 │
  │              │ parse id    │                     │                 │
  │              │ as UUID     │                     │                 │
  │              │ ‼ malformed │                     │                 │
  │              │   → 400     │                     │                 │
  │              │             │                     │                 │
  │              │ get_task(   │                     │                 │
  │              │   session,  │                     │                 │
  │              │   id)       │                     │                 │
  │              │ ───────────►│                     │                 │
  │              │             │ get_by_id(session,  │                 │
  │              │             │           id)       │                 │
  │              │             │ ──────────────────►│                  │
  │              │             │                    │ SELECT WHERE id  │
  │              │             │                    │ ───────────────► │
  │              │             │                    │ ◄────────────────│
  │              │             │                    │ Task | None      │
  │              │             │ ◄──────────────────│                  │
  │              │             │ ‼ if None → raise TaskNotFound        │
  │              │ ‼ TaskNotFound → router returns 404                 │
  │              │ TaskRead    │                                       │
  │              │ ◄───────────│                                       │
  │ 200 + JSON   │                                                     │
  │ ◄────────────│                                                     │
```

## `GET /tasks`

```text
Client      Router            Service              Repository           DB
  │  GET /tasks  │                │                     │                 │
  │ ────────────►│                │                     │                 │
  │              │ list_tasks(    │                     │                 │
  │              │   session)     │                     │                 │
  │              │ ──────────────►│                     │                 │
  │              │                │ list_all(session)   │                 │
  │              │                │ ───────────────────►│                 │
  │              │                │                     │ SELECT *        │
  │              │                │                     │ ───────────────►│
  │              │                │                     │ ◄───────────────│
  │              │                │                     │ list[Task]      │
  │              │                │ ◄───────────────────│                 │
  │              │ list[TaskRead] │                     │                 │
  │              │ ◄──────────────│                     │                 │
  │ 200 + JSON   │                │                     │                 │
  │ ◄────────────│                │                     │                 │
```

An empty list is still a 200 with `[]`, never a 404.

## `PATCH /tasks/{id}/status`

Only the `status` field can change. Status transitions are validated by the enum, not by a state-machine — any known status can move to any other.

```text
Client      Router            Service              Repository           DB
  │  PATCH /tasks/{id}/status                          │                 │
  │ ────────────►│                │                    │                 │
  │              │ TaskUpdateStatus                    │                 │
  │              │ (Pydantic      │                    │                 │
  │              │  validates     │                    │                 │
  │              │  enum)         │                    │                 │
  │              │ ‼ on bad      │                    │                 │
  │              │   status → 422 │                    │                 │
  │              │                │                    │                 │
  │              │ update_status(│                    │                 │
  │              │   session,    │                    │                 │
  │              │   id, status) │                    │                 │
  │              │ ─────────────►│                    │                 │
  │              │               │ get_by_id          │                 │
  │              │               │ ──────────────────►│                 │
  │              │               │                    │ SELECT          │
  │              │               │                    │ ───────────────►│
  │              │               │                    │ ◄───────────────│
  │              │               │ ◄──────────────────│                 │
  │              │               │ ‼ None → raise TaskNotFound          │
  │              │               │ mutate task.status                   │
  │              │               │ session.commit()                     │
  │              │               │ ──────────────────────────────────── ►│
  │              │ TaskRead      │                                      │
  │              │ ◄─────────────│                                      │
  │ 200 + JSON   │                                                      │
  │ ◄────────────│                                                      │
```

## `DELETE /tasks/{id}`

```text
Client      Router            Service              Repository           DB
  │  DELETE /tasks/{id}                              │                 │
  │ ────────────►│             │                    │                 │
  │              │ delete_task(│                    │                 │
  │              │   session,  │                    │                 │
  │              │   id)       │                    │                 │
  │              │ ───────────►│                    │                 │
  │              │             │ delete(session,    │                 │
  │              │             │        id)         │                 │
  │              │             │ ──────────────────►│                 │
  │              │             │                    │ DELETE WHERE id │
  │              │             │                    │ ───────────────►│
  │              │             │                    │ ◄───────────────│
  │              │             │                    │ rows_affected   │
  │              │             │ ◄──────────────────│                 │
  │              │             │ ‼ 0 → raise TaskNotFound             │
  │              │             │ session.commit()                     │
  │              │             │ ──────────────────────────────────── ►│
  │              │ no body     │                                      │
  │              │ ◄───────────│                                      │
  │ 204          │                                                    │
  │ ◄────────────│                                                    │
```

## Error mapping (cross-cutting)

A single FastAPI exception handler will map domain errors to the Problem-Details body documented in [`docs/api.md`](../api.md). Until that handler lands in `backend-3`, routes will use FastAPI's defaults.

| Domain exception        | HTTP status | When                                              |
|-------------------------|-------------|---------------------------------------------------|
| `TaskNotFound`          | 404         | Path id refers to a row that doesn't exist        |
| `InvalidUUID`           | 400         | Path id is not a valid UUID                       |
| (Pydantic validation)   | 422         | Body or query parameters fail schema validation   |
| (Anything else)         | 500         | Unhandled exception. Logged; not exposed in body. |
