# Prompt: backend-writeup (interview prep)

Use this prompt to generate a comprehensive Markdown writeup of the **entire backend implementation** (backend-1 through backend-4). The output is for personal interview preparation — it lives in `docs/internal/` which is gitignored, so it never enters the public repo.

Run this after the four backend PRs are merged and any CodeRabbit / human review fixes have landed, so the writeup reflects the final state of `main`.

## How to use

1. Open a fresh Claude Code session at the repo root.
2. Copy everything below the `---` divider.
3. Paste and let it run. The session will produce `docs/internal/backend-writeup.md`.

Re-run it any time the backend changes materially — the prompt is idempotent (it overwrites the existing writeup) and reflects whatever state `main` is in when invoked.

To reuse this for the frontend later: copy this file to `prompts/frontend-writeup.md` and substitute the file/branch references in the **Reading list** section.

---

You are producing an interview-prep document covering the entire backend implementation of this repository. The document is for the candidate's personal reference; the assessor will never see it, so it can be candid about what worked, what didn't, and what you'd do differently.

## Reading list (read these before writing anything)

Read each of these top-to-bottom. They are the source of truth — don't make anything up that isn't visible here.

1. `README.md` — the immutable HMCTS brief.
2. `PLAN.md` and `plans/overview.md` — project shape and branch structure.
3. `plans/backend.md` — every backend task, tick state, and acceptance criteria.
4. `docs/api.md` — the public API contract.
5. `docs/backend/architecture.md` — the four-layer split and what each layer owns.
6. `docs/backend/request-flow.md` — ASCII sequence diagrams for `/healthz` and the five business endpoints.
7. `docs/backend/data-model.md` — the `tasks` table, status enum, time handling.
8. `docs/backend/decisions.md` — six ADRs (FastAPI, sync SQLAlchemy, Problem-Details errors, Alembic-only schema, pydantic-settings, request-scoped sessions).
9. `prompts/backend-1.md` through `prompts/backend-4.md` — the per-task prompts that bound each PR's scope.
10. The backend source tree under `backend/app/` (config, db, schemas, services, routers, exceptions, errors, main).
11. The test suite under `backend/tests/` (the `db_session` and `client` fixtures in `conftest.py` plus every `test_*.py` file).
12. The single Alembic migration under `backend/migrations/versions/`.
13. `CLAUDE.md` — the in-repo guidance for working sessions (gitignored locally; only present if you have it).

Then run, in order, to see merged-branch history:

```bash
git log --oneline --all --decorate | head -40
gh pr list --state merged --repo ThomasJButler/dts-developer-challenge --limit 10
gh pr view 2 --repo ThomasJButler/dts-developer-challenge --json title,body,mergedAt
gh pr view 3 --repo ThomasJButler/dts-developer-challenge --json title,body,mergedAt
gh pr view 4 --repo ThomasJButler/dts-developer-challenge --json title,body,mergedAt
# PR #5 may or may not be open depending on when you run this:
gh pr list --repo ThomasJButler/dts-developer-challenge --state all --search "backend-4 in:title" --json number,title,state,mergedAt
```

Treat the merged PR descriptions and any `coderabbitai` review comments on them as primary evidence of what shipped and why.

## Output

Write a single file at `docs/internal/backend-writeup.md`. Overwrite anything already there. Use UK English. Plain prose, short paragraphs, no marketing voice. Aim for 2,500–4,000 words. Use the structure below — do not invent new top-level sections.

### 1. One-paragraph summary

Three to five sentences. What the backend is, what it does, what stack runs it. Suitable for the opening minute of a technical interview.

### 2. What was built

A subsection per merged PR. Title each by the branch name plus a short label. Cover what changed, what was deliberately deferred, and the acceptance criteria from `plans/backend.md` that the PR closed.

- `feature/backend-skeleton` (PR #2) — skeleton.
- `feature/backend-task-model` (PR #3) — model, schemas, migration.
- `feature/backend-endpoints` (PR #4) — five HTTP routes.
- `feature/backend-tests` (the PR that ships this writeup prompt) — fixture hardening, service + repo unit tests, coverage floor.

Then a cross-cutting subsection for things that span PRs: the four-layer architecture, the strict layering rules, the canonical task domain model.

### 3. Why — the decisions

For each major choice, one short paragraph: what we picked, what the alternative was, why we landed where we did. Pull the rationale primarily from `docs/backend/decisions.md` and elaborate with anything visible in the code or PR descriptions that the ADRs didn't capture.

Cover at minimum:

- FastAPI for the web layer (vs Flask, Django, or a hand-rolled WSGI app).
- SQLAlchemy 2.x sync + psycopg 3 (vs the async pair).
- Problem-Details error responses (vs FastAPI's default `{"detail": ...}`).
- Alembic owns the schema, no `Base.metadata.create_all` at startup.
- pydantic-settings over `os.environ`.
- Request-scoped session via FastAPI `Depends(get_session)`.
- App-side UUID v4 generation (vs server-side `gen_random_uuid()`).
- Server-side `now()` for `created_at` and `updated_at` (vs Python-side `datetime.utcnow()`).
- Postgres native ENUM type for status (vs varchar + check constraint).
- Constraint naming convention on `Base.metadata` (so autogenerated migrations diff stably).
- Separate `tasks_test` database for the suite (vs SAVEPOINTs against the dev DB).
- Manual UUID parsing in routes so malformed paths return 400, not FastAPI's default 422.

### 4. How — the working practice

Cover the development discipline, not the code. Three or four paragraphs. Cover:

- TDD per task: red test → minimum implementation → green → commit. Calibrated per task (config-only tasks verify by running; behaviour tasks use the full red-green cycle). The per-branch prompts in `prompts/` encode this.
- Strict layering: routers never import models; ORM objects never leak into responses; services own the unit of work; repositories never commit. Each rule is documented in `docs/backend/architecture.md` and enforced by code review.
- Migrations are mandatory and reversible. The `task_status` ENUM type was a particular case study — the first autogenerated migration omitted the type drop on downgrade and had to be hand-edited.
- Anonymity discipline: every commit and committed file is scrubbed of personal identifiers. The repo-local git config is set to a generic "DTS Candidate" identity. Two early commits inherited from a fork template and were rewritten via `git rebase --root --exec '... --reset-author'` followed by a `--force-with-lease` push.
- One PR per task. Each PR's prompt sets the scope explicitly. Stops scope creep dead.

### 5. Issues and fixes

A bullet list. Each entry: what surfaced, how it surfaced, what we changed. Keep these concrete — the interviewer probably wants details. Cover at minimum:

- **Python 3.14 pydantic-core wheel missing.** First venv build failed on `psycopg-binary` and `pydantic-core` because PyO3 didn't yet support 3.14. Fixed by switching the venv to Python 3.11 (the floor named in `CLAUDE.md`) and bumping the psycopg pin to 3.2.10.
- **Alembic autogenerate omits ENUM `DROP TYPE` on downgrade.** Discovered when round-tripping `upgrade → downgrade → upgrade`; the second `upgrade` failed because `task_status` already existed. Hand-edited the migration to call `task_status_enum.drop(op.get_bind())` in `downgrade()`.
- **Ruff `B008` flagged FastAPI's `Depends(...)` in argument defaults.** Switched the routes to `Annotated[Session, Depends(get_session)]` with a `SessionDep` type alias at the top of `app/routers/tasks.py`.
- **422 detail message claimed "Request body failed validation" for non-body errors.** The same handler covers body/query/path/header/cookie. CodeRabbit flagged this on PR #4; reworded to "Request validation failed".
- **CodeRabbit pre-merge "Docstring Coverage" check warned at 29.63%.** A focused commit added one-line docstrings to every test method, test class, package `__init__.py`, validator, migration `upgrade`/`downgrade`, and inner SAVEPOINT-restart callback. `interrogate -i` now reports 100%.
- **Test fixture isolated writes but not reads.** The SAVEPOINT pattern rolled back writes but didn't hide pre-existing committed rows. A curl smoke that created a task in the dev DB caused `TestListTasks` to fail because the test saw the lingering row. Fixed in `backend-4` by moving the suite onto its own `tasks_test` database with auto-bootstrap (`CREATE DATABASE` + Alembic migrate at session start).
- **Default branch mismatch breaks CodeRabbit auto-review.** The fork's default branch is still `master` (upstream mirror); PRs targeting `main` get an "Auto reviews are disabled on base/target branches other than the default branch" skip. Worked around by triggering reviews with `@coderabbitai review` on each PR. Permanent fix deferred (would need `gh repo edit --default-branch main`).
- **Merge-commit author leaks the real GitHub handle.** Even with anonymous commit metadata, GitHub names the merge commit after the actor who clicked Merge. Flagged for submission-day cleanup; not blocking development.
- **GitHub PR base defaulted to upstream HMCTS org.** `gh pr create` initially tried to open PR #1 against `hmcts:main`. Fixed with `gh repo set-default ThomasJButler/dts-developer-challenge`.

### 6. Conventions and constraints

A short section. Cover, in plain prose:

- Anonymity (no real names in files, commits, or commit author/email).
- UK English everywhere.
- "No scope creep" — features outside the brief are deferred, not implemented. Examples: auth, pagination, soft delete, audit log, multi-tenancy.
- Branch-per-task, PR-first merges to `main`.
- Comments on important stuff (load-bearing decisions get a sentence or two of *why*; trivial code gets nothing).
- Code style: ruff + ruff-format with the rules listed in `backend/pyproject.toml`.

### 7. Files of interest, grouped by area

A bullet list grouped under: config, persistence, domain, HTTP, error handling, tests, migrations, docs. One line per file with what it owns. Useful for an interviewer who wants to dive into one area.

### 8. Open follow-ups not in scope for backend-1..4

Lift these from `plans/backend.md`, `plans/testing.md`, and the open-follow-ups sections of the backend plans:

- CI workflow (`testing-1`).
- a11y + polish (`testing-2`).
- Frontend integration (`integration-2`).
- GitHub default-branch swap.
- Merge-commit author cleanup before submission.
- Pin Python 3.11 in the CI workflow.

### 9. If I had another day

Two or three sentences. Honest reflection: what would you tighten? Where is the design thinnest? The goal is to anticipate the "what would you change?" question interviewers ask. Suggested honest answers if you can't think of your own: tighter coverage on `app/errors.py` (the catch-all is currently untested), an integration test that exercises `alembic upgrade head` against a real database in CI, pagination on `GET /tasks` if the brief ever grew.

## Style rules for the output

- UK English.
- No personal identifying info in the document. The reader knows who you are — the document doesn't need to.
- Short paragraphs. One idea per paragraph.
- File paths in backticks: `backend/app/main.py`.
- Pull rationale from `docs/backend/decisions.md` rather than inventing new reasoning. If a decision isn't documented anywhere, *flag it* in a "needs decision record" note rather than make one up.
- Don't invent commit shas or PR numbers — read them from `git log` and `gh pr view`.
- Don't dramatise problems. Issues are described matter-of-factly.

When you finish, save the file to `docs/internal/backend-writeup.md` (creating the directory if needed) and stop. Do not commit it — that path is gitignored.
