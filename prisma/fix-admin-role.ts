/**
 * One-shot migration: fix admin user role on production DB.
 * Usage: npx tsx prisma/fix-admin-role.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const user = await prisma.user.findUnique({ where: { username: "admin" } });

  if (!user) {
    console.log("Admin user not found — nothing to fix.");
    return;
  }

  if (user.role === "admin") {
    console.log(`Admin user id=${user.id} already has role="admin". No change needed.`);
    return;
  }

  const oldRole = user.role;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });

  console.log(`Fixed admin role: id=${updated.id} "${oldRole}" → "${updated.role}"`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
