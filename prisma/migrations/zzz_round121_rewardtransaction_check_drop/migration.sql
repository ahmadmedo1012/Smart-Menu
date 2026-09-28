-- r121 regression fix (caught by the final e2e regression — unit tests mock
-- prisma, so no DB constraint fires there): RewardTransaction.points
-- legitimately stores NEGATIVE values for redemption debits —
-- src/app/api/loyalty/redeem/route.ts writes `points: -REWARD_COST` for the
-- redeem transaction while earn transactions write positives. The
-- zz_round121_rewardtransaction_points_check (points >= 0) constraint broke
-- the entire redeem flow with a 500 («new row for relation "RewardTransaction"
-- violates check constraint»).
--
-- The REAL balance invariant lives on LoyaltyCard.points (>= 0) — enforced
-- in-app by the route's atomic `points: { gte: REWARD_POINTS }` updateMany
-- guard, and at the DB level by zz_round121_loyaltycard_points_check (kept).
-- RewardTransaction is a ledger: signed entries are its design. Inventing a
-- sign constraint there was wrong; this drops it.

ALTER TABLE "RewardTransaction" DROP CONSTRAINT IF EXISTS "zz_round121_rewardtransaction_points_check";
