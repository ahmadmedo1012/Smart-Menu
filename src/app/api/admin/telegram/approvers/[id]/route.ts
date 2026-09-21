import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // r118-A2-P2: removing an approver revokes payment power — same
    // MANAGE_SUBSCRIPTIONS gate as the POST (was EDIT_SETTINGS) + audit row.
    const auth = await requirePermission("MANAGE_SUBSCRIPTIONS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const { id } = await params;
    const approverId = parseInt(id);
    if (isNaN(approverId)) return error("معرف غير صالح", 400);

    const removed = await prisma.telegramApprover.delete({
      where: { id: approverId },
      select: { telegramId: true, label: true },
    });

    logAudit({
      action: "delete",
      targetType: "telegram_approver",
      targetId: approverId,
      actorId: auth.userId ?? undefined,
      metadata: { telegramId: String(removed.telegramId), label: removed.label },
    }).catch(() => {});

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
