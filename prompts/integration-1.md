# Prompt: integration-1

Copy everything below the divider into a fresh Claude Code session at the repo root.

---

You're picking up work on the DTS task-management build. Before doing anything else, read:

1. `README.md` — the original brief, immutable requirements.
2. `PLAN.md` and `plans/overview.md` — project shape, stack, branch naming.
3. `plans/integration.md` — the trunk you're working on. Focus on `integration-1`.
4. `CLAUDE.md` if present locally (gitignored personal notes; safe to use if it's there).

Then implement `integration-1` exactly as listed in `plans/integration.md`. Do not start any other task. Do not scaffold the backend or frontend services in this branch.

## Branch

```bash
git checkout master
git checkout -b feature/integration-scaffold
```

## Scope

Exactly the checklist in `plans/integration.md` under `integration-1`:

- `docker-compose.yml` with a `db` service (Postgres 16, named volume, healthcheck).
- `.env.example` documenting `DATABASE_URL`, `API_BASE_URL`, `PORT`.
- `.gitignore` already exists from a previous commit, but if it's missing anything obvious, top it up.
- `docs/api.md` with the full API contract: endpoint table, request/response examples, status codes, error shape, all five endpoints from the brief.

## TDD note

This task is config and docs, so there's no unit-test surface. Verify by running:

```bash
docker compose up -d db
docker compose ps              # db reports healthy
docker compose exec db pg_isready -U postgres
docker compose down
```

`docs/api.md` is verified by review: every endpoint from the brief has an example request, example success response, and example error response.

## Anonymity

No personal names, emails, or GitHub handles anywhere in committed files or in the commit message. Repo-local git config is already anonymous; do not override.

## Stop condition

When the checklist is satisfied:

1. Tick the `integration-1` boxes in `plans/integration.md`.
2. Commit with a concise message describing the scaffolding.
3. Push the branch and open a PR into `master`.
4. Stop. Do not roll into the next task.
