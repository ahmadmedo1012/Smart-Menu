-- Alter column from PaymentProvider enum to TEXT
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "provider" TYPE TEXT;
DROP TYPE IF EXISTS "PaymentProvider";
