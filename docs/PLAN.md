# PLAN.md — chizlab-admin

> Authoritative project plan. All agents read this. Do not contradict CLAUDE.md.
> Last updated: 2026-06-23 by Plan agent.

---

## 1. Project Scope

chizlab-admin is an educational-materials storage system composed of a NestJS
backend, a Python AI worker, and a React + Vite admin panel. It exposes two
distinct API surfaces — a JWT-protected admin API for full CRUD management and
a read-only public API for the external chizlab.uz platform — with all media
stored in self-hosted MinIO and background analysis processed via a Redis-queued
AI worker powered by Google Gemini.

---

## 2. API Surfaces

### 2.1 Admin API — `/api/admin/*`

- Protected by **JWT Bearer** tokens (short-lived access + refresh).
- Login: 8-digit PIN. Lockout: **5 failed attempts → 15-minute lockout**.
- Full CRUD on materials and categories.
- Media upload endpoint that returns a MinIO URL.
- Two separate Swagger docs: `/docs/admin` (admin) and `/docs/public` (public).

### 2.2 Public API — `/api/public/*`

- Restricted to requests whose `Origin` (or `Referer`, as fallback) hostname is in `PUBLIC_ALLOWED_ORIGINS`.
- **GET only** — no mutations allowed.
- Filter rules (hard-coded, not client-controllable):
  - `status = 'active'`
  - `isReady = true`
  - `deletedAt IS NULL`
- The public Swagger doc must not leak admin schemas.

### 2.3 Internal Callback — `/internal/ai-result`

- POST only. Protected by `X-Internal-Secret` header (`INTERNAL_CALLBACK_SECRET` env var).
- Never publicly routed (internal Docker network only).
- Receives AI analysis results from the Python worker.
- Not included in either public Swagger doc.

---

## 3. Material Lifecycle State Machine

```
                    ┌──────────────────────────────────┐
                    │                                  │
         upload     ▼                                  │ admin edits
  ──────────────► pending ────► AI worker runs ───────►│
  (isReady=false)             │                        │
                              │ success                │ failure (3 retries)
                              ▼                        ▼
                           active               needs_review
                        (isReady=true)           (isReady=false)
                              │                        │
                              │ admin unpublishes       │ admin fixes + publishes
                              ▼                        ▼
                           draft  ◄───────────────────►  (back to active/draft)
```

**State transition rules:**
- New material → `pending`, `isReady=false`.
- AI success → `active`, `isReady=true`, AI fills: `title`, `description`, `tags`, optionally `categoryId`.
- AI failure after 3 retries → `needs_review`, `isReady=false`.
- Admin can move any material to `draft` or `active` manually.
- Soft delete: sets `deletedAt`; record is never hard-deleted.
- Public API only sees: `status=active AND isReady=true AND deletedAt IS NULL`.

---

## 4. Phase / Task DAG

| # | Phase | Task | Agent | Depends on | Deliverable |
|---|-------|------|-------|------------|-------------|
| 0 | **Plan** | Write PLAN.md, openapi.yaml, contracts/index.ts | Plan | — | `docs/PLAN.md`, `packages/contracts/openapi.yaml`, `packages/contracts/index.ts` |
| 1 | **Design** | Fetch chizlab.uz, extract tokens, produce UI spec | Design | 0 | `design/design-tokens.{css,ts}`, `design/UI-SPEC.md` |
| 2 | **Infra** | Docker Compose, Dockerfiles, .env.example, MinIO + Redis config | Integration | 0 | `infra/docker-compose.yml`, `infra/*.Dockerfile`, `infra/.env.example` |
| 3a | **Backend — Auth** | NestJS project scaffold, JWT auth module, PIN login, lockout, refresh | Backend | 0, 2 | `apps/api` auth module passing tests |
| 3b | **Backend — Materials** | Materials entity, CRUD endpoints, FTS, pagination, soft delete | Backend | 3a | `/api/admin/materials` + `/api/public/materials` endpoints |
| 3c | **Backend — Categories** | Categories entity, tree endpoints | Backend | 3a | `/api/admin/categories` + `/api/public/categories` endpoints |
| 3d | **Backend — Upload** | MinIO upload endpoint, multipart handling | Backend | 3a | `POST /api/admin/upload` |
| 3e | **Backend — AI Callback** | Internal callback endpoint, material update on result | Backend | 3b | `POST /internal/ai-result` |
| 3f | **Backend — pgvector** | pgvector extension, nullable embedding column on Material | Backend | 3b | Migration + entity field |
| 4 | **AI Worker** | Python worker: Redis consumer, Gemini adapter, retry logic, POST to callback | Backend | 2, 3e | `services/ai-worker/` passing integration test |
| 5a | **Frontend — Scaffold** | React+Vite+TanStack Query+RHF+Zod+Router+Tailwind setup, brand shell | Frontend | 1, 2 | `apps/admin` builds and serves |
| 5b | **Frontend — Auth** | PIN login screen, JWT storage, refresh interceptor | Frontend | 5a, 3a | Login screen + auth context |
| 5c | **Frontend — Materials** | Materials table, sort/filter/paginate, polling for pending | Frontend | 5b, 3b | Materials list view |
| 5d | **Frontend — Material Form** | Create/edit form with media upload, Zod validation | Frontend | 5c, 3d | Create + edit screens |
| 5e | **Frontend — Categories** | Category tree management screen | Frontend | 5b, 3c | Categories screen |
| 6 | **Review / QA** | End-to-end review: contract conformance, test coverage, security checks | Reviewer | 3a–3f, 4, 5a–5e | QA sign-off in `memory/progress.md` |
| 7 | **Integration** | Wire all services in docker-compose, smoke test full stack | Integration | 6 | Running `docker compose up` passes smoke tests |

**Critical path:** 0 → 2 → 3a → 3b → 3e → 4 → 6 → 7

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PIN-only auth weakness (brute force) | Medium | High | Rate-limit: 5 failed attempts → 15-min lockout (already decided). Consider adding TOTP as a future phase. |
| pgvector unavailable on target Postgres image | Low | Medium | Use `pgvector/pgvector` Docker image. Embedding column is nullable; feature is gated — app boots without it. |
| AI provider lock-in (Gemini) | Low | Medium | `AIProvider` interface with Gemini implementation + OpenAI/Anthropic stubs. Switching = env var change only. |
| Media storage data loss on redeploy | Low | High | MinIO backed by named persistent Docker volume on host. Documented in `infra/`. |
| Public API scraping / abuse | Medium | Medium | `/api/public/*` endpoints restricted to allowed `Origin`/`Referer` hostnames via `PUBLIC_ALLOWED_ORIGINS`. Note: these headers are client-supplied and spoofable by non-browser clients — this is a soft restriction, not a hard auth boundary. |
| AI worker job loss on Redis restart | Low | Medium | Redis AOF persistence enabled in docker-compose. Bull queue retries 3× with exponential backoff. |
| Large media file upload timeouts | Medium | Low | 100 MB limit enforced by NestJS interceptor + Nginx/proxy config. Chunked streaming if needed in v2. |
| Contract drift between frontend and backend | Medium | High | `packages/contracts/openapi.yaml` is single source of truth. Backend generates Swagger from DTOs and CI diffs against contract. |

---

## 6. Open Questions / Deferred Decisions

- **TOTP / 2FA** for admin login — deferred to post-MVP.
- **Semantic search** using `embedding` column — field added, feature gated, deferred.
- **Role-based access control** — single `admin` role for now; enum + guard in place for future expansion.
- **CDN / signed URLs** for MinIO media — evaluate after MVP.
- **Websocket / SSE** for realtime status — deferred; using polling (TanStack Query `refetchInterval=5s` while any `pending` material exists).
