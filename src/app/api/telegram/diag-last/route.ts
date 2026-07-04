import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return new Response("Server misconfigured", { status: 500 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expected)
    return new Response("Forbidden", { status: 403 });

  const envToken = !!process.env.TELEGRAM_BOT_TOKEN;
  const envAdmin = process.env.TELEGRAM_ADMIN_IDS ?? "(not set)";
  const envGroups = process.env.TELEGRAM_GROUP_IDS ?? "(not set)";

  // Auto-migrate: remove old migrated group, add new supergroup
  let migrated = false;
  const oldGroup = await prisma.telegramBroadcastTarget.findFirst({
    where: { chatId: "-5376375121" },
  });
  if (oldGroup) {
    await prisma.telegramBroadcastTarget.delete({ where: { id: oldGroup.id } });
    migrated = true;
  }
  const newGroup = await prisma.telegramBroadcastTarget.findFirst({
    where: { chatId: "-1004226625838" },
  });
  if (!newGroup) {
    await prisma.telegramBroadcastTarget.create({
      data: { label: "SmartLink Group", chatId: "-1004226625838" },
    });
    migrated = true;
  }

  const diagConfig = await prisma.systemConfig.findUnique({ where: { key: "diag_last_keyboard" } });

  return Response.json({
    migrated,
    envToken,
    envAdmin,
    envGroups,
    diag: diagConfig?.value ?? null,
  });
}
