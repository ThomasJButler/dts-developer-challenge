# Frontend

Express + Nunjucks + GOV.UK Frontend. Server-rendered. A thin client over the backend's HTTP API. Owns no business logic and no database.

## frontend-1, skeleton

Branch: `feature/frontend-skeleton`. Depends on integration-1.

- [x] `frontend/package.json` (express, nunjucks, govuk-frontend, dotenv, undici or node-fetch, nodemon, mocha, supertest, chai, eslint).
- [x] Express app with Nunjucks pointed at the `govuk-frontend` templates.
- [x] Asset pipeline for the GOV.UK CSS/JS/assets. Use the pre-built dist if it's simpler than wiring up Sass.
- [x] Base layout extending `govuk/template.njk` with header, footer, and a service name.

Done when `npm run dev` shows a GOV.UK-styled landing page at `/`.

## frontend-2, API client

Branch: `feature/frontend-api-client`. Depends on frontend-1 and backend-3.

- [x] `app/lib/api-client.js`: thin `fetch` wrapper, base URL from env, JSON parse, 4xx/5xx mapped to typed errors.
- [x] Unit tests against a mocked HTTP layer.

Done when the client covers all five endpoints and tests pass without hitting a real backend.

## frontend-3, task UI

Branch: `feature/frontend-task-ui`. Depends on frontend-2.

- [x] `GET /tasks` list page: table of tasks, status tag component, due date formatted in Europe/London.
- [x] `GET /tasks/new` and `POST /tasks`: create form using GOV.UK input, textarea, date input, and radios for status. Error summary on validation failure.
- [x] `GET /tasks/:id` detail page with an "Update status" form and a "Delete" action.
- [x] `POST /tasks/:id/status` and `POST /tasks/:id/delete`. POST-only is fine, no need for method-override unless it gets in the way.
- [x] CSRF protection. Anything rendering forms needs it.

Done when every CRUD flow works against a running backend and forms re-render with errors plus the values the user typed.

## frontend-4, tests

Branch: `feature/frontend-tests`. Depends on frontend-3.

- [x] Supertest route tests with the API client mocked. Don't hit a real backend.
- [x] Render assertions on the list page (empty and populated), the create form, and the error summary state.
- [x] Stretch: backend `PATCH /tasks/{id}/due` endpoint. Documented widening beyond the brief ("status is the only mutable field") because a no-due-date task otherwise needs delete-and-recreate to add one.
- [x] Stretch: editable due date on the detail page. Separate form parallel to "Update status". Reuses `validateDue` from the create flow. Submitting all five date inputs blank clears the due date.

Done when `npm test` is green, the route handlers are covered, the new due-date flow works end-to-end against a running backend, and `docs/api.md` documents the new endpoint.

## Notes

The error-summary pattern is non-negotiable. Even if the backend validates and returns a structured error, the frontend has to render a GOV.UK error summary at the top of the page with links jumping to each field. That's an accessibility requirement, not a styling preference.

Persist UTC, render Europe/London. The backend hands you UTC ISO timestamps; convert on the way into the template, not in the database.

Don't reach into the backend's database. If you need data that doesn't exist on the API yet, add it to the API first.
