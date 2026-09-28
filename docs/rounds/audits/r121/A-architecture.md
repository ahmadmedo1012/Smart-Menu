# r121 — Auditor A: Architecture Coherence (web/backend; mobile/ PROTECTED)

**Scope:** `src/**` layering, boundaries, duplication, giant files, cycles, global state, error/data-access consistency, dead compatibility layers, tsconfig/import hygiene. Read-only; every claim below cites lines actually read (syntax-sensitive quotes verified against raw bytes after a tooling display artifact was caught and neutralized — see Method note).

**Method:** full import-graph cycle detection (DFS over all 482 hand-written TS/TSX files under `src/`, excluding `src/generated/**`); grep-matrix for boundary violations (components→app, lib→components, store→*, child→parent); line-count sweep of all source files; read-through of every >400-line file's structure plus targeted reads of lib/session, lib/auth, lib/db, lib/api-helpers, lib/rate-limit, lib/telegram-broadcast, proxy.ts, both subscription payment routes, both restaurant-DELETE routes, both public-menu query surfaces; `pnpm knip` (advisory, allowed) + `tsc --noEmit` (0 errors, re-verified at HEAD) + `npx eslint src` (0 errors, 1 warning).

**Tooling note (for other auditors):** in this session, some Bash outputs (`grep`/`sed`/`cat`) dropped `[x` sequences (e.g. `const [hasMore` displayed as `const asMore`) — an apparent syntax error in `owner/orders/page.tsx:43` was disproven by `od -c` (bytes are correct; tsc passes). Any syntax-level claim from Bash output should be re-verified via `od`/Read before filing.

---

## 1. Actual layering (as built)

```
src/proxy.ts            edge: cookie-PRESENCE check + CSRF origin + CSP/nonce + security headers (documented: real validation deferred to requireAuth)
src/app/(public)/       marketing + public menu (RSC, ISR 60s) + themed 404 catch-all
src/app/(protected)/    owner/ admin/ cart/ subscribe/ order-confirmed/ login/ — layouts + colocated page components
src/app/api/**          65 route.ts files — thin-ish handlers: auth guard → zod → prisma (via shared lib where extracted)
src/components/         feature-grouped (menu/ owner/ admin/ loyalty/ payment/ subscribe/ landing/ layout/ orders/ shared/) + ui/ (shadcn base-nova)
src/hooks/              5 client hooks (useAccessGate, useConfig, useHighContrast, usePaymentStatusPoll, usePollWhenVisible)
src/lib/                60 modules: db/session/auth (data+auth core), api-helpers/rate-limit (API kit), domain (order-modifiers, referral-conversion,
                        subscription-decisions, receipt, stats-queries…), telegram-* family, ui-adjacent (premium-toast.tsx — see A-9)
src/store/              cart.ts (zustand, persist+migrate) — imports lib/constants only
src/generated/prisma/   Prisma 7.8 client output (excluded from analysis; 50k lines generated)
```

**Verdict: the layering is coherent and consistently directional.** Dependencies flow app→components→lib, app→lib, store→lib, hooks→lib. Zero components→app imports, zero lib→app, zero child→parent component imports, zero prisma imports in components (all DB access lives in app/ routes + lib). Business logic is disproportionately but defensibly located in route handlers (see A-1/A-4/A-10 for the three places it congealed into copy-paste). The single direction violation in the whole tree is A-9 (lib/premium-toast.tsx → components/ui).

## 2. Circular dependencies

**None.** Full-graph DFS over every hand-written file found **0 cycles** (lib↔lib, store↔components, components↔components all clean). The `src/generated` exclusion is safe: nothing under `src/` (outside generated) imports generated except via the stable `@/generated/prisma/*` facade (13 files, types/enums/client only).

---

## Findings

### A-1 [P2] 85-line Telegram payment-notification block copy-pasted verbatim across the two payment routes
- Type: FACT (code-proven)
- Evidence: `src/app/api/subscriptions/route.ts:126-214` vs `src/app/api/subscriptions/upgrade/route.ts:170-259` — identical block: collect approver chatIds (`getAdminTelegramIds()` + `telegramBroadcastTarget.findMany` + `TELEGRAM_CHAT_ID`/`TELEGRAM_GROUP_IDS` env fallbacks, 19 lines verbatim) → chunked `Promise.allSettled` keyboard sends (10/batch, 60ms pause — both carry the same round89-C2 comment) → `telegramMessages` metadata merge-update with best-effort `.catch` logging → `keyboardErr` catch. Only ~6 lines differ: message text, two button labels (`موافقة على التفعيل` vs `موافقة على الترقية`), log prefixes. A THIRD variant of target-gathering already exists as `gatherTargets()` in `src/lib/telegram-broadcast.ts:50-72`.
- Impact: technical — this is the money-approval path: a change to approver discovery, chunk pacing, or the `telegramMessages` storage contract (consumed by webhook cleanup + `lib/telegram-payment-sync.ts`) must be applied in 2–3 places; r116's telegram-payment-sync work and r118's transport hardening already had to fan out. Divergence here = approvals that admins never see.
- Fix (minimal, root-cause): one lib helper (e.g. `lib/telegram-notify.ts`): `broadcastPaymentKeyboard(payment, { msg, approveLabel, rejectLabel })` returning the stored `telegramMessages` — both routes call it inside their existing `try { … } catch (keyboardErr)` shells. The `subscriptions/validate` + webhook paths keep their own flows.
- Risk: low — behavior is pinned by `tests/unit/subscriptions-family.test.ts` + `subscriptions-upgrade.test.ts` (both exist). Of not fixing: next payment flow (renewal?) gets a 4th copy.
- Tests required: existing subscriptions-family/upgrade suites must stay green unchanged.

### A-2 [P3] Every protected hard page-load fires 2–3 `/api/auth/me` session validations; no shared auth context
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/admin/layout.tsx:85` (layout gate), `src/components/layout/AdminSidebar.tsx:63` (sidebar gate), `src/hooks/useAccessGate.ts:30` (page gate — 12 admin pages). All three fetch `/api/auth/me` independently on mount; `/api/auth/me` → `validateSession()` → a DB round-trip each (session+user join, session.ts:168-181). Owner side: `owner/layout.tsx:98` + `useActiveRestaurant.ts:59` fallback. Layouts render `null` until their fetch resolves (`if (!authLoaded) return null`), so cold entry to /owner|/admin is a blank frame gated on the slowest of the parallel /me probes.
- Impact: technical + mild UX — 3× Neon latency per admin cold load; the gate pattern is also inconsistent with the established server-side `requireAuth()` redirect that r113-F114 shipped for `/login` («/me calls 0, CLS 0» — the same fix was never applied to the two dashboard layouts). NOT a security finding: all data APIs validate server-side (E's audit confirms); E-security.md already filed the related "cookie-presence-only page gating" P3 — this finding covers the distinct duplication/efficiency angle and shares its fix locus.
- Fix (minimal): layouts fetch once and provide the `{role, permissions}` via React context; `AdminSidebar` + `useAccessGate` consume the context when present (fallback fetch only when used outside the provider). Server-component `requireAuth()` redirect on the two layouts (E's fix) also collapses the probes to zero client fetches.
- Risk: low; keep fail-closed semantics of useAccessGate for standalone use.
- Tests required: e2e protected-route redirect negatives (exist) + useAccessGate unit pins.

### A-3 [P3] `lib/order-status.ts` "single source of truth" is ignored by the entire admin orders surface (3 parallel status maps)
- Type: FACT (code-proven)
- Evidence: `src/lib/order-status.ts:1-6` declares itself «Single source of truth for order presentation across owner + admin pages»; owner honors it (`owner/orders/page.tsx:13`, `owner/orders/OrdersTable.tsx:10-11`). Admin does not: `src/app/(protected)/admin/orders/page.tsx:26-33` defines a local `STATUS_CONFIG` (hand-picked `text-orange`/`bg-orange-muted` classes vs the lib's semantic `bg-warning/15 text-warning` tokens) plus its own `TABS`; `src/components/orders/useOrderDetail.ts:39` exports a SECOND `STATUS_CONFIG` consumed by `admin/orders/[id]/page.tsx:22`. The lib even models `next` (lifecycle) which admin re-derives as `STATUS_FLOW`.
- Impact: technical + minor visual — the same order status renders with different badge styling on owner vs admin; adding/renaming a status = 3 edits; the SSOT comment misleads maintainers.
- Fix: admin pages import `ORDER_STATUS_META`/`getOrderStatusMeta` (+ derive flow from `.next`); delete both local maps (or keep admin's icon-only extras as props). 
- Risk: low — visual parity change on admin badges (token classes are the design-system-correct ones).
- Tests required: existing order-status/detail unit tests.

### A-4 [P3] Public-menu query duplicated between the web RSC page and the mobile API route (+ one stale Stage-H comment)
- Type: FACT (code-proven)
- Evidence: `src/app/(public)/menu/[slug]/page.tsx:139-171` vs `src/app/api/public/menu/[slug]/route.ts:70-113` — both hand-write the same hierarchical select: categories `isActive:true` + items `status:'available', category:{isActive:true, restaurantId}` + `modifierGroups.options {isAvailable:true}` + `sortOrder` ordering; the API route's r102-M4 comment itself says «Same visibility discipline as the web serializer». This discipline already bit r118-A3-P2, which had to land the inactive-category fix on "3 surfaces" (orders POST is the third, `api/orders/route.ts:225`). Additionally the web select's Stage-H rationale («the deployed database may not have them yet… schema sync is manual») is STALE: the API route selects `isFeatured` directly and `fetchShowcaseFlags` (page.tsx:104-125) raw-selects it — round90-F4 already documented the migration window as closed; what survives is only the transient-error tolerance, which the comment no longer states.
- Impact: technical — every menu-visibility rule change (e.g. a future per-plan hiding rule) is a multi-surface manual patch; the stale comment invites wrong conclusions about prod schema.
- Fix (minimal): extract query CONSTRUCTION into `lib/menu-queries.ts` (`fetchPublicMenuRows(restaurantId)`); each surface keeps its own serialization (RSC props vs JSON coercion) and its cache wrapper (ISR vs `unstable_cache` tag). While touching the web select, correct the Stage-H comment to the surviving rationale (degrade-to-no-showcase on transient DB error).
- Risk: low; projections must stay byte-compatible per surface — keep each surface's `select` list as a parameter or keep two selects over one shared `where`.
- Tests required: `tests/unit/menu-queries.test.ts` (locked projection contract) + public-menu route tests.

### A-5 [P3] `admin/KpiCard.tsx` compatibility shim's justification is stale (2 consumers, not 8)
- Type: FACT (code-proven)
- Evidence: `src/components/admin/KpiCard.tsx` (6 lines) re-exports `shared/KpiCard` «keeps every existing admin/owner import paths working without touching 8 consumer files» (round79 Stage D). Repo-wide grep today: exactly 2 importers remain — `owner/OwnerCharts.tsx:15`, `admin/page.tsx:10`.
- Impact: technical (trivial) — an obsolete compatibility layer that outlived its migration window; new imports keep accruing to the shim path.
- Fix: repoint the 2 imports to `@/components/shared/KpiCard`, delete the shim.
- Risk: none (type-only move; tsc catches stragglers).
- Tests required: none.

### A-6 [P3] `globalThis.__requestId` request-correlation is a shared mutable global (cross-request contamination under concurrency)
- Type: FACT (code-proven)
- Evidence: `src/proxy.ts:17-18` sets `globalThis.__requestId` per request; `src/lib/logger.ts:19-21` reads it for every log line. round86-D6's stated goal («one id per request ties all its log lines together») holds only while requests are serialized. On any process serving concurrent requests (standalone/self-hosted Docker; Vercel Node functions can serve concurrent invocations per instance), request B's proxy run overwrites the id between request A's handler log calls — A's lines then carry B's id.
- Impact: technical — misleading production logs exactly when they matter (incident triage); no user-facing effect.
- Fix (minimal, root-cause): `AsyncLocalStorage`-backed id in logger (set once in proxy/instrumentation), or document the concurrency caveat in the r86-D6 comment if ALS is deemed not worth it on the proxy→handler boundary.
- Risk: low; keep the header-derived id as seed.
- Tests required: none (logging-only).

### A-7 [P3] Dead `plans` state + wasted `/api/plans` fetch in owner settings
- Type: FACT (code-proven)
- Evidence: `src/app/(protected)/owner/settings/page.tsx:48` `const [, setPlans] = useState<Plan[]>([]);` — the value slot is discarded at destructuring (unreadable by construction); `:72` the effect fetches `/api/plans` in `Promise.all` with settings; `:94` `setPlans(plansData.data ?? [])` is the data's only destination. The plans payload is fetched on every settings load and thrown away.
- Impact: technical — one dead network round-trip per settings visit + confusing state. Likely a leftover from a removed plan-selector UI.
- Fix: delete the plans fetch + state (2 hunks); or, if a plan display was intended, render it.
- Risk: none.
- Tests required: none (owner settings page has no data-contract pin on /plans here).

### A-8 [P3] Giant-file triage: 2 of 18 files >400 lines lack any decomposition; the rest are justified (see §3 table)
- Type: SUGGESTION (judgment call)
- Evidence: `src/app/(protected)/owner/loyalty/page.tsx` (638) keeps 5 components inline (`AnimatedCount`, `StatCard`, `ConversionRate`, `RedeemPanel` ≈130 lines, page) while ALREADY half-using `components/loyalty/` (dynamic `LoyaltySettings` import at :27) — the extraction target exists and is half-adopted. `src/app/(protected)/owner/settings/page.tsx` (545) is a single component with zero internal structure (compare cart/page.tsx: 487 lines orchestrating 13 extracted siblings + 2 hooks after r89-wave5). Everything else >400 lines carries either round-tagged invariant rationale per block (orders route, subscription-decisions), is already post-decomposition orchestration (cart, MenuPageClient, subscribe wizard), or is a cohesive interactive flow that is additionally code-split (OrderDialog, PaymentDialog — both already decomposed once in r87-C3).
- Impact: technical — maintenance cost concentrated in two files; both are owner-facing screens with active round history.
- Fix (ponytail — opportunistic, not urgent): extract `RedeemPanel` + `StatCard` to `components/loyalty/` next time loyalty is touched; extract settings form sections (upload handlers, form card) next time settings is touched. Do NOT restructure the justified giants.
- Risk: low; pure moves.
- Tests required: existing loyalty/settings page tests (unit + dashboard render sweeps).

### A-9 [P3] `lib/premium-toast.tsx` is a client UI component living in lib/ — the only lib→components edge in the tree
- Type: SUGGESTION (judgment call)
- Evidence: `src/lib/premium-toast.tsx:1-8` — `'use client'`, JSX, imports `@/components/ui/x-icon`, `@/components/ui/shopping-cart-icon`, `@/components/ui/types`. Grep proves it is the sole lib→components import in the codebase; every other lib module is UI-free (server-safe). round86-B1 documents its content history but not its location.
- Impact: technical (consistency) — the lib/ boundary reads as "non-UI, server-safe"; this file breaks the rule for ~40 importers' convenience.
- Fix: OPTIONAL — move to `components/shared/premium-toast.tsx` with mechanical import rewrite, or leave with a one-line comment declaring it the sanctioned exception. Ponytail leans: comment now, move only when imports are next churned.
- Risk: import churn across ~40 files for zero behavior change.
- Tests required: none.

### A-10 [P3] Restaurant-DELETE business rules duplicated across owner and admin routes, with drifted 409 copy
- Type: FACT (code-proven)
- Evidence: `src/app/api/owner/restaurants/[id]/route.ts:118-168` vs `src/app/api/restaurants/[id]/route.ts:262-330` — both implement the same three documented invariants: orders-are-financial-records guard (r118-A7-P3), explicit review `deleteMany` inside the tx (r93-N1), and `P2003`+`Order_restaurantId_fkey` field-name check → friendly 409 (r119-S7). The owner path throws a local `OrdersPresentError` class; the admin path inlines the same return. For the SAME condition the two routes send DIFFERENT Arabic copy: owner «لا يمكن حذف مطعم لديه طلبات مسجلة — تواصل مع الدعم للاحتفاظ بسجل الطلبات» vs admin «… — يُحتفظ بسجل الطلبات لأغراض المحاسبة».
- Impact: user-facing (minor) — same error, two messages; technical — the deletion guard family (each block individually justified by its round tag) lives in 2 places that must co-evolve.
- Fix (minimal): extract `assertNoOrdersOrThrow(restaurantId, role)` + shared 409 message into lib (routes keep their genuinely different parts: owner's link deletion / subscription guard; admin's blob cleanup + revalidatePath).
- Risk: low; both paths already share tests semantics (r118 delete-guard tests).
- Tests required: existing delete-guard unit tests (4, r118) must pass for both routes.

---

## 3. Giant files — every hand-written source file >400 lines (18)

`src/generated/**` excluded (50k lines of Prisma output, not source).

| File | Lines | Verdict |
|---|---|---|
| owner/loyalty/page.tsx | 638 | **Split candidate** — 5 inline components; extraction dir exists (A-8) |
| components/shared/PaymentDialog.tsx | 630 | Justified — payment flow; already decomposed once (r87-C3: 768→598) with extracted hooks/subcomponents |
| components/menu/OrderDialog.tsx | 626 | Justified — cohesive customer dialog; dynamically imported (ssr:false) so bundle-isolated |
| subscribe/SubscribeForm.tsx | 619 | Acceptable — one wizard state machine; sections are props-driven |
| owner/settings/page.tsx | 545 | **Split candidate** — zero internal decomposition + A-7 dead code |
| components/menu/MenuPageClient.tsx | 518 | Justified — orchestrator; dialog/sheet already dynamic-imported |
| owner/page.tsx | 515 | Acceptable — dashboard composition over KpiCard/charts |
| admin/page.tsx | 495 | Acceptable — same |
| api/orders/route.ts | 487 | **Justified** — money path; every block carries a round-tagged invariant (TOCTOU locks, idempotency, P2002 contracts); uses 4 shared lib helpers; splitting would separate invariants from their guards |
| cart/page.tsx | 487 | Justified — orchestrates 13 extracted siblings + hooks (r89-wave5 survivor, growth = features) |
| lib/subscription-decisions.ts | 474 | Justified — single approval state machine (r116/r117 hardened, 409/alreadyStatus contracts) |
| subscribe/page.tsx | 460 | Acceptable — wizard shell |
| admin/admins/page.tsx | 446 | Acceptable — table+dialog page |
| admin/subscriptions/page.tsx | 436 | Acceptable |
| components/pricing/PricingClient.tsx | 422 | Acceptable |
| components/menu/ReviewSheet.tsx | 415 | Acceptable |
| owner/OwnerCharts.tsx | 406 | Acceptable |
| admin/orders/page.tsx | 405 | Acceptable, but carries A-3's duplicated status map |

## 4. SOLID — clean bill (evidence-backed)

1. **Zero circular dependencies** — DFS over the complete hand-written import graph (482 files): 0 cycles. Store↔components, lib↔lib, components↔components all acyclic.
2. **Layer discipline is near-perfect** — 0 components→app imports; 0 lib→app; 0 prisma in components; store imports only `lib/constants`; no child→parent component imports. Single exception documented as A-9.
3. **Error handling is genuinely consistent** — 57/65 API routes funnel through `handleError` (lib/api-helpers.ts:99-133: zod→422, P2002→409, P2003→400, P2025→404, conn/timeout→503, Arabic fallbacks). The 8 non-users are protocol-justified: webhook (Telegram toast/edit protocol), cron/* (best-effort cleanup loops), health (special envelope), seed (dev-gated), auth login/logout (custom contract flows), admin/events/trigger (event echo). Every `String(e)` hit is log-only, never a response body.
4. **Rate limiting is unified** — one DB-backed factory (`createDbRateLimiter`, fail-closed default + documented r119 `failOpen` for the secret-gated webhook) used across ~28 route files with per-route documented budgets; probabilistic sweep tuning documented in-file.
5. **Auth layering is sound at the API layer** — proxy (edge, cookie-presence only, documented) → `requireAuth/requirePermission/requireAdmin` (lib/auth.ts, with the r91-F-B 401/403 split) → per-route guards. `lib/session.ts` is exemplary: one-query session+user join (r85-B6), sliding TTL + 7-day absolute cap + 5-session cap inside one transaction with the r94-3a off-by-one fix, mobile Bearer parity + r119-B6 dual-surface revocation.
6. **Dedup culture with receipts** — the big dedups cite their dead copies: `stats-queries.ts` (round79: 3 parallel stats routes), `parsePagination` (round87-C10: was ×10 routes), `useAccessGate` (round87-C1: was ×11 hand-rolled gates incl. one that denied everyone), `chime.ts` (round86-C3: was ×3 byte-identical beeps), KpiCard merge (round79). A-1/A-3/A-4/A-10 are the remaining stragglers, not a pattern.
7. **Import hygiene** — single `@/*` alias (tsconfig.json:27-31); exactly ONE relative import that leaves a file's directory (`components/menu/MenuClientSection.tsx:18` → sibling `../loyalty/LoyaltyWidget`, benign reuse); tsconfig excludes correctly fence mobile/docs/scripts/tests-e2e from the web program.
8. **Web↔mobile lib twins are disciplined** — `arabic-plural.ts` and `receipt.ts`: 0-line diffs; `constants.ts`: comment-only diff. The twin pattern is a documented parity decision, and it is being maintained.
9. **knip policy is deliberate** — knip.config.ts documents every entry point and the v5.46.4 pin (v6 crashes); CI runs it advisory-only (round92-D9). The ~60 unused exports it reports are known accepted drift — triaged fully by Auditor F (F-2) — including shadcn-conventional ui/ exports; not re-reported here.
10. **Hidden globals are all documented and justified** — `db.ts` prisma singleton (standard), `chime.ts` shared AudioContext (r118-A5-F3, fixes the 6-context Chromium cap), `logger.__requestId` (A-6, the one with an unstated caveat).

## 5. Ledger checks (in-domain)

- **knip v6 pin** — LEDGER-VERIFIED (knip.config.ts:10-12 documents the v6 RangeError; `pnpm knip` runs clean on 5.46.4).
- **Web checkout idempotencyKey global-namespace decision** — LEDGER-VERIFIED as a documented decision: `api/orders/route.ts:351-354` namespaces as `ORD-<key>`; web /cart sends `W…` keys (r109-N1), mobile random 14-char. No new squat surface observed.
- **`/api/upload` chunked bypass, reviews pageSize=100, dep pins** — other auditors' domains (C/D/F); untouched here.
- **Baseline claim "eslint 0 errors (11 legacy warnings)"** — src/ itself has 1 warning (unused eslint-disable directive); the other 10 live outside src/ — flagging for Auditor R/O only, no action proposed.
- **E-security.md P3 "cookie-presence-only page gating"** — cross-referenced, not re-reported; A-2 covers the distinct /me-triplication angle and shares the fix locus.

## 6. Summary counts

**10 findings: 0×P0 · 0×P1 · 1×P2 (A-1) · 9×P3.** No fabricated padding: every finding cites code read this session; two proposed non-actions (A-9 comment-first, A-8 opportunistic) are explicitly marked SUGGESTION. The architecture is in notably better shape than 20-round-old codebases usually are — the honest headline is *one real duplication debt cluster on the payment/notification path (A-1), one consistency debt cluster on status/deletion rules (A-3/A-10), one query-duplication on the public menu (A-4), and hygiene items* — against a clean bill on cycles, layering, error handling, rate limiting, auth core, and import hygiene.
