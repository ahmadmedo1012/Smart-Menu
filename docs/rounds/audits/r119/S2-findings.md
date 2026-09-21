# S2 — Money-Path Deep Audit (r119)

Agent: S2 (money-path arithmetic correctness) · Repo: /home/z/my-project/repos/Smart-Menu @ 92611477 (post-r118 batch) · READ-ONLY.

Scope: every calculation that produces or transforms money — order totals, discountedPrice semantics, invoice/WhatsApp/Telegram rendering, promo/loyalty/referral, subscriptions, cancel/refund, price-change-during-session, mobile cart. r118-B1 additions (modifier-group contract, raw cap 100, negative-total rejection, discountedPrice=0 nullish fix, order-time modifier snapshot, owner-invoice modifier deltas) were **verified complete on their paths** — this report hunts for what is STILL wrong around them.

## Baseline verification of r118-B1 (all confirmed present & consistent)

- Group contract enforced server-side, mirroring the serviceable surface: `src/lib/order-modifiers.ts:47-110` + `orders/route.ts:234-243`. ✔
- Raw cap 100 pre-dedupe: `order-modifiers.ts:19`, `orders/route.ts:42-45`; dedupe before pricing: `orders/route.ts:224-228`. ✔
- Negative line rejection: `orders/route.ts:313-315` + redundant `:318-320`. ✔ (runs after dedupe, so it cannot be bypassed)
- discountedPrice=0 nullish read: `orders/route.ts:306,406-409`. ✔
- Order-time modifier snapshot (names+deltas in `modifiersJson`): `orders/route.ts:414-416`, `order-modifiers.ts:120-130`. ✔
- Owner invoice (whatsapp/generate) renders `price + Σ deltas`: `whatsapp/generate/route.ts:125-132`. ✔ (but see P2-1/P2-4 — the rest of the invoice family was NOT fixed)

Server re-prices every line from DB (`orders/route.ts:207-217, 295-317`); client money fields are dropped by zod (`:28-69`). Qty is `int().positive().max(99)` — no qty=0 path. Client-side estimate mirrors server math exactly (`menu-types.ts:184-191`, cart line price includes deltas). Float drift in `recalcSubtotal` (e.g. 66.39999999999999) is absorbed by the `Decimal(10,2)` column — no consumer compares the raw float to the DB value. **The write path is sound. The divergence is in what humans are shown and in the post-write flows.**

---

## P1 — broken money

### S2-P1-1 · Checkout WhatsApp invoice is built from STALE client prices; the server total is thrown away
- **Where**: web `src/app/(protected)/cart/page.tsx:246-265` (+ stale replay via `sessionStorage smartmenu_last_receipt:270-277`, `/order-confirmed` resend); mobile `mobile/src/screens/public/MenuScreen.tsx:472-476`.
- **Failure mode**: POST /api/orders returns the full re-priced order (`orders/route.ts:386-424` returns `total` + `items[].price` + `modifiersJson`), but the client only reads `orderNo` (`cart/page.tsx:232`) and then builds the receipt from the LOCAL cart — `price: i.price` and `totalPrice: subtotal` are numbers captured at add-to-cart time (localStorage/AsyncStorage-persisted, `store/cart.ts:235`).
- **Numeric example**: customer adds an item at 20.00 د.ل on Monday. Tuesday the owner raises it to 25.00. Checkout Wednesday: DB order = 25.00, loyalty points = floor(25/10)=2, KPI revenue = 25.00 — but the WhatsApp message the restaurant actually collects cash against says **20.00**. Same divergence if a discount was added/removed, or a modifier delta changed, between add-to-cart and checkout. The restaurant bills 20, the platform records 25 — every downstream number (stats, loyalty tiers, AOV) silently disagrees with real cash flow. This is the operational billing channel for these restaurants.
- **Fix**: build the receipt from the server echo. `const order = json.data` → map `order.items` (parse `modifiersJson` for the summary; unit price = `Number(oi.price) + Σ deltas`) and `totalPrice = Number(order.total)`. Mobile identical (`res` already IS the unwrapped order — `services/api/client.ts:118`). Optionally move receipt rendering server-side (see P4-3) to kill the whole class.

---

## P2 — functional (money-visible)

### S2-P2-1 · Money rendered at 1 decimal misstates 2-decimal charges — and the same order renders 2-dp on one surface and 1-dp on another
- **Where**: `src/lib/format.ts:68-73` (`decimals = Number.isInteger(num) ? 0 : 1` default) + `mobile/src/lib/format.ts:68` (same). Callers on money surfaces without explicit decimals: `whatsapp/generate/route.ts:132,138,146,147` (owner invoice), `receipt.ts:108,120` (owner copy text), mobile `MenuScreen.tsx:248,440,519,548`, `OwnerScreens.tsx:70,91,278,360,365`.
- **Failure mode**: DB is `Decimal(10,2)` and the item form (`ItemCoreFields.tsx:83-88`, `step="0.5"` — typed values are not clamped) + API zod accept 12.75. `formatPrice(12.75)` → **"12.8 د.ل"** (overstates 0.05); `formatPrice(12.74)` → "12.7" (understates 0.04); `formatPrice(100.05)` → "100.0". The customer pre-checkout dialog shows 12.8 (`OrderDialog.tsx:553`), the customer receipt shows 12.75 (`receipt.ts:57-68`, `decimals: 2`), and the owner invoice shows 12.8 — three renderings, two values, one charge.
- **Fix**: default money rendering to 2 decimals with trailing-zero trim ("12.75", "12.5", "12") — one change in `formatPrice` default (`decimals ?? 2` + trim) or pass `{decimals:2}` at the ~10 invoice/cart call sites. Update `tests/unit/receipt-whatsapp-format.test.ts:15` which currently LOCKS the 1-dp default.

### S2-P2-2 · Verified payment grants exactly 30 days regardless of `plan.periodDays`
- **Where**: `src/lib/subscription-decisions.ts:152` (upgrade branch) and `:274` (new-user branch): `planEnd: new Date(Date.now() + 30*24*60*60*1000)`.
- **Failure mode**: `SubscriptionPlan.periodDays` (`schema.prisma:69`, default 30) is a real column, seeded/CI-updatable (`scripts/ci-seed.mjs:72-82`), displayed in pricing (`plan-comparison.ts:16`). Any plan with periodDays=90/365: customer pays `plan.price` (amount validated server-side, `subscriptions/route.ts:88-90` ✔), admin verifies, restaurant gets `planEnd = +30d` — then `cron/subscription-expiry` flips it EXPIRED 2/11 months early. Paid term lost.
- **Fix**: `planEnd: new Date(Date.now() + (plan?.periodDays ?? 30) * 86400_000)` (fetch `periodDays` in both `select`s at `:144` and `:245`); add a unit test with periodDays=365.

### S2-P2-3 · Two contradictory revenue definitions on the same owner dashboard (cancelled orders)
- **Where**: KPI excludes cancelled — `src/lib/stats-queries.ts:203` (`status: { not: 'cancelled' }`, r93-N5 documented unification). Charts INCLUDE cancelled — `src/app/api/stats/advanced/route.ts:64-87` (revenue7d, revenueRange `SUM(total)`), `:100-105` (aovTrend `AVG(total)`), `:106-133` (order counts) — no status filter.
- **Failure mode**: a day with one 100.00 order that gets cancelled: KPI "إيرادات اليوم" = 0.00, the chart next to it shows 100.00. The exact inconsistency r93-N5 says it eliminated (KPI vs loyalty totalSpent) was re-created one layer up.
- **Fix**: add `AND status != 'cancelled'` to the three revenue/aov raw queries (and decide for counts); assert parity in a unit test.

### S2-P2-4 · Modifier deltas still missing from the order-detail pages and the owner "copy as WhatsApp" text — itemized lines don't reconcile with the stored subtotal
- **Where**: `src/lib/receipt.ts:97-121` (`buildOrderShareText`: `oi.price * oi.quantity` — no deltas, while `:120` prints `o.total` WITH deltas); `src/app/(protected)/owner/orders/[id]/page.tsx:306-321` and `admin/orders/[id]/page.tsx:292` (same omission; modifiers aren't rendered at all — neither names nor prices).
- **Failure mode**: burger 15.00 + "extra cheese +2.00" ×2 → stored line price 15.00, subtotal 34.00. The owner order page and the copied WhatsApp text list "2x burger = 30" and total 34 — a 4.00 gap with NO line explaining it (the r118 fix added the deltas only to `/api/whatsapp/generate`, not to these surfaces).
- **Fix**: reuse `parseStoredModifiers` (already exported) in both pages + `buildOrderShareText`; render the delta per line exactly like `whatsapp/generate/route.ts:124-141`.

### S2-P2-5 · completed→cancelled keeps loyalty points, totalSpent and referral rewards (no claw-back)
- **Where**: `src/app/api/orders/[id]/route.ts:119-227` — accrual happens only on transition INTO completed; the cancel path (`:229-236` plain update) never decrements `points`/`totalSpent`/`totalOrders` and never reverses the `RewardTransaction` earn row or the converted referral reward (`referral-conversion.ts` grant is final).
- **Failure mode**: complete a 500.00 order (+50 pts, +500 totalSpent, referrer +50 pts), then correct the mistake by cancelling — the customer keeps everything; 10 such cycles = a free 5-stamp redemption from never-collected revenue. Points are only ever consumed by redeem (`loyalty/redeem/route.ts:87-101`, race-safe ✔).
- **Fix**: on `existing.status === 'completed' && body.status === 'cancelled'`, inside a tx: `points: { decrement: ptsEarned }`, `totalSpent: { decrement: existing.total }`, `totalOrders: { decrement: 1 }` + a `type:'adjust'`/negative RewardTransaction row (keeps ledger symmetric); re-run `computeTier`. Leave referral rewards (documented conservative choice) or reverse via the same earn row's orderId.

### S2-P2-6 · discountedPrice=0 is three-way inconsistent: POST allows it, PUT rejects it, the edit UI hides it
- **Where**: POST `items/route.ts:44-45` (`min(0)` ✔); PUT `items/[id]/route.ts:82-83` (`z.number().positive()` — **rejects 0**); edit form `use-item-form.ts:101` (`editing.discountedPrice ? String(...) : ''` — **0 loads as empty**) + `use-item-save.ts:69` (truthy send) — empty → `undefined` → "omitted → untouched".
- **Failure mode**: r118-B1 established discountedPrice=0 = legit 100%-free item on the read/order path, and POST can create it (owner types 0 in the discount field). After that: the edit dialog shows an EMPTY discount field (owner cannot see the item is free), and any edit that does send 0 would 422 (`positive()`); there is no way in the UI to clear or see the state (empty = untouched). The item is permanently free until direct DB surgery. Also PUT forbids `price: 0` while POST allows it.
- **Fix**: PUT `price: z.number().min(0)`, `discountedPrice: z.number().min(0).nullable()`; form load `editing.discountedPrice != null ? String(...) : ''`; save send `form.discountedPrice === '' ? null : Number(...)` (explicit null clears — PUT already accepts nullable).

---

## P3 — polish / hardening

1. **Order prices are read OUTSIDE the create transaction** (`orders/route.ts:207-217` before the tx at `:353`). Unlike `maxOrders`/`isActive` (re-read under `FOR UPDATE`, `:360-373`), a price edit landing in the ms-wide window charges the pre-edit price. Re-read `price/discountedPrice` inside the tx (or accept + document the snapshot semantics).
2. **`recalcSubtotal` is an unrounded float** fed to `Decimal(10,2)` (`orders/route.ts:393-395`). DB rounding saves correctness, but `Math.round(recalcSubtotal*100)/100` (or cents-int math) makes server/stored/displayed values byte-identical and future-proofs any future float comparison.
3. **No upper bound on item price** (`items/route.ts:44`, `items/[id]/route.ts:82`): `price: 1e9` overflows `Decimal(10,2)` → Prisma P2020 → 500, not 422. Add `.max(99999)`.
4. **Stranded loyalty points / tier inflation**: redeem requires BOTH `totalOrders ≥ 5` AND `points ≥ 5` and consumes 5 of each (`loyalty/redeem/route.ts:73-101`), but accrual is `floor(total/10)` per order — a 100-LYD order earns 10 pts + 1 order. Points grow 2-10× faster than stamps; surplus points can never be spent yet drive `computeTier` (gold/platinum at 150/400 pts). Either gate redeem on points-only cost or stop tiering on unspendable points.
5. **Referral tier write uses a pre-lock snapshot**: `referral-conversion.ts:117` reads `referrer.points` in the include, lock happens at `:142` — a second concurrent conversion for the same card (waited on the lock) computes `computeTier(stalePoints + points)` and can write a LOWER tier (points are safe — `increment`). Re-read points after the lock.
6. **/pricing "سنوي · وفّر 17%" toggle is display-only**: `PricingClient.tsx:62-63` shows `price*10 /السنة`, but the CTA links `/subscribe?plan=id` with no term, and payment always validates against `plan.price` (monthly) — a yearly-intent customer buys a monthly term (and if they somehow paid 10×, P2-2 would still grant 30 days). Either implement a yearly plan row (periodDays=365) or remove the toggle.
7. **Sub-10-LYD orders never touch the loyalty card** (pts=0 path skips the upsert entirely, `orders/[id]/route.ts:121`): `totalSpent`/`totalOrders` undercount vs true spend (locked as intended by `order-lifecycle.test.ts:244` — document it in the loyalty dashboard copy, or accrue card stats even when pts=0).
8. **Cart has no line cap**: server caps items at 50 lines (`orders/route.ts:61`); a persisted 51-line cart (distinct item+modifier signatures) always 422s with no client guard (`store/cart.ts` unbounded).

## P4 — ideas

1. **Proration on mid-cycle upgrade**: upgrade resets `planStart=now`, charges full new `plan.price`, discards remaining days of the paid term (`subscription-decisions.ts:147-156`). Credit remaining days into the new term or discount.
2. **Server-side canonical receipt**: POST /api/orders returns `receiptText` (or a `/api/orders/[id]/receipt` endpoint) rendered from the stored rows; web/mobile just forward it. Eliminates the entire client-recomputation class (P1-1, P2-1, P2-4) in one move.
3. **Central money module**: one `sumMoney()` + `formatMoney()` (2-dp internally, trim on display) shared web+mobile; forbid raw `toFixed(1)` on money via lint rule.
4. **Points→currency redemption at checkout** (server-applied discount, replacing the forced-0 stub with a verified server-side discount source).

## Untested critical branches (highest-value test gaps)

| Branch | File:line | Why critical |
|---|---|---|
| Owner-invoice modifier-delta rendering | `whatsapp/generate/route.ts:124-141` | r118's flagship invoice fix — `tests/unit/whatsapp-generate.test.ts` fixture (`:94-102`) has NO `modifiersJson`, so the delta math (`Number(oi.price) + deltaSum`) and the «الإضافات» line are 0% covered |
| Fractional (2-dp) price rendering | `format.ts:68-73` + all invoice callers | every fixture price is an integer (10/25); 12.75-style rendering is unlocked (and currently wrong — P2-1) |
| completed→cancelled loyalty claw-back | `orders/[id]/route.ts` | no test, no behavior (P2-5) |
| revenue parity stats vs stats/advanced | `stats-queries.ts:203` vs `advanced/route.ts:64-105` | the cancelled-order exclusion is asserted nowhere |
| planEnd vs periodDays | `subscription-decisions.ts:152,274` | every decision test uses default 30-day plans |
| receipt-from-server-response at checkout | `cart/page.tsx:231-265` | the P1-1 fix target; nothing asserts the WhatsApp text matches the stored order |

## Top 3 most dangerous arithmetic scenarios

1. **Stale-price invoice (P1-1)** — cart price 20.00 captured Monday, owner raises to 25.00, checkout Wednesday: DB/loyalty/stats all say 25.00 while the restaurant's WhatsApp invoice — the thing cash is collected against — says 20.00. Silent, unlimited divergence; hits web AND mobile; replayed again via order-confirmed resend.
2. **Paid term truncation (P2-2)** — 365-day plan at 350 د.ل, amount validated, admin approves: `planEnd = now+30d`, expiry cron kills the restaurant's menu 11 months early. Customer paid 12× the monthly rate for 1/12 of the term.
3. **Points from cancelled revenue (P2-5)** — complete a 500 د.ل order then cancel it: customer keeps 50 pts + 500 totalSpent (referrer keeps 50 pts). Repeat with real orders that later get voided → stamp-card redemptions (free meals) funded by revenue that never existed; no ledger entry ever reverses.

## Quick reference — verified-correct money invariants (for the next round)

- Order total = Σ(db eff price + Σ deduped available owned deltas) × qty, discount forced 0, qty ∈ [1,99], lines ≤ 50, all re-priced server-side (`orders/route.ts:295-320`).
- discountedPrice is ABSOLUTE (validated `0 ≤ d ≤ price` on POST; PUT per P2-6), mods stack ON TOP of the discounted price — consistent web/mobile/server (`menu-types.ts:184-191`).
- Loyalty earn = floor(total/10) on completion, idempotent via orderId earn-row + conditional status flip; redeem is TOCTOU-safe (`updateMany` guards); referral grants are per-order, per-code-capped (10), self-referral-guarded, FOR UPDATE-serialized.
- Subscription amount is always the server plan price; one pending payment per user enforced by partial unique index (P2002→409).
- No coupon/promo path exists in the order flow; `discountPercent` (referrals) is display-only — nothing applies it to money.
