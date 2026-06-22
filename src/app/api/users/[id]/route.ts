import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error as apiError, handleError } from "@/lib/api-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") return apiError("غير مصرح", 401);
    const { id } = await params;
    await prisma.user.delete({ where: { id: Number(id) } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
