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
