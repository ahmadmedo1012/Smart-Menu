import type { NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { broadcastToAll } from "@/lib/telegram-broadcast";

export async function POST(_: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const result = await broadcastToAll(
      "🔔 *Test Notification*\n\nSmart Menu Telegram integration is working correctly!",
      { parseMode: "Markdown" },
    );
    return success(result);
  } catch (e) {
    return handleError(e);
  }
}
