# Prompt: frontend-2

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/frontend.md` — focus on `frontend-2`.
4. `docs/api.md` — the API contract. The client must match it.
5. `CLAUDE.md` if present locally.

Prerequisites: `frontend-1` and `backend-3` merged. The client needs the contract to be stable.

## Branch

```bash
git checkout master
git pull
git checkout -b feature/frontend-api-client
```

## Scope

Exactly the checklist in `plans/frontend.md` under `frontend-2`:

- `app/lib/api-client.js`: thin wrapper over `fetch` (or undici). Base URL from `process.env.API_BASE_URL`. JSON parse on success. 4xx and 5xx mapped to typed errors (e.g. `ValidationError`, `NotFoundError`, `ApiError`) carrying the response body for the caller to surface.
- Methods for all five endpoints: `createTask`, `getTask(id)`, `listTasks`, `updateTaskStatus(id, status)`, `deleteTask(id)`.
- Unit tests against a mocked HTTP layer (no live backend).

## TDD discipline

One method at a time, test first.

1. `frontend/test/test_api_client.js`: test that `createTask({title, ...})` POSTs to `/tasks` with a JSON body and returns the parsed response on 201. Mock fetch with `sinon` or a small inline stub — whatever you reach for, keep it consistent across tests. Run mocha; test fails because the method doesn't exist.
2. Implement `createTask`. Green.
3. Test: `createTask` throws `ValidationError` carrying the response body on 422.
4. Test: `createTask` throws `ApiError` on 500.
5. Repeat for `getTask`, `listTasks`, `updateTaskStatus`, `deleteTask`. Each gets at least: happy path, error mapping for the relevant status codes.

Cross-reference paths, methods, and bodies against `docs/api.md`. If anything doesn't match, the contract wins — fix the test and the client.

## Anonymity

No personal names anywhere.

## Stop condition

1. Tick the `frontend-2` boxes in `plans/frontend.md`.
2. Commit, push, open PR into `master`.
3. Stop.
