import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().optional(),
  chatId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const { id } = await params;
    const tid = Number(id);
    if (Number.isNaN(tid)) return error('Invalid ID', 400);
    const body = updateSchema.parse(await request.json());
    const target = await prisma.telegramBroadcastTarget.update({
      where: { id: tid },
      data: body,
    });
    return success(target);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const { id } = await params;
    const tid = Number(id);
    if (Number.isNaN(tid)) return error('Invalid ID', 400);
    await prisma.telegramBroadcastTarget.delete({
      where: { id: tid },
    });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
