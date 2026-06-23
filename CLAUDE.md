# CLAUDE.md — CHIZLAB Materials (Admin Backend + Panel)

> This file is the single source of truth for the project. Every agent reads it
> first. Do not contradict it. If something here is wrong or missing, raise it
> with the user via the Orchestrator instead of guessing.

---

## 1. What we are building

An **educational-materials storage system** that serves as the **admin panel +
backend for another platform**. The other platform consumes ONLY the public
read (GET) API. Admins manage content through a dedicated admin panel.

Two consumers, two surfaces:

- **Admin panel** (humans) → full CRUD via the `/api/admin/*` API.
- **External platform** (machine) → read-only via the `/api/public/*` API.

---

## 2. Monorepo layout (directory ownership)

```
prohome-materials/
├── apps/
│   ├── api/            # NestJS backend (OWNER: backend agent)
│   └── admin/          # React + Vite admin panel (OWNER: frontend agent)
├── services/
│   └── ai-worker/      # Python AI worker (OWNER: backend agent)
├── packages/
│   └── contracts/      # Shared OpenAPI spec + generated TS types (OWNER: plan agent, consumed by all)
├── infra/              # docker-compose, Dockerfiles, env (OWNER: integration agent)
├── design/             # design tokens, brand study, UI spec (OWNER: design agent)
├── memory/             # progress.md, decisions.md, context.md (OWNER: memory agent)
├── docs/               # PLAN.md and supporting docs (OWNER: plan agent)
└── .claude/agents/     # subagent definitions
```

**Directory ownership is the conflict-avoidance mechanism.** An agent only
writes inside the directories it owns. This is what makes parallel work safe.

---

## 3. Tech stack (decided — do not change without user approval)

**Backend — `apps/api`**

- NestJS (TypeScript), PostgreSQL.
- One service, two route groups:
  - `/api/admin/*` — full CRUD, JWT-protected.
  - `/api/public/*` — GET only, for the external platform.
- **Two separate Swagger docs:** `/docs/admin` and `/docs/public`.
- Auth: JWT (short-lived access + refresh). Single role `admin` for now, but
  model roles as an enum/guard so adding roles later is trivial.
  Login = **8-digit PIN** + **rate-limiting + lockout** on failed attempts.
- Search: **PostgreSQL full-text** (`tsvector` + GIN index). Also enable the
  **`pgvector`** extension and a nullable `embedding` column for future
  semantic search (do not block on it).
- Pagination: **offset/limit**.
- Filtering: by `categoryId`, `tags`, `status` via query params.
- An **internal, authenticated callback endpoint** (e.g. `POST /internal/ai-result`,
  protected by a shared secret, never exposed publicly) for the AI worker to
  write analysis results back.

**AI worker — `services/ai-worker`** (Python)

- Consumes jobs from a **Redis** queue (broker shared with NestJS).
- Provider: **Google Gemini** (multimodal — image, video, PDF, audio).
- **Pluggable provider adapter**: an `AIProvider` interface with a Gemini
  implementation now, and stub implementations for OpenAI and Anthropic Claude
  so switching is just an env var + API token. No provider-specific code leaks
  outside the adapter.
- Flow: NestJS enqueues a job when media is uploaded → worker downloads media
  from MinIO → runs analysis → POSTs the result to the NestJS internal callback.
- On failure: **retry 3× with exponential backoff**, then mark `needs_review`.

**Admin panel — `apps/admin`**

- React + Vite, **TanStack Query**, **React Hook Form + Zod**, React Router,
  Tailwind CSS.
- **Fully responsive** (desktop + mobile).
- **Full chizlab.uz brand.** Brand assets (logo, cursor, naqsh ornaments) will
  be placed by the user in `apps/admin/public/brand/`. The design agent must
  study the live chizlab.uz site to extract exact design tokens (see §6).
- Screens: PIN login, materials table (sort + filter + paginate), create/edit
  forms, category tree management.
- Media flow: user picks a file from their computer → it uploads to the backend
  upload endpoint (which stores it in MinIO and returns a URL) → the returned
  **URL** is what goes into the material payload. The form stores a URL, not a file.
- Realtime status: **polling** — TanStack Query `refetchInterval (~5s)` that runs
  ONLY while there is at least one material in `pending` state, and stops otherwise.

**Storage — MinIO**

- Self-hosted MinIO (S3-compatible), backed by a **persistent Docker volume** on
  the host so media survives redeploys. Backend talks to it via the S3 API only.

**Deploy**

- Docker + VPS. Single `docker-compose` brings up: api, ai-worker, admin (built
  static + served), postgres, redis, minio.

---

## 4. The `Material` data model (canonical)

Flat, independent records (no inter-material relationships).

| Field         | Type                                                     | Notes                                       |
| ------------- | -------------------------------------------------------- | ------------------------------------------- |
| `id`          | uuid                                                     | PK                                          |
| `title`       | text                                                     | AI-fillable                                 |
| `description` | text (**plain text**, not markdown/html)                 | AI-fillable                                 |
| `categoryId`  | uuid → `categories.id`                                   | category is a **tree** (parent/child)       |
| `mediaUrl`    | text                                                     | URL returned by the upload endpoint (MinIO) |
| `tags`        | text[]                                                   | AI-fillable                                 |
| `status`      | enum: `draft` \| `active` \| `pending` \| `needs_review` | lifecycle + AI state                        |
| `isReady`     | boolean                                                  | `false` until AI analysis completes         |
| `embedding`   | vector (pgvector, nullable)                              | future semantic search                      |
| `createdAt`   | timestamptz                                              |                                             |
| `updatedAt`   | timestamptz                                              |                                             |
| `deletedAt`   | timestamptz (nullable)                                   | **soft delete** — never hard-delete         |

`Category`: `id`, `name`, `parentId` (nullable, self-referencing tree), `createdAt`.

**Lifecycle:** a material is created with `status=pending, isReady=false`. The AI
worker analyzes the media, fills the fields it can, and on success sets
`status=active` (or back to `draft`), `isReady=true`. If it cannot, after retries
it sets `status=needs_review` and an admin completes the fields manually.
**All fields are AI-fillable**; design the analysis and schema so AI could fill
every field, but every field must also be editable by a human.

---

## 5. Public vs Admin API rules

- `/api/public/*` exposes **GET only** and **never** returns `draft`,
  `pending`, `needs_review`, or soft-deleted records — only `active` + `isReady`.
- `/api/admin/*` is the full CRUD surface, JWT-protected, sees everything.
- The two Swagger documents must be generated separately and must not leak admin
  schemas into the public doc.

---

## 6. chizlab.uz design system

The design agent must **fetch the live chizlab.uz site and inspect its rendered
CSS / computed styles** to extract exact tokens — colors, typography (font
families, scale), border radii, shadows, spacing, and the "naqsh" ornament
motif usage. The earlier content fetch did NOT expose hex colors or fonts, so
relying on memory is not allowed: pull them from the live site.

Output of the design agent → `design/design-tokens.{css,ts}` + `design/UI-SPEC.md`.
The admin panel is **brand-rich** (logo, custom cursor, naqsh motifs) but must
stay **fast and functional** — do not let decoration harm usability or load time.
Brand binary assets come from the user in `apps/admin/public/brand/`.

---

## 7. Global engineering rules

- TypeScript everywhere on the JS side; strict mode on.
- Validation at every boundary: Zod (frontend), class-validator/DTOs (NestJS),
  pydantic (Python).
- No secrets in code. Everything via `.env`; ship a complete `.env.example`.
- Conventional Commits. Single branch; **commit at the end of each phase.**
- Never hard-delete. Never expose the internal callback publicly.
- The OpenAPI spec in `packages/contracts/` is the contract. Frontend and worker
  code against it; do not invent endpoint shapes.
- All user-facing UI text is in **Uzbek**. All code, comments, agent files,
  commit messages, and docs are in **English**.

---

## 8. Definition of Done (quality gate)

A phase is "done" only when **both**:

1. The **Reviewer/QA agent** has approved it, AND
2. All **tests pass**.

The Orchestrator must not advance a dependent phase until its prerequisites meet
this gate.
