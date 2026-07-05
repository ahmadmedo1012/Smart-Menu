import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { id } = await params;
    const approverId = parseInt(id);
    if (isNaN(approverId)) return error("Invalid ID", 400);

    await prisma.telegramApprover.delete({ where: { id: approverId } });

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
