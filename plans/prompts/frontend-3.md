# Prompt: frontend-3

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/frontend.md` — focus on `frontend-3`. Note the GOV.UK error-summary accessibility rule in the Notes section.
4. `docs/api.md` — the contract.
5. `CLAUDE.md` if present locally.

Prerequisite: `frontend-2` merged.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/frontend-task-ui
```

## Scope

Exactly the checklist in `plans/frontend.md` under `frontend-3`:

- `GET /tasks` list page: table of tasks, GOV.UK tag component for status, due date formatted in Europe/London.
- `GET /tasks/new` and `POST /tasks`: create form using GOV.UK input + textarea + date input + radios for status. Error summary on validation failure, with links to each invalid field.
- `GET /tasks/:id`: detail page with "Update status" form and a "Delete" action.
- `POST /tasks/:id/status` and `POST /tasks/:id/delete` (HTML form, POST-only is fine).
- CSRF protection (csurf or equivalent).

## TDD discipline

One route at a time, test first. Use Supertest against the Express app with the API client mocked (`frontend-2`'s client gets stubbed via a module mock or DI — keep it consistent).

1. Test `GET /tasks` with the client stubbed to return an empty list: response 200, renders the "no tasks yet" empty state. Implement, green.
2. Test `GET /tasks` with the client stubbed to return three tasks: response includes each title, each status as a tag, each due date in Europe/London. Implement, green.
3. Test `POST /tasks` with valid body: client called with the right payload, then redirect to the new task's detail page.
4. Test `POST /tasks` with invalid body (missing title): response 400 (or 200 re-rendering the form), GOV.UK error summary present, the title field's value is preserved.
5. Continue for `GET /tasks/:id`, `POST /tasks/:id/status`, `POST /tasks/:id/delete`.
6. CSRF test: a POST without the token is rejected.

Manual check at the end: `npm run dev`, browser, walk through create → list → status update → delete.

## Anonymity

No personal names anywhere.

## Stop condition

1. Tick the `frontend-3` boxes in `plans/frontend.md`.
2. Commit, push, open PR into `main`.
3. Stop. Deeper rendering coverage lives in `frontend-4`.
