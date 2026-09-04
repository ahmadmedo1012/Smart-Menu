-- Round79 Stage H — cinematic featured-item showcase on /menu/[slug].
-- Adds the three showcase columns to MenuItem.
-- Idempotent (ADD COLUMN IF NOT EXISTS): safe to re-run via the build-time
-- sync script (scripts/round79-db-sync.mjs) and safe on fresh databases.
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "featuredRank" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "showcaseTag" VARCHAR(40);
