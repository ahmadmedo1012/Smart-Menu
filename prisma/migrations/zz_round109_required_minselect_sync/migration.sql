-- r109-F9: repair modifier groups saved with the required/minSelect mismatch.
--
-- The owner builder let «إلزامية» (required) and «الحد الأدنى» (minSelect)
-- disagree: flipping required ON left minSelect at 0, and the PUBLIC menu
-- dialog enforces minSelect>0 ONLY — such groups rendered «اختياري» and
-- accepted orders without the required modifier (live-proven r108,
-- ORD-MU31MBIC-B14E7AA1). The write path now enforces the invariant
-- (src/lib/modifier-schema.ts); this migration repairs rows already saved
-- with the mismatch: required groups get the minimum enforcement (1).
--
-- Idempotent by construction (re-running matches nothing once repaired).

UPDATE "ModifierGroup" SET "minSelect" = 1 WHERE "required" = true AND "minSelect" = 0;
