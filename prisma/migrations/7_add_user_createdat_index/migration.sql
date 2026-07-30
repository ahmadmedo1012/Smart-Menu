-- Add index on User.createdAt for admin stats time-range queries
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");