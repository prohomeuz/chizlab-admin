# Decisions Log (append-only)

## 2026-06-23 — Project foundation decisions (from CLAUDE.md)

**Decision:** NestJS (TypeScript) + PostgreSQL for the backend API.
Alternatives: Express, Fastify, Hono. NestJS chosen for its modular architecture, built-in DI, guard/decorator system (easier role-based auth), and first-class TypeScript support.

**Decision:** Single NestJS service, two route groups: `/api/admin/*` (CRUD, JWT-guarded) and `/api/public/*` (GET-only). Two separate Swagger docs at `/docs/admin` and `/docs/public`.
Alternatives: separate microservices. Single service chosen to reduce operational complexity at this scale.

**Decision:** PIN login (8-digit) + JWT (short-lived access + refresh).
Rationale: admin-only panel, no need for full email/password flow. PIN is fast for single-admin use.

**Decision:** Rate-limit + lockout on failed PIN attempts.
Threshold: **5 failed attempts → 15-minute lockout**. (Set by user 2026-06-23.)

**Decision:** Redis queue (Celery or arq) + Python AI worker consuming jobs. NestJS enqueues on upload; worker processes and POSTs back to internal callback.
Alternatives: direct API call from NestJS, background job in NestJS. Python chosen for Gemini SDK maturity and multimodal AI ecosystem.

**Decision:** Google Gemini as the default AI provider, with a pluggable `AIProvider` adapter. Stub implementations for OpenAI and Anthropic Claude. Provider selected via `AI_PROVIDER` env var.

**Decision:** MinIO (self-hosted, S3-compatible) for media storage. Persistent Docker volume so media survives redeploys.

**Decision:** Polling (TanStack Query `refetchInterval ~5s`) over WebSocket for realtime status updates. Polling active only while at least one visible material is `pending`.

**Decision:** Contract-first development. OpenAPI spec in `packages/contracts/` is the authoritative contract. All agents code against it.

**Decision:** Directory ownership as the parallel-work conflict guarantee. Each agent owns specific directories and never writes outside them.

**Decision:** Soft delete only (`deletedAt`). Never hard-delete materials or categories.

## 2026-06-23 — Public API authentication

**Decision:** `/api/public/*` requires an `X-API-Key` header (static key stored in env).
Alternatives: fully open (no auth), OAuth2. API key chosen for simplicity and to prevent unrestricted scraping. External platform sends the key in every request. Backend validates against `PUBLIC_API_KEY` env var.

## 2026-06-23 — Monorepo tooling

**Decision:** No monorepo tool (Nx/Turborepo) — plain directories with individual package.json files per app. Keeps things simple for a VPS + docker-compose deploy.

## 2026-06-27 — Production hardening decisions

**Decision:** Fix arq `redis_settings` as module-level assignment after the class body, not a class-level `property()`.
Why: arq 0.25.0 reads `WorkerSettings.redis_settings` directly on the class at import time (not via an instance). A Python `property` descriptor accessed on the class returns the property object itself, not the computed value. `WorkerSettings.redis_settings = WorkerSettings.get_redis_settings()` after the class body makes it a plain `RedisSettings` instance.

**Decision:** CORS restricted via `CORS_ORIGINS` env var (comma-separated list). Production value: `https://admin.chizlab.uz`. Empty string = deny all cross-origin requests.
Why: Open `app.enableCors()` allows any origin — a security risk for a JWT-authenticated admin panel. The admin panel origin is fixed and known.

**Decision:** Remove `/internal` from the nginx proxy location regex in `apps/admin/Dockerfile`.
Why: `/internal/ai-result` is the AI worker callback endpoint. It must only be reachable from within the Docker bridge network (ai-worker → api via Docker DNS). Routing it through nginx would expose it to the public internet, bypassing the `InternalSecretGuard`.

**Decision:** GitHub Actions CI with 3 jobs (backend-test, frontend-test, docker-build). Deploy job is commented out and requires manual activation with VPS SSH secrets.
Why: Automated testing on every push prevents regression. Deploy is intentionally manual for the first production setup to avoid accidental overwrites.
