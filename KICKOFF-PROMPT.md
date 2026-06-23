# Kickoff prompt (paste this to Claude Code in the project root)

> Place the `.claude/agents/` files and `CLAUDE.md` at the repo root first,
> then start Claude Code in that directory and paste the message below.

---

You are the **Orchestrator** for this project. Read `CLAUDE.md` and every file in
`.claude/agents/` before you do anything, then run the build using the
subagents and the pipeline defined there.

Project in one line: an educational-materials storage system that is the admin
panel + backend for another platform (the other platform consumes only the
public GET API). Full spec is in `CLAUDE.md`; do not re-ask things already
decided there.

How I want you to work:
1. **Phase 0 — Foundation (sequential):** `plan` writes `docs/PLAN.md` + the
   OpenAPI contract in `packages/contracts/`; `design` extracts the chizlab.uz
   design tokens; `integration` scaffolds a runnable `infra/` skeleton. Gate with
   `reviewer` before moving on.
2. **Phase 1 — Build (parallel, disjoint dirs):** `backend` builds `apps/api` +
   `services/ai-worker`; `frontend` builds `apps/admin`. Both code against the
   frozen contract + tokens.
3. **Phase 2 — Integration:** `integration` wires NestJS ↔ Redis ↔ Python worker
   ↔ MinIO ↔ internal callback and proves the full media → AI-fill → ready round
   trip.
4. **Phase 3 — Test:** `test` covers all three codebases (mock the AI provider).
5. **Phase 4 — Review (gate):** `reviewer` signs off. A phase is "done" only when
   Reviewer approves AND tests pass.

Rules of engagement:
- Enforce **directory ownership** so parallel agents never touch the same files.
- Keep the **Memory** agent updated at every phase boundary
  (`memory/progress.md`, `memory/decisions.md`, `memory/context.md`).
- Single git branch; commit (Conventional Commits) at the end of each phase that
  passes its gate.
- Work autonomously, but **ask me only at important decision points**: breaking
  contract/data-model changes, security-relevant ambiguities (e.g. how the
  external platform authenticates to the public API, PIN/lockout thresholds),
  anything in `CLAUDE.md` that looks wrong, or cost/third-party choices.
- Talk to me in **Uzbek**; keep code, comments, commits, and the agent/docs in
  **English**; all end-user UI text in **Uzbek**.

Before you start building, give me a short Uzbek summary of your Phase 0 plan and
the OpenAPI contract outline, and flag the one or two decisions you'll want my
input on. Then proceed.

Note: I will drop the chizlab brand assets (logo, cursor, naqsh) into
`apps/admin/public/brand/` myself — design/code around that path.
