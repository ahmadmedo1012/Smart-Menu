-- round88-A2 indexes (each justified by an EXPLAIN before/after on the
-- round88 perf DB — 161 restaurants / 40,250 orders / 80,718 order items /
-- 60,000 system events / 64,400 reward transactions — see
-- scripts/round88-perf/ and the worklog):
--   RewardTransaction(restaurantId, createdAt) → loyalty/stats recentTransactions
--     0.18ms (idx+sort-all) → 0.01ms (ordered index scan)
--   Referral(restaurantId, createdAt) → loyalty/stats recentReferrals
--     0.07ms → 0.01ms
--   SubscriptionPayment(status, createdAt) → admin/subscriptions pending list
--     0.08ms (idx+sort) → 0.03ms (ordered index scan, no sort node)
--   SystemEvent_userId_idx (expression) → /api/user/events 15s poll
--     14.09ms/1128 buffers (pkey scan + filter over the sparse metadata.userId
--     tail) → 0.09ms/42 buffers (bitmap scan). NOT expressible in
--     schema.prisma (jsonb path expression) — documented there in the
--     SystemEvent model comment; `prisma migrate diff --to-schema` ignores
--     non-datamodel indexes (verified exit 0), so the CI parity gate holds.

-- CreateIndex
CREATE INDEX "Referral_restaurantId_createdAt_idx" ON "Referral"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardTransaction_restaurantId_createdAt_idx" ON "RewardTransaction"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_createdAt_idx" ON "SubscriptionPayment"("status", "createdAt");

-- CreateIndex (round88-A2, hand-written: jsonb path expression index)
CREATE INDEX "SystemEvent_userId_idx" ON "SystemEvent" ((("metadata"#>ARRAY['userId']::text[])), "id");
