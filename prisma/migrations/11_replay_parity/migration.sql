-- Replay parity catch-up (round81): closes the drift between the migration
-- chain and schema.prisma. Everything after 0_init that historically evolved
-- via `prisma db push` only (never captured in migrations): 5 tables, 21
-- columns, 16 indexes, 8 FKs, 2 enums, Role enum values, and the
-- SystemEvent.severity type swap.
--
-- PRODUCTION SAFETY: every statement is guarded so the whole migration is a
-- NO-OP on production (all objects already exist there in final form) while a
-- fresh replay ends EXACTLY at schema.prisma (verified with
-- `prisma migrate diff --from-migrations --to-schema` = empty).
--
-- Ordering note: Prisma sorts lexicographically — "0_init" < "0_zz_..." <
-- "10_..." < "11_..." < "1_..." — this runs 4th; it only touches objects
-- created by 0_init plus its own new objects, so position is safe, and on
-- production only the new guarded migrations run.

-- ============================================================
-- 1) Enums
-- ============================================================
DO $$
BEGIN
    CREATE TYPE "EventSeverity" AS ENUM ('info', 'warning', 'error', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "Permission" AS ENUM ('APPROVE_ORDERS', 'MANAGE_SUBSCRIPTIONS', 'EDIT_SETTINGS', 'VIEW_ANALYTICS', 'MANAGE_RESTAURANTS', 'MANAGE_USERS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Role enum values (prod already has them; fresh replay adds them here)
DO $$
BEGIN
    ALTER TYPE "Role" ADD VALUE 'super_admin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "Role" ADD VALUE 'sub_admin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "Role" ADD VALUE 'USER';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2) Column additions (all guarded)
-- ============================================================
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "avgRating" DECIMAL(3,2);
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "modifiersJson" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "city" VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "featuredRank" INTEGER;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pickupTypes" TEXT NOT NULL DEFAULT 'inside,takeaway,delivery';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "showOnLanding" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "provider" SET DEFAULT 'libyana';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[];
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramLinkedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramNotifyOrders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramNotifyPayments" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramNotifySettings" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;

-- ============================================================
-- 3) SystemEvent.severity: TEXT -> EventSeverity
--    ONLY when the column is not already the enum (prod already converted:
--    a naive DROP COLUMN here would destroy production data).
-- ============================================================
DO $$
DECLARE udt text;
BEGIN
    SELECT udt_name INTO udt FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SystemEvent' AND column_name = 'severity';
    IF udt IS DISTINCT FROM 'EventSeverity' THEN
        ALTER TABLE "SystemEvent" DROP COLUMN "severity";
        ALTER TABLE "SystemEvent" ADD COLUMN "severity" "EventSeverity" NOT NULL DEFAULT 'info';
    END IF;
END $$;

-- ============================================================
-- 4) Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS "UserRestaurant" (
    "userId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRestaurant_pkey" PRIMARY KEY ("userId","restaurantId")
);

CREATE TABLE IF NOT EXISTS "ModifierGroup" (
    "id" SERIAL NOT NULL,
    "nameAr" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "menuItemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ModifierOption" (
    "id" SERIAL NOT NULL,
    "nameAr" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Review" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "menuItemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 5) Indexes (all guarded)
-- ============================================================
CREATE INDEX IF NOT EXISTS "UserRestaurant_userId_idx" ON "UserRestaurant"("userId");
CREATE INDEX IF NOT EXISTS "UserRestaurant_restaurantId_idx" ON "UserRestaurant"("restaurantId");
CREATE INDEX IF NOT EXISTS "ModifierGroup_menuItemId_idx" ON "ModifierGroup"("menuItemId");
CREATE INDEX IF NOT EXISTS "ModifierOption_groupId_idx" ON "ModifierOption"("groupId");
CREATE INDEX IF NOT EXISTS "RateLimitEntry_windowEnd_idx" ON "RateLimitEntry"("windowEnd");
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitEntry_key_windowEnd_key" ON "RateLimitEntry"("key", "windowEnd");
CREATE INDEX IF NOT EXISTS "Review_menuItemId_idx" ON "Review"("menuItemId");
CREATE INDEX IF NOT EXISTS "Review_menuItemId_createdAt_idx" ON "Review"("menuItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Referral_referralCode_restaurantId_idx" ON "Referral"("referralCode", "restaurantId");
CREATE INDEX IF NOT EXISTS "Restaurant_isActive_idx" ON "Restaurant"("isActive");
CREATE INDEX IF NOT EXISTS "Restaurant_showOnLanding_isActive_idx" ON "Restaurant"("showOnLanding", "isActive");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_userId_idx" ON "SubscriptionPayment"("userId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_userId_status_idx" ON "SubscriptionPayment"("userId", "status");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- ============================================================
-- 6) Foreign keys — replace only when missing or wrong ON DELETE action.
--    (confdeltype: 'a'=NO ACTION, 'c'=CASCADE, 'r'=RESTRICT, 'n'=SET NULL,
--     'd'=SET DEFAULT)
-- ============================================================
DO $$
DECLARE deltype text;
BEGIN
    SELECT confdeltype INTO deltype FROM pg_constraint
    WHERE conname = 'Order_restaurantId_fkey' AND conrelid = '"Order"'::regclass;
    IF deltype IS DISTINCT FROM 'c' THEN
        ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_restaurantId_fkey";
        ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
DECLARE deltype text;
BEGIN
    SELECT confdeltype INTO deltype FROM pg_constraint
    WHERE conname = 'OrderItem_itemId_fkey' AND conrelid = '"OrderItem"'::regclass;
    IF deltype IS DISTINCT FROM 'r' THEN
        ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_itemId_fkey";
        ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "UserRestaurant" ADD CONSTRAINT "UserRestaurant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "UserRestaurant" ADD CONSTRAINT "UserRestaurant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
