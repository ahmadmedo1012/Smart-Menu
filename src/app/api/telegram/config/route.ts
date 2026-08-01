import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { encryptValue } from "@/lib/config";
import { z } from "zod";

const upsertSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const config = await prisma.telegramConfig.findFirst({
      select: { id: true, botToken: true, chatId: true, events: true, isActive: true },
    });
    // Never expose the bot token — only indicate whether it's configured
    return success({
      id: config?.id,
      chatId: config?.chatId,
      events: config?.events,
      isActive: config?.isActive,
      botTokenMasked: config?.botToken ? true : false,
      botToken: undefined,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const body = upsertSchema.parse(await request.json());
    const encryptedToken = await encryptValue(body.botToken);
    await prisma.telegramConfig.upsert({
      where: { id: 1 },
      create: {
        botToken: encryptedToken,
        chatId: body.chatId,
        events: body.events,
        isActive: body.isActive,
      },
      update: {
        botToken: encryptedToken,
        chatId: body.chatId,
        events: body.events,
        isActive: body.isActive,
      },
    });
    // Re-read so return reflects saved state without leaking ciphertext
    const saved = await prisma.telegramConfig.findFirst({
      select: { id: true, chatId: true, events: true, isActive: true },
    });

    // Register the webhook so Telegram actually delivers updates to us.
    // Without this the bot never receives messages (live: bot silent).
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const domain = process.env.NEXT_PUBLIC_DOMAIN;
    if (secret && domain && body.isActive) {
      try {
        const webhookUrl = `${domain}/api/telegram/webhook`;
        const res = await fetch(`https://api.telegram.org/bot${body.botToken}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: secret,
            allowed_updates: ["message", "callback_query"],
          }),
        });
        const json = (await res.json()) as { ok?: boolean; description?: string };
        if (!json.ok) {
          return error(`تم الحفظ لكن فشل تسجيل الويب هوك: ${json.description ?? "unknown"}`, 400);
        }
      } catch {
        return error("تم الحفظ لكن فشل الاتصال بـ Telegram", 500);
      }
    }

    return success(saved);
  } catch (e) {
    return handleError(e);
  }
}
