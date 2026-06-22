import { NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const ok = await sendTelegramMessage(
      "🔔 *Test Notification*\n\nSmart Menu Telegram integration is working correctly!",
      { parseMode: "Markdown" },
    );
    if (!ok) return error("فشل إرسال رسالة الاختبار. تحقق من الإعدادات.", 400);
    return success({ sent: true });
  } catch (e) {
    return handleError(e);
  }
}
