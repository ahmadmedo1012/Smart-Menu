-- r121-D3 (X2 §9): schema↔DB nullability drift on the four array columns.
--
-- Restaurant.gallery, User.permissions, MenuItem.dietaryTags and
-- MenuItem.allergens are nullable in PostgreSQL (origin: 0_init / 11_replay_parity
-- — `TEXT[] DEFAULT ARRAY[]::TEXT[]` with no NOT NULL) but REQUIRED in
-- schema.prisma (`String[] @default([])`) — and Prisma's datamodel cannot even
-- express an optional list, so required is the only honest representation.
-- X2 proved with the repo's own tooling that NO Prisma-based gate can see this
-- drift (`prisma migrate diff --from-config-datasource --to-schema` →
-- "No difference detected" — the diff engine normalizes nullable-array-with-
-- default to a required list). The fix direction is therefore DB→schema, not
-- schema→DB: make the database match what the generated client already claims
-- (`string[]`, never null at runtime).
--
-- Defense-in-depth only: all app writes are Prisma (never NULL), and the live
-- round DB has 0 NULL rows in all four columns (verified via information_schema
-- + NULL-count queries). This closes the raw-SQL / Neon-console hole where a
-- manual INSERT could persist a NULL the client types call impossible.
--
-- Idempotent by construction: the UPDATE matches nothing once tightened (and
-- matched nothing even before — 0 NULL rows), and SET NOT NULL on an already-
-- NOT NULL column is a successful no-op in PostgreSQL.

UPDATE "Restaurant" SET "gallery" = '{}' WHERE "gallery" IS NULL;
ALTER TABLE "Restaurant" ALTER COLUMN "gallery" SET NOT NULL;

UPDATE "User" SET "permissions" = '{}' WHERE "permissions" IS NULL;
ALTER TABLE "User" ALTER COLUMN "permissions" SET NOT NULL;

UPDATE "MenuItem" SET "dietaryTags" = '{}' WHERE "dietaryTags" IS NULL;
ALTER TABLE "MenuItem" ALTER COLUMN "dietaryTags" SET NOT NULL;

UPDATE "MenuItem" SET "allergens" = '{}' WHERE "allergens" IS NULL;
ALTER TABLE "MenuItem" ALTER COLUMN "allergens" SET NOT NULL;
