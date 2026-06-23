import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const config = await prisma.telegramConfig.findFirst();

    if (!config) {
      return success({
        exists: false,
        diagnostics: {
          configExists: false,
          isActive: false,
          botTokenPreview: null,
          chatId: null,
          events: [],
        },
      });
    }

    let telegramApiError: string | null = null;
    if (config.botToken && config.chatId && config.isActive) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${config.botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: config.chatId,
              text: "🔍 *Diagnostic Test*\n\nIf you see this, Telegram is working.",
              parse_mode: "Markdown",
            }),
          }
        );
        if (!res.ok) {
          const body = await res.text();
          telegramApiError = `HTTP ${res.status}: ${body.slice(0, 500)}`;
        }
      } catch (e) {
        telegramApiError =
          e instanceof Error ? e.message : "Network error during test call";
      }
    }

    return success({
      exists: true,
      diagnostics: {
        configExists: true,
        isActive: config.isActive,
        botTokenPreview: config.botToken
          ? config.botToken.slice(0, 4) + "..."
          : null,
        chatId: config.chatId || null,
        events: (config.events as string[]) ?? [],
      },
      telegramApiError,
    });
  } catch (e) {
    return handleError(e);
  }
}
