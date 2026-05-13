# Prompt: frontend-writeup (interview prep)

Use this prompt to generate a comprehensive Markdown writeup of the **entire frontend implementation** (frontend-1 through frontend-4). The output is for personal interview preparation — it lives in `docs/internal/` which is gitignored, so it never enters the public repo.

This prompt is designed to be re-run **as the frontend trunk progresses**, not only at the end. After each frontend PR merges (or at any other natural break-point), invoke it again — it overwrites the existing writeup and reflects whatever state `main` is in when invoked. That way the personal reference stays in sync with the code without anyone having to maintain it by hand.

## How to use

1. Open a fresh Claude Code session at the repo root.
2. Copy everything below the `---` divider.
3. Paste and let it run. The session will produce `docs/internal/frontend-writeup.md`.

If a frontend PR has not yet merged when you run this, the prompt accepts that gracefully: cover the PRs that have landed, plus the current in-progress branch if there is one, and mark anything pending as "not yet implemented".

---

You are producing an interview-prep document covering the entire frontend implementation of this repository. The document is for the candidate's personal reference; the assessor will never see it, so it can be candid about what worked, what didn't, and what you'd do differently.

## Reading list (read these before writing anything)

Read each of these top-to-bottom. They are the source of truth — don't make anything up that isn't visible here.

1. `README.md` — the immutable HMCTS brief.
2. `PLAN.md` and `plans/overview.md` — project shape and branch structure.
3. `plans/frontend.md` — every frontend task, tick state, and acceptance criteria.
4. `docs/api.md` — the public API contract the frontend consumes. The frontend must not drift from this.
5. `frontend/design_handoff_manage_your_tasks/README.md` — the handoff overview: stack, routes, task model, what's in and out of scope for the UI.
6. `frontend/design_handoff_manage_your_tasks/spec.html` — the primary build reference. Annotated Nunjucks per screen, rationale per choice, full UK English microcopy, accessibility checklist, out-of-scope list.
7. `frontend/design_handoff_manage_your_tasks/screenshots/*.png` — the seven screen states. Read each PNG.
8. Any `docs/frontend/*.md` wireframe-style documents that exist (architecture, request-flow, decisions). If they don't exist yet, note that in the writeup rather than invent them.
9. `plans/prompts/frontend-1.md` through `plans/prompts/frontend-4.md` — the per-task prompts that bound each PR's scope.
10. The frontend source tree under `frontend/app/` (Express app, routers/routes, lib, views, public assets, middleware).
11. The test suite under `frontend/test/` (Mocha + Supertest specs, any fixture or helper file).
12. `frontend/package.json` and `frontend/package-lock.json` — pin versions and scripts.
13. `CLAUDE.md` — the in-repo guidance for working sessions (gitignored locally; only present if you have it).
14. `docs/internal/backend-writeup.md` if present — it explains the API contract the frontend integrates against; useful when describing how the frontend's HTTP client maps onto the backend's Problem-Details and route shapes.

Then run, in order, to see merged-branch history. Resolve the repo slug dynamically so this prompt stays anonymous and reusable:

```bash
REPO=$(gh repo view --json owner,name --jq '"\(.owner.login)/\(.name)"')

git log --oneline --all --decorate | head -60
gh pr list --state merged --repo "$REPO" --limit 20
# Pull each merged frontend PR's title, body, mergedAt. PR numbers vary;
# discover them rather than hard-coding.
gh pr list --repo "$REPO" --state all --search "frontend in:title" --json number,title,state,mergedAt
# Then `gh pr view <n> --repo "$REPO" --json title,body,mergedAt` for each one
# returned above. Include the in-progress PR too, if there is one.
```

Treat the merged PR descriptions and any `coderabbitai` review comments on them as primary evidence of what shipped and why.

## Output

Write a single file at `docs/internal/frontend-writeup.md`. Overwrite anything already there. Use UK English. Plain prose, short paragraphs, no marketing voice. Aim for 2,500–4,000 words once the trunk is complete; an earlier run with only one or two PRs landed will naturally be shorter, and that's fine. Use the structure below — do not invent new top-level sections.

### 1. One-paragraph summary

Three to five sentences. What the frontend is, what it does, what stack runs it. Suitable for the opening minute of a technical interview. Make clear it is a server-rendered Express + Nunjucks + GOV.UK Frontend app — no React, no client-side router, no API exposed of its own.

### 2. What was built

A subsection per merged PR. Title each by the branch name plus a short label. Cover what changed, what was deliberately deferred, and the acceptance criteria from `plans/frontend.md` that the PR closed. PR numbers vary; pull them from `gh pr list` rather than hard-coding.

Expected branch breakdown (skip any that haven't merged yet, and add a "not yet implemented" note for them):

- `feature/frontend-skeleton` — Express + Nunjucks + GOV.UK Frontend skeleton, base layout, asset pipeline.
- `feature/frontend-api-client` — typed/validated HTTP client wrapping the backend.
- `feature/frontend-task-ui` — the seven screens from the design handoff (list, empty list, create, create-with-errors, detail, detail-with-banner, delete confirmation), CSRF, flash messages.
- `feature/frontend-tests` — Supertest route tests with the API client mocked, render assertions.

Then a cross-cutting subsection for things that span PRs: the design-handoff-first approach, the GOV.UK error-summary pattern, UTC-in / Europe/London-out time handling, progressive-enhancement-only JavaScript, the POST/Redirect/GET pattern on every mutation.

### 3. Why — the decisions

For each major choice, one short paragraph: what we picked, what the alternative was, why we landed where we did. Pull rationale from the design handoff (`spec.html` includes per-choice rationale), the per-task prompts, the PR descriptions, and any `docs/frontend/decisions.md` if it exists.

Cover at minimum:

- Express + Nunjucks (vs Next.js, Remix, plain templating engines, or a SPA). The brief constrains us to server-rendered HTML for accessibility; GOV.UK Frontend's Nunjucks macros make Nunjucks the path of least resistance.
- GOV.UK Frontend pre-built dist (vs compiling the Sass ourselves).
- Server-side validation re-rendering with `govukErrorSummary` even when the backend also validates. Document this as an accessibility requirement (WCAG 2.2 AA), not a stylistic choice.
- POST/Redirect/GET on every mutation, so refresh never resubmits.
- A typed/validated HTTP client in `frontend/app/lib/api-client.js` mapping backend Problem-Details into typed errors (vs raw `fetch` in route handlers).
- CSRF protection on every POST.
- Session middleware just for flash messages (vs a query-string flag).
- `luxon` for Europe/London date rendering (vs `Intl.DateTimeFormat`, `date-fns-tz`, or hand-rolled).
- Schema validation library (zod or joi) at the route edge.
- Progressive enhancement only — the prototype JS in the design handoff is explicitly *not* ported; forms work without JavaScript.
- The plain-black service header deviation from default GOV.UK Frontend (if `spec.html` documents this).
- Why a separate frontend service at all, rather than templating from the backend. Answer: separation of concerns mandated by the brief; the backend stays headless and reusable.

If a decision isn't documented anywhere, **flag it in a "needs decision record" note** rather than invent one.

### 4. How — the working practice

Cover the development discipline, not the code. Three or four paragraphs. Cover:

- TDD per task: red test → minimum implementation → green → commit. Calibrated per task — config-only tasks verify by running, behaviour tasks use the full red-green cycle. The per-branch prompts in `plans/prompts/` encode this.
- Design-handoff first. `frontend-1`'s prompt included a mandatory Phase 1 design-research step before any code was written. Note any scope deltas the research surfaced and how they were folded into the plan.
- Mock the API in tests; never hit a live backend. The `api-client.js` is the seam.
- Accessibility baked in from the skeleton, not bolted on. GOV.UK Frontend gives most of it; the error-summary pattern and the focus-management on form errors are the deliberate parts.
- Anonymity discipline carries over from the backend. The repo-local git config is set to a generic identity; `package.json` `author` is empty or anonymous; no personal data anywhere in files, commits, or commit authors.
- One PR per task. Each PR's prompt sets the scope explicitly. Stops scope creep dead. The design handoff has seven screens but they all land in `frontend-3`, not piecemeal across the trunk.

### 5. Issues and fixes

A bullet list. Each entry: what surfaced, how it surfaced, what we changed. Keep these concrete — the interviewer probably wants details. As this writeup is regenerated over time, this section grows as issues are encountered; cover only what actually happened. Do not invent issues to fill the section.

Examples of the kinds of things to look for as the trunk progresses (do not invent; only include those that genuinely surfaced):

- Asset-pipeline missteps when wiring GOV.UK Frontend — pointing Nunjucks at the wrong template path, serving the assets folder from the wrong route, the CSS not finding the font/image files.
- Nunjucks macro misuse — passing data into `govukInput` / `govukErrorSummary` in the wrong shape, errors not appearing on refresh, the error-summary not linking to the field anchor.
- CSRF middleware ordering — having to place it after `urlencoded` parsing, or the cookie session middleware before it.
- Time-zone rendering bugs — naive `Date` arithmetic forcing the user's local time zone, or DST boundary off-by-one.
- API-client error mapping — Problem-Details from the backend losing fidelity in transit, the 422 `errors[]` array not surviving into template-side error display.
- Form re-render preserving values — making sure the user's typed input survives a validation failure (a common GOV.UK pattern bug).
- Test isolation — Supertest leaving a server listening across tests, or the mocked API client leaking state between specs.
- CodeRabbit catches — same pattern as on the backend; capture them here too as they appear.
- Anonymity slips — any time a personal identifier nearly leaked into `package.json`, the lockfile, a snapshot, or a screenshot.

### 6. Conventions and constraints

A short section. Cover, in plain prose:

- Anonymity (no real names in files, commits, or commit author/email).
- UK English everywhere, in code identifiers as well as user-facing text (the design handoff specifies UK microcopy).
- WCAG 2.2 AA accessibility floor, enforced by the error-summary pattern and the use of GOV.UK Frontend macros.
- "No scope creep" — features outside the brief are deferred, not implemented. Examples: auth, pagination, search/filter, soft delete, multi-user, real-time updates.
- Branch-per-task, PR-first merges to `main`.
- Comments on important stuff (load-bearing decisions get a sentence or two of *why*; trivial code gets nothing).
- ESLint as the lint baseline. Note the configured rules.

### 7. Files of interest, grouped by area

A bullet list grouped under: app entry, routes, views, lib (API client, validation, time formatting), middleware (session, CSRF, flash, error handling), public assets, tests, design handoff, docs. One line per file with what it owns. Useful for an interviewer who wants to dive into one area.

### 8. Open follow-ups not in scope for frontend-1..4

Lift these from `plans/frontend.md`, `plans/testing.md`, and the open-follow-ups sections of any frontend plan documents:

- End-to-end integration smoke (`integration-2`).
- CI workflow that runs both Node and Python suites (`testing-1`).
- a11y audit pass + README screenshots (`testing-2`).
- Carry-over follow-ups from the backend trunk that still apply: GitHub default-branch swap, merge-commit author cleanup before submission.
- Anything the design handoff explicitly lists as out of scope (skim its README and spec for an "out of scope" section).

### 9. If I had another day

Two or three sentences. Honest reflection: what would you tighten? Where is the design thinnest? The goal is to anticipate the "what would you change?" question interviewers ask. Suggested honest angles if you can't think of your own: a real visual-regression test on the seven screens (Playwright or Percy), a stricter contract test that exercises the api-client against a recorded backend OpenAPI, a hardened CSP that disallows inline styles once the GOV.UK templates are stable, or pagination on the list view once the data set is non-trivial.

## Style rules for the output

- UK English.
- No personal identifying info in the document. The reader knows who they are — the document doesn't need to.
- Short paragraphs. One idea per paragraph.
- File paths in backticks: `frontend/app/main.js`.
- Pull rationale from the design handoff and any `docs/frontend/decisions.md` rather than inventing new reasoning. If a decision isn't documented anywhere, **flag it** rather than make one up.
- Don't invent commit shas or PR numbers — read them from `git log` and `gh pr view`.
- Don't dramatise problems. Issues are described matter-of-factly.
- This document evolves. When re-run after a new PR, prefer extending existing sections to creating duplicate ones. The output should read as one coherent piece, not a journal of runs.

When you finish, save the file to `docs/internal/frontend-writeup.md` (creating the directory if needed) and stop. Do not commit it — that path is gitignored.
