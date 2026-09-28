# r121 — Full-Repository Transformation Round (Engineering Swarm)

**Session start:** 2026-09-28 · **HEAD at round start:** `74ef578f` (r120 final) · **Lead agent:** Super Z (this session)

## Round context (every auditor must know this before auditing)

**Product:** «المنيو الذكي | Smart Menu» — RTL-first Arabic SaaS (Libya market, د.ل currency):
restaurant digital menus via QR + order receiving through WhatsApp + Telegram payment approval +
subscriptions/plans + loyalty + referrals. Public customer menu, owner dashboard, admin panel, marketing landing.

**Stack:** Next.js 16.3.4 (App Router, Turbopack, standalone for local/e2e) · React 19.2.8 ·
Prisma 7.8 + PostgreSQL (Neon in prod, embedded PG 16 local :5434) · Tailwind 4 · shadcn/ui-style
components (base-nova) · Zustand (cart) · zod 4 · pnpm 11.9.0 workspace.

**This repo has survived 20 engineering rounds (r100–r120).** The honest ledger is
`docs/ENGINEERING_STATE.md` — READ IT FIRST. Known deferred items live there and in the r120
entry's "Deferred" paragraph. Re-reporting a known item as a new discovery is a defect of the audit,
not a finding. Where cheap, VERIFY ledger items still hold at HEAD and mark them LEDGER-VERIFIED / LEDGER-STALE.

**Baseline at round start (all green, verified this session):** tsc 0 · eslint 0 errors (11 legacy
warnings) · unit 2006/2006 (141 files) · production build OK · local PG with all migrations applied.

**Environment for auditors:** node_modules installed; local PG running on :5434 (db `smartmenu`);
`.env.local` present (local dummies). Read-only commands allowed (grep/rg via tools, file reads,
`pnpm knip`, `pnpm audit --prod`). Do NOT build, do NOT start servers, do NOT modify code, do NOT
git commit/push. The ONLY file you create is your own findings file in this directory.

**PROTECTED TERRITORY:** `mobile/` (Expo app) — out of scope this session. Do not audit in depth,
do not propose changes. Web/backend/database/infra only. (Cross-cutting shared-root issues may be
NOTED, flagged "mobile-adjacent", never edited.)

**Finding format (use exactly):**

```markdown
### {ID}-{n} [{P0|P1|P2|P3}] {short title}
- Type: FACT (code-proven) | SUGGESTION (judgment call)
- Evidence: path/to/file.ts:LN-LN — what the code actually does
- Impact: user-facing / technical
- Fix (minimal, root-cause): ...
- Risk: of fixing / of not fixing
- Tests required: ...
```

P0 = security hole / data loss / broken core flow. P1 = high (major UX or correctness defect,
likely hits real users). P2 = important. P3 = refinement/polish. **No fabrication:** cite only
lines you actually read; mark anything uncertain UNVERIFIED. Ponytail governs proposed fixes:
smallest diff that fixes the root cause; never delete validation/security/error-handling/a11y.

**Ledger items already known (do NOT re-report; verify only if in your domain):**
- r120 deferred: /subscribe SSR shell (LCP 4.47s) · menu warm-nav freeze (ISR all-at-once, needs
  useLinkStatus/toploader) · orb-float viewport-gating + offscreen shimmer (menu TBT 621-688ms) ·
  gallery touch/swipe · StickyMenuHeader SSR mount (2.6s header-less under throttle) · mobile icons
  off-brand + fake Cairo bold TTFs · alpha-muted text sweep · Arabic display line-heights (showcase
  clip) · title-template unification («…| Smart Menu | المنيو الذكي» triple) · owner stats
  empty-state polish · offline.html branding
- Ledger: text-[10px] micro-typography ×92 · reviews pageSize=100 no pagination · /api/upload
  chunked bypass (Vercel-capped) · dep pins (TS 7, eslint 10, motion 13, knip 6, expo 54, zod 4.6)
  · mobile advisories image-size/uuid (no patch) · web checkout idempotencyKey global-namespace
  decision · Neon password rotation (USER ACTION, git-history leak) · GitHub Actions billing-blocked
  · duplicate restaurant + QA orders purge (USER ACTION)

## Auditor roster (r121)

| ID | Role | Status |
|---|---|---|
| A | Architecture | done |
| B | Next.js/Web platform | done |
| C | Backend/API | done |
| D | Database/Data integrity | done |
| E | Auth/Security red-team | done |
| F | Dependencies/Packages | done |
| G | Performance | done |
| H | UI/UX journeys + states | done |
| I | Design system (Impeccable lens) | done |
| J | Responsive/RTL | done |
| K | Accessibility | done |
| L | SEO/Metadata | done |
| M | Testing/QA | done |
| N | Deployment/Vercel/CI | done |
| O | Code quality + Ponytail over-engineering | done |
| P | Customer journey/Product | done |
| Q | Visual regression (browser) | done |
| R | Repository hygiene/organization | done |
| X1 | Cross-check: P1 verdicts | done |
| X2 | Cross-check: money/security | done |
| X3 | Cross-check: UX/infra + dedupe | done |

Fleet totals: ~55 raw P1/P2 findings → 30 verified deduped items in MASTER-BACKLOG.md.
P1s (all browser/code-verified): C-1 cross-tenant review destroy · E-1 cross-tenant item move ·
G-1 127KB-gz orphan chunk ×28 routes · J-1 float z-band tap-hijack on money CTAs · P-1 yearly
pricing fiction · P-2 landing fabricated features · M-1 e2e suite red (7 stale pins) · M-3 login 500.
