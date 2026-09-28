# X2 — Cross-Check: Money/Security P2 Findings (r121)

**Cross-checker:** X2 (adversarial verification, read-only) · **HEAD:** `74ef578f` (clean)
**Inputs verified:** C-api.md (C-2..C-5), D-database.md (D-1..D-3), E-security.md (E-2, E-3),
A-architecture.md (A-1), P-product.md (P-4, P-5), H-uiux.md (H-4), M-testing.md (order-lifecycle:300 pin).
**Method:** full re-read of every cited file + git archaeology (`4ba875a2` diff, `b5cfa07c` pre-r120 state)
+ live local-PG queries (`information_schema`, NULL counts, `User` roles) + one live
`prisma migrate diff` (read-only, `--from-config-datasource --to-schema`). No code modified, no servers started.

**Verdict legend:** CONFIRMED / PARTIAL (core true, a cited mechanism wrong) / REFUTED.

---

## 1. C-2 + D-1 — OrderItem.price semantics (whatsapp/generate double-count) → **CONFIRMED (both), with the fix contract sharpened**

**Writer (verified):** `src/app/api/orders/route.ts:417-429` — since `4ba875a2` (r120-B1) the create path stores
`price = (discountedPrice ?? price) + Σ deltas`; commit message says exactly "Money truth: OrderItem.price now
stores the EFFECTIVE unit price". Pre-r120 (verified at `b5cfa07c`): `price = discountedPrice ?? price` (base
only), while `recalcSubtotal` (orders/route.ts:306-328) has ALWAYS included deltas — so Order.total/subtotal were
correct in both eras; only the line rows changed semantics. No backfill exists: r120's only migration
(`zz_round120_premium_maxmenus_ladder/migration.sql`) touches `SubscriptionPlan.maxMenus` only.

**Every OrderItem.price consumer mapped:**

| Consumer | Contract assumed | State |
|---|---|---|
| `api/whatsapp/generate/route.ts:125-132` (`formatPrice(Number(oi.price) + deltaSum)`) | BASE (pre-r120) | **WRONG for every post-r120 modified row** (line = base + 2×deltas; «المجموع» = base+deltas) |
| `lib/receipt.ts:105-110` `buildOrderShareText` (`oi.price × qty`, no delta handling) | EFFECTIVE | correct post-r120; understates pre-r120 modified rows |
| `owner/orders/[id]/page.tsx:318` (`oi.price * oi.quantity`) | EFFECTIVE | same |
| `admin/orders/[id]/page.tsx:292` | EFFECTIVE | same |
| `cart/page.tsx:284-321` (receipt from the server 201 echo, `price: Number(i.price)`, modifier names ride the notes line) | EFFECTIVE | correct (fresh rows only) |
| stats (`stats-queries.ts` revenueAggregate `_sum total`, popular-items `_sum quantity`) | uses Order.total / qty | **unaffected** by the semantics change |
| mobile receipt (r119-B2M "server-truth receipt") | EFFECTIVE (echo) | mobile-adjacent, noted |

So C-2's core is code-proven: **exactly one of six consumers still assumes base price**, and it is the one endpoint
whose comment (`route.ts:130-131`, "r118-A3-P2-1: unit price now INCLUDES the modifier deltas") describes the
pre-r120 world. C-2's "no in-repo UI caller" is verified (grep: only comments/tests reference the route).
D-1's additions verified: receipt.ts understates the legacy population; test fixture
`tests/unit/whatsapp-generate.test.ts:94-102` has NO `modifiersJson` on the item (→ `parseStoredModifiers` returns
`[]`, deltaSum=0) so the double-count is **unpinned**; the writer IS pinned by
`tests/unit/orders-create.test.ts:138-160` (`(10+2)×2 = 24` subtotal + snapshot).

**Single consistent contract (adopt r120's):** *stored price = effective unit price; all renderers print it
as-is; deltas appear only as the informational «الإضافات» line.* Exact changes:
1. `whatsapp/generate/route.ts:132` — delete `+ deltaSum` (keep lines 133-141 modifier names/prices as info).
2. D-1's backfill migration for the legacy population (see risk below).
**Tests pinning old behavior:** none pin the `+ deltaSum` arithmetic (fixture is modifier-less; assertion
`'2x لاتيه - 10 د.ل'` at :207 still passes after the fix). `orders-create.test.ts` pins the writer only.
**Risk:** the one-line change alone **trades one wrong population for another** — post-r120 rows become correct,
but pre-r120 snapshot rows (base-only storage) flip from correctly-priced to understated on this one surface
(they were ALREADY understated in the other 5 consumers). The backfill is therefore load-bearing: it must (a)
skip post-r120 rows (createdAt cutoff at the `4ba875a2` deploy, 2026-09-25 — otherwise it double-adds deltas),
and (b) naturally no-ops on pre-r118 bare-id rows (`->>'priceDelta'` on a JSON number is NULL → COALESCE 0) —
those rows stay base-only and keep rendering low on ALL consumers (transitional, documented). No aggregate
recomputes from Σ OrderItem.price anywhere (stats read Order.total), so the backfill cannot corrupt totals.

---

## 2. C-3 — slug reservation enforced on 1 of 3(+1) slug-write paths → **CONFIRMED (all three paths snipe-able; one nuance)**

- Reservation helper shape (inline, duplicated, not a lib): `api/subscriptions/route.ts:66-72` and
  `api/restaurants/route.ts:191-200` (public self-registration, r103-F4) and `api/subscriptions/validate/route.ts:55-58`
  (wizard) — all `findFirst({ status:'pending', metadata:{ path:['tempRestaurants'], array_contains:[{slug}] } })`.
- (a) `PUT /api/restaurants/[id]` — `updateSchema` accepts `slug` (`restaurants/[id]/route.ts:28-45`); owner branch
  :194-209 and both staff branches :210-240 do a regex-only validation then `restaurant.update` — **no pending-payment
  check** → snipe confirmed.
- (b) `POST /api/owner/restaurants` — :110-112 checks `restaurant.findUnique({slug})` only → **snipe confirmed**.
- (c) `PUT /api/settings` `restaurant_slug` — :162-167 regex-only; also **no Restaurant-table uniqueness pre-check**
  (a real collision dies as P2002 → generic 409 «بيانات مكررة» — adjacent copy bug, C-10 family) → **snipe confirmed**.
- Dead-end consequence verified end-to-end: `subscription-decisions.ts:233-237` throws `SLUG_TAKEN` INSIDE the tx
  BEFORE `tx.subscriptionPayment.update` (:239-242) → payment stays `pending`; re-submission blocked by
  `subscriptions/route.ts:76-80` («لديك طلب دفع معلق بالفalready» → 400) and metadata is immutable via any API.
  Admin surfaces the reason «رابط المطعم محجوز مسبقاً. يُرجى إبلاغ العميل باختيار رابط آخر» (:391-393) — advice
  the payer cannot act on.
- **Nuance C-3 understates:** the dead-end is not strictly "no retry path" — an admin CAN reject the pending payment
  (`admin/subscriptions` POST → `handleCancelled`), which frees the user to re-submit with a new slug. But the money
  has already moved (bank/wallet transfer) and the payer has no self-service remedy, so the "admin manual-unwind +
  re-payment" characterization stands.
**Smallest fix:** extract the 4-line pending-slug guard into `src/lib/validation.ts` (beside `slugField`) and call it
at the 3 sites (restaurants/[id] PUT when `slug` present, owner/restaurants POST, settings `restaurant_slug` branch —
optionally add the missing Restaurant-uniqueness pre-check there too, same 409 family). Cost: one extra indexed-ish
findFirst per slug-changing write (rare; D-11 already measured the scan as immaterial at current volume).
**Tests pinning old behavior:** none found for the three sites' slug branches (settings-tenant tests cover isolation
only, per M's matrix). Risk of fixing: negligible.

---

## 3. C-4 + H-4 — settings `restaurant_*` mirror writes bypass Restaurant validation → **CONFIRMED (both halves)**

- `settings/route.ts:10-16`: `{key ≤100, value ≤20_000}` for ANY key; :151-193 maps
  `restaurant_name/description/phone/whatsapp/email/address/workingHours/themeColor/pickupTypes` straight into
  `prisma.restaurant.update` with only the slug regex (:165-167) and logo/gallery media checks (:171-179).
  Canonical schema (verified): `restaurants/[id]/route.ts:34-45` — name ≤200, description ≤1000, phone/whatsapp ≤30,
  **email `.email().max(254)`**, address ≤300, workingHours ≤500. So a 20,000-char name/description/email/themeColor
  is storable via settings. Public-payload shipping verified: `api/public/menu/[slug]/route.ts:42-55` selects
  name/description/phone/whatsapp/email/address/workingHours/themeColor.
- Detail check: `pickupTypes` is `String` (comma-joined) in schema (schema.prisma:107) — the UI's
  `pickupTypes.join(',')` (settings page :171) matches the route's raw-string write (:168); no type bug there,
  just an unbounded string like the rest.
- H-4 verified: `owner/settings/page.tsx:436-518` — name/description/phone/whatsapp/email/address/workingHours inputs
  carry **zero `maxLength`** and no format checks; `type="email"` (:491) never fires because `save()` (:155-194) is a
  plain onClick PUT, not a form submit.
**Fix (mirroring beats routing):** route the settings PUT through a shared `restaurantMirrorSchema` extracted from the
same zod pieces `restaurants/[id]` uses (put the field schemas in `src/lib/validation.ts` next to `slugField` and have
BOTH routes import them — kills the C-4 bypass AND the existing duplication in one move). Client half (H-4): add the
matching `maxLength` attributes 200/1000/30/30/254/300/500. Write-time validation only — stored oversized values stay
grandfathered (house policy, round97-X3).
**Tests pinning old behavior:** M's matrix confirms settings-tenant.test.ts has no bounds tests and its mock factory
lacks `requirePermission` (staff-branch tests need that added). Risk: none beyond grandfathering.

---

## 4. D-2 — no order-status state machine (cancelled→completed mints loyalty + referral) → **CONFIRMED, with the web-UI claim corrected and the fix narrowed**

- `orders/[id]/route.ts:13-20`: zod accepts all five statuses; the ONLY gates are permission (:99-103, non-owner
  status CHANGE needs APPROVE_ORDERS) and the completion block's condition `body.status === 'completed' &&
  existing.status !== 'completed'` (:119). **No transition validation** — cancelled→completed reaches the accrual:
  ptsEarned = floor(total/10) (:120), card upsert points/totalOrders/totalSpent + earn RewardTransaction
  (:172-215), referral conversion (:222-224 tx path, :240-247 plain path). CONFIRMED money mint on cancelled revenue.
- **Correction to D-2's web-UI claim:** the web surfaces do NOT enforce "forward-only". Both owner
  (`owner/orders/[id]/page.tsx:150-159`) and admin (`admin/orders/[id]/page.tsx:130-139`) timeline dots call
  `updateStatus(s)` for ANY `idx <= currentIdx` — i.e. **backward transitions within {new,preparing,ready,completed}
  are one click away on the web** (completed→new included). What the web DOES enforce: `cancelled` is terminal
  (`disabled={!isActive || order.status === 'cancelled'}`) and the action buttons hide on cancelled/completed
  (:204-225 / :180-200). Mobile (`mobile/src/screens/owner/OwnerScreens.tsx:393-394`, mobile-adjacent) renders all
  five chips unconditionally — verified.
- **M's cross-check verified:** `tests/unit/order-lifecycle.test.ts:300` — "toggle round-trip: completed → ready is
  allowed (reverse transition, plain update)" — deliberately PINS a backward transition (plus :314 re-completion via
  the earn-row guard, :283 double-completion idempotent re-ack). A broad "no backward transitions" guard breaks :300.
**Minimal server-side allowed-transition map (derived from both web surfaces + tests):**
`cancelled` is TERMINAL (reject any from-cancelled change, 422 Arabic «لا يمكن تغيير حالة طلب ملغي»); every other
transition — including backward ones within the four live statuses and completed→cancelled (the ledger's deferred
claw-back item presupposes it) — stays allowed; same-status PUTs stay allowed (idempotent re-ack). That single guard
closes the cancelled→completed mint, survives :300/:283/:314, and doesn't break mobile's non-cancelled chips.
One guard before the :119 block + one before the plain :229 update.
**Risk:** mobile's cancelled chip will now 422 with the Arabic message (correct behavior; surfaced via the chip's
error path — mobile edit out of scope this round). Tests required: cancelled→completed 422 + zero loyalty writes;
:300 family unchanged.

---

## 5. E-2 — panel approval lacks the webhook's self-approval guard → **CONFIRMED**

- Webhook guard (verified): `telegram/webhook/route.ts:86-101` — `isPaymentSelfApproval(paymentId, cq.from.id)`
  (impl `subscription-decisions.ts:70-80`: payer's `user.telegramChatId === approverTelegramId`) blocks BOTH approve
  and reject, role-blind, before `resolveSubscriptionPayment`.
- Panel (verified): `admin/subscriptions/route.ts:64-84` — `requirePermission('MANAGE_SUBSCRIPTIONS')` then straight
  to `resolveSubscriptionPayment(id, status)`. **No payer-identity check.**
- Attack chain verified: `subscriptions/upgrade/route.ts:36-39` is requireAuth-only and pins `userId: auth.userId`
  (:140-142) → any MANAGE_SUBSCRIPTIONS holder (sub_admin with the permission, or legacy `admin` who passes every
  permission except MANAGE_USERS — auth.ts:71-76) who owns/manages a restaurant can file their own pending upgrade
  then approve it from the panel → paid plan activated, no money.
**Smallest fix:** yes — the panel-side twin. The identity on this surface is a web userId (not a Telegram id), so the
correct shape is: load `payment.userId` and return 403 «لا يمكنك البت في طلب دفع خاص بحسابك» when it equals
`auth.userId` — role-blind, mirroring the webhook's semantics. (Marginally better root-cause: an optional
`actorUserId` param on `resolveSubscriptionPayment` enforced centrally — prevents a 3rd surface from repeating the
gap; either is acceptable, panel-site is the smaller diff.) Tests: sub_admin(MANAGE_SUBSCRIPTIONS) own payment → 403
stays pending; someone else's → 200; existing webhook self-approval tests stay green.

---

## 6. E-3 — sub_admin(MANAGE_USERS) can reset the legacy `admin` password → **CONFIRMED (premise now locally proven; prod still UNVERIFIED)**

- Guard verified: `admin/reset-password/route.ts:37-39` — the ONLY target guard is
  `target.role === 'super_admin' && auth.role !== 'super_admin'`. A role-`admin` target is resettable by any
  MANAGE_USERS holder (callers: super_admin, or sub_admin+MANAGE_USERS; legacy admin is itself blocked from
  MANAGE_USERS).
- Privilege of the target verified: `auth.ts:71-76` — `admin` passes **every** permission except MANAGE_USERS
  unconditionally (a sub_admin passes only listed ones); `stats-queries.ts:64-66` treats admin as staff-full-access;
  `users/[id]/route.ts:33-38` makes role assignment super_admin-only (so direct self-promotion is closed — the reset
  is the remaining path). Reset also deletes all victim sessions (`:46`) → silent immediate takeover. The sibling
  guards block super_admin targets only (`users/[id]:52-54`, `admin/admins/[id]:29` — the latter route is itself
  super_admin-only at :19, belt-and-braces).
- **Premise strengthened beyond E's report:** the local seeded DB HAS the account — live query returned
  `id=1, username='admin', role='admin'`; the seed creates it by design (`api/seed/route.ts:33-37`, ADMIN_PASSWORD
  env). **UNVERIFIABLE from repo: whether `role='admin'` rows exist in the PRODUCTION Neon DB** (seed is
  NODE_ENV=production-hard-blocked; run `SELECT id, username, role FROM "User" WHERE role='admin';` on Neon before
  prioritizing).
**Fix:** extend the guard to staff targets — `if ((target.role === 'super_admin' || target.role === 'admin' ||
target.role === 'sub_admin') && auth.role !== 'super_admin') return 403` (sub_admin targets included: resetting a
peer sub_admin inherits their permission set — same escalation class). **No existing test pins sub_admin→admin**
(verified: reset-password-guard.test.ts pins sub_admin→super_admin 403, super_admin→super_admin 200,
sub_admin→owner 200; rbac-matrix pins zero-perm/legacy-admin callers 403) — the extension breaks nothing pinned.
Risk: support workflows for staff passwords route through super_admin (acceptable, matches admins/[id]).

---

## 7. C-5 — public POST /api/restaurants legacy single-form fields unbounded → **CONFIRMED (+1 field C missed)**

- `restaurants/route.ts:33-53`: legacy `description/phone/whatsapp/email/address/workingHours/city` are bare
  `z.string().optional()`; the array form (:21-31) caps name 200 / description 1000 / phone 30 / whatsapp 30.
  **Additionally, legacy `name` (:35) is `min(1)` with NO `.max`** — C-5's list omits it; it is unbounded too.
- Legacy normalization (:220-230) persists description/phone/whatsapp (:246-248) and email/address/workingHours
  (:249-251) into Restaurant rows on the PUBLIC self-registration path (username+password present; 5/min/IP —
  verified :13, :124-141). description/phone/whatsapp ship in the public menu payload (verified §3).
  `city` accepted but never stored (create data has no `city`) — dead field confirmed.
**Smallest fix:** apply the same bounds to the legacy fields — cleanest: coerce a legacy single-menu body into
`restaurants: [{...}]` pre-parse and validate once through `restaurantInputSchema` (+ the email/address/workingHours
pieces which exist only in restaurants/[id] PUT — fold them into the shared schema from §3). Drop `city` from the
schema (or store it; dropping is the ponytail move — nothing reads it). Write-time only; nothing pinned
(M's matrix lists no legacy-form bounds tests). Risk: none.

---

## 8. A-1 — 85-line Telegram payment-keyboard block duplicated across the two payment routes → **CONFIRMED as duplication; the "3rd variant" is a consolidation TRAP**

Byte-level diff of `subscriptions/route.ts:126-214` vs `subscriptions/upgrade/route.ts:170-259`:
**Identical logic (the ~85 lines):** getDecryptedBotToken gate → `getAdminTelegramIds()` +
`telegramBroadcastTarget.findMany({isActive})` + TELEGRAM_CHAT_ID/TELEGRAM_GROUP_IDS env fallback (19 lines) →
chunked `Promise.allSettled` sends, 10/batch, 60ms pause between batches (both carry the round89-C2 comment) →
`telegramMessages` metadata merge-update with best-effort `.catch` logging → `keyboardErr` catch shell.
**Exact differences (all 6):**
1. `msg` text — subscribe: `🔗 *طلب اشتراك جديد* #…` + `• عدد المطاعم: N` (round91-F-B counter, :148-152);
   upgrade: `⬆️ *طلب ترقية اشتراك* #…` + `• المطعم: #<id>` (:192-199).
2. Approve button label: `🟢 موافقة على التفعيل` vs `🟢 موافقة على الترقية` (reject label identical).
3. Log prefixes `[subscriptions]` vs `[upgrade]` — **pinned by tests** (subscriptions-upgrade.test.ts:520 asserts
   `'[upgrade] failed to store telegramMessages'`), as are both button labels
   (subscriptions-family.test.ts:168, subscriptions-upgrade.test.ts:202) and the env-fallback behavior (:525+).
4. `plan?.nameAr ?? 'غير معروف'` (subscribe) vs bare `plan.nameAr` (upgrade).
5. Test-file references inside the pacing comments.
6. Trivial line-offset drift (~89 vs ~90 lines).
**The trap:** the "third variant" `gatherTargets()` (`telegram-broadcast.ts:50-72`) is NOT the same audience — it
gathers broadcastTargets + (non-adminOnly) ALL linked users' chatIds, and does NOT include `getAdminTelegramIds()`
or the env fallbacks. Consolidating the payment-keyboard sends onto it would (a) send payment-approval keyboards to
every Telegram-linked OWNER and (b) drop the admin ids/env fallbacks — a real money-approval regression.
**Safe consolidation:** a NEW helper (A-1's `lib/telegram-notify.ts`) parameterized on `{msg, approveLabel, logPrefix}`
returning the stored `telegramMessages`, reproducing the payment-route target set verbatim; both routes call it
inside their existing try/catch shells. Do NOT touch gatherTargets. Tests: both existing suites must stay green
UN_CHANGED (they pin labels, prefixes, metadata shape, env fallback) — which the parameterization satisfies.

---

## 9. D-3 — schema↔DB drift on 4 array columns → **PARTIAL: drift CONFIRMED live; the "drift gate flags it" mechanism REFUTED (proven with the repo's own tool)**

**Confirmed by live PG:** `Restaurant.gallery` (0_init/migration.sql:69), `User.permissions`
(11_replay_parity/migration.sql:76), `MenuItem.dietaryTags`/`allergens` (:59,61) are `is_nullable=YES`; schema.prisma
declares all four as required lists (:23, :104, :158-159) — and Prisma's datamodel cannot even express optional
lists, so required is the only representation. `MenuItem.showcaseTags` (migration 12:18, `NOT NULL DEFAULT '{}'`)
is the lone array that matches. NULL counts today: **0 rows** in all four columns (live query) → the proposed
`SET NOT NULL` migration is a no-op on current data.
**Refuted sub-claim:** D-3's impact says "a `migrate diff`-based drift gate flags these 4 columns". I ran the
repo's own tooling read-only: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`
→ **"No difference detected."** Prisma's diff engine normalizes a nullable array-with-default to a required list
(same reason a fresh `migrate deploy` leaves them nullable and `migrate dev` never generates the tightening).
So: the drift is real at the SQL level and invisible to every Prisma-based gate — including the one
11_replay_parity's header claims verified "ends EXACTLY at schema.prisma" (true only under this blindness).
**Correct fix direction:** make the DB match the schema (D-3's `UPDATE … SET col='{}' WHERE col IS NULL` then
`ALTER … SET NOT NULL` ×4) — NOT schema-match-DB (impossible: Prisma lists are always required). But re-rate the
impact honestly: defense-in-depth against raw-SQL/ops writes only; no app-path writes NULL (all writes are Prisma),
no gate will ever catch a regression, and no runtime path reads these columns without defaults. P3 stands.

---

## 10. P-4 + P-5 — approval black hole + expiry cliff → **CONFIRMED (every mechanic verified; minimal fixes sized)**

P-4, all verified:
- 24h SLA promise: `order-confirmed/page.tsx:106-107` («…خلال 24 ساعة. سيتم إشعارك عند اكتمال التفعيل»);
  `subscribe/page.tsx:289` («سيتم إشعارك عند التفعيل»).
- The only approval surfaces: subscribe page 15s poll (:143-181) — **gated on `sseOpen`** (`if (!sseOpen) return;`)
  and it DOES handle `subscription_approved` (:162-167) — but only while that tab/dialog is open;
  `UserBannerNotifier.tsx:34-37` handles **`subscription_rejected` only** (no approved branch) — and the poll
  (`/api/user/events`, server-filtered by `metadata.userId`, user/events/route.ts:31-38) already DELIVERS
  `subscription_approved` events (they carry `metadata.userId`, subscription-decisions.ts:184-193, :323-333).
- Dead end: `owner/page.tsx:130-134` — `!activeId` → `setError('لم يتم تفعيل حسابك بعد…')`, no payment status,
  no date, no support link; the error-state retry button no-ops (`:188` `activeId && load(activeId)`).
- Lock: `subscriptions/route.ts:76-80` 400 «لديك طلب دفع معلق بالفعل» (partial-unique-index backed);
  `cron/cleanup` purges Session/AuditLog/SystemEvent/RateLimitEntry only (verified :23-84) — pending payments live
  forever. Telegram user-notify fires only when the payer already linked a bot (`subscription-decisions.ts:368-373`)
  — a fresh subscriber hasn't.
**Minimal honest fixes (all feasible, verified):** (1) one more `eventType === 'subscription_approved'` branch in
UserBannerNotifier (success banner + link to /owner) — **zero API change needed**, the event already flows;
(2) owner dead-end: replace the bare error with an honest pending card — smallest data-bearing version is a
`hasPendingPayment`/pending-since extension on `/api/auth/me` (or honest copy + WhatsApp support link with NO new
data if the ponytail bar is strict); (3) drop «خلال 24 ساعة» for «سريعاً خلال أوقات الدوام» (or enforce via an
escalation SystemEvent — bigger, skip).

P-5, all verified:
- Silent flip: `vercel.json` runs `/api/cron/subscription-expiry` daily 01:00; the cron (route :26-41) flips
  PAID→EXPIRED with no pre-expiry event. Lazy enforcement exists independently (`subscription-guard.ts:16-24`:
  EXPIRED status OR `planEnd < now`), so the cliff bites even without the cron.
- No days-remaining surface: `PlanUsageBadge.tsx` has NO planEnd/subscriptionStatus/«متبقي» reference (grep);
  `/api/auth/me` returns `subscriptionStatus` only (route :36) — **no planEnd** client-side.
- Swallowed reason: `owner/menu/page.tsx:131` `catch { premiumToast('error', 'فشل الحفظ'); }` discards the 403
  «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» that owner write routes return (owner/restaurants/route.ts:27,85 etc.),
  while `item-dialog/use-item-save.ts:127` on the SAME page surfaces `e.message` (csrfJson throws the server's
  Arabic envelope — verified csrf-client.ts:38-57). Inconsistent within one page, confirmed.
- Menu stays live / orders keep flowing on expiry (public menu + orders POST have no subscription gate) — verified
  by the guard being used only in owner/restaurants + owner/reviews (per P's grep; consistent with my reads).
**Minimal honest fixes:** (1) delete the generic catches and toast `e.message` like use-item-save does (one line per
site; same locus as H-6); (2) surface `planEnd` in `/api/auth/me` via the existing `getUserSubscriptionState()`
lib (one call) + a «ينتهي اشتراكك في X يوم — جدّد» card with a `/subscribe` link in the owner layout (pairs with
the P-4 banner change in the same component). Keep the live-menu grace policy as-is (defensible, P agrees).

---

## Cross-interaction risks between these fixes (the ALSO section)

1. **C-2/D-1 × order-detail rendering:** dropping `+ deltaSum` makes whatsapp/generate agree with the other five
   consumers, but WITHOUT the backfill it silently degrades pre-r120 snapshot rows on that one surface (they were
   correct there, wrong everywhere else). Ship the backfill (createdAt-cutoff-guarded) WITH the one-liner, or accept
   and document the transitional understatement. The backfill cannot corrupt anything: no aggregate consumes
   Σ OrderItem.price (stats read Order.total; loyalty reads Order.total at completion time).
2. **D-2 × cancel-race handling:** the "cancelled is terminal" guard must sit BEFORE both the :119 accrual block
   and the :229 plain update; it must NOT touch same-status PUTs (idempotent re-ack, order-lifecycle:283) or
   completed→X transitions (:300 pin). Do not implement a full forward-only map — it breaks the web timeline dots'
   backward jumps and mobile's chips.
3. **C-3 × C-4:** the settings `restaurant_slug` branch needs the pending-reservation guard AND (found during
   verification) has NO Restaurant-uniqueness pre-check at all — fold both into the same fix; also note the P2002
   fallback there returns the misleading name-conflict copy («هذا الاسم موجود مسبقاً») for a slug conflict.
4. **C-4 × C-5 × H-4:** one shared `restaurantFieldSchema` in lib/validation.ts serves restaurants/[id] PUT,
   restaurants POST (both forms), owner/restaurants POST, and the settings mirror; H-4's maxLengths are its client
   shadow. Landing them separately risks a fourth re-duplication.
5. **E-2 × E-3:** independent guards, but the compound chain (sub_admin resets admin password → logs in as admin →
   admin auto-passes MANAGE_SUBSCRIPTIONS → self-approves own payment via the E-2 gap) means fixing EITHER one
   breaks the demonstrated chain; fix both. E-2's guard should be role-blind (the webhook's is).
6. **A-1 × everything:** the consolidation helper must reproduce the payment-route target set verbatim; reusing
   telegram-broadcast's gatherTargets would leak approval keyboards to all linked owners (see §8 trap). Tests pin
   labels/prefixes/metadata — parameterize, don't unify copy.
7. **P-4 × P-5 × C-3:** all three touch the pending/expired-owner limbo. C-3 removes ONE cause of a stuck pending
   payment (SLUG_TAKEN); P-4's banner + honest dead-end cover the remaining causes (slow approval). The
   UserBannerNotifier gains both an `subscription_approved` branch (P-4) and optionally an expiry card (P-5) —
   one component, one batch.
8. **D-3:** zero interaction risk (0 NULL rows live; write paths all Prisma).

## Verdict summary

| # | Finding | Verdict |
|---|---|---|
| 1 | C-2/D-1 OrderItem.price double-count | **CONFIRMED** (backfill is load-bearing; no test pins the old arithmetic) |
| 2 | C-3 slug reservation 1-of-3 | **CONFIRMED** (3/3 paths snipe-able; admin-reject escape exists but payer has no self-service) |
| 3 | C-4/H-4 settings validation bypass + UI caps | **CONFIRMED** (mirror a shared schema; pickupTypes is String — no type bug) |
| 4 | D-2 no status machine | **CONFIRMED, narrowed** (web UI allows backward transitions too; fix = cancelled-terminal only; :300 pin survives) |
| 5 | E-2 panel self-approval | **CONFIRMED** (panel twin on payment.userId, role-blind) |
| 6 | E-3 admin-target reset | **CONFIRMED** (account exists locally; **prod UNVERIFIED — query Neon before prioritizing**) |
| 7 | C-5 legacy fields unbounded | **CONFIRMED (+legacy `name` also unbounded — C missed it)** |
| 8 | A-1 Telegram block duplication | **CONFIRMED** (6 exact diffs listed; gatherTargets is a consolidation trap, not a variant to reuse) |
| 9 | D-3 array nullability drift | **PARTIAL** — drift CONFIRMED live (0 NULL rows); "migrate diff flags it" REFUTED by live run ("No difference detected") |
| 10 | P-4/P-5 black hole + cliff | **CONFIRMED** (all mechanics; minimal fixes sized, banner needs zero API change) |
