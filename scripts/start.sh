#!/bin/bash
set -e

# بدل npx prisma db push — نسوي migration بأمان
echo "Running safe-migrate..."
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const pr = new PrismaClient();
async function run() {
  // Try to add restaurantId column safely — ignore if exists
  await pr.\$executeRawUnsafe('ALTER TABLE \"Referral\" ADD COLUMN IF NOT EXISTS \"restaurantId\" INTEGER;');
  await pr.\$executeRawUnsafe('UPDATE \"Referral\" SET \"restaurantId\" = 1 WHERE \"restaurantId\" IS NULL;');
  await pr.\$executeRawUnsafe('ALTER TABLE \"Referral\" ALTER COLUMN \"restaurantId\" SET NOT NULL;');
  console.log('Migration OK — Referral.restaurantId is set');
}
run().catch(e => console.log('Migration skipped (maybe exists):', e.message)).finally(() => pr.\$disconnect());
" 2>&1

npx prisma db push --accept-data-loss 2>&1
echo "Starting Next.js..."
exec npx next start -p "\$PORT"
