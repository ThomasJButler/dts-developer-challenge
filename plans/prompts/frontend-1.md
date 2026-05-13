# Prompt: frontend-1

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build — the frontend trunk starts here. Before writing a single line of code, you have a **research phase** to do. The design handoff is the source of truth for look, copy, validation, and interaction. Skipping it will cause rework.

## Phase 0: Reading

In this order:

1. `README.md` — the brief.
2. `PLAN.md` and `plans/overview.md`.
3. `plans/frontend.md` — focus on `frontend-1`, but skim the later tasks so you know what's coming.
4. `docs/api.md` — background; `frontend-1` itself does not call the API.
5. `CLAUDE.md` if present locally.
6. The full backend writeup, if `docs/internal/backend-writeup.md` exists locally — it explains the API contract you'll integrate against in later tasks.

## Phase 1: Design research (mandatory, do not skip)

The design handoff lives at `frontend/design_handoff_manage_your_tasks/`. Treat it as the visual and behavioural specification — your job across the frontend trunk is to recreate it faithfully in Express + Nunjucks + GOV.UK Frontend.

Read every file. In this order:

1. `frontend/design_handoff_manage_your_tasks/README.md` — the handoff overview: stack, routes, task model, what's in and out of scope. **Read this first, in full.**
2. `frontend/design_handoff_manage_your_tasks/spec.html` — the primary build reference. Annotated Nunjucks for every screen, rationale per choice, full UK English microcopy, accessibility checklist, out-of-scope list. Open it in a browser if it's easier to read rendered than as source.
3. `frontend/design_handoff_manage_your_tasks/index.html` — landing page; gives the lay of the bundle.
4. `frontend/design_handoff_manage_your_tasks/prototype.html` and `prototype.js` — clickable prototype. **Do not port the JavaScript.** It exists only so a human can click through. The toolbar at the top toggles empty/error/success states.
5. `frontend/design_handoff_manage_your_tasks/sample_data.json` — fixtures the prototype uses. Worth a look so the test data in any local seed matches what designers had in mind.
6. `frontend/design_handoff_manage_your_tasks/screenshots/*.png` — read these too. Seven screens (list, empty list, create form, create with errors, detail, detail with success banner, delete confirmation). Use the Read tool on each PNG.

As you read, write a short summary back to the user covering:

- The service name (it sets the header text and `package.json` name).
- The seven screens and the route table from the handoff README.
- Any deviations from default GOV.UK Frontend appearance that the spec calls out.
- Anything in the handoff that **expands the scope** of `frontend-1` beyond what `plans/frontend.md` currently lists. Flag those so the user can decide whether to widen `frontend-1` or push them into later tasks. Do not silently absorb scope creep.

Stop after the summary and wait for the user to confirm before starting Phase 2. They may want to update `plans/frontend.md` and the later prompts (`frontend-2`, `frontend-3`, `frontend-4`) in light of what you found.

## Phase 2: Branch

The branch is already cut. Confirm with:

```bash
git rev-parse --abbrev-ref HEAD   # expect: feature/frontend-skeleton
```

If you're on `main` instead, cut it now:

```bash
git checkout main && git pull
git checkout -b feature/frontend-skeleton
```

## Phase 3: Scope of frontend-1

Exactly the checklist in `plans/frontend.md` under `frontend-1`, calibrated to what the design handoff said:

- `frontend/package.json` with express, nunjucks, govuk-frontend, dotenv, undici (or node-fetch), nodemon, mocha, supertest, chai, eslint. Match the version pins suggested in the handoff README where they exist.
- Express app with Nunjucks resolving the `govuk-frontend` templates from `node_modules`.
- GOV.UK CSS/JS/assets served statically from `govuk-frontend/dist/govuk/assets`. Pre-built dist over Sass unless the handoff requires custom SCSS (it shouldn't).
- Base layout extending `govuk/template.njk`, with the header, footer, and service name **exactly as the design specifies** (including any plain-black-header deviation the spec calls out).
- A landing route (`GET /`) that either redirects to `/tasks` or renders a trivial page — whichever matches the handoff. If the handoff is silent, a redirect to `/tasks` is the safe default; the real list view ships in `frontend-3`.

Things `frontend-1` does **not** include: the API client (that's `frontend-2`), any of the seven task screens themselves (that's `frontend-3`), CSRF, flash messages, session middleware. If reading the handoff convinces you something needs to move earlier, raise it with the user during the Phase 1 summary rather than smuggling it in here.

## TDD discipline

Failing test first.

1. `frontend/test/test_index.js` (Mocha + Supertest): `GET /` returns 200 (or 303 to `/tasks`, whichever the handoff dictates) and the HTML contains the service name from the spec. Watch it fail (the app doesn't exist yet).
2. Implement the minimum: Express app, Nunjucks setup pointing at govuk-frontend, base layout, the `/` controller.
3. Green.
4. Next failing test: response contains the GOV.UK header markup (a distinctive class like `govuk-header`). Wire the layout in. Green.

The asset pipeline (CSS/JS actually loading in the browser) is verified manually with `npm run dev` plus a quick visual check. A unit test on static-asset wiring isn't worth the time.

## Anonymity

No personal names anywhere. `package.json` `author` is the anonymous identity (or empty). No personal email anywhere in `package.json`, the lockfile, or any committed file. The repo-local git config is already set; do not override it.

## Stop condition

1. Tick the `frontend-1` boxes in `plans/frontend.md`.
2. Commit in small, well-scoped commits. Push.
3. Open a PR into `main` with the title `frontend-1: …` and a body listing what changed and what was deliberately deferred.
4. Stop. Do not start `frontend-2` work.
