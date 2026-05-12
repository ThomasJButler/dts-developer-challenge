# Testing

CI and the polish pass. Comes after both service test suites exist.

## testing-1, CI

Branch: `feature/testing-ci`. Depends on backend-4 and frontend-4.

- [ ] `.github/workflows/ci.yml`: matrix with backend (ruff + pytest against a Postgres service container) and frontend (eslint + mocha).
- [ ] Cache npm and pip.
- [ ] Status badge in `README.md`.

Done when opening a PR runs both jobs and they go green.

## testing-2, edges and polish

Branch: `feature/testing-polish`. Depends on testing-1.

- [ ] Backend: a malformed UUID returns 400, not 500. Oversized titles are rejected. A past due-date is allowed (backend) but flagged in the frontend.
- [ ] Frontend: accessibility pass with axe-core or a manual checklist. Focus order, `for`/`id` pairs on labels, error-summary links to fields.
- [ ] README: how to run, screenshots, a short architecture diagram.

Done when a fresh assessor can clone, run, and understand the project from the README alone, and the a11y checklist is signed off.

## Notes

The Postgres service container in GitHub Actions needs a healthcheck just like the local compose file, otherwise pytest will race the database on cold starts.

a11y isn't a one-time pass. Every form change risks a regression: missing `for`/`id`, lost focus, error summary links that point to nothing. Worth running axe-core in CI eventually, though not in scope for this build.
