import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";

export async function POST(request: NextRequest) {
  // Auth via secret_token (same as webhook)
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return new Response("Server misconfigured", { status: 500 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    // Priority: env var first, then DB
    const envToken = process.env.TELEGRAM_BOT_TOKEN ?? "(not set)";
    const dbConfig = await prisma.telegramConfig.findFirst();
    const dbToken = dbConfig?.botToken ?? "(no db row)";
    const isActive = dbConfig?.isActive ?? "(no db row)";
    const effectiveToken = envToken !== "(not set)" ? envToken : dbToken !== "(no db row)" ? dbToken : null;

    const adminIds = getAdminTelegramIds();
    const envAdmin = process.env.TELEGRAM_ADMIN_IDS ?? "(not set)";

    const results: Record<string, unknown>[] = [];

    // Test each admin ID
    for (const id of adminIds) {
      const sent = await sendMessageWithKeyboard(effectiveToken ?? "", String(id),
        "🔍 *تشخيص الأزرار*\n\nهذه رسالة تشخيصية.", [
          [{ text: "✅ اختبار", callbackData: `diag:${Date.now()}` }],
        ], { parseMode: "Markdown" });
      results.push({ target: "admin", chatId: id, sent: !!sent });
    }

    // Test broadcast targets
    const targets = await prisma.telegramBroadcastTarget.findMany({
      where: { isActive: true },
      select: { id: true, chatId: true, label: true },
    });
    for (const t of targets) {
      const sent = await sendMessageWithKeyboard(effectiveToken ?? "", t.chatId,
        "🔍 *تشخيص الأزرار*", [
          [{ text: "✅ اختبار", callbackData: `diag:${Date.now()}` }],
        ], { parseMode: "Markdown" });
      results.push({ target: "broadcast", id: t.id, label: t.label, chatId: t.chatId, sent: !!sent });
    }

    return Response.json({
      envToken: envToken !== "(not set)" ? "✅ present" : "❌ missing",
      dbToken: dbToken !== "(no db row)" && dbToken ? "✅ present" : `❌ ${dbToken}`,
      dbConfigActive: isActive,
      envAdminRaw: envAdmin,
      parsedAdminIds: adminIds,
      broadcastTargets: targets,
      sendResults: results,
      effectiveToken: effectiveToken ? "✅ available" : "❌ missing",
    });
  } catch (e) {
    console.error("[diagnose-keyboard]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
