import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const upsertSchema = z.object({
  botToken: z.string(),
  chatId: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const config = await prisma.telegramConfig.findFirst({
      select: { id: true, botToken: true, chatId: true, events: true, isActive: true },
    });
    return success(config ?? {});
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const body = upsertSchema.parse(await request.json());
    const config = await prisma.telegramConfig.upsert({
      where: { id: 1 },
      create: {
        botToken: body.botToken,
        chatId: body.chatId,
        events: body.events,
        isActive: body.isActive,
      },
      update: {
        botToken: body.botToken,
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
