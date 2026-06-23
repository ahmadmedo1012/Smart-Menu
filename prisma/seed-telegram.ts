/**
 * Seed script to set up Telegram bot configuration in the database.
 *
 * This script does NOT contain real tokens. Run it to verify the DB connection,
 * then configure the actual bot token and chatId via the admin UI at /admin/telegram
 * or by editing the row directly in the telegramConfig table.
 *
 * Usage:
 *   npx tsx prisma/seed-telegram.ts
 *
 * Or to seed with a placeholder:
 *   BOT_TOKEN=your_token CHAT_ID=your_chat_id npx tsx prisma/seed-telegram.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const exists = await prisma.telegramConfig.findFirst();
  if (exists) {
    console.log("TelegramConfig already exists (id=%d). Skipping upsert.", exists.id);
    console.log("  botToken: %s", exists.botToken ? exists.botToken.slice(0, 6) + "..." : "(empty)");
    console.log("  chatId:   %s", exists.chatId || "(empty)");
    console.log("  isActive: %s", exists.isActive);
    console.log("  events:   %s", (exists.events as string[]).join(", ") || "(none)");
    console.log("\nTo update, use the admin page at /admin/telegram.");
    return;
  }

  const botToken = process.env.BOT_TOKEN || "";
  const chatId = process.env.CHAT_ID || "";

  if (!botToken || !chatId) {
    console.log("No TelegramConfig found. To seed with a placeholder:");
    console.log("  1. Get a bot token from https://t.me/BotFather");
    console.log("  2. Get your chat ID by messaging @userinfobot");
    console.log("  3. Run:  BOT_TOKEN='123:abc' CHAT_ID='-100123' npx tsx prisma/seed-telegram.ts");
    console.log("  4. Or configure via the admin UI at /admin/telegram after seeding.");
    console.log("\nSeeding with empty placeholder...");
  }

  const config = await prisma.telegramConfig.upsert({
    where: { id: 1 },
    create: { botToken, chatId, events: ["user_signup", "system_alert"], isActive: !!botToken },
    update: { botToken, chatId, isActive: !!botToken },
  });

  console.log("TelegramConfig upserted: id=%d, isActive=%s", config.id, config.isActive);
  if (!botToken) {
    console.log("\nNext steps:");
    console.log("  1. Go to https://t.me/BotFather, create a bot, copy the token");
    console.log("  2. Go to /admin/telegram in the app");
    console.log("  3. Enter the token and chat ID, then click 'حفظ الإعدادات'");
    console.log("  4. Click 'اختبار الإرسال' to verify");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
