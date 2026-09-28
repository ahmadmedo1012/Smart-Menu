# X1 — Cross-check: the 8 r121 P1 findings (adversarial verification)

**Task ID:** 5-X1 (X1 CROSS-CHECKER) · **HEAD:** `74ef578f` · **Mode:** READ-ONLY on code.
**Method:** full re-read of every cited file + callers/callees; independent chunk-graph analysis of
`.next` (BUILD_ID `DkVVmorxzwxdxYxX9-NWi`, 118 chunks); live one-session probes against
`.next/standalone/server.js` (curl: login `{}` / garbage / empty-body; server killed in the same
bash call); live local-PG query (`SubscriptionPlan` rows); test-file reads; cross-read of
C/E/G/J/P/M/Q findings + M-4/X2 to avoid double-counting.

**Verdict summary: 6 CONFIRMED · 1 CONFIRMED-with-correction (P-1, one sub-claim refuted) · 1 PARTIAL (M-3, scope of the bug class refuted).**
No finding was fabricated; one (M-3) over-generalizes a single-route bug to a class; one (P-1)
has one wrong evidence detail; one (C-1) has a wrong test-coverage claim already corrected by M-4.

---

## 1. C-1 [P1] reviews DELETE commits cross-item deletion → **CONFIRMED**

**My own citations** (`src/app/api/items/[id]/reviews/route.ts`, read in full):
- `:199-202` — `tx.review.delete({ where: { id: reviewId } }, …)` inside `prisma.$transaction` —
  the delete is keyed by `reviewId` ONLY (attacker-controlled query param, `:160-162`), never
  scoped by `itemId`.
- `:205` — the scope check `if (!review || review.menuItemId !== itemId) return null;` runs AFTER
  the delete. In Prisma interactive transactions a **resolved** callback (any value, incl. `null`)
  **COMMITS**; only throwing (or `tx.$rollback()`) rolls back. So for a review of item Y deleted
  via item X's URL: the row is destroyed, then the route answers `404 «التقييم غير موجود»` (`:219`).
- `:164-196` — the ownership ladder authorizes on the URL's `itemId` only (owner primary/linked,
  sub_admin MANAGE_RESTAURANTS or link, admin/super_admin) → any caller authorized for ANY item can
  pass `?reviewId=` of ANY review platform-wide. Cross-tenant destruction confirmed.
- `:208-216` — counter recompute runs only when the review belonged to the URL item → the victim
  item's `ratingCount`/`avgRating` keep counting the deleted row (permanent drift). The revalidate
  (`:221-225`) also only targets the URL item — the victim's ISR menu cache isn't even purged.

**Correction (already filed as M-4, verified by me):** C-1's "zero test coverage exists for this
handler" is **inaccurate** — `tests/unit/r103-fixes.test.ts:289-299` pins the exact surface
("review belonging to ANOTHER item → 404, transaction **rolled back** to null") but its
`mockTransaction` (plain `fn(txMock)`) makes commit/rollback semantics invisible, i.e. the test
pins the *misleading response* and encodes the author's wrong mental model. Substance (no coverage
of the commit semantics) holds.

**Recommended fix (agree with C-1):** `tx.review.deleteMany({ where: { id: reviewId, menuItemId: itemId } })`;
`count === 0` → 404 (nothing deleted, nothing to roll back); keep the recompute + revalidate.
**Must land with** the M-4 test update (`mockReviewDelete` → `mockReviewDeleteMany`, add
row-survival + victim-counter assertions; the `sub_admin WITH MANAGE_RESTAURANTS → allowed` pin at
`:322-332` survives unchanged — platform-wide moderation of *in-scope items* stays by design).
**Risk of fixing:** negligible — behavior only changes for the cross-item case that currently
corrupts data. **Risk of not fixing:** any owner can silently vandalize competitors' reviews.

---

## 2. E-1 [P1] PUT /api/items/[id] cross-tenant categoryId move → **CONFIRMED**

**My own citations** (`src/app/api/items/[id]/route.ts`, read in full):
- `:92` — `categoryId: z.number().int().positive().optional()` in `updateSchema` (no tenant tie).
- `:153-159` — the spread loop copies every body key except `modifierGroups` into `updateData`
  (categoryId verbatim).
- `:220-224` — `prisma.menuItem.update({ where: { id: itemId }, data: updateData })` writes it.
- `:130-149` — the ownership ladder checks `existing.category.restaurantId` (the item's **current**
  restaurant) only; the **destination** category is never fetched.
- Contrast verified: POST (`src/app/api/items/route.ts:196-228`) fetches the target category and
  runs the owner/UserRestaurant/MANAGE_RESTAURANTS ladder on `category.restaurant.id` before create.
- Feasibility verified: category ids are exposed in the public menu payload
  (`src/app/api/public/menu/[slug]/route.ts:74` categories select `id`), and the DB FK
  (MenuItem.categoryId → Category.id) accepts any valid category id regardless of tenant.
- Nuance (E-1 slightly overstates): the image is still validated against the item's **current**
  tenant (`:216 mediaUrlError(body.image, existing.category.restaurantId)`) — so the injected image
  must be A's own valid blob, not a foreign one; name/description/price are fully A-controlled.
  The impact chain (item served on B's public menu, orderable by B's customers, occupies B's
  item-count/plan cap, pollutes B's stats; A loses edit rights afterwards) is accurate.

**Recommended fix (agree with E-1):** mirror the POST ladder — when `body.categoryId` is present,
fetch the target category and require its `restaurantId` ∈ {caller primary} ∪ {UserRestaurant
links} (owners) or MANAGE_RESTAURANTS (staff); 403 «غير مصرح» otherwise. One conditional block;
in-tenant category moves unaffected. **Risk:** low. **Tests:** M-5's E-1 row (owner A + B's
categoryId → 403 + row unchanged; own second category → 200).

---

## 3. G-1 [P1] ~128 KB-gz orphan polyfill chunk on 28 routes → **CONFIRMED**
(cause chain verified statically as far as possible; the exact Turbopack resolution stage remains
inferred — G-1 itself marked the mechanism UNVERIFIED and mandated rebuild verification; I keep
that caveat and add one hard requirement to the fallback plan, see ⚠.)

**Independently verified facts** (all measured/read this session):
- The chunk exists and carries the polyfills: `.next/static/chunks/45b08jpy-zb6l.js` =
  **439,315 B raw / 131,926 B gz**; fingerprints present and mapped to module ids: bn.js
  «red works only» (#5944), base64-js «fromByteArray» (#872), Buffer «utf16le» (#230), asn1
  «utctime» (#763), browserify-aes «invalid suite type» (#7984), elliptic POINT_CONVERSION_HYBRID
  (#7016), stream «writableHighWaterMark» (#686/854) — plus the app module `csrfFetch`/`csrfJson`
  (#49241 = `src/lib/csrf-client.ts`) in the tail. The crypto cluster is `next/dist/compiled/
  crypto-browserify` (both bn.js and asn1 signatures found in that file — verified).
- **Blast radius exact:** 28 client-reference manifests reference the chunk — `/menu/[slug]`,
  `/login`, `/subscribe`, `/cart`, `/order-confirmed`, owner ×10, admin ×13 (manifest scan);
  `/` and `/pricing` manifests are clean (verified). Matches G-1/Q-visual.
- **Orphan claim independently reproduced:** zero references to the root polyfill module ids
  (230/872/686/854/5944/763/7984/7016) across ALL 118 chunks (my own scan: cross-chunk references
  = {}). The cluster is registered, never executed — pure transfer+parse cost.
- **Cause chain:** `SelfHostedQR.tsx:4` static `import QRCode from 'qrcode'` is the ONLY
  client-graph static import of qrcode (consumers: `owner/qr/page.tsx:19`, `admin/qr/page.tsx:20`).
  qrcode is the **only** client-bundle dependency with node-builtin requires (grepped every client
  dep: `@base-ui/react`, `@vercel/analytics`, `lucide-react`, `motion`, `next-themes`, `sonner`,
  `zustand`, `zod` — all clean; qrcode's `renderer/png.js` requires `fs`+`pngjs`, and pngjs
  requires `stream/util/zlib/assert/buffer`). qrcode's main (`lib/index.js` → `lib/server.js`,
  read) pulls exactly that server path. The executed browser build (`lib/browser.js` via the
  package.json `browser` field) is a **self-contained 23,752 B chunk** (`35s8_gp--zjmt.js`)
  referenced only by the two qr manifests — and I verified it has **zero async chunk-load calls**
  and no cross-chunk deps.
- **The dynamic-import precedent demonstrably avoids the polyfills:** the loyalty page's
  `ReferralQR.tsx:12-19` dynamic `import('qrcode')` maps at runtime (chunk-mapping in
  `0hh6ijkf54nab.js`) to that same clean `35s8` chunk — the polyfill chunk is NOT part of the
  dynamic chain. The qrcode server-path code (`lib/server.js`, pngjs: «toFileStream»,
  «getTypeFromFilename», «IHDR», «deflateLevel») is absent from every client chunk — the polyfills
  are residue of the static-graph resolution of the main entry, exactly G-1's hypothesis.
- New fact G-1 missed (harmless): `src/app/(public)/menu/[slug]/print/page.tsx:3` has a second
  static `import QRCode from 'qrcode'` — but that page is an async **server** component (no
  `'use client'`); it never enters the client graph. Irrelevant to the chunk, relevant to the
  fallback (below).

**Recommended fix:** agree — convert `SelfHostedQR.tsx:4` to `import type` + `import('qrcode')`
inside the effect, and make `qrPngDataUrl` (:82-88, called only from the two qr pages' download
handlers: owner/qr:79, admin/qr:78) dynamic too. Expect the polyfill cluster to leave the sync
chunk group (the loyalty page proves the async path is clean). **Verification is mandatory**
(rebuild + `scripts/bundle-report.mjs` with the polyfill signatures added) because the Turbopack
internals are inferred, not proven.

**⚠ NEW interaction flag on G-1's fallback:** the stated fallback — `turbopack.resolveAlias`
mapping `qrcode` → `qrcode/lib/browser.js` — would **break the print page's server-side QR**
(`print/page.tsx67` calls `QRCode.toDataURL` in Node; `lib/browser.js`'s toDataURL needs a canvas
element → throws «You need to specify a canvas element»). If the fallback is ever needed, the
alias must be scoped to the browser condition (`turbopack: { resolveAlias: { browser: { qrcode:
'./node_modules/qrcode/lib/browser.js' } } }` — `next.config.ts` currently has no resolveAlias,
verified).

**Risk of fixing:** low (async QR load adds ~100 ms before the img mounts; the QR e2e specs pin
`[data-testid="qr-code"]` — `round79-phaseC-journey.spec.ts`, `r93-sim-owner.spec.ts` — Playwright
auto-wait covers it; spot-check advised). **Risk of not fixing:** ~128 KB gz dead weight on the
flagship menu, login, subscribe, cart (≈ a quarter of the menu page's JS).

---

## 4. J-1 [P1] floating z-band (60/61/63) above the modal band (40/50) → **CONFIRMED**

**My own citations** (all read):
- Floats: `FloatingWhatsApp.tsx:26` (`fixed bottom-… end-4 z-[60]`), `ScrollToTop.tsx:47`
  (`z-[61]`, visibility scroll-driven only :33-40), `CartSlideOver.tsx:67` (FAB
  `z-[63]` — I verified the FAB's render condition: it renders whenever `totalItems > 0`
  (:58-88), INCLUDING while its own sheet is open — the trigger `m.div` sits outside
  `SheetContent`).
- Modal band: `ui/dialog.tsx:34` (overlay z-40) / `:60` (content z-50); `ui/sheet.tsx:31`/`:58`;
  hand-rolled `menu/ReviewSheet.tsx:190-201` (z-40 backdrop + z-50 sheet).
- **Mount pattern verified:** both layouts mount the floats permanently inside MotionProvider —
  `(public)/layout.tsx:163-168`, `(protected)/layout.tsx:143-148` — and the layout comment
  (:159-161) confirms MotionProvider applies **no transform**, so the floats live in the root
  stacking context. Dialogs/sheets open in Base UI portals appended to `document.body`
  (`ui/dialog.tsx:9-22`) — the layouts never unmount, so 60/61/63 > 40/50 paints the floats above
  every overlay AND panel for the whole dialog lifetime. (WhatsApp has only a 3s deferred mount,
  :13-17; ScrollButton only scroll-driven visibility — neither reacts to modals.)
- **No existing hide-when-open mechanism:** grep for `data-modal-open`/`body:has` on modals →
  zero. (The r120 U8-F-1 work was tab-order/deferred-mount, not modal awareness.)

**Fix-option assessment:**
- **(a) Lower the floats below the modal band — RECOMMENDED.** 3 one-line edits:
  `FloatingWhatsApp.tsx:26` z-[60]→**z-30**, `ScrollToTop.tsx:47` z-[61]→**z-31**,
  `CartSlideOver.tsx:67` z-[63]→**z-33** (keeps their internal order; all below 40/50).
  Side effects checked against the full z-census: nothing fixed/sticky occupies 30–40 except
  `StickyMenuHeader` (z-30, top-anchored — floats are bottom-anchored, no spatial overlap; ties
  resolve by DOM order with floats later in the layout). Dropdowns/selects (z-40/50),
  `NewOrdersBar` (z-50, bottom-center — no spatial overlap with corner floats), lightbox z-100,
  banner/progress z-90, skip-links z-100 are all unaffected or correctly above. Residual risk
  (J-1's own note): a future full-height sticky element could cover the floats — low.
- **(b) Hide-when-open:** the codebase has a `:has()` precedent (`ui/table.tsx`, `globals.css`)
  but no modal-open marker; would require changes in ≥4 modal surfaces (`ui/dialog.tsx`,
  `ui/sheet.tsx`, `ReviewSheet.tsx`, `layout/Header.tsx` mobile menu) + CSS + controlled/
  uncontrolled open-state handling. More moving parts, easy to miss a surface (select popovers and
  the search bar are z-50 too but are not "dialogs" — with (a) they cover the floats naturally,
  with (b) they'd need case-by-case decisions). Nicer visuals (floats vanish instead of dimming),
  not worth the risk for the minimal fix.
- **(c) Portal-layer restructure:** too big — agreed, no.

**Tests:** gstack/e2e at 375×667 + 740×360: open OrderDialog/CartSlideOver/ReviewSheet → floats
behind the overlay; tap the CTA end-corner → hits the CTA. **Risk of fixing (a):** minimal.

---

## 5. P-1 [P1] yearly toggle «سنوي · وفّر 17%» is unpurchasable → **CONFIRMED** (one sub-claim REFUTED)

**Full chain, my own citations:**
- Toggle/display: `PricingClient.tsx:62` `displayPrice = yearly ? monthlyPrice * 10 :
  monthlyPrice` (**×10 is computed client-side** — plan rows carry no yearly price anywhere);
  `:63` `/السنة`; `:151` «وفر شهرين عند الاشتراك السنوي»; `:211` `YEARLY_SAVINGS_PCT=17`;
  `:259-282` the capsule toggle.
- CTA: `PricingClient.tsx:193` `` `/subscribe?plan=${plan.id}` `` — **no billing-period parameter
  exists**.
- Wizard: `subscribe/page.tsx:48` reads `?plan` only; `PlanSelector.tsx` — zero yearly/period
  handling (verified); `PaymentSection.tsx:27` renders `{price} د.ل/شهر` (monthly),
  `:49` «ادفع الآن ({price})», `:79` `price={Number(currentPlan.price)}` → PaymentDialog
  (bank/wallet amount = monthly price).
- Server contract: `subscriptions/route.ts:88` `if (Number(amount) !== Number(plan.price))` —
  the server **rejects any amount ≠ the monthly plan.price**; a yearly amount literally cannot be
  paid through the API.
- Approval: `subscription-decisions.ts:148-155` `planDays = plan.periodDays ?? 30` (r119-S2-P2-2
  honored — periodDays exists and IS used, but every plan row carries 30: schema default
  `prisma/schema.prisma:69`, and live local DB = Free 0/30d, Premium 29/30d — no 365-day rows,
  no yearly price column).
- **Live one-session probe:** not needed for this one — the chain is fully code-closed.
  **Yearly billing is TRULY not purchasable.**

**REFUTED sub-claim:** P-1's evidence says "`src/app/api/plans/route.ts` does not even expose
`periodDays`" — **wrong**: the route returns full rows (spread, no select) and `PricingClient`
itself consumes `plan.periodDays` (line 63). Immaterial to the verdict (the wizard never uses it
for pricing), but the line should be corrected.

**What implementing it would require (touch points):** (1) `PricingClient.tsx:193` CTA carries
`&billing=yearly`; (2) `subscribe/page.tsx` reads and threads it; (3) `PlanSelector`/`PaymentSection`
display ×10 + «/السنة»; (4) `PaymentDialog` amount; (5) `subscriptions/route.ts:88` amount-check
branch + persisting the term — either a payment-metadata field read by `subscription-decisions`
(NB: the decision reads `plan.periodDays` from the PLAN row, not the payment), **or** a separate
annual plan row (periodDays=365, price=×10) which needs ZERO decision-logic change since
r119-S2-P2-2 already honors it; (6) `subscriptions/upgrade` parity decision; (7) Telegram message
amount (route:152) is fine as-is; (8) tests (M-5-style e2e + unit on the amount branch).

**Honest minimal fix: (a) hide the yearly toggle** — delete the toggle state, the `displayPrice`
×10 branch, the yearly `periodLabel` branch, `:151` savings line, `:211` constant. Copy/UI-only,
zero money-path risk. Verified: no test pins the toggle (ui-sweep/full-sweep pricing regexes match
generic text that survives). Making yearly real (b) is a legitimate follow-up **product feature**
(~7+ touch points including the payment contract) — should not ride along with a fix batch.
**Risk of (a):** none. **Risk of not fixing:** a payer believes they bought 12 months, gets
EXPIRED at day 31 (compounded by P-5's silent-expiry cliff) — refund/dispute exposure.

---

## 6. P-2 [P1] fabricated landing features («حجز وانتظار» + phone login) → **CONFIRMED**

**My own verification:**
- `FeaturesSection.tsx:11` «واتساب · استلام · توصيل · **حجز وانتظار**» — `prisma/schema.prisma:594-598`
  `enum PickupType { inside, takeaway, delivery }` — exactly three; repo-wide grep
  (`reservation|waitlist|حجز` across `src/` + `prisma/schema.prisma` + `docs/API.md`) → the ONLY
  hit is the marketing line itself. No reservation/waitlist feature exists anywhere.
- `FeaturesSection.tsx:12` «تسجيل دخول العملاء برقم الجوال بخطوة واحدة» — auth surface is
  `src/app/api/auth/{login,logout,me,register}` (username+password, PBKDF2); grep for
  `otp|phoneLogin|برقم الجوال|sms` → only the marketing line. Diners are anonymous (name+phone
  form at checkout). No phone login, no OTP.
- Nit: P-2's "the r82 honesty-policy comment sits four lines ABOVE the fabricated list" — it
  actually sits at `:19-20` **below** the features array (`:10-16`). Cosmetic; the irony stands.
- No test pins this copy (verified) → the copy rewrite is risk-free.

**Fix (agree with P-2):** rewrite the two cards to what exists — «داخل المكان · سفري · توصيل»
(matches the r120 unified labels) and «بدون تسجيل للزبون — الطلب باسم ورقم فقط» (a genuine
selling point). No backend change. **Risk:** none.

---

## 7. M-1 [P1] 7 e2e specs pin pre-r119 400s (routes now 422) → **CONFIRMED (live + static)**

**The 7 specs, verified against current route code:**
| # | Spec | Pin | Route now |
|---|---|---|---|
| 1 | `tests/e2e/api-smoke.test.ts:47` | login `{}` → `toBe(400)` | `auth/login/route.ts:66-67` → **422** |
| 2-5 | `tests/e2e/api-sweep.test.ts:71,84,96,108` (helper `:68` `expect([400,429])`) | register empty/short-username/short-password/missing-name | `auth/register/route.ts:48-50` → **422** |
| 6 | `tests/e2e/full-sweep.test.ts:298` | login `{}` → `toBe(400)` | **422** |
| 7 | `tests/e2e/auth-fix-verification.spec.ts:41` | register short password → `toBe(400)` | **422** |

**Live one-session verification** (standalone server, killed in the same call):
`POST /api/auth/login` with `{}` → **`422` «يرجى إدخال اسم المستخدم وكلمة المرور»** — exactly
the contract M-1 reported.

**Is the fix just 400→422? Yes — no further drift.** Response shape is unchanged
(`{success:false, error:string}` — login's fixed Arabic string, register's
`parsed.error.issues[0].message`), so the inner assertions survive. TWO non-obvious details for
the fixer: (1) api-sweep's helper must become `expect([422, 429]).toContain(status)` AND the
inner guards `if (res.status() === 400)` must become `=== 422` or they'll silently skip;
(2) the "(or 429 if rate-limited)" title phrasing should be updated alongside.
**Other 400 pins verified NOT stale:** `referral-claim.spec.ts` ×5 (route still 400 at
`referrals/claim/route.ts:26`), `loyalty-redeem.spec.ts` ×2, `round86-security.spec.ts:107`
(`[400,404]`) — those routes weren't in r119-B4's six-route unification; M's session run had them
green. **Risk of fixing:** none (contract shipped to prod in r119).

---

## 8. M-3 [P2] login non-JSON → 500 → **PARTIAL** (core CONFIRMED; the "same class of bug" across routes REFUTED)

**Core CONFIRMED (live-reproduced twice):**
- `src/app/api/auth/login/route.ts:66` — `loginSchema.safeParse(await request.json())`: safeParse
  guards schema failures, not the JSON **parse**. The route's custom catch (`:195-198`,
  `logError` + `error('حدث خطأ في الخادم', 500)`) deliberately bypasses `handleError` (generic
  copy = no info leak) — so a malformed body surfaces as **500**.
- Live probes (one-session standalone): garbage body → **500** «حدث خطأ في الخادم»; empty body
  (Content-Length 0) → **500**. Both reproduced.

**Scope REFUTED — the bug is NOT a class across routes.** Census: **40** `request.json()`/
`req.json()` call sites in `src/app/api/**`. Of these:
- **38 are effectively guarded.** The overwhelming majority funnel their catch through
  `handleError` (`src/lib/api-helpers.ts:99-133`), which **already** maps JSON-parse errors to
  **400 «بيانات غير صالحة — خطأ في صيغة JSON»** via message duck-typing (`:110-113`:
  `msg.includes("JSON") || msg.includes("Unexpected token") || msg.includes("parse")`). Verified
  for the exposed ones by reading the routes: orders (catch `:472` → handleError),
  subscriptions/validate (`:67`), register (`:121`). `referrals/claim` guards inline
  (`:24 await request.json().catch(() => ({ code: '' }))` → 400 «كود إحالة غير صالح»).
  `telegram/webhook` pre-checks content-type (`:228`) and its catch-all acks 200.
- **Exactly 2 routes return 500 on malformed JSON:** `auth/login` (public, mobile-CSRF-exempt —
  the real, user-facing bug) and `admin/events/trigger` (auth-gated; negligible).
- (Live probes of orders/validate returned 429 from their DB-backed limiters — those limiters run
  BEFORE the parse, which also bounds the exposure of the 400-vs-500 question; static read
  settles it.)

**Correct status per repo convention:** **400** — the convention already exists in
`handleError`'s JSON branch («بيانات غير صالحة — خطأ في صيغة JSON»). M-3's proposed copy
«صيغة الطلب غير صالحة» is fine but the existing string is the house convention.

**Minimal fix (smaller than M-3's):** in `login/route.ts`, wrap only the parse —
`let body; try { body = await request.json(); } catch { return error('صيغة الطلب غير صالحة', 400); }`
before safeParse — or add the same JSON-message branch to the login catch. Keep the generic 500
for everything else (preserves the hardening's no-leak property; a parse error leaks nothing).
Note: the parse currently precedes the limiters — the new 400-before-limiter path is cheap (no
KDF, no DB write), so no amplification regression vs today's 500-before-limiter.
**M-3's new negative tests remain valid** (malformed + empty body → 4xx, in api-smoke + a unit
contract case) and pair naturally with the M-1 pin update in the same file. **Risk:** negligible.

---

## Interactions / conflicts between the 8 fixes and r118–r120 hardening

1. **C-1 × M-4 (KNOWN):** the `deleteMany` fix changes the mocked prisma surface —
   `r103-fixes.test.ts` F5b mocks must be updated in the same change-set or the fix "breaks
   tests". Pre-planned by M-4; verified by me.
2. **M-1 × M-3 (both touch `tests/e2e/api-smoke.test.ts`):** batch them — M-1 updates the
   `{}`-body pin to 422, M-3 adds the malformed-body cases next to it. One file, one PR slice.
3. **G-1 fallback × print page (NEW, must-flag):** an *unscoped* `turbopack.resolveAlias`
   qrcode→lib/browser.js breaks the print page's server-side `QRCode.toDataURL`
   (`print/page.tsx:67` — needs lib/server.js's PNG renderer; browser build throws in Node).
   Scope any alias to the `browser` condition. The primary fix (dynamic import) has no such risk.
4. **G-1 × QR e2e specs:** `[data-testid="qr-code"]` pins (round79-phaseC, r93-sim-owner) —
   dynamic import delays img mount ~100 ms; Playwright auto-wait covers it; keep a spot-check in
   the fix's test run.
5. **J-1(a) × P-6:** both touch `FloatingWhatsApp` (P-6 moves its mount off `/menu/[slug]`;
   J-1 changes z). Compatible; J-1's z change is needed on all routes regardless of P-6's move.
6. **P-1(a) × G-5:** complementary, not conflicting — removing the toggle shrinks PricingClient;
   G-5's /subscribe SSR-shell split is orthogonal (both cut /subscribe JS).
7. **E-1 × C-7:** same file/schema region (`items/[id]/route.ts`) — no semantic conflict; trivial
   sequencing.
8. **M-3 × E-6:** independent; if E-6's per-IP pre-check lands, keep the parse-400 cheap (before
   or after the limiter is fine — it burns no KDF/DB).
9. **Round-tag check on every touched file** (r103-F5b, round90-F3, r93-W1a, round92-A2,
   round87-A7 in reviews route; round90-F3/round86-A3/round87-A1/round91-F-B/w3-f1/round88-C in
   items/[id]; r106-N2 in SelfHostedQR; r120-U8-F-1 + r97-X1 in the floats; r95/r120-U11-P2-4 in
   PricingClient; r119-S2-P2-2 in subscription-decisions): **none of the 8 fixes removes
   validation, security, error-handling, or a11y** — all are additive guards, copy, z-index, or
   test-contract updates. Ponytail rule respected.

---

*X1 read every cited line at HEAD `74ef578f` before writing a verdict. One bash session started
the standalone server twice for live probes (killed within the same call each time — M-6's
one-session pattern); no code modified; only this file + `5-X1-worklog.md` written.*
