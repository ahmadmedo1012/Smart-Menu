# Swarm Cleanup & Architecture Blueprint

**Project:** Smart Menu — Multi-tenant Restaurant SaaS  
**Date:** 2026-07-06  
**Methodology:** 4-phase multi-agent swarm → single-source-of-truth documentation

---

## Background

7 root `.md` documentation files (PROJECT_CONTEXT.md, DESIGN.md, MASTER_FORENSIC_AUDIT_REPORT.md, etc.) are
uncoordinated, overlapping, and partially stale. 30 debug PNG screenshots, 20MB orphan obsidian vault,
tracked `.env*` files, and tracked build traces pollute the repository.

Goal: clean the working tree to production-only source, then synthesize a single authoritative
`PROJECT_ARCHITECTURE.md`.

---

## Phase 1: Ingestion (parallel × 2)

### Agent 1 — Doc Forensics

Read every `.md` in `docs/` and project root. Extract structured data:

- Business rules: subscribe flow (pre-flight validation, USER/UNPAID creation), Telegram approval chain,
  SSE event types and broadcast paths, JWT auth model, RBAC role hierarchy
- Prisma schema: models, relations, enums, indexes
- Environment variables: every `process.env.X` usage with source file
- API routes: every route handler, method, auth guard

### Agent 2 — Code Mapper

Trace `src/` structure exhaustively:

- Route handlers ↔ page components mapping
- Shared components usage graph (`src/components/shared/`, `src/components/ui/`)
- Library utilities inventory (`src/lib/`)
- Hook definitions and consumers (`src/hooks/`)
- Store files and subscribers (`src/store/`)
- Generated code boundaries (`src/generated/prisma/`)

**Output:** Structured JSON — business rules, route map, component tree, env catalog, dead-file candidates.

---

## Phase 2: Survey (parallel × 3)

### Agent 3 — Route Reconciliation

Compare Agent 2's route map against documentation claims from:

- PROJECT_CONTEXT.md
- smart-menu-fix-roadmap.md
- MASTER_FORENSIC_AUDIT_REPORT.md

Flag: documented-but-nonexistent routes, undocumented routes, incorrect descriptions.

### Agent 4 — Env Forensics

Cross-reference all `process.env.X` in source against `.env.example` and committed `.env*` files.

Report: unused environment variables, missing-from-example vars, over-documented vars,
secrets leaked in VCS.

### Agent 5 — Dead Import Scan

Static analysis of import chains across `src/`:

- Components imported but never used
- Lib utilities with zero consumers
- Orphaned type exports
- Dead code reported in MASTER_FORENSIC_AUDIT_REPORT that's still present

---

## Phase 3: Erasure

### Agent 6 — Cleanup Sweep

Ordered deletion (all reversible via `git restore` before committing):

1. `git rm --cached` all `.env*` except `.env.example`; add `/.env*` to `.gitignore`
2. `git rm src/app/.next/trace` + `src/app/.next/trace-build`
3. `rm -rf smart-menu/` + `git rm -rf just_facebook_mcp/`
4. `git rm` all root `*.png` screenshots (30+ files)
5. `git rm` stale root `.md` files:
   - `PROJECT_CONTEXT.md`
   - `DESIGN.md`
   - `MASTER_FORENSIC_AUDIT_REPORT.md`
   - `REGISTRATION_REFACTOR_REPORT.md`
   - `smart-menu-fix-roadmap.md`
6. Delete dead code files identified in Phase 2 (after user sign-off on manifest)

**Guard:** Agent outputs a deletion manifest BEFORE executing. User approves the list.

---

## Phase 4: Synthesis → PROJECT_ARCHITECTURE.md

### Agent 7 — Blueprint Author

Write single `PROJECT_ARCHITECTURE.md` at project root. Sections:

1. **Ecosystem Overview** — Multi-tenant restaurant SaaS, Arabic-first RTL, WhatsApp ordering
2. **Technical Stack** — Next.js 16.2.9 / Prisma 7.8 / PostgreSQL / Tailwind CSS 4 / shadcn/ui base-nova
3. **Directory Architecture** — Annotated tree of `src/` with route structure, component hierarchy, lib organization
4. **Database Schema** — All Prisma models visualized with key relations, enums, indexes
5. **Core Workflows** —
   - Onboarding: shift-left validation → USER/UNPAID → dialog gate → verification → PAID
   - Telegram ChatOps + SSE: transaction log → webhook → EventEmitter → SSE broadcast → client
   - Orders: menu selection → cart → WhatsApp redirect → Telegram notification → status update
6. **Auth Model** — JWT httpOnly cookies, role hierarchy (USER/owner/super_admin/admin), RBAC guards
7. **API Reference** — Key endpoints, auth requirements, error format
8. **Deployment & Infra** — Vercel Fluid Compute, Neon PostgreSQL, environment variables
9. **Conventions & Roadmap** — File naming, linting, future extension guidelines

---

## Phase 5: Verification

```bash
npm run build    # Must pass 0 errors
npm run lint     # Must pass 0 errors
```

If either fails, loop back to fix before commit.

---

## Success Criteria

- [ ] All `.env*` files removed from git tracking (except `.env.example`)
- [ ] All 30 debug PNGs deleted
- [ ] `smart-menu/` + `just_facebook_mcp/` removed
- [ ] `src/app/.next/` build traces removed from tracking
- [ ] Stale root `.md` files replaced by `PROJECT_ARCHITECTURE.md`
- [ ] Dead code files purged
- [ ] `PROJECT_ARCHITECTURE.md` matches actual codebase (verified by compilation)
- [ ] `npm run build` passes 0 errors
- [ ] `npm run lint` passes 0 errors

---

## Rollback

Every deletion is a `git rm` before commit. If anything breaks, `git checkout -- .` restores all files.
The deletion manifest from Agent 6 provides exact file lists for any partial restore.
