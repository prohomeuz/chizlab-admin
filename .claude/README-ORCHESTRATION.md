# CHIZLAB Materials — Claude Code orchestration bundle

This bundle drives Claude Code to build the whole project with specialized
subagents. Drop these files at your repo root.

## Files

- `CLAUDE.md` — single source of truth: what we build, stack, data model, rules,
  the quality gate. Every agent reads this first.
- `.claude/agents/` — the subagents:
  - `orchestrator.md` — conducts the pipeline, the only one that talks to you.
  - `plan.md` — `docs/PLAN.md` + the OpenAPI contract (the interface everyone
    codes against).
  - `design.md` — extracts chizlab.uz tokens → `design/`.
  - `backend.md` — owns `apps/api` (NestJS) + `services/ai-worker` (Python).
  - `frontend.md` — owns `apps/admin` (React + Vite).
  - `integration.md` — owns `infra/`, wires everything end-to-end.
  - `test.md` — tests across all three codebases.
  - `reviewer.md` — quality gate (approve + tests must pass).
  - `memory.md` — `memory/progress.md` + `decisions.md` + `context.md`.
- `KICKOFF-PROMPT.md` — paste its body into Claude Code to start.

## Why this is safe to parallelize

A short sequential **foundation** phase freezes the **OpenAPI contract** and the
**design tokens**. After that, build tracks run in parallel because each agent
**owns disjoint directories** (`apps/api` + `services/ai-worker` vs `apps/admin`)
— they can't edit the same files, so there are no merge conflicts. Integration,
test, and review run sequentially at the end.

## How to run

1. Copy `CLAUDE.md`, `.claude/`, and the docs to your empty repo root.
2. Put your brand assets in `apps/admin/public/brand/` (logo, cursor, naqsh).
3. Start Claude Code in the repo root.
4. Paste the body of `KICKOFF-PROMPT.md`.
5. Answer the Orchestrator only at the decision points it raises.

## Decisions already locked (so agents don't re-ask)

NestJS + PostgreSQL; one service with `/api/admin` (CRUD) + `/api/public` (GET) +
two Swagger docs; JWT + 8-digit PIN + rate-limit/lockout; PG full-text + pgvector;
offset/limit pagination; soft delete; flat materials; category tree; MinIO +
persistent volume; React + Vite + TanStack Query + RHF/Zod + Tailwind; full
chizlab brand, fully responsive; Gemini multimodal with a pluggable
OpenAI/Claude-ready adapter; async via Redis queue + Python worker + internal
callback; `pending → ready/needs_review` lifecycle with `isReady`; polling for
status; monorepo; native subagents + orchestrator; contract-first then
directory-ownership parallelism; commit per phase; quality gate = Reviewer + tests.
