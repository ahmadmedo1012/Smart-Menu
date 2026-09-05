-- Replayability prerequisites (round81): migrations 5, 8 and 9 reference
-- objects that were never created inside the migration chain (they were
-- originally created via `prisma db push` during early development):
--   * 5_add_telegram_approvers_bigint  -> ALTERs "TelegramApprover"
--   * 8_add_subscription_expiry        -> ALTER TYPE "SubscriptionStatus"
--   * 9_add_user_subscription_status_index -> indexes "User"."subscriptionStatus"
-- A fresh database therefore could not replay the chain (P3009), which broke
-- CI and any disaster-recovery scenario. Production has all objects already,
-- so every statement here is guarded and becomes a no-op there.
--
-- NOTE on ordering: Prisma sorts migrations lexicographically, so
-- "0_init" < "0_zz_..." < "10_..." < "1_..." — this runs SECOND, before the
-- migrations that need these objects. The "subscriptionStatus" column and the
-- "telegramId" BIGINT type are created in their FINAL form (schema.prisma);
-- later migrations' ALTERs on them are then harmless idempotent no-ops.

-- 1) SubscriptionStatus enum (without EXPIRED — migration 8 adds it)
DO $$
BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('UNPAID', 'PAID', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL; -- already exists (production)
END $$;

-- 2) User.subscriptionStatus column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'UNPAID';

-- 3) TelegramApprover table (telegramId created as BIGINT directly — the
--    follow-up ALTER in migration 5 is a no-op type-cast)
CREATE TABLE IF NOT EXISTS "TelegramApprover" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "addedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramApprover_pkey" PRIMARY KEY ("id")
);

-- 3a) unique telegram id + FK to User — guarded separately because
--     CREATE TABLE IF NOT EXISTS skips the whole block when the table exists
DO $$
BEGIN
    ALTER TABLE "TelegramApprover" ADD CONSTRAINT "TelegramApprover_telegramId_key" UNIQUE ("telegramId");
EXCEPTION
    WHEN duplicate_object OR duplicate_table THEN NULL; -- constraint already exists
END $$;

DO $$
BEGIN
    ALTER TABLE "TelegramApprover" ADD CONSTRAINT "TelegramApprover_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL; -- constraint already exists
END $$;
