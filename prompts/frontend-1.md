# Prompt: frontend-1

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/frontend.md` — focus on `frontend-1`.
4. `docs/api.md` — only as background; this task doesn't call the API yet.
5. `CLAUDE.md` if present locally.

Prerequisite: `integration-1` merged. (Backend doesn't need to exist yet.)

## Branch

```bash
git checkout master
git pull
git checkout -b feature/frontend-skeleton
```

## Scope

Exactly the checklist in `plans/frontend.md` under `frontend-1`:

- `frontend/package.json` with express, nunjucks, govuk-frontend, dotenv, undici (or node-fetch), nodemon, mocha, supertest, chai, eslint.
- Express app with Nunjucks resolving `govuk-frontend` templates.
- GOV.UK CSS/JS/assets served. Use the pre-built dist if it's simpler than wiring Sass.
- Base layout extending `govuk/template.njk`, with header, footer, and service name.

## TDD discipline

Write the failing test first.

1. `frontend/test/test_index.js` (Mocha + Supertest): a test that `GET /` returns 200 and the HTML contains the service name. It should fail because the Express app doesn't exist yet.
2. Implement the minimum: an Express app, Nunjucks setup, base layout, a controller for `/`.
3. Green.
4. Next: a test that the response includes the GOV.UK header markup (look for a distinctive class like `govuk-header`). Add the layout integration. Green.

The asset pipeline (CSS/JS being served) is verified manually with `npm run dev` and a browser; a unit test isn't worthwhile for static asset wiring.

## Anonymity

No personal names anywhere. The `package.json` `author` field must be the anonymous identity (or empty). No personal email in `package.json`.

## Stop condition

1. Tick the `frontend-1` boxes in `plans/frontend.md`.
2. Commit, push, open PR into `master`.
3. Stop.
