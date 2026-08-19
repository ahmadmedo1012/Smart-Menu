-- Subscription expiry enforcement
-- Index to speed up the expiry cron: WHERE "subscriptionStatus" = 'PAID' scans.
CREATE INDEX "User_subscriptionStatus_idx" ON "User"("subscriptionStatus");