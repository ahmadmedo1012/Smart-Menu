-- r121-D4: zero CHECK constraints in the database — every business bound
-- (price >= 0, quantity 1..99, rating 1..5, points >= 0) was zod-only.
--
-- The pg_constraint dump at audit time was 53 constraints, contype ∈ {p,f,u}
-- only. All CURRENT write paths are zod-gated, but nothing stopped a future
-- script, admin bulk edit, or manual Neon SQL from persisting a negative price
-- or a 0-quantity line — a single bad row would silently poison revenue sums
-- and receipts. These named CHECKs push the app-level contracts to the
-- database (Ponytail: DB constraint over app code — defense-in-depth, not a
-- replacement for the zod gates).
--
-- Contract sources (each bound mirrors the zod contract exactly):
--   MenuItem.price    >= 0        items POST `z.number().min(0)` (0 = free item)
--   OrderItem.price   >= 0        orders POST rejects a negative effective unit
--                                 price pre-write (r118-A3-P1: eff + Σdeltas < 0)
--   OrderItem.quantity BETWEEN 1 AND 99   orders POST `.int().min(1)
--                                 .max(MAX_ITEM_QUANTITY=99)` (src/lib/constants)
--   Review.rating     BETWEEN 1 AND 5     reviews POST `z.number().int().min(1).max(5)`
--   LoyaltyCard.points    >= 0    redeem is a guarded updateMany that can never
--                                 take points negative (r119 verified)
--   RewardTransaction.points >= 0 earn/claim are additive-only
--
-- Constraint names carry the zz_round121_ prefix so a future drop/replace is a
-- one-line, unambiguous operation (never confused with an ORM-managed name).
--
-- Idempotency: prisma migrate deploy runs each migration exactly once; the
-- DROP IF EXISTS + ADD pattern additionally makes the file safe to re-apply by
-- hand (self-healing). Pre-flight on the round DB: 0 violating rows in all six
-- columns (verified read-only before deploy — Neon needs the same check).

ALTER TABLE "MenuItem" DROP CONSTRAINT IF EXISTS "zz_round121_menuitem_price_check";
ALTER TABLE "MenuItem" ADD CONSTRAINT "zz_round121_menuitem_price_check" CHECK ("price" >= 0);

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "zz_round121_orderitem_price_check";
ALTER TABLE "OrderItem" ADD CONSTRAINT "zz_round121_orderitem_price_check" CHECK ("price" >= 0);

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "zz_round121_orderitem_quantity_check";
ALTER TABLE "OrderItem" ADD CONSTRAINT "zz_round121_orderitem_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "zz_round121_review_rating_check";
ALTER TABLE "Review" ADD CONSTRAINT "zz_round121_review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "LoyaltyCard" DROP CONSTRAINT IF EXISTS "zz_round121_loyaltycard_points_check";
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "zz_round121_loyaltycard_points_check" CHECK ("points" >= 0);

ALTER TABLE "RewardTransaction" DROP CONSTRAINT IF EXISTS "zz_round121_rewardtransaction_points_check";
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "zz_round121_rewardtransaction_points_check" CHECK ("points" >= 0);
