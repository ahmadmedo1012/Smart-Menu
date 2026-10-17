# P19 Route Matrix — Smart Menu (الربط الذكي | Smart Menu)

> **Task:** P19-B2 (Phase 19, Pod B) · **Method:** code-reading only — no browser, no dev
> server. Every verdict below cites `file:line` from the working tree at commit
> `82bffbdc` (main). Where a behavior could not be verified by code/tests
> reading, the row says so explicitly.
>
> **Repo shape:** the Next.js app lives at the repo ROOT (`src/app` — this
> matrix). The repo also carries a React-Native/Expo client in `mobile/`
> (own navigation stacks: `mobile/src/navigation/{Public,Auth,Owner,Admin}Stack.tsx`)
> — out of scope for this web matrix; one claims finding from it is in Appendix B.

## Counts (web app)

| Kind | Count | Source |
|---|---|---|
| Public page routes | 8 | `src/app/(public)/**` (incl. `[...notfound]` catch-all) |
| Protected app-shell pages | 4 | login, subscribe, cart, order-confirmed |
| Owner pages | 10 | `src/app/(protected)/owner/**` |
| Admin pages | 13 | `src/app/(protected)/admin/**` |
| **Total page routes** | **35** | `find src/app -name page.tsx \| wc -l` = 35 |
| API handler files | 66 (+1) | `find src/app/api -name route.ts \| wc -l` = 66; plus `src/app/demo/route.ts` (non-prod demo seeder) — 99 exported handlers per `docs/API.md:5` |
| Metadata routes | 2 | `src/app/robots.ts`, `src/app/sitemap.ts` (+ `public/manifest.json`, `public/sw.js`) |
| Route boundaries | error/loading per page + root `error.tsx` / `global-error.tsx` / `not-found.tsx` | `find src/app -name 'error.tsx' -o -name 'loading.tsx'` |

---

## 1. Public group — `src/app/(public)/` (RTL marketing + customer surfaces)

| Route | File | Purpose | Key interactive controls | Verdict (code/test evidence) |
|---|---|---|---|---|
| `/` | `(public)/page.tsx` | «المائدة» editorial landing: hero, vocabulary marquee, live-stats trust line, demo-menu board, journey, ambience, owner chapter, finale, FAQ, footer. ISR 60s (`page.tsx:13`); SSR-bakes live platform stats (`page.tsx:22-31` → `countPublicStats`); emits SoftwareApplication + FAQPage JSON-LD (`page.tsx:46-79`) | Sticky header w/ burger + anchor nav (`LandingHeader.tsx:143,179`); theme toggle; hero CTAs (`HeroTable.tsx:52-53`); marquee loop; WAI-ARIA tabs in the demo-menu board (parity pin `tests/design/parity.test.ts:1492`); `<details>` FAQ (`LandingFaq.tsx`); stats retry affordance (`HomePage.tsx:252-259`) | **PASS** — landing fixtures pinned (`tests/unit/r92-landing-fixtures.test.ts`), hero LCP SSR contract pinned (`tests/unit/r92-hero-ssr.test.ts`), craft pins (`tests/design/parity.test.ts:1417-1483`). Claims audit: Appendix A |
| `/menu` | `(public)/menu/page.tsx` | Menu index → `redirect()` to the demo menu (`al-waha-cafe-demo`) else first active restaurant (`menu/page.tsx:24-47`); no-restaurant fallback renders warm empty state (`menu/page.tsx:51-67`) | None (server redirect; one CTA button in fallback) | **PASS** — redirect + fallback logic is pure server code, read in full; covered by route-family tests (`r118-public-menu-route.test.ts`) |
| `/menu/[slug]` | `(public)/menu/[slug]/page.tsx` | THE product surface: full customer menu (hero w/ logo+open-hours, categories, items, featured showcase, order dialogs, cart, loyalty, referral capture). `notFound()` for unknown slugs | Category **drawer** over the scene (P16-4b, `CategoryTabs.tsx:4`); item cards → **OrderDialog** (zoom+scrim, modifiers, quantity, notes — dynamic-loaded on first open, `MenuPageClient.tsx:26-33`); **ReviewSheet** post-order; **CartSlideOver** + cross-restaurant CartSwitchDialog (`MenuPageClient.tsx:14`); live search toolbar (`MenuToolbar`); **LoyaltyWidget** client-mounted (`MenuClientSection.tsx:125-133`); high-contrast toggle; ReferralHandler | **PASS** — serializer contract pinned (`tests/unit/r118-public-menu-route.test.ts`), sold-out cross-wire + never-leads pin (`tests/unit/menu-showcase-fallback.test.ts:187,273`), ISR config (`r92-menu-isr-config.test.ts`), JSON-LD (`r138-jsonld-contract.test.ts`), grid density (`r145-menu-grid-density.test.ts`), modifier invariant (`r109-modifier-required-invariant.test.ts`) |
| `/menu/[slug]/print` | `(public)/menu/[slug]/print/page.tsx` | Print-only paper menu: QR (unit-level cache), prices, dietary tags, structured opening-hours line; own `noindex` + self-canonical (robots comment `src/app/robots.ts:7-12`) | `PrintButton` (client island) | **PASS** — code-read; robots/print interplay pinned by `r92-sitemap-filter.test.ts` + `robots.ts:7-12`; not browser-printed this session (code-read only) |
| `/pricing` | `(public)/pricing/page.tsx` | Plan ladder (5 cards, `xl:grid-cols-5` — P15 orphan fix `PricingClient.tsx:276,340`) + ecosystem/FAQ blocks. ISR 300s (`page.tsx:8`) | Plan select CTA; FAQ accordion; free-plan CTAs | **PASS** — SSR plans via `getActivePlans` (`page.tsx:10-13`); prices/feature lists pinned by `tests/unit/plan-comparison.test.ts`, `payment-plan-constants.test.ts`, `r93-restaurant-plan-caps.test.ts`, `r92-plan-texts.test.ts` |
| `/privacy` | `(public)/privacy/page.tsx` | Legal: data collected / used / shared. ISR 3600s (`page.tsx:12`) | ScrollReveal only | **PASS** — static content, code-read; distinct description + canonical pinned by r93/W2-b changes (`page.tsx:13-16`) |
| `/terms` | `(public)/terms/page.tsx` | Legal: account/content responsibility, payments, refunds. ISR 3600s | ScrollReveal only | **PASS** — same pattern as privacy |
| `/*` (catch-all) | `(public)/[...notfound]/page.tsx` | Unmatched URLs → `notFound()` INSIDE the public group so the 404 renders themed (3-layer scheme, file header `[...notfound]/page.tsx:1-15`) | Theme toggle on the 404 shell | **PASS** — 404 layers pinned by r111-F12 structure (file:line above); not live-triggered this session (code-read) |

## 2. Protected app shell — `src/app/(protected)/`

The group layout is the shared app shell (theme boot, toaster, PWA, cart
hydrator — `(protected)/layout.tsx:1-27`); auth is enforced per-subgroup, not
here. `login` lives in this group unauthenticated by design.

| Route | File | Purpose | Key interactive controls | Verdict |
|---|---|---|---|---|
| `/login` | `(protected)/login/page.tsx` | Server-resolved session (r113-F114): authed users redirected pre-stream, anonymous get the form first-paint | LoginForm (username/password, lockout messaging, JSON-body submit) | **PASS** — `tests/unit/login-lockout.test.ts`, `login-backstop.test.ts`, `login-timing-equalization.test.ts`, `r121-m3-login-json-body.test.ts` |
| `/subscribe` | `(protected)/subscribe/page.tsx` | Owner signup wizard: plan → menu (name/slug/cuisine) → payment (receipt upload) | 3-step wizard state (`SubscribeClient.tsx:72`), first-invalid focuser (P15 fix), receipt upload, plan cards | **PASS** — SSR shell pinned (`r121-subscribe-ssr.test.ts`), caps/limits (`r93-restaurant-plan-caps.test.ts`, `payment-schema-caps.test.ts`), pending-payment scope (`r93-pending-payment-scope.test.ts`) |
| `/cart` | `(protected)/cart/page.tsx` | Cart review + order submit (WhatsApp handoff w/ server submit path) | qty steppers, idempotency-keyed submit (`cart/page.tsx:106-110`), WhatsApp share | **PASS** — `r92-cart-aria-plural.test.ts`, `cart-submit-error.test.ts`, `r110-cart-switch-guard.test.ts`, `r121-cart-ux.test.ts` |
| `/order-confirmed` | `(protected)/order-confirmed/page.tsx` | Post-order confirmation + loyalty share/referral | ShareAfterOrder, ReferralCard, WhatsApp CTA | **PASS** — hydration coverage (`r93-coverage-loyalty-hydration.test.ts`), referral claim flow (`r92-referrals-claim.test.ts`, `tests/e2e/referral-claim.spec.ts`) |

## 3. Owner area — `src/app/(protected)/owner/` (guard: `owner/layout.tsx:39-47`)

`requireAuth()` → no session → `/login`; `USER`/`UNPAID` → `/subscribe`;
admin roles → `/admin`. Tenant scoping via `useActiveRestaurant`.

| Route | Purpose | Key interactive controls | Verdict |
|---|---|---|---|
| `/owner` (`page.tsx`) | Owner dashboard: KPI cards, revenue chart, popular items, recent orders, quick links (QR/orders) | Area/HorizontalBar charts, copy-link, poll-to-refresh | **PASS** — `chart-stats.test.ts`, `stats-queries.test.ts`, e2e `team3-owner.spec.ts` |
| `/owner/loyalty` (`page.tsx`) | Loyalty console: card lookup by phone, tiers, **redemption** (confirm → `POST /api/loyalty/redeem`, `page.tsx:229`), stats (`/api/loyalty/stats`, `page.tsx:342`), per-restaurant settings (LoyaltySettings ×2 `page.tsx:423,503`) | lookup form, redeem confirm, ReferralCard copy | **PASS** — `loyalty-stats.test.ts`, `loyalty-referral.test.ts`, `loyalty-subscription.test.ts`, e2e `loyalty-redeem.spec.ts` |
| `/owner/menu` (`page.tsx`) | Item/category manager for the active restaurant: item dialog w/ modifier groups, dietary tags, image upload, featured; sold-out switch | ItemDialog family (`src/components/owner/item-dialog/**`), ConfirmDialog, SearchInput, move up/down, PlanUsageBadge | **PASS** — `item-modifier-drafts.test.ts`, `r121-e1-item-move.test.ts`, `items-contract.test.ts`, `items-featured.test.ts`, `menu-modifiers.test.ts` |
| `/owner/menus` (`page.tsx`) | Legacy guessed path → `redirect('/owner/restaurants')` (`menus/page.tsx:1-5`) | none | **PASS** — pure redirect, code-read |
| `/owner/orders` (`page.tsx`) | Live order board w/ status filters + polling | LivePollIndicator, NewOrdersBar, status chips | **PASS** — `orders-list.test.ts`, `polling-probes.test.ts`, `polling-rate-limits.test.ts` |
| `/owner/orders/[id]` (`page.tsx`) | Order detail + status transitions (completing accrues loyalty points, `api/orders/[id]/route.ts:123-138`) | status buttons, WhatsApp resend, copy, map pin | **PASS** — `order-lifecycle.test.ts`, `order-status.test.ts`, e2e `round5-lifecycle.spec.ts` |
| `/owner/qr` (`page.tsx`) | Branded QR per restaurant: logo/colors, download/print | color inputs, download PNG, print | **PASS** — code-read; QR generation path shared with public print page (`menu/[slug]/print/page.tsx`); no dedicated unit test found (e2e `persona-3-owner.spec.ts` covers the surface) |
| `/owner/restaurants` (`page.tsx`) | Multi-menu manager: create/edit restaurants, plan caps, delete w/ guard | create dialog, delete confirm, star/logo upload | **PASS** — `owner-restaurants-gate.test.ts`, `r92-owner-restaurant-id.test.ts`, `r93-coverage-owner-restaurants.test.ts`, `r118-restaurant-delete-guard.test.ts`, `restaurant-delete-guard` lib |
| `/owner/reviews` (`page.tsx`) | Reviews inbox: read/delete moderation | delete Dialog confirm | **PASS** — `r92-owner-reviews.test.ts`, `reviews-atomic-pii.test.ts` |
| `/owner/settings` (`page.tsx`) | Restaurant profile: name/description/phone/WhatsApp, logo upload, weekly hours editor, delivery fee | forms, WeeklyHoursEditor, image upload | **PASS** — `opening-hours.test.ts`, `settings-tenant.test.ts`, `r121-impl1b-restaurant-fields.test.ts` |

## 4. Admin area — `src/app/(protected)/admin/` (guard: `admin/layout.tsx:30-33`)

No session → `/login`; owners → `/subscribe`; sub_admin permission-filtered
per-page (`useAccessGate`).

| Route | Purpose | Key interactive controls | Verdict |
|---|---|---|---|
| `/admin` (`page.tsx`) | Platform KPIs: revenue, orders, users, charts | KpiCard, AreaChart, HorizontalBar, refresh | **PASS** — `stats-permission.test.ts`, `admin-subscriptions-status.test.ts`, `chart-stats.test.ts` |
| `/admin/admins` (`page.tsx`) | Admin/sub_admin accounts + permissions | create/edit dialogs, delete (trash) | **PASS** — `r92-admin-admins-id.test.ts`, `r93-coverage-admin-admins.test.ts`, `create-owner.test.ts` |
| `/admin/audit-logs` (`page.tsx`) | Audit trail browser | pagination, filters, refresh | **PASS** — `audit-events.test.ts`, `rbac-matrix.test.ts` |
| `/admin/menu` (`page.tsx`) | Cross-restaurant item inspector (picker + item dialog, availability switch) | restaurant Switcher, Dialog, Switch, SearchInput, poll-when-visible | **PASS** — `admin-routes.test.ts`, `r93-items-get-ratelimit.test.ts` |
| `/admin/orders` (`page.tsx`) | All-restaurant orders table | filters, status chips, pagination | **PASS** — `orders-list.test.ts`, `r93-pending-payment-scope.test.ts` |
| `/admin/orders/[id]` (`page.tsx`) | Order detail w/ full status control + delete confirm | status buttons, ConfirmDialog | **PASS** — `order-lifecycle.test.ts` |
| `/admin/qr` (`page.tsx`) | Platform QR generator (any restaurant) | inputs + download | **PASS** — code-read (same QR lib path as owner/qr) |
| `/admin/restaurants` (`page.tsx`) | Tenant management: list, feature flags, delete w/ guard | dialogs, delete confirm | **PASS** — `r93-restaurant-delete-review.test.ts`, `r118-restaurant-delete-guard.test.ts` |
| `/admin/settings` (`page.tsx`) | System config editor (feature toggles) | ConfigEditor | **PASS** — `round94-config-read-gate.test.ts`, `config-bot-token.test.ts` |
| `/admin/subscriptions` (`page.tsx`) | Subscription approvals (bank receipts, upgrade/reject) | approve/reject, receipts viewer | **PASS** — `subscriptions-family.test.ts`, `subscriptions-bank.test.ts`, `payment-rejection.test.ts`, `subscription-decisions.test.ts` |
| `/admin/system-events` (`page.tsx` + `client.tsx`) | System event feed | filters, pagination | **PASS** — `system-events-writes.test.ts` |
| `/admin/telegram` (`page.tsx`) | Telegram approvers/webhook config + broadcast | link/verify flow, approvers CRUD, test send | **PASS** — `telegram-verify-anti-replay.test.ts`, `broadcast-targets.test.ts`, `r118-config-masking-and-caps.test.ts` |
| `/admin/users` (`page.tsx`) | User directory + role/password admin | edit dialog, reset password | **PASS** — `users-patch-staff-guard.test.ts`, `reset-password-guard.test.ts`, `rbac-matrix.test.ts` |

## 5. API — `src/app/api/**` (66 route files, 99 handlers)

Full per-route inventory (methods, auth class, rate limits) is hand-maintained
in `docs/API.md:1-30` and machine-checked by `scripts/check-api-auth.mjs`
(CI-enforced: every handler gated). Domain groups:

| Domain | Routes | Notes (code-verified anchors) |
|---|---|---|
| auth | 4 | login sets httpOnly cookie + mobile Bearer (`docs/API.md` auth table); `login-lockout.test.ts`, `login-timing-equalization.test.ts` |
| orders | 3 | POST is PUBLIC w/ re-pricing + idempotency + 150/min restaurant ceiling (`orders-create.test.ts`, `orders-atomic-cap.test.ts`, `orders-items-throttle.test.ts`); PUT completes → loyalty accrual (`api/orders/[id]/route.ts:123-138`) |
| public | 9 | `/api/public/stats` = the landing's count source (ISR 60, `api/public/stats/route.ts:5,14`); `/api/public/menu/[slug]` single-round-trip for RN (`r118-public-menu-route.test.ts`) |
| loyalty/referrals | 4 | card create/lookup (`api/loyalty/route.ts:44,109`), redeem (`api/loyalty/redeem/route.ts:37-125`), referral, claim — all rate-limited + PII-stripped |
| owner & menu | 18 | items/categories/restaurants/reviews/settings — tenant-scoped, CSRF'd (`csrf.test.ts`, `resource-ownership.test.ts`) |
| admin | 12 | stats/config/users/subscriptions/telegram — permission-gated (`rbac-matrix.test.ts`, `tests/security/rbac-negative.test.ts`) |
| subscriptions | 4 | upgrade/validate/status (`subscriptions-upgrade.test.ts`, `subscription-decisions.test.ts`) |
| telegram | 6 | webhook (secret-gated `r92-telegram-webhook-gate.test.ts`), broadcast, config |
| cron | 2 | cleanup + subscription-expiry, CRON_SECRET (`cron-cleanup.test.ts`, `cron-subscription-expiry.test.ts`) |
| misc | 4 | health, upload, whatsapp/generate, seed (`r119-b6-auth-health-contracts.test.ts`, `upload-route.test.ts`, `round94-whatsapp-generate-ratelimit.test.ts`) |

Whole-surface sweeps: `tests/e2e/api-sweep.test.ts` (401/405/400/422/200 on
ALL routes), `tests/e2e/round80-security.spec.ts`, `round86-security.spec.ts`.
Plus `/demo` (GET, `src/app/demo/route.ts:12-17`): self-healing demo seeder —
**hard-blocked 404 in production** (`NODE_ENV==='production'` guard).

## 6. Metadata + boundaries

- `src/app/robots.ts` — allow all, print-path handling (r121-L-2 comment at `robots.ts:7-12`).
- `src/app/sitemap.ts` — active-restaurant sitemap, degrades on DB failure (`sitemap.ts:7-18`); junk-slug exclusion pinned by `r92-sitemap-filter.test.ts`.
- `public/manifest.json` + `public/sw.js` — PWA; SW install prompt pinned by `install-prompt.test.ts`, `blob-guard.test.ts`.
- Route boundaries: per-page `error.tsx`/`loading.tsx` (admin/owner/public trees) + root `error.tsx`, `global-error.tsx`, `not-found.tsx` — **code-read only, NOT live-triggered this session** (no fault injection performed; the 404 path is exercised by `[...notfound]` design + `r111-F12` layering).

---

## Appendix A — Landing marketing-claims verification (P19-B2 deliverable 2)

**Claim: «+N مطعم مسجل · +M صاحب مطعم على المنصة» (trust line + finale).**
- **Verdict: DB-SOURCED, not hard-coded.** Single source: `countPublicStats()`
  — `src/lib/stats-queries.ts:236-242` (`prisma.restaurant.count({where:{isActive:true}})`
  + `prisma.user.count({where:{role:'owner'}})`). Consumed server-side into the
  ISR landing (`src/app/(public)/page.tsx:13,22-31`) and by
  `GET /api/public/stats` (`src/app/api/public/stats/route.ts:10-16`).
- Honest degradation: null → «—» cells + retry (`HomePage.tsx:131-139,252-259`);
  finale null → «أرقام المنصّة تُجلب الآن…» (`FinaleCta.tsx:43-45`).
- **Fix applied (edge case):** the client-fallback fetch resolved
  `{totalRestaurants:0,totalUsers:0}` on failure, which rendered «+0» live-count
  assertions in the both-paths-fail case despite its own comment
  («Keep the section in its loading state rather than fabricating numbers»).
  `landing-data.ts:93-131` now resolves `null` on failure (type
  `Promise<PublicStats | null>`); HomePage's existing `!s` guard
  (`HomePage.tsx:111`) routes it into the honest «—» + retry path. No rendered
  copy changed on web; no pins touched.

**Claim: loyalty («ولاء ومكافآت», «نقاط تُجمع لزبائنك الأوفياء مع كل طلب»).**
- **Verdict: REAL, WORKING FEATURE — no rewording needed.** Evidence chain:
  points accrue atomically when an order transitions to completed
  (`src/app/api/orders/[id]/route.ts:123-138`, double-grant guards,
  `RewardTransaction` 'earn'); customers create/look up cards by phone
  (`src/app/api/loyalty/route.ts:44,109`, PII-stripped for anonymous);
  redemption is a real atomic write (`src/app/api/loyalty/redeem/route.ts:87-120`,
  stamp-card 5-order rule, `updateMany` race guard, 'redeem' transaction);
  tiers (`src/lib/loyalty-tiers.ts`), referrals
  (`api/loyalty/referral`, `api/referrals/claim`, `ReferralHandler`); customer UI
  mounted on every public menu (`MenuClientSection.tsx:125-133`) and post-order
  share (`order-confirmed/page.tsx`); owner console with lookup + redemption +
  stats (`owner/loyalty/page.tsx:207,229,342`). Tests: 5 unit files
  (`loyalty-stats/-referral/-subscription/-ip-cap/r93-coverage-loyalty-hydration`)
  + e2e `tests/e2e/loyalty-redeem.spec.ts` (which caught the r97-W6 403 inversion).
  The landing copy itself carries the honesty doctrine
  (`RolesSection.tsx:11-17`: «every course is a SHIPPED function»).

## Appendix B — Sold-out spot check (P19-B2 deliverable 3)

**Verdict: the P15 rule HOLDS at `82bffbdc`.**
- Sort logic: `src/app/(public)/menu/[slug]/page.tsx:244-252` —
  `availabilityRank` (status==='available' ? 0 : 1) sorts BEFORE `sortOrder`
  and `id`, so an unavailable item can never lead its category.
- Pinning test: `tests/unit/menu-showcase-fallback.test.ts:273-293`
  («P16-4b honesty guard: a sold-out item never LEADS its category (the P15
  partition stands)») — a sold-out item with sortOrder 1 exports AFTER the
  available item (assert `[2,1]`), other categories keep their order. Re-run
  this session: PASS.

## Appendix C — Claims finding in the sibling mobile app (same repo)

`mobile/src/components/landing/TrustBand.tsx:30` labeled the live
`totalUsers` figure (which counts `User.role:'owner'` — see
`stats-queries.ts:230-233`) as «حساب نشط» ("active account"), the label the
web relabeled to «صاحب مطعم» in r143 (Phase-4 W1 D6) precisely because the
count counts owners only. The mobile landing fetches the same endpoint
(`mobile/src/screens/public/LandingScreen.tsx:131`). **Fix applied:** the
label now reads «صاحب مطعم», matching the web trust cells
(`HomePage.tsx:133-134`) and the count's definition — the minimal honest fix
(one word), no other copy touched.
