import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { encryptValue } from "@/lib/config";
import { z } from "zod";

const upsertSchema = z.object({
  botToken: z.string(),
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
    const config = await prisma.telegramConfig.upsert({
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
    return success(config);
  } catch (e) {
    return handleError(e);
  }
}
