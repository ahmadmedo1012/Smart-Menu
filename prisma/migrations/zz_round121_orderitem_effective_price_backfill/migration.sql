-- r121-C2/D-1 (X2 §1 — load-bearing backfill): OrderItem.price semantics.
--
-- Since r120 (commit 4ba875a2, 2026-09-25 17:37:05 UTC) the order writer stores
-- the EFFECTIVE unit price = (discountedPrice ?? price) + Σ modifier deltas
-- (src/app/api/orders/route.ts — "Money truth: OrderItem.price now stores the
-- EFFECTIVE unit price"), and r121-C2 fixed the last consumer that still added
-- the deltas on top (api/whatsapp/generate). PRE-r120 rows still store the BASE
-- price — this migration adds the modifier deltas from the modifiersJson
-- snapshot so every renderer prints one consistent truth (lines × qty == total).
--
-- Boundaries (all X2-verified):
-- * Cutoff: OrderItem carries no createdAt column, so the r120 cutover rides
--   the PARENT Order.createdAt (lines are created inside the order's own tx —
--   same instant). Timestamp '2026-09-25 17:37:05' is the 4ba875a2 commit time
--   from git log, as naive UTC (Prisma stores DateTime as naive UTC). Rows
--   created AFTER the cutover already store effective price; re-adding deltas
--   would double-count. The cutoff is ALSO the idempotency guard: re-running
--   can only ever match rows whose order predates the cutover, and those are
--   re-set to the same value (no marker column needed).
-- * Deltas come from the modifiersJson SNAPSHOT format
--   ([{id,nameAr,name,priceDelta}] — written since r118-B1). Rows with no
--   snapshot objects — empty '[]', or pre-r118 BARE-ID arrays ([1,2] — ids
--   resolved against CURRENT options, no stored deltas) — are left UNTOUCHED:
--   they stay base-only and keep rendering low on ALL consumers (transitional,
--   documented boundary; assigning them today's option prices would be a guess,
--   not a backfill).
-- * A malformed priceDelta (non-numeric text) is skipped rather than failing
--   the deploy — the row simply stays base-only, same as the bare-id case.
-- * Safety: no aggregate consumes Σ OrderItem.price anywhere (stats read
--   Order.total; loyalty accrual reads Order.total at completion time) — this
--   backfill cannot corrupt any total. OrderItem has no updatedAt column, so
--   nothing else moves.
--
-- Pre-flight on the round DB (read-only): 0 snapshot-modified rows predate the
-- cutoff locally — the UPDATE is a no-op here; Neon needs the same count check
-- before deploy (same SELECT with COUNT(*) instead of UPDATE).

UPDATE "OrderItem" AS oi
SET "price" = oi."price" + (
        SELECT COALESCE(SUM((m ->> 'priceDelta')::numeric), 0)
        FROM jsonb_array_elements(oi."modifiersJson"::jsonb) AS m
        WHERE jsonb_typeof(m) = 'object'
          AND m ->> 'priceDelta' ~ '^-?[0-9]+(\.[0-9]+)?$'
)
FROM "Order" AS o
WHERE o."id" = oi."orderId"
  AND o."createdAt" < TIMESTAMP '2026-09-25 17:37:05'
  AND oi."modifiersJson" LIKE '[%'
  AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(oi."modifiersJson"::jsonb) AS m
        WHERE jsonb_typeof(m) = 'object'
          AND m ->> 'priceDelta' ~ '^-?[0-9]+(\.[0-9]+)?$'
  );
