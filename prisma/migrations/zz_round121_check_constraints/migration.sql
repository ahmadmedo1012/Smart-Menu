-- r121-D4 (r121-E hotfix, ADV2-4): DB-level enforcement of the zod contracts.
--
-- ⚠ r121-E DEPLOY HOTFIX — this migration BLOCKED the production deploy chain:
-- ADD CONSTRAINT ... CHECK validates EXISTING rows, and production carries
-- legacy pre-validation-era data (e.g. the r105 qty-cap-era order lines that
-- predate the 99 cap, and historical rating/points edge rows). The original
-- version of this file failed migrate-deploy on that data, freezing
-- production at 19fa136a until edited.
--
-- Every constraint below is therefore added NOT VALID: new/updated rows are
-- enforced immediately (the DB backstop D-4 was designed for), legacy rows
-- are not re-scanned. After the legacy data is cleaned (see the pending USER
-- ACTION in ENGINEERING_STATE: purge the QA/edge orders), run
--   ALTER TABLE ... VALIDATE CONSTRAINT <name>;
-- per constraint to make them fully checked. Postgres keeps NOT VALID
-- constraints fully functional for writes — VALIDATE is an optimization +
-- integrity audit, not a requirement.
--
-- The RewardTransaction points check is GONE from this file on purpose: the
-- ledger legitimately stores NEGATIVE redemption debits (redeem route writes
-- points: -REWARD_COST — r121 e2e caught the 500 live). Local databases that
-- applied the original version had it removed by
-- zzz_round121_rewardtransaction_check_drop; on a fresh database it simply
-- never exists. Both paths converge on the same final state.

ALTER TABLE "MenuItem" ADD CONSTRAINT "zz_round121_menuitem_price_check" CHECK ("price" >= 0) NOT VALID;
ALTER TABLE "OrderItem" ADD CONSTRAINT "zz_round121_orderitem_price_check" CHECK ("price" >= 0) NOT VALID;
ALTER TABLE "OrderItem" ADD CONSTRAINT "zz_round121_orderitem_quantity_check" CHECK ("quantity" >= 1 AND "quantity" <= 99) NOT VALID;
ALTER TABLE "Review" ADD CONSTRAINT "zz_round121_review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5) NOT VALID;
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "zz_round121_loyaltycard_points_check" CHECK ("points" >= 0) NOT VALID;
