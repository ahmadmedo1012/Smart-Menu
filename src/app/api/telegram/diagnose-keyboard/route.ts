import { type NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";

export async function POST(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const config = await prisma.telegramConfig.findFirst();
    const botToken = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;

    const envToken = process.env.TELEGRAM_BOT_TOKEN ?? "(not set)";
    const dbToken = config?.botToken ?? "(no db row)";
    const isActive = config?.isActive ?? "(no db row)";
    const adminIds = getAdminTelegramIds();
    const envAdmin = process.env.TELEGRAM_ADMIN_IDS ?? "(not set)";

    if (!botToken) {
      return success({
        status: "blocked",
        reason: "لا يوجد توكن بوت",
        details: { dbToken, envToken, isActive },
      });
    }

    if (adminIds.length === 0) {
      return success({
        status: "blocked",
        reason: "لا يوجد معرفات مشرفين",
        details: { envAdmin, adminIds },
      });
    }

    // Try sending keyboard message to each admin
    const results: Record<string, unknown>[] = [];
    for (const id of adminIds) {
      const sent = await sendMessageWithKeyboard(botToken, String(id), "🔍 *اختبار نظام الأزرار*\n\nإذا رأيت هذه الرسالة بالأزرار أدناه، النظام يعمل بشكل صحيح.", [
        [{ text: "✅ اختبار", callbackData: `diag_test:${Date.now()}` }],
      ], { parseMode: "Markdown" });
      results.push({ chatId: id, sent: !!sent });
    }

    // Also check broadcast targets
    const targets = await prisma.telegramBroadcastTarget.findMany({
      where: { isActive: true },
      select: { id: true, chatId: true, label: true },
    });
    for (const t of targets) {
      const sent = await sendMessageWithKeyboard(botToken, t.chatId, "🔍 *اختبار نظام الأزرار*", [
        [{ text: "✅ اختبار", callbackData: `diag_test:${Date.now()}` }],
      ], { parseMode: "Markdown" });
      results.push({ broadcastTargetId: t.id, label: t.label, chatId: t.chatId, sent: !!sent });
    }

    return success({
      status: "completed",
      botTokenSource: dbToken !== "(no db row)" && dbToken ? "DB" : "ENV",
      dbConfigActive: isActive,
      envAdminRaw: envAdmin,
      parsedAdminIds: adminIds,
      broadcastTargets: targets,
      sendResults: results,
    });
  } catch (e) {
    return handleError(e);
  }
}
