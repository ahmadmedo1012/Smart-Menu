-- r122 rescue of the r121 effective-price backfill (C-2/D-1 money-truth work).
--
-- WHY THIS FILE EXISTS (forensics): the original
-- zz_round121_orderitem_effective_price_backfill shipped a FLAT UPDATE whose
-- `oi."modifiersJson"::jsonb` cast runs over every pre-cutoff row matching
-- `LIKE '[%'`. On production that cast hit a legacy row whose modifiersJson
-- starts with '[' but is not valid JSON -> the migration errored, froze the
-- deploy chain (a failed ledger record), and its files were then REMOVED
-- (a failed record for a missing migration directory blocks P3009 as
-- "failed"; a ROLLED-BACK record for a missing directory is deploy-safe —
-- behavior matrix verified on Prisma 7.10: combo B). This replacement:
--   1. never casts unvalidated JSON in a set-based statement — each row's
--      cast lives inside a per-row BEGIN/EXCEPTION; malformed rows are
--      SKIPPED (kept base-only, the same documented boundary as pre-r118
--      bare-id rows) instead of aborting the deploy;
--   2. carries a double-charge guard: databases where the ORIGINAL v1
--      migration FINISHED (local dev/round DBs) already have the deltas
--      added — re-running would charge them twice (the r121 ledger's
--      "manual re-apply double-charges" warning). v1's finished record
--      makes this migration a no-op there. On production v1 only ever
--      FAILED (finished_at IS NULL) and on fresh databases it has no
--      record at all — in both cases this backfill runs, exactly once
--      (its own finished record then guards all future re-runs).
--
-- Semantics (identical to v1 otherwise):
-- * Cutoff: rows are priced inside the order's own tx — Order.createdAt
--   predating the r120 cutover (2026-09-25 17:37:05 UTC, commit 4ba875a2)
--   store the BASE price; post-cutover rows already store effective price.
-- * Deltas come from the modifiersJson SNAPSHOT format
--   ([{id,nameAr,name,priceDelta}] — written since r118-B1). Bare-id arrays
--   ([1,2] — no stored deltas) contribute nothing and stay base-only.
-- * No aggregate consumes Σ OrderItem.price anywhere (stats read
--   Order.total; loyalty accrual reads Order.total) — this cannot corrupt
--   any total. OrderItem has no updatedAt, so nothing else moves.

DO $$
DECLARE
    r RECORD;
    delta NUMERIC;
    updated INT := 0;
    skipped  INT := 0;
BEGIN
    -- Double-charge guard: v1 already finished on this database?
    IF EXISTS (
        SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = 'zz_round121_orderitem_effective_price_backfill'
          AND finished_at IS NOT NULL
    ) THEN
        RAISE NOTICE 'v1 backfill already finished here — skipping (double-charge guard)';
        RETURN;
    END IF;

    FOR r IN
        SELECT oi.id, oi."price", oi."modifiersJson"
        FROM "OrderItem" oi
        JOIN "Order" o ON o."id" = oi."orderId"
        WHERE o."createdAt" < TIMESTAMP '2026-09-25 17:37:05'
          AND oi."modifiersJson" LIKE '[%'
    LOOP
        BEGIN
            SELECT COALESCE(SUM((m ->> 'priceDelta')::numeric), 0)
              INTO delta
              FROM jsonb_array_elements(r."modifiersJson"::jsonb) AS m
             WHERE jsonb_typeof(m) = 'object'
               AND m ->> 'priceDelta' ~ '^-?[0-9]+(\.[0-9]+)?$';

            IF delta IS NOT NULL AND delta <> 0 THEN
                UPDATE "OrderItem" SET "price" = r."price" + delta WHERE id = r.id;
                updated := updated + 1;
            END IF;
        EXCEPTION WHEN others THEN
            -- malformed legacy modifiersJson: skip, keep base-only
            skipped := skipped + 1;
            RAISE NOTICE 'backfill: skipped OrderItem % (malformed modifiersJson)', r.id;
        END;
    END LOOP;

    RAISE NOTICE 'backfill done: % row(s) updated, % malformed row(s) skipped', updated, skipped;
END $$;
