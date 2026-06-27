# Session Handoff

> Read this FIRST when picking up this project cold. Then read CLAUDE.md for the full spec.

## What This Project Is

CHIZLAB Materials — educational-materials admin system.
- Admins upload media (images, video, PDF, audio) → AI worker (Gemini) analyzes it → fills metadata automatically.
- Two API surfaces: `/api/admin/*` (full CRUD, JWT auth) and `/api/public/*` (GET-only, X-API-Key).
- External platform consumes the public API; humans use the admin panel.

## Current State (as of 2026-06-27)

All 5 phases complete and committed. System runs via `docker compose up` from `infra/`.

**Test count:** 50 tests, 0 failures (29 Jest backend + 21 Vitest frontend).
**Last commit group:** Production hardening — redis bug, CORS, nginx, CI/CD, memory agent.

## Where Things Live

| What | Path |
|------|------|
| Spec (single source of truth) | `CLAUDE.md` |
| API contract (OpenAPI 3.1) | `packages/contracts/openapi.yaml` |
| TypeScript types from contract | `packages/contracts/index.ts` |
| NestJS backend | `apps/api/src/` |
| React admin panel | `apps/admin/src/` |
| Python AI worker | `services/ai-worker/` |
| Docker Compose | `infra/docker-compose.yml` |
| Env template | `infra/.env.example` |
| Design tokens | `design/design-tokens.{css,ts}` |
| Screen/component spec | `design/UI-SPEC.md` |
| CI/CD | `.github/workflows/ci.yml` |
| Memory files | `memory/` |

## Agent Directory Ownership

| Directory | Owner agent |
|-----------|-------------|
| `apps/api/` + `services/ai-worker/` | backend |
| `apps/admin/` | frontend |
| `infra/` | integration |
| `packages/contracts/` + `docs/` | plan |
| `design/` | design |
| `memory/` | memory |

## How to Run Locally

```bash
cp infra/.env.example infra/.env
# Edit infra/.env: set GEMINI_API_KEY, CORS_ORIGINS=http://localhost:5173, change weak secrets
cd infra && docker compose up -d
```

- Admin panel: http://localhost:80 (PIN: whatever you set in ADMIN_PIN)
- API Swagger: http://localhost:3000/docs/admin
- MinIO console: http://localhost:9101 (minioadmin / minioadmin123)

## Key Architectural Decisions

1. **NestJS** (TypeScript strict) + **PostgreSQL** (pgvector edition) — single service, two route groups
2. **JWT auth** — 8-digit PIN login, 5 failed attempts → 15 min lockout
3. **arq** (Python async Redis queue) for AI jobs — NestJS enqueues, Python worker processes
4. **MinIO** (self-hosted S3) — `minio_data` Docker volume is critical, never remove it
5. **Polling** (TanStack Query, 5s refetchInterval) — only active while materials are in `pending` state
6. **Soft delete only** — `deletedAt` column, never hard-delete
7. **Contract-first** — `packages/contracts/openapi.yaml` is authoritative; all code follows it

## Outstanding Items

- Python AI worker has no pytest tests (functional, but untested)
- No structured logging (basic NestJS Logger only)
- CI deploy job commented out in `.github/workflows/ci.yml` — needs VPS SSH secrets
- Verify Gemini API key: provided key starts with `AQ.` (standard format is `AIza...`)
  If AI worker fails with auth error, get a new key from https://aistudio.google.com/app/apikey

## What Memory Agent Should Update

When called after any significant change, update:
1. `memory/progress.md` — phase status, outstanding bugs, test count
2. `memory/decisions.md` — append new decisions with WHY
3. `memory/context.md` — append new env vars, updated "how to run"
4. `memory/session-handoff.md` — update "Current State" date and outstanding items

Never record secret values — only env var names.
