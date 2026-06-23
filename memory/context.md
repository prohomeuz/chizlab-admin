# Context (durable facts)

## What we are building

Educational-materials storage system: admin panel + backend.
- Admins manage content via `/api/admin/*` (full CRUD, JWT-protected).
- External platform reads via `/api/public/*` (GET-only, API-key protected).

## Canonical Data Model (from CLAUDE.md §4)

**Material**: id (uuid), title, description, categoryId, mediaUrl, tags (text[]),
status (draft|active|pending|needs_review), isReady (bool), embedding (vector, nullable),
createdAt, updatedAt, deletedAt (nullable, soft-delete).

**Category**: id (uuid), name, parentId (nullable, self-ref tree), createdAt.

Material lifecycle: created with status=pending, isReady=false → AI worker fills fields →
on success: status=active, isReady=true. On failure after 3 retries: status=needs_review.

## Directory Ownership

| Directory | Owner agent |
|-----------|-------------|
| `docs/` | plan |
| `packages/contracts/` | plan |
| `design/` | design |
| `infra/` | integration |
| `apps/api/` | backend |
| `services/ai-worker/` | backend |
| `apps/admin/` | frontend |
| `memory/` | memory |

## API Surfaces

- `/api/admin/*` — full CRUD, JWT-guarded (access + refresh tokens).
- `/api/public/*` — GET-only, `X-API-Key` header required.
- `/internal/ai-result` — POST, shared secret in `INTERNAL_CALLBACK_SECRET` env var. Never publicly routed.
- `/docs/admin` and `/docs/public` — two separate Swagger UIs.

## Auth Rules

- PIN login: 8-digit PIN → JWT (short-lived access + refresh).
- Lockout: 5 failed PIN attempts → 15 minutes blocked.
- Public API: `X-API-Key` header validated against `PUBLIC_API_KEY` env var.

## Key Env Vars (names, not values)

`DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`,
`MINIO_BUCKET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`,
`ADMIN_PIN` (seed), `PUBLIC_API_KEY`, `INTERNAL_CALLBACK_SECRET`,
`AI_PROVIDER` (gemini|openai|claude), `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.

## Key Files

- `CLAUDE.md` — single source of truth for spec.
- `packages/contracts/openapi.yaml` — authoritative API contract.
- `docs/PLAN.md` — implementation plan and task DAG.
- `design/design-tokens.css` / `design/design-tokens.ts` — brand tokens.
- `design/UI-SPEC.md` — component and screen spec.
- `infra/docker-compose.yml` — full stack compose file.

## How to run

`docker compose up` from repo root (after copying `.env.example` → `.env` and filling values).
