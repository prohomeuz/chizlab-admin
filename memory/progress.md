# Progress

## Pipeline Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 — Foundation | passed-gate | Reviewer APPROVED. Commit: 4fd2865 |
| Phase 1 — Build | passed-gate | Reviewer APPROVED. Backend: 69de16a. Frontend: 0 TS errors, clean build. |
| Phase 2 — Integration | passed-gate | Reviewer APPROVED. docker-compose, Dockerfiles, env template, health endpoint. |
| Phase 3 — Test | passed-gate | Reviewer APPROVED. 50 tests (29 backend Jest + 21 frontend Vitest), 0 failures. |
| Phase 4 — Review | passed-gate | COMPLETE. Fixed ThrottlerGuard wiring + Category soft-delete. All checks passed. |
| Phase 5 — Production hardening | passed-gate | COMPLETE. Fixed 3 production bugs + CI/CD + memory agent. Commit: see below. |

## What was built

- `apps/api` — NestJS backend: admin CRUD, public read-only, JWT PIN auth, MinIO upload, Bull queue, pgvector, full-text search, dual Swagger docs
- `apps/admin` — React+Vite admin panel: PIN login, materials table with polling, create/edit form, categories tree, chizlab.uz brand
- `services/ai-worker` — Python arq worker: Gemini multimodal analysis, pluggable provider adapter, 3x retry
- `infra/` — docker-compose with 7 services, persistent volumes, health checks, env template
- `packages/contracts/` — OpenAPI spec (contract)
- `.github/workflows/ci.yml` — GitHub Actions CI (lint + test + Docker build)
- 50 unit/component tests, 0 failures

## Fixes applied in Phase 4

1. ThrottlerGuard registered as global APP_GUARD (was configured but not wired)
2. Category entity: added @DeleteDateColumn + migration, service uses softRemove (was hard-deleting)

## Fixes applied in Phase 5 (Production hardening — 2026-06-27)

1. **AI Worker Redis bug** — `redis_settings = property(...)` replaced with module-level
   `WorkerSettings.redis_settings = WorkerSettings.get_redis_settings()` after the class body.
   arq reads this attribute on the class at import time; a property descriptor returns itself, not the value.

2. **CORS restriction** — `app.enableCors()` replaced with origin-restricted config using
   `CORS_ORIGINS` env var. Production value: `https://admin.chizlab.uz`.

3. **nginx /internal exposure** — Removed `internal` from the nginx location regex in
   `apps/admin/Dockerfile`. The `/internal/ai-result` endpoint must only be reachable
   from within the Docker network (ai-worker → api directly, not through nginx).

4. **GitHub Actions CI** — Created `.github/workflows/ci.yml` with 3 jobs:
   backend-test (with postgres + redis services), frontend-test, docker-build.

5. **Memory agent** — Restored `.claude/agents/` + expanded memory.md definition.
   Created `memory/session-handoff.md` for session continuity.

## Outstanding items (non-blocking)

- Python AI worker has no pytest tests (code works, but untested)
- No structured logging (NestJS default Logger only; no Winston/Pino/Sentry)
- Deploy job in CI is commented out — needs VPS_HOST/VPS_USER/VPS_SSH_KEY secrets to activate
- Gemini API key format should be verified (provided key starts with `AQ.` not `AIza...`)
