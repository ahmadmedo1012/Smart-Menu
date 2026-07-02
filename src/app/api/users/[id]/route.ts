import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { success, error as apiError, handleError } from "@/lib/api-helpers";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["admin", "owner"]).optional(),
  name: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  restaurantId: z.number().positive().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return apiError(auth.error, auth.status);
    const { id } = await params;
    const uid = Number(id);
    if (Number.isNaN(uid)) return apiError("Invalid ID", 400);
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return apiError("بيانات غير صالحة", 400);
    const updated = await prisma.user.update({
      where: { id: uid },
      data: parsed.data,
      select: { id: true, username: true, name: true, role: true, restaurantId: true },
    });
    return success({ user: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return apiError(auth.error, auth.status);
    const { id } = await params;
    const uid = Number(id);
    if (Number.isNaN(uid)) return apiError("Invalid ID", 400);
    await prisma.user.delete({ where: { id: uid } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
