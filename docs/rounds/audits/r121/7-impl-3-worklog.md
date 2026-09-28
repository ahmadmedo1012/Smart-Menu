# 7-impl-3 — r121 worklog (DASHBOARD SHELL + A11Y + SEO)

Task ID: 7-impl-3 (IMPL-3, engineering round r121, MASTER-BACKLOG items #15-#25 + X2-verdict-10 P-4/P-5).
Code-writing task: 13 fix clusters across the (protected) dashboards, order-confirmed, print, robots.ts and the L-batch metadata surfaces.

Verification: `pnpm typecheck` 0 errors · `pnpm test` 145 files / 2101 tests ALL PASS (includes my new
tests/unit/r121-impl3-dashboard-shell.test.ts — 46 tests) · eslint clean on every touched file (0 new
errors/warnings; the one print/page.tsx:210 unused-disable warning is pre-existing legacy). NO build, NO
server, NO git commit (per round rules — build verification flagged to the lead).

## What shipped (fix-by-fix)

1. **B-2/A-2/E-4 — FULL server-gate conversion (not the fallback)**: `owner/layout.tsx` + `admin/layout.tsx`
   are now async SERVER components calling the existing `requireAuth()` (the r113-F114 /login pattern) with
   role-aware redirects preserved verbatim from the old client gates (owner: USER/UNPAID→/subscribe,
   admin-roles→/admin, else /login; admin: non-admin-roles → owner?/owner:/subscribe, else /login). The
   client chrome moved to NEW `owner/OwnerShell.tsx` + `admin/AdminShell.tsx`. Killed: the null-until-/me
   SSR shell on all 23 dashboard routes, the fake-cookie shell exposure, and 2-3 duplicate /me calls per
   cold load — `AdminSidebar` now takes role/permissions as props, and `useAccessGate` (12 admin pages)
   consumes a NEW `AccessGateMeContext` fed by the server (fetch fallback preserved for standalone use,
   fail-closed). The owner shell additionally receives planEnd + pendingPaymentSince (server-resolved).
   super_admin routing + sub_admin permission gating pinned by tests.
2. **K-1/K-2 (+K-6, +LayoutHeader)**: inner `<main aria-live>` → plain content `<div>` in both shells +
   order-confirmed (both branches); aria-live dropped; NewOrdersBar gained the deliberate sr-only
   `role="status"` announce-on-growth region (`newOrdersArrivalPhrase` exported, r92 plural discipline);
   LayoutHeader's static duplicate h1 → span.
3. **K-3**: `id="main-content"` moved from the group `<main>` (whose first tabbable children were the nav)
   to the real first content element in each (protected) sub-layout: owner/admin shells (past sidebar+
   header), order-confirmed content root (past Header), and id-wrappers in login/subscribe/cart layouts
   (same-as-today behavior for the latter two — their Header-first pages are IMPL-2/IMPL-5 surfaces).
4. **K-4**: GalleryCarousel lightbox — trap built from live `querySelectorAll('button:not([disabled])')`
   (dots included), opener capture + focus return on close, body-focus re-entry guard, and RTL arrow
   navigation (LEFT = next, OrderDialog convention).
5. **K-5**: AreaChart gained `ariaLabel` (fallback keeps «مخطط مساحي»); admin dashboard passes data-bearing
   labels («اتجاه الإيرادات آخر 30 يومًا: من X إلى Y د.ل» / «حجم الطلبات… N طلب»).
6. **J-3**: `hidden sm:inline` on the w-14 status word + `hidden md:block` on the grip (≈92px back to the
   name at ≤390px). Pure class changes.
7. **J-2 (my half)**: order-confirmed ×2 + owner order-detail back arrows → MotionArrowRight/
   MotionChevronRight (+ aria-label on the icon-only detail button).
8. **H-1 (my half)**: dropped forced `decimals: 1` at all 10 owner/admin display sites (owner/orders/[id] ×3,
   OrdersTable, OwnerOrdersList, OwnerKpiGrid, CategoriesList ×2, admin/orders/[id] ×3); admin AOV KPI
   keeps deliberate decimals:2; receipts untouched (decimals:2 pinned).
9. **L-1**: (protected)/layout robots → `{ index: false, follow: true }` (safe default; 4 page-level
   overrides keep winning).
10. **L-2**: print generateMetadata + `robots: { index: false, follow: false }` + self-canonical
    `/menu/[slug]`; robots.ts print disallow line REMOVED (crawlable noindex). L-6's /cart + /order-confirmed
    disallows intentionally left (separate batch).
11. **L-3/L-4/L-5**: servesCuisine deleted from Restaurant JSON-LD; 5 double-brand titles stripped
    (pricing/login/subscribe/cart/menu-index) + dead login/layout title deleted + pricing og:title suffix
    unified to «| الربط الذكي» (terms/privacy pattern); (public) layout's redundant default robots field
    dropped (default index,follow identical; 404s now single-robots).
12. **P-4**: UserBannerNotifier gained the `subscription_approved` branch (extracted testable
    SubscriptionEventBanner — success card role=status + «تحديث لوحة التحكم» reload action; rejected branch
    byte-compatible); owner/page.tsx dead-end replaced with an honest pre-activation card (pending → date +
    resubmission-block explanation + honest notification promise; no pending → «إكمال الدفع» CTA to
    /subscribe); the false 24h SLA at order-confirmed replaced with «سريعاً خلال أوقات الدوام». Verified the
    pending-resubmission 400 already surfaces its Arabic reason via PaymentDialog's getErrorMessage catch —
    no change needed there.
13. **P-5**: planEnd resolved SERVER-side in owner/layout via the EXISTING `getUserSubscriptionState()`
    (zero API change — better than extending /api/auth/me, which is out of my file scope anyway) → expiry
    banner in OwnerShell when ≤7 days («اشتراكك ينتهي خلال N يوم») + expired variant («انتهى اشتراكك» with
    the honest live-menu grace copy) + renewal CTA; owner/menu/page.tsx:131 catch now surfaces the server's
    403/plan-cap Arabic reason via getErrorMessage (aligned to use-item-save on the same page).

## Files (mine only — the tree also carries IMPL-1a/IMPL-2's parallel work)

New: owner/OwnerShell.tsx, admin/AdminShell.tsx, tests/unit/r121-impl3-dashboard-shell.test.ts (46 tests).
Edited: owner/layout.tsx (rewritten), admin/layout.tsx (rewritten), (protected)/layout.tsx, login/subscribe/
cart layouts, order-confirmed/page.tsx, owner/page.tsx, owner/menu/page.tsx, owner/menu/CategoriesList.tsx,
owner/orders/[id]/page.tsx, owner/orders/OrdersTable.tsx, owner/OwnerOrdersList.tsx, owner/OwnerKpiGrid.tsx,
admin/page.tsx, admin/orders/[id]/page.tsx, useAccessGate.ts, AdminSidebar.tsx, LayoutHeader.tsx,
UserBannerNotifier.tsx, NewOrdersBar.tsx, GalleryCarousel.tsx, AreaChart.tsx, (public)/layout.tsx,
pricing/layout.tsx, menu/page.tsx, menu/[slug]/page.tsx, menu/[slug]/print/page.tsx, robots.ts,
e2e comment refreshes (team5-admin, round4-deep — behavior-compatible, tests still poll-wait).

## Deviations / judgment calls (flagged)

- **P-5 renewal CTA → /subscribe, not /pricing** (task said /pricing; auditors P + X2 both specify
  /subscribe, which is the actual owner upgrade/renewal flow — /pricing is marketing and only links onward).
- **P-4 approved banner action = «تحديث لوحة التحكم» (reload), not a /owner link** (X2's letter) — the
  notifier only renders inside the owner tree, so a link to the current tree is a no-op; a reload actually
  completes activation (activeId caches client-side).
- K-3 fully fixed for dashboards + order-confirmed + login; subscribe/cart keep today's behavior (their
  page-level Header renders before content — those pages belong to IMPL-2/IMPL-5; their layouts now provide
  a valid skip target so nothing regressed).
- X3's optional L-6 robots.ts trim (cart/order-confirmed disallows) intentionally NOT done (out of my 11).

## Needs lead follow-up

- **`pnpm build`** (I own no build rights): async server layouts with cookies()/prisma — routes were already
  ƒ Dynamic via the group layout's connection(), so no reclassification expected, but confirm + watch the
  nonce/CSP flow per X3 conflict #8 (group layout owns the nonce; sub-layouts untouched).
- e2e suite not runnable here (no server) — team5-admin/round4-deep admin-guard tests should pass FASTER
  now (server redirect lands with the document); comments updated.
- Build-time double-check that `(protected)` routes all carry a `#main-content` target (the id moved from
  the group main to per-sub-layout roots — all 6 sub-layout families covered, asserted by unit test).
