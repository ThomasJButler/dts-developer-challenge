# Plan

The work is split across four trunks. Each has its own file under `plans/`.

- [`plans/overview.md`](plans/overview.md): stack, branch naming, dependency order, whole-project "done when".
- [`plans/integration.md`](plans/integration.md): compose, env, API contract, end-to-end smoke.
- [`plans/backend.md`](plans/backend.md): FastAPI service, DB, migrations, tests.
- [`plans/frontend.md`](plans/frontend.md): Express + Nunjucks + GOV.UK UI, API client, tests.
- [`plans/testing.md`](plans/testing.md): CI and the polish pass.

Start with `integration-1`. Once it's in, backend and frontend can move in parallel.
