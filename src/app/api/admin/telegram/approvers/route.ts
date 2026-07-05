import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const approvers = await prisma.telegramApprover.findMany({
      orderBy: { createdAt: "desc" },
      include: { addedBy: { select: { id: true, name: true, username: true } } },
    });

    return success(approvers);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const body = await request.json();
    const telegramId = Number(body.telegramId);
    if (!Number.isFinite(telegramId) || telegramId <= 0) {
      return error("معرف تليجرام غير صالح", 400);
    }

    const existing = await prisma.telegramApprover.findUnique({ where: { telegramId } });
    if (existing) return error("هذا المعرف مضاف مسبقاً", 409);

    const approver = await prisma.telegramApprover.create({
      data: {
        telegramId,
        label: String(body.label ?? "").trim(),
        addedById: auth.userId,
      },
      include: { addedBy: { select: { id: true, name: true, username: true } } },
    });

    return success(approver);
  } catch (e) {
    return handleError(e);
  }
}
