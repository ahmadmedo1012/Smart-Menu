-- Round83 §2.3 — multiple showcase badges per featured item.
-- showcaseTag (single VARCHAR, round79) → showcaseTags (TEXT[] up to 3 tags).
--
-- BACKWARD COMPATIBILITY (plan requirement, one round of dual-write):
--   * the legacy `showcaseTag` column is KEPT (dropped in a later round) —
--     the API keeps writing it as tags[0] so any older payload consumer
--     still works;
--   * the legacy value is COPIED into the array as its first element so no
--     production data is lost;
--   * ADD COLUMN IF NOT EXISTS + conditional UPDATE make this migration
--     idempotent and safe to re-run (same guardian style as 10/11).
--
-- Ordering note: lexicographically "12_..." runs after "11_..." and before
-- "1_add_..." — MenuItem exists since 0_init, so position is safe. On
-- production only this migration runs (additive-only: new column + backfill,
-- zero destructive statements).

ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "showcaseTags" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: legacy single tag becomes the first array element (only where
-- the array is still empty — never overwrites tags written after this deploy).
UPDATE "MenuItem"
SET "showcaseTags" = ARRAY["showcaseTag"]
WHERE "showcaseTag" IS NOT NULL
  AND "showcaseTag" <> ''
  AND "showcaseTags" = '{}';
