# E2E Multi-Agent Testing Swarm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit Smart Menu from 6 perspectives, aggregate friction logs, execute repairs, verify clean build.

**Architecture:** Workflow-orchestrated parallel codebase audit → friction log consolidation → parallel fix application → build verification. All 6 perspectives run concurrently against source code (no browser needed for initial pass).

**Tech Stack:** Next.js 16.2.9, React 19, Tailwind CSS 4, Framer Motion 12, Prisma 7.8, PostgreSQL, Zod 4, shadcn/ui base-nova

## Global Constraints

- RTL-first with `dir="rtl"` and `lang="ar"`
- Dark/light theme via next-themes + CSS custom properties in globals.css
- Brand color: orange #f66d0f primary
- Background: dark #111013, light #fafafa
- All animations use Framer Motion spring physics
- No hardcoded colors — use CSS vars
- Files under 500 lines
- Validate input at system boundaries

---

### Task 1: Swarm Execution — Workflow

**Method:** Deploy workflow with 6 parallel agents → aggregate → fix → build.

- [ ] **Step 1: All 6 agents audit concurrently via Workflow tool**
  - Visual Guard: read globals.css + all pages for theme/color/RTL audit
  - Motion Inspector: audit all Framer Motion usage for spring physics
  - Layout Auditor: audit all pages for DOM/layout correctness
  - Chaos Engineer: audit error/loading/not-found coverage + empty states
  - Security Sentinel: audit auth guards, CSRF, rate limit, API routes
  - UX Fluidity Lead: audit cart flow, WhatsApp, SSE, PWA, scroll

- [ ] **Step 2: Aggregate findings into ranked fix matrix**

- [ ] **Step 3: Apply fixes to source files**

- [ ] **Step 4: Build verification — `npm run lint && npm run build`**

- [ ] **Step 5: Commit all validated changes**

### Task 2: Playwright Browser Verification (if needed)

- [ ] Only if code audit reveals visual issues needing real browser confirmation
