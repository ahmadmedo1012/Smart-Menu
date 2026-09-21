# S12 — Product parity roadmap (r119): gap validation, sized build plan, priorities, quick wins, true gaps

Repo: `/home/z/my-project/repos/Smart-Menu` @ `92611477`. READ-ONLY analysis — no files modified.
Source of truth for the gap list: `docs/ENGINEERING_STATE.md:212-213` (r118 "Mobile feature-parity ROADMAP").

---

## 1. Gap validation — verdict per documented gap (file:line evidence)

| # | Documented gap (r118) | Verdict | Evidence |
|---|---|---|---|
| G1 | Owner menu CRUD = "web-redirect stub" | **CONFIRMED, with correction** — it is NOT a redirect, it is a passive text placeholder (no `Linking.openURL` at all). Owners must manually open a browser; nothing is clickable. | `mobile/src/screens/owner/OwnerScreens.tsx:380-391` (`OwnerMenuScreen` — text: «يمكن إدارة الأصناف والفئات عبر تطبيق الويب حاليًا…»); the only mobile `Linking.openURL` calls are WhatsApp/support (`LoginScreen.tsx:45`, `FloatingWhatsApp.tsx:19`, `MenuScreen.tsx:484`, `OrderConfirmedScreen.tsx:30`). Web full CRUD: `src/app/(protected)/owner/menu/page.tsx` (319 lines, categories+items+dialog+availability toggle :154-162). |
| G2 | Admin section = static placeholders | **CONFIRMED** — 10 of 11 admin screens are `EmptyState` stubs; dashboard is a nav grid only. | `mobile/src/screens/admin/AdminScreens.tsx:43-139` (AdminRestaurants/Users/Admins/Orders/OrderDetail/Subscriptions/SystemEvents/AuditLogs/Telegram = placeholders), `:141-153` (Settings = logout only), `:9-32` (Dashboard = action grid). Navigation wires them: `mobile/src/navigation/AdminStack.tsx:5-7,50-56`. |
| G3 | No signup funnel | **CONFIRMED, worse than documented** — subscribe screens exist (`AuthStack.tsx:21-23`) but are reachable ONLY for already-authenticated users with UNPAID/EXPIRED/REJECTED status (`RootNavigator.tsx:172-178`). An unauthenticated visitor's only paths are Pricing→**Login dead-end** (`PricingScreen.tsx:94` «اشترك الآن» → `navigate("Login")`) and Login. AND the mobile funnel never collects credentials — it posts `tempUsername: slug` (`SubscribeScreens.tsx:102,147`), so after admin approval the owner has **no password** (web collects username+password: `subscribe/SubscribeForm.tsx:114,438-457` → `POST /api/auth/register`, wired at `subscribe/page.tsx:251`). Web register exists + tested: `src/app/api/auth/register/route.ts` (rate-limited :22, 409s), `tests/unit/r92-register-route.test.ts`. |
| G4 | No reviews UI | **CONFIRMED on both sides** — customer: mobile `MenuScreen.tsx` (556 lines) has no rating stars / review sheet (web: `MenuItemCard.tsx:69,221` star display; `ReviewSheet.tsx` GET/POST `/api/items/[id]/reviews`). Owner: `OwnerScreens.tsx:483-492` = `EmptyState` stub (web: `owner/reviews/page.tsx` 274 lines → `/api/owner/reviews` with server-side stats+distribution, `api/owner/reviews/route.ts:55-95`). Nav entry already exists: `OwnerStack.tsx:51`, dashboard quick-action `OwnerScreens.tsx:76`. |
| G5 | Loyalty/referral post-order missing | **CONFIRMED** — mobile `OrderConfirmedScreen.tsx:18-22,53` shares a generic app link (clipboard), no loyalty registration/referral code; owner `OwnerScreens.tsx:494-503` = stub. Web full: `ShareAfterOrder.tsx` (`POST /api/loyalty` :82 → `card.referralCode` :95-97, referral URL `?ref=` :67-68), owner dashboard `owner/loyalty/page.tsx` (638 lines; ReferralQR/ReferrerList/TierChart/TransactionTable components). Backend complete + tested: `/api/loyalty` (phone-based, no auth needed for POST — `api/loyalty/route.ts:27-33`), `/api/loyalty/redeem|referral|stats`, tests `loyalty-referral/stats/ip-cap/subscription.test.ts`, `r93-coverage-loyalty-hydration.test.ts`. Mobile already captures inbound `?ref=` (`MenuScreen.tsx:69-74,462,470`). |
| G6 | First-launch RTL needs restart | **CONFIRMED** — `I18nManager.forceRTL(true)` at JS scope (`mobile/src/app/App.tsx:26-28`) only takes effect after a native restart; nothing detects/informs the user. `app.json` declares `CFBundleLocalizations: [ar, en]` + `CFBundleDevelopmentRegion: ar` (iOS) but no build-time RTL forcing for Android. |

### Corrections / additions to the documented list
- **G7 (MISSED by r118): mobile OwnerSettings = logout only.** `OwnerScreens.tsx:505-517` vs web `owner/settings/page.tsx` (545 lines: logo upload :249, gallery :304, pickup types :391, restaurant profile :429, plan upgrade :73, `PUT /api/settings` :173, `/api/upload` :105). Owners cannot fix their WhatsApp number / working hours from the app.
- **G8 (partial, undocumented): mobile menu page lacks web's showcase niceties** — no featured showcase, gallery carousel, high-contrast toggle, print link (web `MenuHero.tsx:132` → `/menu/[slug]/print`), item rating display. Core ordering parity is proven (r114), these are engagement polish.
- **Already built but easy to assume missing (do NOT rebuild):**
  - Item availability/sold-out toggle — EXISTS: `owner/menu/page.tsx:154-162` (status toggle + toast), `prisma/schema.prisma:155` (`status ItemStatus`), enum `:579-582`; mobile *displays* it (grayed/disabled `MenuScreen.tsx:266,271`) but has no text badge and no owner control (control = part of G1).
  - Table/takeaway/delivery flags — EXIST: `schema.prisma:107` (`pickupTypes`), `:592-596` (enum), web picker `OrderDialog.tsx:471-501`; mobile checkout has 3 pickup types (r114-verified).
  - Multi-branch/multi-menu — EXISTS on web: `owner/restaurants/page.tsx` + `UserRestaurant` join (`schema.prisma` Restaurant relation `userRestaurants UserRestaurant[]`), `RestaurantSwitcher` (`ACTIVE_RESTAURANT_KEY`, `RestaurantSwitcher.tsx:10,37`). Mobile stub `OwnerScreens.tsx:393-402` = parity gap only.
  - Owner analytics — EXISTS: `/api/stats` + `/api/stats/advanced` (`api/stats/advanced/route.ts:22-25`); mobile dashboard already renders stats (`OwnerScreens.tsx:19-24,26-` OwnerStats interface).
  - Owner order-notification sound on WEB — EXISTS (`src/lib/chime.ts`, used `NewOrdersBar.tsx:3`); the missing one is **mobile** (no sound/vibration anywhere; `grep chime|sound|vibrat mobile/src` = 0 hits; no expo-notifications in `mobile/package.json`).

---

## 2. Systematic parity table (web routes → mobile screens)

| Web route (feature) | Mobile screen | Parity |
|---|---|---|
| `/` landing | `LandingScreen.tsx` | ✅ |
| `/pricing` | `PricingScreen.tsx` (110 lines) | ⚠️ CTA dead-ends to Login (`:94`) |
| `/terms`, `/privacy` | `StaticScreens.tsx` | ✅ |
| `/menu/[slug]` (order journey, modifiers, search, referral capture) | `MenuScreen.tsx` | ✅ core (r114-proven); ⚠️ missing ratings/review sheet, showcase, gallery, print link, contrast toggle (G8) |
| `/menu/[slug]/print` | — | ❌ (browser-only acceptable) |
| `/login` | `LoginScreen.tsx` | ✅ (+ forgot-password→WhatsApp `:43-46`) |
| `/subscribe` (register + restaurant + payment) | `Subscribe*` (3 screens) | ❌ unreachable pre-auth + no credentials (G3) |
| `/cart` | in-`MenuScreen` cart sheet | ✅ |
| `/order-confirmed` (confetti + referral share dialog) | `OrderConfirmedScreen.tsx` | ⚠️ no loyalty/referral share (G5), generic share only |
| `/owner` dashboard (stats) | `OwnerDashboardScreen` (`OwnerScreens.tsx:26-378`) | ✅ |
| `/owner/orders` + `[id]` (poll 15s, chime) | `OwnerOrdersScreen` + detail | ✅ data; ❌ no new-order sound/vibration |
| `/owner/menu` (categories+items CRUD) | `OwnerMenuScreen` | ❌ STUB (G1) |
| `/owner/restaurants` (multi-menu) | `OwnerRestaurantsScreen` | ❌ STUB (`OwnerScreens.tsx:393-402`) |
| `/owner/qr` | `OwnerQrScreen` (`:416-481`) | ✅ (real QR + share, r102-M2) |
| `/owner/reviews` | `OwnerReviewsScreen` | ❌ STUB (G4-owner) |
| `/owner/loyalty` | `OwnerLoyaltyScreen` | ❌ STUB (G5-owner) |
| `/owner/settings` (logo/gallery/pickup types/profile/plans) | `OwnerSettingsScreen` | ❌ logout only (G7, missed by docs) |
| `/admin/*` (10 pages, 2578 lines) | `AdminScreens.tsx` | ❌ placeholders (G2) |
| Telegram order approvals | bot-side (webhook) | n/a (owner uses Telegram app) |

Note: `mobile/src/screens/{owner,admin}/*Screen.tsx` individual files are 1-line re-export shims of the `*Screens.tsx` bundles — all real code lives in the bundles. `mobile/src/components/{menu,owner,admin,charts}/` directories are EMPTY (ready scaffolding for the builds below).

---

## 3. Backend readiness per gap

| Gap | Backend ready? | Evidence |
|---|---|---|
| G1 menu CRUD | **YES** — all endpoints exist, owner-scoped, plan-limited | `/api/categories` + `[id]`, `/api/items` + `[id]` (`items/route.ts:109-122` ownership + `PlanLimitError`), `/api/upload` (Bearer, 5MB cap `upload/route.ts:17,35`). Tests: `items-contract.test.ts`, `menu-modifiers.test.ts`, `item-modifier-drafts.test.ts`. Mobile client already supports FormData (`services/api/client.ts:71`) and Bearer mutations (no CSRF needed — r114 order POST proven). |
| G2 admin screens | **YES** | `/api/admin/stats` (ordersToday/revenueTrend/top restaurants, `admin/stats/route.ts:39-117`), `/api/users` + `[id]` (web admin users page `:69,96,107`), `/api/orders` (admin orders page `:73`), `/api/admin/subscriptions|system-events|audit-logs|telegram|admins`. Tests: `admin-routes.test.ts`, `r92-admin-admins-id.test.ts`, `r93-coverage-admin-admins.test.ts`, `system-events-writes.test.ts`. |
| G3 signup | **YES + one tiny backend addition** | `/api/auth/register` fully built/tested BUT returns cookie-session only — no `sessionToken` for mobile Bearer (`register/route.ts:88-101`), unlike `/api/auth/login` which returns `sessionToken` for `X-Client-Type: mobile` (`login/route.ts:169-188`). Mobile client already sends that header (`client.ts:43,67`). Workaround without backend change: register → login (2 calls). Cleaner: mirror the login pattern in register (~5 lines server + test). |
| G4 reviews | **YES** | `/api/items/[id]/reviews` GET/POST (limiter `:14-22`), `/api/owner/reviews` GET (stats+distribution `:55-95`). Tests: `r92-owner-reviews.test.ts`, `reviews-atomic-pii.test.ts`, `r93-reviews-subadmin-pii.test.ts`. |
| G5 loyalty | **YES** | `/api/loyalty` POST is phone-based, unauthenticated-friendly (`loyalty/route.ts:27-33` — rate-limited); `/api/loyalty/stats|redeem|referral`, `/api/referrals/claim`. 5 test files (see §1 G5). r105 probe of `/api/loyalty/redeem` consistent with this. |
| G6 RTL | n/a (client-side) | — |

**Conclusion: ZERO backend feature work is required for the mobile parity roadmap except the optional 5-line register-token mirror.** All gaps are mobile-UI builds against existing, tested APIs.

---

## 4. Sized build plan

Sizes: **S** ≤1 screen/file-pattern reusing existing logic; **M** new screen(s) + hook + tests; **L** multi-screen flow or backend changes.

### G1 — Owner menu CRUD (mobile) — phased M→L
- **G1a (S→M) Read-only browser + availability toggle**: rewrite `OwnerMenuScreen` (new `mobile/src/screens/owner/OwnerMenuScreens.tsx` or use empty `components/owner/`). GET `/api/categories?restaurantId=` + `/api/items?restaurantId=`; tap item → PATCH `/api/items/[id] {status}` (web contract `owner/menu/page.tsx:154-162`). Reuse: OwnerOrdersScreen list/pagination patterns (`OwnerScreens.tsx:143-197`), `api.getPaginated` (`client.ts:125`). Tests: payload-contract test in `tests/unit/` (pattern: `r118-public-menu-route.test.ts`). Risks: plan-limit 402/403 toasts; multi-restaurant scope (use `/api/owner/restaurants` like OwnerQrScreen `:430`).
- **G1b (M) Item create/edit form**: fields = name/nameAr/description/price/discountedPrice/image/category (contract from web `ItemDialog` + `owner/menu/types.ts`); image via `expo-image-picker` (already a dep) → compress → FormData → `/api/upload` → POST/PATCH `/api/items`. Risks: 5MB upload cap (413), RTL form layout, decimal price keyboard.
- **G1c (M) Category CRUD + item delete**: `POST /api/categories`, `PATCH/DELETE /api/categories/[id]`, `DELETE /api/items/[id]`; must surface the server's has-orders 409 guard (r118-B2) as a friendly Arabic confirm (web pattern `owner/menu/page.tsx` deleteTarget).
- Full G1 = **L** if done in one round; recommend shipping G1a+G1b first (covers ~80% of daily owner edits: price change, sold-out, new item).

### G2 — Admin screens (mobile) — **L, recommend NOT building now**
10 web pages = 2578 lines. Users = 1-2 platform staff who have working web. If ever needed, highest-value single screen is AdminDashboard stats (GET `/api/admin/stats`, M: one screen + charts — note empty `mobile/src/components/charts/` dir was scaffolded for this). Telegram approvals already work from the Telegram app itself. Keep "web-first by design" (already documented `ENGINEERING_STATE.md:105`).

### G3 — Signup funnel (mobile) — **M**
Files: `SubscribeScreens.tsx` (add username/password/name to `SubscribeMenuScreen` — validation copy from `src/lib/validation.ts:39` policy 8-100), `PricingScreen.tsx:94` (CTA → `SubscribePlan`), `RootNavigator.tsx:172-178` (route unauthenticated users into AuthStack — e.g. PublicStack gains a modal route or LoginScreen gains «إنشاء حساب جديد»), optional backend: mirror login's mobile sessionToken in `register/route.ts` (~5 lines + 1 test in `r92-register-route.test.ts`). Flow (copy web `subscribe/page.tsx:231-267`): register → validate slug → payment; keep the 409 retry contract comment. Risks: register rate-limit 5/min/IP (`:22`) — surface 429 Arabic message; username uniqueness UX; after approval the owner can now actually LOG IN on mobile (today's tempUsername flow cannot).

### G4 — Reviews UI (mobile) — split
- **G4a (S→M) customer-side**: rating badge + count on mobile item cards (`MenuScreen.tsx` item render) + a review sheet (GET/POST `/api/items/[id]/reviews`, shape from web `ReviewSheet.tsx:34-57,154`). Trust-building for diners.
- **G4b (S) owner-side**: list + star filter in `OwnerReviewsScreen` — GET `/api/owner/reviews?minRating=` (paginated, stats in `meta` — `owner/reviews/route.ts:88-93`); reuse OwnerOrdersScreen pagination (`OwnerScreens.tsx:143-188`).

### G5 — Loyalty/referral (mobile) — split
- **G5a (S) post-order share**: on `OrderConfirmedScreen`, replace generic share with `POST /api/loyalty {customerPhone, restaurantId}` (phone already collected at checkout `MenuScreen.tsx:462-470`) → referralCode → `Share.share` with `${domain}/menu/${slug}?ref=CODE` (web contract `ShareAfterOrder.tsx:67-97`). ~60 lines.
- **G5b (M) owner loyalty dashboard**: GET `/api/loyalty/stats` → tier chart + referrers + transactions (data shapes = web `owner/loyalty/page.tsx` components TierChart/ReferrerList/TransactionTable); redeem flow → POST `/api/loyalty/redeem`.

### G6 — RTL first-launch — **S**
`App.tsx:26-28`. Options: (a) build-time: Expo config-plugin/locale config so native starts RTL (investigate `expo-localization` plugin `supportsRTL` / Android `localeConfig` for ar); (b) runtime honesty (~30 lines): when `!I18nManager.isRTL` on first mount, show a one-time Arabic notice «أعد تشغيل التطبيق لتفعيل الواجهة» (RTL layout is already applied to styles regardless, so the app is usable meanwhile). Verify on the r114 emulator protocol.

### G7 — Owner settings essentials (mobile) — **M**
Minimal high-value subset (skip gallery): WhatsApp number, phone, working hours, address, pickup types → `PUT /api/settings` (contract `owner/settings/page.tsx:169-182`); profile read via `/api/settings` GET. Larger subset adds logo upload (`/api/upload`) + plan upgrade (`/api/plans`, `/api/subscriptions/upgrade`).

---

## 5. Recommended build order (priority for Libya restaurant market)

| # | Item | Size | Rationale |
|---|---|---|---|
| 1 | **G6 RTL first-launch fix** + quick-win batch below | S | Every new install on an LTR-locale phone hits it; first impression = adoption. Cheapest highest-visibility fix. |
| 2 | **G1a+G1b Owner menu CRUD (browse, sold-out toggle, price/item edit)** | M | **Daily retention.** Owners change prices/availability daily; today they must leave the app → breaks the "manage from your phone" promise. Highest DAU impact. |
| 3 | **G3 Signup funnel (incl. 5-line register-token backend mirror)** | M | **Revenue acquisition on mobile.** Libyan restaurateurs are phone-first; today's funnel dead-ends at Login AND produces passwordless accounts that cannot log into the app at all. |
| 4 | **G5a Loyalty referral share post-order + G4a customer reviews on menu** | S+M | **Repeat customers + trust.** Referral loop (`?ref=`) already captured by mobile (`MenuScreen.tsx:69-74`) — closing the loop turns every order into customer acquisition for the restaurant. Reviews visible on the menu = diner trust. |
| 5 | **G7 Owner settings essentials (WhatsApp/hours/pickup types)** | M | Keeps menus accurate (wrong WhatsApp number = lost orders); unblocks the mobile subscribe screen's own instruction «ارفع صورة الإيصال من شاشة الإعدادات» (`SubscribeScreens.tsx:204`) which currently points at a logout-only screen. |
| 6+ | G1c categories CRUD · G4b owner reviews · G5b owner loyalty dashboard · G8 showcase polish | M each | Second wave. |
| — | G2 admin screens | L | **Explicitly defer** — 1-2 internal staff, full web panel works, Telegram approvals already mobile. |

---

## 6. Quick wins (<50 lines each, evidence-based)

1. **QW1 — Make the G1 stub actionable (mobile)**: `OwnerMenuScreen` (`OwnerScreens.tsx:380-391`) gets a real «افتح المحرر في المتصفح» button (`Linking.openURL(`${domain}/owner/menu`)`; `domain` pattern already at `:417`) + the restaurant's editor QR. ~15 lines. Stops the dead-end until G1 ships.
2. **QW2 — New-order vibration/sound (mobile owner)**: in the poll-merge where new orders are prepended (`OwnerScreens.tsx:184-188`), `Vibration.vibrate([0,200,100,200])` (react-native core, no new dep) when new ids appear. Web already has its chime (`src/lib/chime.ts`); mobile has NOTHING (grep = 0). ~12 lines.
3. **QW3 — Share button on web menu page**: no `navigator.share`/Share2 anywhere in `src/components/menu/*` (verified by grep). Add to `StickyMenuHeader.tsx` (or next to the print link pattern `MenuHero.tsx:132`): `navigator.share({title, url})` with clipboard+toast fallback (mobile web + Safari desktop). ~30 lines. Organic spread of per-restaurant menu links = free acquisition.
4. **QW4 — Fix the Pricing dead-end (mobile)**: `PricingScreen.tsx:94` «اشترك الآن» → `navigate("Login")` is a dead-end for NEW users; point it at the web `/subscribe` via `Linking.openURL` until G3 lands (or straight to `SubscribePlan` after G3). ~5 lines.
5. **QW5 — Sold-out text badge (mobile)**: unavailable items are only dimmed (`MenuScreen.tsx:266,271` opacity 0.5); add a «نفدت الكمية» label so diners aren't confused by an unlabeled gray card. ~8 lines.

(Rejected quick-win candidate: "owner order-notification sound on web" — already built, `src/lib/chime.ts` + `NewOrdersBar.tsx:3`, r118-B3 hardened it. "Arabic numerals toggle" — deliberate product policy, Western digits by design, `src/lib/format.ts:1-14`.)

---

## 7. True competitive gaps (missing ENTIRELY, web+mobile) — with schema impact

Checked against code: multilingual toggle, item availability, scheduled orders, table QR vs takeaway, delivery zones/fees, multi-branch, owner analytics, push notifications.

| True gap | Evidence of absence | Schema impact |
|---|---|---|
| **TG1 EN/AR bilingual UI toggle** | No i18n lib (`package.json` has no next-intl/i18next; `grep locale` in `src/lib` = 0); all UI strings hardcoded Arabic. Item DATA already bilingual (`name`/`nameAr`, `MenuItemCard.tsx:65`). | None for data. Needs string dictionary (~200+ keys), locale cookie/param, `dir` switch — an L infra build. |
| **TG2 Scheduled / pre-orders** | No `scheduledFor`/`orderTime` anywhere (`schema.prisma` Order model `:182-208` — verified absent). | `Order.scheduledFor DateTime?` + validation (future-window cap), customer date picker, owner order-card badge, WhatsApp receipt line. M+ |
| **TG3 Delivery zones & fees** | `pickupTypes` flag exists (`schema.prisma:107`) but NO fee/zone model — grep `deliveryFee` in schema = 0; checkout totals have no delivery component (`OrderDialog` type picker `:471-501` only). | New `DeliveryZone` model (restaurantId, name, area/city, `fee Decimal`, `minOrder Decimal`, isActive) + `Order.deliveryFee Decimal @default(0)` + checkout calc + owner CRUD. L |
| **TG4 Table-level QR (dine-in binding)** | QRs are restaurant-level only (`OwnerQrScreen.tsx:457`, admin QR same); no `table` param anywhere in checkout. | `Order.tableLabel String?` + QR generator `?table=N` + checkout preill + owner order list display. S+ |
| **TG5 Owner push notifications (app closed)** | No `expo-notifications`/FCM in `mobile/package.json`; order discovery = 15s in-app polling (`constants` `ORDERS_POLL_INTERVAL_MS = 15_000`) + Telegram bot (which covers approvals, not general alerts). | New `PushToken` model (userId, platform, token) + expo-push integration + opt-in. M+ (Telegram partially mitigates). |

**NOT true gaps** (exist in code — listed to prevent re-scoping): item availability toggle (web owner UI + enum + mobile display), takeaway/delivery flags, multi-branch (web), owner analytics (web+mobile dashboards), web owner chime.

---

## 8. Summary for the worklog

Parity verdicts: G1-G6 all CONFIRMED (G1 corrected: passive placeholder, not redirect; G3 worse: unreachable pre-auth AND passwordless), G7 owner-settings missed by docs. Backend: 100% ready for every gap (only optional 5-line register-token mirror). Build order: RTL+quickwins → menu-CRUD(A/B) → signup → loyalty-share+customer-reviews → owner-settings; defer admin. 5 quick wins identified. 5 true cross-platform gaps (i18n, scheduling, delivery fees, table QR, push).
