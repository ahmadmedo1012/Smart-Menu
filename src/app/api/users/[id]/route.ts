import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { requireAuth } = await import("@/lib/auth");
    if (!(await requireAuth()).authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    const { id } = await params;
    await prisma.user.delete({ where: { id: Number(id) } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
