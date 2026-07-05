import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().default(""),
  chatId: z.string().min(1, "Chat ID is required"),
});

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const targets = await prisma.telegramBroadcastTarget.findMany({
      orderBy: { createdAt: "desc" },
    });
    return success(targets);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const body = createSchema.parse(await request.json());
    const target = await prisma.telegramBroadcastTarget.create({
      data: { label: body.label, chatId: body.chatId },
    });
    return success(target);
  } catch (e) {
    return handleError(e);
  }
}
