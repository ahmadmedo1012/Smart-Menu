-- round87-A9: dedupe then enforce uniqueness on (referralCode, referredName).
-- The claim route's find-then-create had no unique constraint — concurrent
-- claims for the same code+fingerprint created duplicate pending rows,
-- inflating owner referral stats. Duplicate groups keep their lowest id.

DELETE FROM "Referral" r
USING "Referral" keep
WHERE r."referralCode" = keep."referralCode"
  AND r."referredName" = keep."referredName"
  AND r.id > keep.id;

CREATE UNIQUE INDEX "Referral_code_name_key" ON "Referral"("referralCode", "referredName");
