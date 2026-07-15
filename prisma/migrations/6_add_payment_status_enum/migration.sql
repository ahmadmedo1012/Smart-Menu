-- Create PaymentStatus enum and migrate SubscriptionPayment.status
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'verified', 'cancelled');
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "status" TYPE "PaymentStatus" USING status::text::"PaymentStatus";
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "status" SET DEFAULT 'pending';