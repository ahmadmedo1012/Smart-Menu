# C — Backend/API Audit (r121)

**Auditor:** C (Backend/API) · **Scope:** all 66 routes under `src/app/api/**` (99 handlers) + shared libs they call (`api-helpers`, `rate-limit`, `order-modifiers`, `subscription-decisions`, `referral-conversion`, `payment-schema`, `modifier-schema`, `stats-queries`) · **Mode:** READ-ONLY — no code modified, no servers started.

**Method:** line-by-line read of the money path (orders POST/PUT, subscriptions POST/upgrade, subscription-decisions, telegram webhook, loyalty ×4, referrals/claim, whatsapp/generate) and of every CRUD/tenant route (items ×2, categories ×2, restaurants ×2, owner/restaurants ×2, settings, users, admin/subscriptions, admin/create-owner, telegram/config, upload, auth/register, public/menu, stats ×2 + stats-queries, orders/count, cron/cleanup); zod-schema diffing across sibling routes; git-diff verification of r120 (`4ba875a2`) against current consumers; cross-check against the r118 A-fleet / r119 S-fleet findings and the r121 E auditor (E-security.md) to avoid re-reporting.

**Headline:** the 20-round hardening spine HOLDS everywhere it was applied (order POST contract, subscription-decision races, loyalty/referral atomicity, plan-cap locks, error contract). The new findings cluster in exactly the places the hardening *didn't reach*: **one cross-tenant destructive commit in review moderation (C-1)**, **one r120 money-truth regression on the server-side invoice API (C-2)**, **slug-reservation enforced on only 1 of 3 slug-write paths (C-3)**, and **two weaker parallel write channels into Restaurant/MenuItem rows that bypass the canonical validation (C-4, C-5)**.

---

## Findings

### C-1 [P1] Review DELETE commits a cross-item deletion, then reports 404 — scoped caller can destroy any review on the platform
- Type: FACT (code-proven)
- Evidence: `src/app/api/items/[id]/reviews/route.ts:198-219` — inside `prisma.$transaction`, `tx.review.delete({ where: { id: reviewId } })` runs FIRST (line 199-202), and only AFTER the delete does the scope check run: `if (!review || review.menuItemId !== itemId) return null;` (line 205). Returning `null` from the `$transaction` callback **resolves** it → the transaction **COMMITS** — the review row of ANOTHER item is already deleted. The route then answers `404 «التقييم غير موجود»` (line 219) while the row is gone. The counter-recompute (lines 208-216) only runs for the URL's `itemId`, so the victim item's `ratingCount`/`avgRating` permanently drift upward (they still count the deleted review). Ownership is gated on the URL's item only (lines 164-196): any owner/staff-authorized caller for item X can pass `?reviewId=` of a review belonging to item Y (any tenant) and silently delete it. Zero test coverage exists for this handler (`rg reviewId tests/` → no matches).
- Impact: cross-tenant destructive write (competitor review vandalism — delete rivals' 5★ reviews), permanent rating-counter drift on the victim item, and a misleading 404 that hides the deletion from the caller and from logs/audit (no audit row for review moderation at all).
- Fix (minimal, root-cause): scope the delete itself — replace the delete+check with `const deleted = await tx.review.deleteMany({ where: { id: reviewId, menuItemId: itemId } }); if (deleted.count === 0) throw new Error('REVIEW_NOT_FOUND');` then re-read for the response; keep the existing recompute. (Throwing rolls the tx back; deleteMany makes the scope check and the delete one statement.)
- Risk: of fixing — negligible (behavior only changes for the cross-item case, which currently corrupts data). Of not fixing — any authenticated owner can vandalize platform-wide reviews undetected.
- Tests required: owner of restaurant A calls `DELETE /api/items/{ownItemId}/reviews?reviewId={review of restaurant B's item}` → 404 AND review still exists AND B's counters unchanged; in-scope delete → 200 + counters recomputed.

### C-2 [P2] r120 regression: `/api/whatsapp/generate` double-counts modifier deltas — server-side invoice lines contradict the charged total
- Type: FACT (code-proven)
- Evidence: `src/app/api/whatsapp/generate/route.ts:125-132` — `deltaSum = mods.reduce((s, m) => s + m.priceDelta, 0)` then the line renders `formatPrice(Number(oi.price) + deltaSum)`. That `+ deltaSum` was the r118-A3-P2-1 fix, written when `OrderItem.price` stored the BASE price. r120-B1 (`4ba875a2`, `src/app/api/orders/route.ts:417-429`) changed the stored price to the EFFECTIVE unit price (base + deltas) so "receipt lines sum exactly to the stored total" — but this route was not updated (git-verified: `4ba875a2` touched `api/orders/route.ts`, not `whatsapp/generate`). For every post-r120 order with modifiers, the generated line = base + 2×deltas while «المجموع» = base + deltas — the exact "receipt said 18+5=23 while الإجمالي said 32" contradiction class r120 declared fixed. No in-repo UI caller remains (web cart builds its own receipt from the server echo; mobile likewise) — the route is a live, permission-gated, API.md-documented invoice endpoint with unit tests that use a no-modifier fixture (`tests/unit/whatsapp-generate.test.ts:94-99`), so the drift is unpinned.
- Impact: any owner/staff caller of the documented server-side invoice API receives a self-contradicting money text for modified orders (e.g. item 18 + «إضافات» +5 → line shows «28 د.ل», total shows «23 د.ل»). Latent today (no UI caller) but one owner-tool/integration away from user-facing.
- Fix (minimal): drop `+ deltaSum` at line 132 (render the stored price as-is — it already includes deltas). Pre-r120 legacy rows will then understate by their deltas (few, transitional); if that matters, gate on the snapshot-vs-legacy format from `parseStoredModifiers` instead.
- Risk: of fixing — legacy pre-r120 rows render slightly low on this one surface (acceptable, documented). Of not fixing — the platform's own server-side invoice API violates the money-truth invariant r120 established.
- Tests required: invoice built from a post-r120-shaped row (price 23, snapshot mods [{priceDelta:5}]) → line shows «23 د.ل» not «28 د.ل»; lines × qty sum equals stored total.

### C-3 [P2] Pending-payment slug reservation is enforced on only 1 of the 3 slug-write paths — a slug snipe re-creates the r103-F4 payer dead-end
- Type: FACT (code-proven)
- Evidence: r103-F4 added the pending-`tempRestaurants` slug reservation to the public self-registration path (`src/app/api/restaurants/route.ts:187-201`) and it exists on subscriptions POST (`src/app/api/subscriptions/route.ts:59-74`) and the wizard check (`subscriptions/validate/route.ts:52-59`). But: (a) `PUT /api/restaurants/[id]` accepts `slug` (`restaurants/[id]/route.ts:34-45`, owner branch line 194-209) with a format regex and DB-uniqueness only — no pending-payment check; (b) `POST /api/owner/restaurants` checks only the Restaurant table (`owner/restaurants/route.ts:111-112`) — no pending-payment check; (c) `PUT /api/settings` can write `restaurant_slug` with only a regex check (`settings/route.ts:162-167`, see C-4). Sequence that breaks a payer: payer submits payment (slug X reserved pending, money already transferred) → another owner PUTs/PATCHes their restaurant slug to X (allowed) → approval runs `handleVerified` → `SLUG_TAKEN` thrown inside the tx BEFORE the payment update (`subscription-decisions.ts:233-242`) → payment stays `pending` forever with no retry path for a different slug (the payer's metadata is immutable; «لديك طلب دفع معلق» blocks a fresh payment).
- Impact: money-path dead-end for a paying customer (the exact scenario r103-F4 closed for POST); requires a slug-guessing or observant second party, but the reservation exists precisely because this class was deemed worth closing.
- Fix (minimal): extract the pending-slug guard (`findFirst({ where: { status:'pending', metadata: { path:['tempRestaurants'], array_contains:[{slug}] } } })`) into a lib helper and call it in restaurants/[id] PUT (when `slug` changes), owner/restaurants POST, and settings' `restaurant_slug` branch — 409 «الرابط محجوز بطلب دفع معلق».
- Risk: of fixing — one extra query per slug-changing write (rare). Of not fixing — paid flow becomes an admin manual-unwind + re-payment.
- Tests required: pending payment with slug X → owner PUT slug→X → 409; same for owner/restaurants POST.

### C-4 [P2] `PUT /api/settings` `restaurant_*` mirror writes bypass the canonical Restaurant field validation (20k name, unchecked email/themeColor, slug without reservation)
- Type: FACT (code-proven)
- Evidence: `src/app/api/settings/route.ts:10-16` accepts any `{key ≤100, value ≤20_000}` pairs; lines 23-36 + 151-193 map `restaurant_name/description/phone/whatsapp/email/address/workingHours/slug/themeColor/pickupTypes` straight onto `prisma.restaurant.update`. Only `slug` gets a regex (line 165) and logo/gallery get media checks (171-179). Compare the canonical `PUT /api/restaurants/[id]` schema (restaurants/[id]/route.ts:34-45): name ≤200, description ≤1000, phone/whatsapp ≤30, **email `.email().max(254)`**, address ≤300, workingHours ≤500. Via settings, an owner can store a 20,000-char name/description/phone/whatsapp/email/themeColor/pickupTypes — and name/description/phone/whatsapp/themeColor ship in the PUBLIC menu payload (`public/menu/[slug]/route.ts:44-54`, restaurants/[id] public projection :117-128). `restaurant_slug` here also skips C-3's pending-reservation.
- Impact: same-column-weaker-channel validation bypass — the payload-hygiene rule (bounded strings on everything that renders publicly) is voidable through the settings batch; DB bloat + client-side DoS on the hottest public payload; inconsistent data quality.
- Fix (minimal): validate the extracted restaurant fields against the same zod pieces restaurants/[id] PUT uses (share the field schemas from a lib), keep the existing slug regex + media checks. Ponytail: a `restaurantMirrorSchema` applied to the `restaurantFields` subset before the update.
- Risk: of fixing — stored oversized values predating the fix must be grandfathered (validation on write only — same policy as round97-X3 slug tightening). Of not fixing — the public menu payload stays injectable with 20k strings by any owner.
- Tests required: settings PUT `restaurant_name` of 300 chars → 422; `restaurant_email` invalid → 422; name ≤200 → 200.

### C-5 [P2] Public `POST /api/restaurants` legacy single-form fields are unbounded while the array form in the SAME schema is capped
- Type: FACT (code-proven)
- Evidence: `src/app/api/restaurants/route.ts:33-53` — `createSchema` legacy fields `description`, `phone`, `whatsapp`, `email`, `address`, `workingHours`, `city` are bare `z.string().optional()` (no `.max`), while the array form `restaurantInputSchema` (lines 21-31) caps name 200 / description 1000 / phone 30 / whatsapp 30, and restaurants/[id] PUT caps email (254 + format) / address 300 / workingHours 500. The public self-registration path (username+password present, 5/min/IP) normalizes to the legacy form when `restaurants[]` is absent (lines 220-230) — so a public caller can persist unbounded description/phone/whatsapp/email/address/workingHours into Restaurant rows; description/phone/whatsapp render in the public menu payload. (`city` is accepted but never stored — dead field, lines 48 vs 242-257.)
- Impact: unbounded free text on a PUBLIC route — the exact class r103-F7/r118-B4 bounded elsewhere; row bloat + public-payload bloat; API-contract inconsistency between the two forms of one endpoint.
- Fix (minimal): apply the `restaurantInputSchema` bounds to the legacy fields (or collapse: coerce a legacy single-menu body into `restaurants: [{...}]` and validate once). Drop or store `city`.
- Risk: of fixing — none (write-time validation only). Of not fixing — public write surface with multi-KB strings per field per attempt (bounded only by the platform body cap).
- Tests required: legacy-form POST with 5000-char description → 422; array-form unchanged.

### C-6 [P3] `MenuItem.nameAr` unbounded on items POST+PUT (name is capped); `dietaryTags`/`allergens` unbounded arrays of unbounded strings — all ship in the public menu payload; API.md row is stale
- Type: FACT (code-proven)
- Evidence: `src/app/api/items/route.ts:41` and `src/app/api/items/[id]/route.ts:79` — `nameAr: z.string().nullable().optional()` with NO `.max`, while `name` is `.max(100)` and r103-F7 capped the *categories* nameAr (100) with the stated rationale "unbounded … ships inside the public ISR menu payload (client-side DoS)". Items nameAr ships in the same payload (`public/menu/[slug]/route.ts:81`). Same file lines 54-55: `dietaryTags`/`allergens` = `z.array(z.string())` — no per-string max, no array max (contrast `showcaseTags` `.max(40)`×3 at line 61) — also selected into the public payload (line 90-91). `docs/API.md:63` claims "icon/nameAr bounded (r103-F7)" for /api/items — inaccurate (F7 touched categories only).
- Impact: same DoS/bloat class the repo's own payload-hygiene rule targets; docs misstate the contract.
- Fix (minimal): `nameAr: z.string().max(100).nullable().optional()` on both routes; `z.array(z.string().max(40)).max(10)` for both tag arrays; update the API.md row.
- Risk: minimal (write-time validation; stored data untouched per house policy).
- Tests required: 200-char nameAr → 422; 11 dietaryTags → 422.

### C-7 [P3] Unbounded numeric fields + a price-0 POST/PUT split on the item write family
- Type: FACT (code-proven) + SUGGESTION (the split)
- Evidence: (a) `price` has no upper bound — POST `z.number().min(0)` (items/route.ts:44), PUT `z.number().positive()` (items/[id]/route.ts:82); `discountedPrice` same pair; `priceDelta: z.number()` unbounded both signs (`modifier-schema.ts:17`). The DB `Decimal(10,2)` ultimately rejects ≥1e8 with a caught Prisma error (generic 400/500), so 1e9 fails ungracefully rather than 422. (b) `sortOrder: z.number().int()` unbounded on categories POST/PUT (categories/route.ts:17, categories/[id]/route.ts:14), items POST/PUT (:52/:91), modifier schema (:19,30); `featuredRank` unbounded int on the restaurants admin schema (restaurants/[id]/route.ts:65). (c) POST allows `price: 0` (free item — legitimate) but PUT demands `.positive()` → re-saving a free item 422s unless price is omitted — create/update drift, adjacent to but distinct from the known S2-P2-6 (discountedPrice=0, still open at HEAD — verified `items/[id]/route.ts:83`).
- Impact: fat-finger 1e8 prices fail as opaque errors; ±huge sortOrder reorders menus oddly; free items can't be round-tripped through PUT.
- Fix (minimal): add `.max(1_000_000)` (or similar) to price/discountedPrice/priceDelta; `.min(-10000).max(10000)` on sortOrder fields; unify price 0 (allow on PUT like POST; superRefine already guards discount ≤ price).
- Risk: minimal.
- Tests required: price 2_000_000 → 422 with Arabic message; PUT price 0 on a free item → 200.

### C-8 [P3] `GET /api/orders/count` skips the sub_admin `APPROVE_ORDERS` gate its sibling LIST enforces
- Type: FACT (code-proven)
- Evidence: `src/app/api/orders/count/route.ts:48-50` — the role ladder lets ANY `sub_admin` through (only USER/others 403), and with no `restaurantId` param the COUNT is platform-wide for any `status` filter. The sibling `GET /api/orders` requires `APPROVE_ORDERS` for sub_admin (`orders/route.ts:106-112`, round92-B1 — same rationale family: order visibility is approval-grade). A zero-permission sub_admin can poll platform-wide and per-restaurant order counts by status (business-volume disclosure; counts only, no PII).
- Impact: minor information disclosure + an authorization matrix inconsistency inside the orders family (comments claim "Same authorization matrix as GET /api/orders").
- Fix (minimal): mirror the sub_admin `APPROVE_ORDERS` check from orders/route.ts:106-112.
- Risk: none (5s notifier pollers are owners).
- Tests required: zero-permission sub_admin GET count → 403; with APPROVE_ORDERS → 200.

### C-9 [P3] Two public DB-read handlers have no rate limiter while their families are throttled
- Type: FACT (code-proven)
- Evidence: `src/app/api/items/[id]/route.ts:33-75` — GET is public for `available` items (r87-A8) and runs `findUnique` + 10-review include with **no** limiter, while the LIST route `/api/items` got 60/min/IP in r93-W1a (MED-3) for exactly this reason (items/route.ts:21-29). `src/app/api/items/[id]/reviews/route.ts:26-135` — GET runs `findMany` + `aggregate` with no limiter (only POST is throttled, lines 10-15). Both are anonymous DB query surfaces; the public-menu and restaurants/[id] GET families are all capped at 60/min/IP.
- Impact: unthrottled anonymous query load (mild — both are single-item indexed reads), inconsistent with the repo's own "cheap public DB queries sit behind a per-IP limit" posture.
- Fix (minimal): one shared 60/min/IP limiter (`items-get:${ip}` family), id-free keys (key-dilution rule r90-F4).
- Risk: none.
- Tests required: 61st/min request → 429 Arabic.

### C-10 [P3] Loyalty card create is check-then-act with no idempotency — a double-tap surfaces the generic «هذا الاسم موجود مسبقاً» 409 on a phone-keyed card
- Type: FACT (code-proven)
- Evidence: `src/app/api/loyalty/route.ts:58-81` — `findUnique` → generate referral code (loop of `findUnique`s) → `create`. Two concurrent submissions (double-tap on a kiosk) both pass the read; the loser hits P2002 on `(customerPhone, restaurantId)` → falls to `handleError` → 409 «بيانات مكررة — هذا الاسم موجود مسبقاً» (api-helpers.ts:113-115) — a NAME-conflict message for a phone-keyed loyalty card, telling the customer their "name exists". The referral-code loop can also lose its own race (two cards minting the same code) → same misleading 409. Every sibling money surface (orders idempotencyKey, referrals/claim P2002-catch, redeem guarded updateMany) is idempotent-friendly; this one isn't.
- Impact: duplicate-submission UX defect + wrong error copy on a public (20/min-limited) endpoint.
- Fix (minimal): catch P2002 → re-read the card by `(customerPhone, restaurantId)` and return the normal `success({card…})` shape (idempotent create), matching the claim route's documented pattern.
- Risk: minimal.
- Tests required: concurrent duplicate POST → 200 with the same card, no 409.

### C-11 [P3] `subscriptions/upgrade` phone lacks the Arabic-digit normalization its sibling schema has
- Type: FACT (code-proven)
- Evidence: `src/lib/payment-schema.ts:24-28` normalizes ٠-٩ digits before the `^09\d{8}$` regex (subscribe path); `src/app/api/subscriptions/upgrade/route.ts:16-19` re-declares the field WITHOUT `normalizeDigits` — a Libyan user typing Arabic-Indic digits in the upgrade form gets 422 «رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 09» while the subscribe wizard accepts the same input.
- Impact: inconsistent validation of the identical field on the two payment surfaces; Arabic-first product rejects Arabic digits on one path only.
- Fix (minimal): extract the normalized phone field into `src/lib/validation.ts` and use it in both schemas (also drops the duplicated regex).
- Risk: none.
- Tests required: upgrade with `٠٩١٢٣٤٥٦٧٨` → accepted, stored as `0912345678`.

### C-12 [P3] `tempRestaurants` `.max(5)` + its rationale comment are stale after the r120 plan-ladder migration — Enterprise (10 menus) is capped at 5 menus per payment
- Type: FACT (comment/policy drift) + SUGGESTION (the bound)
- Evidence: `src/lib/payment-schema.ts:50-58` — the comment cites "Business maxMenus=5; Free 1 / Basic 2 / Pro 4 — Premium 9999 unlimited", but r120's `zz_round120_premium_maxmenus_ladder` reset the ladder to 1·1·2·3·10 (Premium=2, Pro=3, **Enterprise=10** — ENGINEERING_STATE r120). The hard `.max(5)` therefore now under-serves the top plan: an Enterprise buyer can request at most 5 menus in the payment wizard and must add the remaining 5 through the dashboard (`owner/restaurants` POST — which does honor maxMenus=10).
- Impact: policy/code drift; a paying Enterprise customer hits a confusing «الحد الأقصى 5 مطاعم» on the highest plan.
- Fix (minimal): fix the comment; either raise the bound to the max seeded `maxMenus` (read at startup or hardcode 10 with a comment tying it to the ladder) or keep 5 deliberately and say so in the wizard copy.
- Risk: minimal.
- Tests required: 6-restaurant Enterprise payload → accepted (if bound raised).

### C-13 [P3] `telegram/config` upsert schema is unbounded on every field (botToken, chatId, events[])
- Type: FACT (code-proven)
- Evidence: `src/app/api/telegram/config/route.ts:9-16` — `botToken: z.string().min(1).optional()` (no format check `\d+:[\w-]{35}`, no max), `chatId: z.string()` (unbounded), `events: z.array(z.string())` (unbounded length × count). EDIT_SETTINGS-gated, so exposure is admin-only, but it violates the repo-wide payload-hygiene rule and a mistyped token surfaces only later as a Telegram setWebhook error (line 103) after the row is already saved. (Related but NOT re-reported: S3-P2-5 — `chatId` is stored and consumed by nothing.)
- Impact: low — row bloat + late failure instead of a clean 422; drift from every other bounded schema in the API.
- Fix (minimal): `botToken: z.string().max(100).regex(/^\d+:[A-Za-z0-9_-]{30,}$/)` (or length-only if format feels strict), `chatId: z.string().max(64)`, `events: z.array(z.enum([...known event keys]))` or `z.array(z.string().max(40)).max(20)`.
- Risk: minimal; a stricter token regex could reject exotic future token shapes — length cap alone is the safe subset.
- Tests required: 200-char chatId → 422; malformed token → 422.

---

## Cross-references (found independently, already reported by Auditor E — not counted above)
- **E-1 [P1]** `PUT /api/items/[id]` never re-scopes the client-provided `categoryId` to the item's tenant — cross-tenant item move. I independently confirmed the same lines (`items/[id]/route.ts:92,128-224`); the fix belongs with the ownership check.
- **E-2 [P2]** the admin-panel approval path (`admin/subscriptions` POST → `resolveSubscriptionPayment`) lacks the `isPaymentSelfApproval` guard the webhook has (`telegram/webhook/route.ts:89-101` vs `admin/subscriptions/route.ts:64-84`) — confirmed by my read as well.

## Ledger / prior-round verification (checked at HEAD — NOT re-reported as findings)
- **r118-B1 order-POST hardening HOLDS**: quantity `.max(MAX_ITEM_QUANTITY=99)` (orders/route.ts:39), server-side re-pricing + item-tenant/availability/inactive-category filters (:218-228), modifier-group contract + dedupe + negative-total rejection (:235-331), order-time `modifiersJson` snapshot (:434-436), discount forced 0 (:393-396), `FOR UPDATE` plan-cap serialization inside the tx (:364-392).
- **Idempotency**: `idempotencyKey` → `ORD-` orderNo, pre-check + P2002 catch → inert `{orderNo, already:true}` 200 (:333-349, 460-471); web W-key minted per-checkout and retired on success (cart/page.tsx:79-82, 204-268); mobile reuse-until-success (r119-B2M). **Ledger #6 (global namespace) still open by design** — note the adjacent mismatch: schema `.max(100)` (:56) vs `slice(0, 40)` in the orderNo (:334); no current client exceeds ~20 chars, so collision is theory only — fold into the #6 namespacing decision.
- **r116/r117 subscription-decision hardening HOLDS**: already-processed 409 + `alreadyStatus` replay/conflict split (subscription-decisions.ts:101-114), toast-first webhook + final-text sync (webhook/route.ts:115-193), P2025 race re-read (`raceResolvedResult`, :50-59, 205-214, 376-382), cancel false-broadcast guard (`flipped`, :399-469), webhook limiter fail-OPEN (rate-limit.ts:11-16, webhook/route.ts:25), `planEnd` honors `periodDays` (:146-155, 277).
- **Pending-payment uniqueness**: partial unique index enforced on BOTH subscribe and upgrade via P2002→409 (subscriptions/route.ts:113-124, upgrade/route.ts:158-168).
- **Plan caps**: items POST `FOR UPDATE` + locked maxItems (items/route.ts:239-260); menus `FOR UPDATE` on User (owner/restaurants/route.ts:114-131) and inside approval (subscription-decisions.ts:257-265).
- **Rating aggregates**: set-based atomic SQL on review POST (reviews/route.ts:281-291) and exact recompute on DELETE (:208-216) — modulo C-1's scoping flaw.
- **Referral conversion**: card `FOR UPDATE` + conditional flip + 10-use cap + self-referral guard + one-conversion-per-order (referral-conversion.ts:106-205); claim route P2002-swallow idempotency (:49-70).
- **A4 error contract**: every `String(e)` in `src/app/api/**` is log-only (14 sites, all `logError`); responses go through `handleError`/`validationError` with Arabic copy; cron/cleanup JSON body carries only 'cleanup failed' per r103-N5.
- **Money trust**: `amount === plan.price` server-side on both payment surfaces (subscriptions:88-90, upgrade:76-78) with `plan.price` stored; `discountPercent`/`referrerRewardPct` hard-coded server-side (referrals/claim:60-61); client money fields stripped since r102-A5.
- **Ledger #12 (owner/reviews pageSize=100)** — confirmed still the case (parsePagination defaults). **Ledger #13 (upload chunked bypass)** — confirmed (content-length guard only, upload/route.ts:15-17). **S8-P2-4 (owner/restaurants/[id] PATCH weaker than POST)** — still open (`patchSchema` name/description unbounded, [id]/route.ts:14-19). **S2-P2-6 (discountedPrice=0 POST-vs-PUT)** — still open (`items/[id]/route.ts:83` `.positive()`); the base-`price`-0 split in C-7 is the new adjacent fact. **S3-P2-3 (restaurant deleted while upgrade pending)** — still open (upgrade branch has no restaurant-existence special-case). **S4-P4-1 (owner/restaurants/[id] PATCH missing `revalidateMenu`)** — still open (no menu-cache import in that file).

## Solid surfaces (evidence-checked, no action)
- **Orders POST/PUT**: the deepest-hardened route in the repo — contract, pricing, races, and plan caps all verified above; the loyalty double-grant is guarded at three layers (orders/[id]/route.ts:105-227) and redeem is guarded-updateMany race-safe (loyalty/redeem/route.ts:87-108).
- **Public menu API** (`public/menu/[slug]`): limiter-before-queries, slug regex guard, isActive gate, per-restaurant tagged Data Cache with 404s kept out of the cache (route.ts:19-151).
- **Auth surfaces read**: register (tag-strip before zod, uniqueness races caught → 409, PBKDF2, audit + off-path broadcast), validate (self-username exception r103-F3 intact).
- **Tenant scoping family**: orders GET/[id]/count, categories ×2, items ×2, settings, stats ×2 (via `resolveRestaurantScope` — sub_admin VIEW_ANALYTICS, USER 403), loyalty/stats, owner/reviews, whatsapp/generate — all multi-menu aware (UserRestaurant link or primary match) with consistent 403 «غير مصرح»/«لا تملك الصلاحية» semantics; the only NEW gaps found are C-1 (inside-tx scope), C-8, and the E-1 cross-ref.
- **Destructive guards**: restaurant DELETE has-orders 409 + RESTRICT + P2003 disambiguation on both paths + audit rows; users DELETE last-owner guard + super_admin-target guards; user PATCH privilege-escalation guard + rbac SystemEvents.
- **Rate limiting**: every public mutation is limited (orders 30/min + 150/min/restaurant ceiling, loyalty 20+60, reviews 5+30/hr, claim 10, register/auth 5, validate 10, health 30, webhook 120/30s fail-open); limiters keyed post-auth or IP-canonical (getClientIp), id-free where rotation would dilute; `exemptFromRelax` used where e2e-pinned. Remaining gaps are C-9 + the session-gated CRUD family (accepted: auth-gated, low value).
- **Transactions**: every multi-step money write is in one `$transaction` (order+items, decision+restaurants+user+events, redeem+transaction, referral flip+points+event, item create + plan count); best-effort post-commit work (audit/telegram/revalidate) consistently never fails the committed write.

## Suggested fix order
1. C-1 (data-destroying, tiny diff) · 2. C-2 (money-truth, one-line) · 3. C-3 (payer dead-end, lib helper ×3 call sites) · 4. C-4/C-5 (validation parity, shared schemas) · 5. C-6..C-13 (hygiene batch).
