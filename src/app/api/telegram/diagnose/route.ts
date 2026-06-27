import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

export async function GET(_: NextRequest) {
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

    const testResults: { format: "number" | "string"; ok: boolean; error: string | null }[] = [];
    let workingFormat: "number" | "string" | null = null;

    if (config.botToken && config.chatId && config.isActive) {
      const chatIdNum = Number(config.chatId);
      const chatIdStr = String(config.chatId);
      const botUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

      const testPayload = (chatId: number | string): Record<string, unknown> => ({
        chat_id: chatId,
        text: `\u{1F50D} Diagnostic Test (${typeof chatId})\n\nIf you see this, ${typeof chatId} format works.`,
        parse_mode: "Markdown",
      });

      // Try Number first
      try {
        const r1 = await fetch(botUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testPayload(chatIdNum)),
        });
        if (r1.ok) {
          testResults.push({ format: "number", ok: true, error: null });
          workingFormat = "number";
        } else {
          const err = await r1.text();
          testResults.push({ format: "number", ok: false, error: err.slice(0, 300) });
          // Try String fallback
          try {
            const r2 = await fetch(botUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(testPayload(chatIdStr)),
            });
            if (r2.ok) {
              testResults.push({ format: "string", ok: true, error: null });
              workingFormat = "string";
            } else {
              const err2 = await r2.text();
              testResults.push({ format: "string", ok: false, error: err2.slice(0, 300) });
            }
          } catch (e2) {
            testResults.push({
              format: "string",
              ok: false,
              error: e2 instanceof Error ? e2.message : "Network error",
            });
          }
        }
      } catch (e) {
        testResults.push({
          format: "number",
          ok: false,
          error: e instanceof Error ? e.message : "Network error",
        });
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
      testResults,
      workingFormat,
      note: workingFormat === null
        ? "Neither format worked. Ensure the bot is added as a member of the Telegram group/supergroup."
        : `chat_id as ${workingFormat} works.`,
    });
  } catch (e) {
    return handleError(e);
  }
}
