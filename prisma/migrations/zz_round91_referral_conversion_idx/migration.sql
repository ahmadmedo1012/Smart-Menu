-- R91 F-C (D3 §5 gap 1): Referral(restaurantId, status, referredPhone).
-- src/lib/referral-conversion.ts findFirst
--   { where: { restaurantId, referredPhone, status: 'pending' },
--     orderBy: { createdAt: 'asc' } }
-- runs inside the completion transaction of EVERY completed order (money
-- path). No existing index contained referredPhone: the planner covered the
-- restaurantId equality via Referral_restaurantId_createdAt_idx and residual-
-- filtered phone+status — degrading linearly with pending-claim volume (the
-- per-claim growth vector in the D3 growth table). The 3-column equality
-- index answers the lookup directly; the residual createdAt sort is over the
-- (few) matching rows only.
-- Plain CREATE INDEX, no CONCURRENTLY: the table is small (referrals grow
-- per claim, rate-limited; D3 impact rating today 4/10) — the D3 recipe only
-- triggers at ≥100K rows / write-hot tables. Plain matches the round88/89
-- money-path migration style.
-- zz_ prefix (M-3 ordering footgun guard, same as zz_round90_*): sorts after
-- every 0-14_* and 2026* directory so the migration chronology in
-- _prisma_migrations stays append-last.
CREATE INDEX "Referral_restaurantId_status_referredPhone_idx"
  ON "Referral"("restaurantId", "status", "referredPhone");
