import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 3,
  connectionTimeoutMillis: 10_000,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool, { schema: process.env.DATABASE_SCHEMA ?? "public" }),
});

async function main() {
  const existingTargets = await prisma.telegramBroadcastTarget.count();
  if (existingTargets > 0) {
    console.log("Broadcast targets already exist, skipping seed.");
    return;
  }

  const config = await prisma.telegramConfig.findFirst();
  if (config && config.chatId) {
    await prisma.telegramBroadcastTarget.create({
      data: {
        label: "الإعدادات القديمة (مُهاجر)",
        chatId: config.chatId,
        isActive: config.isActive,
      },
    });
    console.log(`Migrated existing chatId "${config.chatId}" as first broadcast target.`);
  } else {
    console.log("No existing chatId to migrate.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
