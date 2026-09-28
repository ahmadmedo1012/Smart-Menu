# r121 — Auditor D: Database / Data Integrity (web/backend scope)

**HEAD at audit:** `74ef578f` (r120 final, clean tree) · **Method:** read-only — full read of
`prisma/schema.prisma` (25 models), all 26 migrations, the query/transaction surface of
`src/lib` + `src/app/api` + public RSC pages; live verification against the local schema-complete
PG (`:5434`) via read-only SQL (`pg_indexes`, `pg_constraint`, `information_schema.columns`) —
53 constraints / 103 indexes dumped and cross-checked against the datamodel. No code written,
no servers started.

**Ledger discipline:** r119-S7 (2 indexes + Order RESTRICT + P2003 mapping), reviews pageSize=100
cap (ledger #12), idempotencyKey global namespace (#6), loyalty claw-back on cancel (r119 deferred
S2-P2), pagination 4-way unification (r119 deferred) are NOT re-reported as findings — S7 items and
#12 are LEDGER-VERIFIED below. Auditor E's r121 P1 (items PUT cross-tenant categoryId) is owned by
E and not duplicated; my D-7 is a different (delete-contract) defect on the category family.

**Summary:** 0×P0 · 0×P1 · 2×P2 · 9×P3 = 11 findings. The data layer is in unusually good shape
for its age — every counter is set-based or lock-serialized, every multi-model write is
transactional, no external calls inside transactions, money is `Decimal(10,2)` end-to-end. The two
P2s are (1) a **money-truth regression introduced by r120's storage-semantics change** (one
endpoint still double-counts modifier deltas, and historical rows were never backfilled — every
OrderItem renderer is now wrong for one population), and (2) the **absence of an order-status state
machine** (cancelled→completed is accepted at API level and the mobile owner UI offers the button).

---

## Findings

### D-1 [P2] r120 changed OrderItem.price semantics with no backfill — every invoice renderer is now wrong for one population (whatsapp/generate double-counts deltas on new rows)
- Type: FACT (code-proven; git-proven)
- Evidence:
  - `src/app/api/orders/route.ts:417-429` — since r120 (`4ba875a2`, commit msg "Money truth: OrderItem.price now stores the EFFECTIVE unit price (base + modifier deltas)"), the writer persists `price = (discountedPrice ?? price) + Σ deltas`.
  - `src/app/api/whatsapp/generate/route.ts:100-132` — the owner invoice endpoint (last touched r119 `c4bd21f9`, i.e. BEFORE the r120 writer change) still computes `deltaSum` from the snapshot and renders `formatPrice(Number(oi.price) + deltaSum)` → for any order created after r120 with modifiers, each line shows **base + 2×deltas** while `المجموع` shows base+deltas (lines sum > total).
  - `prisma/migrations/zz_round120_premium_maxmenus_ladder/migration.sql` — the round's only migration; it updates `SubscriptionPlan.maxMenus` and nothing else. **No backfill** of historical `OrderItem.price` rows (pre-r120 rows keep base-only price).
  - `src/lib/receipt.ts:103-110` (`buildOrderShareText`, used by owner+admin order detail, `src/components/orders/useOrderDetail.ts:143-149`) renders `oi.price × qty` with no delta handling → correct for post-r120 rows, **understates** modified lines for all pre-r120 historical orders.
  - No first-party web or mobile caller of `POST /api/whatsapp/generate` exists today (verified by repo-wide search — only comments/tests reference it), which is why this is P2 not P1; the endpoint is nevertheless maintained, rate-limited, unit-tested, and listed in docs/API.md's 66-route inventory.
  - Test gap: `tests/unit/whatsapp-generate.test.ts:94-103` — the success-path fixture (`price: 10`, no `modifiersJson`) never exercises a modified line, so the double-count is unpinned.
- Impact: technical (money-path invoice truth — the exact defect family r118-A3-P2-1 and r120-U5-F-2 each fixed for one side) + user-facing the moment any consumer (mobile owner invoice, future UI) adopts the endpoint: an invoice whose line items contradict its own total.
- Fix (minimal, root-cause): one `zz_` migration backfilling legacy rows — `UPDATE "OrderItem" SET price = price + (SELECT COALESCE(SUM((jsonb_array_elements(modifiersJson::jsonb)->>'priceDelta')::numeric),0) FROM ...)` for rows whose snapshot carries deltas (idempotent marker: only rows predating the deploy, or compute-and-compare against subtotal) — then delete `+ deltaSum` in `whatsapp/generate/route.ts:132` so all readers use the stored effective price uniformly.
- Risk: of fixing — the backfill must be exact (dry-run against a snapshot first; legacy bare-id rows have no stored deltas and are already priced correctly by the generate lookup); of not fixing — permanent mixed-population semantics where any new reader must know each row's era.
- Tests required: extend the generate unit fixture with a snapshot-modifier line asserting the line renders the stored price exactly once (base+delta), and the total reconciles; a migration dry-run count test.

### D-2 [P2] No order-status state machine — cancelled→completed is accepted and grants loyalty points + converts referral rewards for cancelled revenue
- Type: FACT (code-proven)
- Evidence:
  - `src/app/api/orders/[id]/route.ts:13-20` — PUT zod accepts all five `OrderStatus` values with no transition validation; `:100-103` gates only the permission, and `:119` special-cases only `existing.status !== 'completed'` — a **cancelled** order can be set to `completed`.
  - `:120-217` — completing from `cancelled` runs the full accrual: `ptsEarned = floor(total/10)` upsert on the customer's LoyaltyCard (`totalOrders`+1, `totalSpent`+total) + earn RewardTransaction; `:222-224` then converts the referral (referrer earns 10% points) — for an order the restaurant had cancelled.
  - DB level: `OrderStatus` is a plain enum (no constraint can express transitions); this is an API-contract gap, not a schema gap.
  - Web UIs guard it (owner + admin order detail disable buttons on `cancelled` — `src/components/orders/useOrderDetail.ts:37` STATUS_FLOW forward-only + `disabled={... order.status === 'cancelled'}`), **but the mobile owner screen renders all five status chips unconditionally** (`mobile/src/screens/owner/OwnerScreens.tsx:393-394` — noted mobile-adjacent; the fix belongs in the API, which is this round's scope).
  - Distinct from the ledger's deferred "loyalty claw-back on cancel" (completed→cancelled not reversing points — r119 deferred S2-P2): this is the inverse transition and is a *grant*, not a claw-back.
- Impact: user-facing via mobile owner UI (one accidental tap on a cancelled order mints free-meal stamp progress + referrer points on cancelled revenue); integrity of loyalty/referral ledgers.
- Fix (minimal, root-cause): in PUT, reject transitions into `completed` from `cancelled` (and arguably any backward transition) with a 422 Arabic message — one guard before the accrual block at `:119`.
- Risk: of fixing — must not break the deliberate idempotent re-ack path (completed→completed) or the existing completed→ready→completed cycle (already earn-row-guarded); of not fixing — the loyalty ledger records rewards for revenue that was cancelled.
- Tests required: PUT cancelled→completed → 422, no LoyaltyCard/RewardTransaction rows; ready→completed accrual unchanged; completed→completed idempotent re-ack unchanged.

### D-3 [P3] Schema↔DB drift: 4 array columns are nullable in PostgreSQL but required in schema.prisma
- Type: FACT (DB-verified)
- Evidence: local PG `information_schema.columns` — `Restaurant.gallery`, `User.permissions`, `MenuItem.dietaryTags`, `MenuItem.allergens` are `is_nullable=YES`; schema.prisma declares them non-optional with `@default([])` (`prisma/schema.prisma:23,104,158-159`). Root cause in `prisma/migrations/0_init/migration.sql:69` (`"gallery" TEXT[] DEFAULT ARRAY[]::TEXT[]` — no NOT NULL; same for the other three) and no later migration tightens them; `MenuItem.showcaseTags` (migration 12) is the only NOT NULL array. All other 103 indexes/53 constraints match the datamodel exactly (verified full dump).
- Impact: technical — a `migrate diff`-based drift gate flags these 4 columns; raw SQL (ops script, Neon console) can insert NULLs that the generated Prisma client types claim impossible (`string[]`), surfacing as `null` at runtime.
- Fix (minimal): one `zz_` migration — `UPDATE ... SET col = '{}' WHERE col IS NULL` then `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` ×4 (schema already matches).
- Risk: of fixing — table locks are momentary at this scale (Neon: fine); of not fixing — drift gate noise masks future real drift.
- Tests required: post-migration `migrate diff --from-db --to-schema` clean; existing unit suite green.

### D-4 [P3] Zero CHECK constraints in the database — every business bound (price ≥ 0, quantity, rating 1-5, points, minSelect ≤ maxSelect) is zod-only
- Type: FACT (DB-verified) + SUGGESTION (the fix is judgment)
- Evidence: `pg_constraint` dump = 53 constraints, contype ∈ {p, f, u} only — no `c` (CHECK) anywhere. All current write paths are zod-gated (verified: `items/route.ts:44-45` price ≥ 0 + discountedPrice ≤ price superRefine `:67-71`; `orders/route.ts:39` qty 1..99; `items/[id]/reviews/route.ts:20` rating int 1-5) — but nothing stops a future script, admin bulk edit, or manual Neon SQL from persisting a negative price or a 0-quantity line.
- Impact: technical (defense-in-depth); a single bad row would silently poison revenue sums (`SUM(total)` includes it) and receipts.
- Fix (minimal): one `zz_` migration adding CHECKs on the money/count columns only: `"MenuItem" CHECK (price >= 0 AND (discountedPrice IS NULL OR discountedPrice <= price))`, `"OrderItem" CHECK (quantity > 0 AND price >= 0)`, `"Order" CHECK (total >= 0 AND subtotal >= 0 AND discount >= 0)`, `"Review" CHECK (rating BETWEEN 1 AND 5)`, `"LoyaltyCard" CHECK (points >= 0)`, `"ModifierGroup" CHECK (minSelect >= 0 AND maxSelect >= 1)`.
- Risk: of fixing — migration fails if any existing row violates (pre-flight SELECTs first — local DB is empty; run counts on Neon before deploy); of not fixing — invariant enforcement rests entirely on every future caller remembering zod.
- Tests required: violation-insert rejects (raw SQL in a unit/migration test), happy-path inserts unchanged.

### D-5 [P3] owner/restaurants POST reads plan.maxMenus BEFORE the FOR UPDATE lock — the only cap not re-read under the lock (fail-open-by-one window)
- Type: FACT (code-proven)
- Evidence: `src/app/api/owner/restaurants/route.ts:102-108` — `user.plan.maxMenus` is read in the pre-tx `findUnique`; `:122-131` locks the User row (`SELECT ... FOR UPDATE`) and counts menus under the lock but **never re-reads `maxMenus` after acquiring it**. Compare the two siblings that round91-F-B (D2-#4) fixed: `orders/route.ts:376-384` re-reads `maxOrders` under the lock, `items/route.ts:245-249` re-reads `maxItems` under the lock (both with explicit comments about the fail-open-by-one race).
- Impact: technical — a concurrent plan change (upgrade approval tx writes `user.planId`, `subscription-decisions.ts:161-170`) landing in the millisecond window lets one menu be created under a stale cap. Rare; bounded to +1 menu.
- Fix (minimal): move the plan select inside the transaction, after the `FOR UPDATE` (mirror the items/orders shape).
- Risk: of fixing — none beyond an extra indexed PK lookup inside the tx; of not fixing — the documented lock pattern is incomplete at one of its three sites, inviting copy-paste of the wrong shape.
- Tests required: none feasible as a unit race pin; a comment-level contract test could assert the plan read sits inside the tx callback.

### D-6 [P3] Owner-path restaurant DELETE never deletes blob storage; category DELETE cascades items without cleaning their image blobs
- Type: FACT (code-proven)
- Evidence:
  - Admin path cleans up: `src/app/api/restaurants/[id]/route.ts:265-268,336-340` collects item images + logo + gallery pre-delete and calls `deleteBlob` per URL after the DB tx succeeds.
  - Owner path does not: `src/app/api/owner/restaurants/[id]/route.ts` imports no blob helper at all (imports at `:1-7`); `:126-129` captures only `{name, slug}`; after `tx.restaurant.delete` (`:147`) no blob deletion runs.
  - Category path leaks the same way: `src/app/api/categories/[id]/route.ts:93` — `menuCategory.delete` cascades `MenuItem` (schema `MenuItem.category` Cascade) and the handler never collects/deletes the cascaded items' `image` blobs (contrast the item DELETE path, `items/[id]/route.ts:289-291`, which does `deleteBlob(existing.image)`).
- Impact: technical — orphaned Vercel Blob objects accumulate silently on every owner-side restaurant delete and every category delete that contains imaged items (storage cost; no functional break).
- Fix (minimal, root-cause): extract the admin path's collect-then-delete into a shared helper (e.g. in `src/lib/blob.ts`) and call it from both delete routes + the category DELETE (collect item images before the cascade).
- Risk: of fixing — low (deletion happens strictly after the DB commit, same as the admin path); of not fixing — unbounded blob spend.
- Tests required: unit test asserting the helper is invoked with the captured URLs on each path (mock deleteBlob).

### D-7 [P3] Category DELETE is blocked by financial-history FKs with only a generic 400 — no pre-check, no actionable contract
- Type: FACT (code-proven)
- Evidence: `src/app/api/categories/[id]/route.ts:93` — bare `menuCategory.delete`. The cascade hits `MenuItem`, whose `OrderItem_itemId_fkey` and `Review_menuItemId_fkey` are **RESTRICT** (verified in pg_constraint; deliberate r119-S7 financial-history stance). Any category containing an ever-ordered or reviewed item therefore throws P2003 → `handleError` → `api-helpers.ts:116-118` → **400 «بيانات مرتبطة لا يمكن حذفها»** — with no hint that the blocker is order history, and with an inconsistent status code vs the sibling restaurant DELETE (409 with a full Arabic explanation + audit trail, `restaurants/[id]/route.ts:277-308`).
- Impact: user-facing — the owner's remedy (move items to another category, or mark them `unavailable`) is never communicated; the delete appears randomly impossible.
- Fix (minimal): pre-check `orderItem.count({ where: { item: { categoryId } } })` + review count → 409 with actionable Arabic copy (same family as the r119 field_name-disambiguated mapping); leave the DB RESTRICT as the backstop.
- Risk: of fixing — none (guard-only, the FK remains); of not fixing — support burden + inconsistent API contract.
- Tests required: category with ordered item → 409 + Arabic message; empty category → 200 delete.

### D-8 [P3] Incremental avgRating accumulates rounding drift vs the exact recompute — menu badge and reviews panel can disagree
- Type: FACT (code-proven, arithmetic)
- Evidence: `src/app/api/items/[id]/reviews/route.ts:285-289` — POST updates the stored aggregate incrementally, rounding to 1 decimal **from the already-rounded stored avg**: `ROUND((COALESCE(avgRating,0)*ratingCount + r)/(ratingCount+1)*10)/10`. Worked example: ratings [5,4,4,4,4,4,4,4,4,4] → stored walks 5.0→4.5→4.3→4.2→4.2… while the true mean is 4.1. The reviews GET panel computes a fresh exact `_avg` (`:116-120`) → badge (stored) and panel (fresh) disagree by up to ~0.1. The DELETE path recomputes exactly (`:208-216`), so the drift also silently "heals" on moderation — two different truths depending on write path.
- Impact: user-facing (public rating badge on the ISR menu page vs the reviews sheet); minor.
- Fix (minimal): keep the atomic single-statement shape but store `ratingSum` alongside (or compute the exact AVG in the same UPDATE ... FROM subquery the DELETE path uses — the row-count argument for the incremental form is weak at ≤30 reviews/hour/item).
- Risk: of fixing — needs a small backfill (ratingSum) or accepting the exact-recompute cost on write; of not fixing — bounded ±0.1 display inconsistency.
- Tests required: pin the [5,4×9] sequence → stored avg equals 4.1.

### D-9 [P3] admin/stats recent-restaurants sorts by Restaurant.createdAt with no index backing (the exact pattern r119-S7 indexed elsewhere)
- Type: FACT (code + DB proven)
- Evidence: `src/app/api/admin/stats/route.ts:53-55` — `restaurant.findMany({ take: 10, orderBy: { createdAt: 'desc' } })`. pg_indexes on `Restaurant`: pkey, slug_key, isActive, showOnLanding_isActive, planId — **no createdAt index**. The same Top-N-by-createdAt pattern motivated `AuditLog_action_createdAt_idx` (566× measured, r119-S7) and `User_lastLoginAt_idx` covers the sibling query at `:64-66`. Volume is small (tenants, not events) so this is polish, not pain.
- Impact: technical — Top-N sort over the whole tenant table per (cached) admin stats call.
- Fix (minimal): one-column `CREATE INDEX "Restaurant_createdAt_idx"` in a `zz_` migration, or order by `id DESC` (equivalent recency at this scale, zero migration).
- Risk: of fixing — none; of not fixing — grows linearly with tenant count.
- Tests required: none (index-only).

### D-10 [P3] whatsapp/generate resolves legacy bare-id modifier rows with a per-line query loop (bounded N+1)
- Type: FACT (code-proven)
- Evidence: `src/app/api/whatsapp/generate/route.ts:101-112` — `for (const oi of order.items) { await parseStoredModifiers(..., ids => modifierOption.findMany(...)) }`. Snapshot-format rows return from JSON without a query (`order-modifiers.ts:150-161`), so only **legacy** (pre-r118) modified lines cost a round trip — up to 50 sequential queries (payload cap) per generate call under the 20/min limiter.
- Impact: technical — latency on legacy orders only; no correctness issue.
- Fix (minimal): collect all legacy id arrays first, one `findMany({ id: { in: union } })`, then split per line (same shape as `hydratePopularItems`, `stats-queries.ts:148-176`).
- Risk: of fixing — none; of not fixing — bounded legacy-path latency.
- Tests required: existing generate tests green.

### D-11 [P3] Slug-reservation checks scan SubscriptionPayment.metadata JSONB with no expression index (seq scan per subscribe/registration POST)
- Type: FACT (code-proven) — severity floor, table grows slowly
- Evidence: `src/app/api/subscriptions/route.ts:66-72` and `src/app/api/restaurants/route.ts:192-199` — `findFirst({ where: { status:'pending', metadata: { path:['tempRestaurants'], array_contains:[{slug}] } } })` per submitted slug. The partial unique index `SubscriptionPayment_pending_user_restaurant_unique` (zz_round93, verified live) covers pending-uniqueness but not this payload lookup — it is a filter over every pending payment row, plus deleted-status rows are excluded only by the `status` predicate.
- Impact: technical — O(pending payments) scan per POST; at current volumes (handful of pending rows) immaterial.
- Fix (minimal): none now; if payments volume grows, an expression index on `(metadata->'tempRestaurants')` or a normalized `reservedSlug` column — document the threshold (the repo's own ≥100K-row D3 recipe).
- Risk: of fixing now — over-engineering (ponytail violation); of not fixing — none at current scale.
- Tests required: n/a.

---

## Ledger verification (LEDGER-VERIFIED / status)

| Item | Status | Evidence |
|---|---|---|
| r119-S7 index `AuditLog(action, createdAt)` | **LEDGER-VERIFIED** | present in local PG: `AuditLog_action_createdAt_idx` (btree action, "createdAt") |
| r119-S7 index `MenuItem(categoryId, sortOrder)` | **LEDGER-VERIFIED** | `MenuItem_categoryId_sortOrder_idx` present |
| r119-S7 `Order.restaurant` Cascade → RESTRICT | **LEDGER-VERIFIED** | `Order_restaurantId_fkey ... ON DELETE RESTRICT` in pg_constraint; P2003→409 field_name mapping on BOTH delete routes (`restaurants/[id]/route.ts:303-308`, `owner/restaurants/[id]/route.ts:148-158`) |
| r119-B4 users DELETE last-owner guard | **LEDGER-VERIFIED** | `users/[id]/route.ts:133-160` orphan-detection + 409 |
| Ledger #12 reviews pageSize=100 no pagination | **LEDGER-VERIFIED (unchanged)** | `parsePagination` max default 100 (`api-helpers.ts:63`) |
| Ledger #6 idempotencyKey global namespace | unchanged (not re-reported) | `orders/route.ts:333-349` still derives orderNo from a client string |
| r119 deferred: loyalty claw-back on cancel | still open, not re-reported | (D-2 is the inverse transition — new) |
| zz_round120 Premium maxMenus=2 | **LEDGER-VERIFIED** | migration content matches; WHERE-guarded, idempotent |

## Solid areas (checked clean, evidence-backed)

1. **Money types:** every monetary column is `Decimal(10,2)` (`MenuItem.price/discountedPrice`, `Order.subtotal/discount/total`, `OrderItem.price`, `ModifierOption.priceDelta`, `SubscriptionPayment.amount`, `LoyaltyCard.totalSpent`; `avgRating` `Decimal(3,2)`) — zero Float usage; the single Decimal→Number boundary is a documented lossless extension (`db.ts:7-23`).
2. **Counter consistency:** ratingCount/avgRating set-based atomic in one tx with the review row (round90-F3 pattern, `reviews/route.ts:281-291`); loyalty accrual double-grant-proof (earn-row check + conditional status flip, `orders/[id]/route.ts:122-217`); referral conversion has FOR UPDATE card lock + conditional flip + per-order idempotency + usage cap (`referral-conversion.ts:108-205`); redeem uses a guarded `updateMany` that can never take points negative (`loyalty/redeem/route.ts:87-108`). No read-modify-write race found anywhere.
3. **Transactions:** every multi-model write is wrapped — order create (order+items, cap check under Restaurant FOR UPDATE), completion accrual, referral conversion (separate, documented), subscription decisions (both branches), session create+trim, settings batch upserts, admin create-owner, restaurant deletes (reviews+restaurant atomically). **No external calls inside transactions** — all Telegram sends are strictly post-commit fire-and-forget (r116-r118 hardening holds).
4. **Plan caps:** maxItems/maxOrders/maxMenus enforced at creation time under row locks (orders `:371-392`, items `:239-260`, owner/restaurants `:122-131`, subscription-decisions `:257-265`) with `PlanLimitError` → 403; slug uniqueness enforced by unique constraint + pre-checks, pending-payment squat prevented at DB level (partial unique index, P2002→409).
5. **Uniqueness coverage:** username, Restaurant.slug, Order.orderNo, LoyaltyCard.referralCode + (customerPhone, restaurantId), Setting (restaurantId, key), WhatsappTemplate (restaurantId, name), TelegramApprover.telegramId, RateLimitEntry (key, windowEnd), Referral (referralCode, referredName) — all verified live in pg_constraint; the zz_round90 index is correctly replaced by the zz_round93 expression index (old one absent from the DB).
6. **Query hygiene:** list routes use slim selects (orders list dropped `_count` LEFT JOINs for grouped index-only counts via `list-counts.ts`); count+findMany pairs all run in `Promise.all`; every hot list is `take`-bounded; stats dashboards are window-bounded (90d) and cached; N+1 eliminated on the public menu (single hierarchical modifier select, `menu/[slug]/page.tsx:148-177`).
7. **Data lifecycle:** no orphan-producing deletes found — User.restaurantId SetNull, SubscriptionPayment.userId SetNull (payment history survives user deletion), AuditLog.actorId SetNull (audit survives), Referral/RewardTransaction.orderId SetNull; soft-delete (isActive/item status) and hard-delete (guarded) coexist consistently; destructive ops are audited on every path (restaurant ×2, user, item, category, admins, config).
8. **Retention:** cron cleanup covers Session (7d), AuditLog (90d, documented compliance choice), SystemEvent (180d), RateLimitEntry (1h) — all on indexed filters (`Session_expiresAt_idx`, `AuditLog_createdAt_idx`, `SystemEvent_createdAt_idx`, `RateLimitEntry_windowEnd_idx`); plus the probabilistic in-request sweep with bounded batches.
9. **Migrations:** chain replays to exactly the datamodel (modulo D-3's nullability and the three documented SQL-only indexes — `SystemEvent_userId_idx`, `SubscriptionPayment_pending_user_restaurant_unique`, `Referral_code_name_key` map — all carrying in-schema explanatory comments); destructive statements are all documented + guarded/idempotent (14's dedupe DELETE keeps lowest id; drop_showcaseTag verified no orphan data; zz_round93 DROP+CREATE inside one transactional DDL); the `zz_` prefix ordering footgun guard is consistently applied and explained per migration.

## Recommended next actions (for the fix batches)

1. **D-1** (backfill + drop `+ deltaSum` + modifier-line unit pin) — money-path, pairs naturally with the r120 lineage; needs a Neon dry-run count first.
2. **D-2** (one guard in orders PUT) — one-line-ish, high integrity value, unblocks mobile owner UI safety.
3. **D-6 + D-7** (shared blob-cleanup helper + category 409 contract) — same file family, one batch.
4. **D-3 + D-4 + D-9** — one combined `zz_round121` migration (NOT NULL ×4, CHECKs after pre-flight, Restaurant createdAt index or switch to `orderBy id`).
5. **D-5, D-8, D-10** — small code-only follow-ups.
