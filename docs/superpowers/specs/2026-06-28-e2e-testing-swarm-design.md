# E2E Multi-Agent Testing Swarm — Design Spec

**Date:** 2026-06-28
**Project:** Smart Menu (Next.js 16, React 19, Prisma/PostgreSQL, Tailwind CSS 4)

## Overview

Multi-agent audit & repair orchestration for the Smart Menu codebase. Six specialized perspectives audited in parallel against source code (26 pages, 37 API routes, 58 components, 10 DB models). Findings consolidated into a ranked fix matrix. Fixes applied concurrently. Verified via build.

## Architecture

```
Phase 1: Codebase Audit
  ├── 🎨 Visual Guard      → globals.css + all pages (theme, RTL, contrast)
  ├── 🏃 Motion Inspector  → motion.ts + all Framer Motion usage
  ├── 📐 Layout Auditor    → all page TSX (DOM structure, nesting, CSS props)
  ├── 💥 Chaos Engineer    → error/loading/not-found coverage across every route
  ├── 🔒 Security Sentinel → auth.ts, csrf.ts, rate-limit.ts, all API routes
  └── ⚡ UX Fluidity Lead  → cart flow, WhatsApp, SSE, PWA, OrderDialog, PaymentDialog

Phase 2: Friction Log Aggregation → Ranked Fix Matrix (critical→cosmetic)

Phase 3: Fix Execution → Parallel mutations across affected files

Phase 4: Build Verification → `npm run lint && npm run build` = zero errors/warnings
```

## Agent Roles

### 🎨 Visual Guard
- **Scope:** All 26 page layouts, globals.css, dark/light theme tokens, RTL direction, color contrast, typography scale
- **Method:** Read globals.css for token completeness, each page.tsx for theme class application, component-level color usage
- **Success criteria:** Every page renders with correct theme tokens, no hardcoded colors, RTL layout correct at all breakpoints

### 🏃 Motion Inspector
- **Scope:** All Framer Motion components (~40+), motion.ts config, spring physics, layout animations, page transitions
- **Method:** Audit every `motion.*` / `animate` usage for spring physics (not tween), hardware acceleration, reduced-motion respect
- **Success criteria:** All animations use spring physics, no visual flickering, `prefers-reduced-motion` respected

### 📐 Layout Auditor
- **Scope:** Every page TSX (26 files), layout.tsx nesting, CSS logical properties (start/end), container isolation
- **Method:** Structural review of DOM hierarchy, CSS prop usage, overflow handling, responsive breakpoints
- **Success criteria:** No layout bleeding, text clipping, overlapping elements; correct start/end properties

### 💥 Chaos Engineer
- **Scope:** error.tsx, loading.tsx, not-found.tsx coverage across all 26 routes; empty states in dynamic pages
- **Method:** Audit every route has error/loading boundary, verify empty-state handling in List/dynamic components
- **Success criteria:** Every route has error + loading boundary; all dynamic pages handle empty/null/error states

### 🔒 Security Sentinel
- **Scope:** middleware.ts (or lack thereof), auth.ts, csrf.ts, rate-limit.ts, every API route.ts (37 files)
- **Method:** Auth guard placement, CSRF token validation, rate-limit application, Prisma query injection, JWT handling
- **Success criteria:** All admin/owner API routes protected; CSRF on mutation endpoints; rate limits on auth

### ⚡ UX Fluidity Lead
- **Scope:** Cart flow (cart/page.tsx, OrderDialog, PaymentDialog), WhatsApp deep links, SSE orders, PWA manifest, scroll behavior
- **Method:** Audit flow states (loading→empty→order→confirmed), PWA manifest completeness, scroll-to-top/scroll restoration
- **Success criteria:** Zero CLS, complete PWA manifest, working WhatsApp deep link flow, SSE reconnection

## Handoff Protocol

| From | To | Trigger | Payload |
|------|----|---------|---------|
| All 6 agents | Aggregator | Agent completes | Friction log (issues + file:line + severity) |
| Aggregator | Fix Executor | Matrix complete | Ranked fix list with file paths + code changes |
| Fix Executor | Builder | All mutations applied | Diff summary |
| Builder | Human | Build result | Pass/fail + any remaining warnings |

## Execution

```bash
# Workflow orchestrates 6 parallel agents → aggregate → fix → build
npx playwright test  # If browser verification needed
npm run lint         # Static analysis
npm run build        # Production build check
```

## Success Criteria

1. All 6 agents complete audit with comprehensive friction log
2. Ranked fix matrix with severity (critical→cosmetic)
3. All high-severity issues resolved
4. `npm run lint` passes with zero errors
5. `npm run build` succeeds with zero errors, zero warnings

## Rollback Plan

- All changes tracked via git; `git diff` reviewed before commit
- If build fails, `git checkout -- .` reverts all mutations
- Each fix dimension commits separately for isolated revert
