import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

const updateSchema = z.object({
  telegramNotifyOrders: z.boolean().optional(),
  telegramNotifyPayments: z.boolean().optional(),
  telegramNotifySettings: z.boolean().optional(),
});

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        telegramNotifyOrders: true,
        telegramNotifyPayments: true,
        telegramNotifySettings: true,
      },
    });

    if (!user) return error("المستخدم غير موجود", 404);

    return success(user);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const body = updateSchema.parse(await request.json());

    const hasAny =
      body.telegramNotifyOrders !== undefined ||
      body.telegramNotifyPayments !== undefined ||
      body.telegramNotifySettings !== undefined;

    if (!hasAny) return error("لا توجد بيانات للتحديث", 400);

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        ...(body.telegramNotifyOrders !== undefined && { telegramNotifyOrders: body.telegramNotifyOrders }),
        ...(body.telegramNotifyPayments !== undefined && { telegramNotifyPayments: body.telegramNotifyPayments }),
        ...(body.telegramNotifySettings !== undefined && { telegramNotifySettings: body.telegramNotifySettings }),
      },
      select: {
        telegramNotifyOrders: true,
        telegramNotifyPayments: true,
        telegramNotifySettings: true,
      },
    });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId,
      targetType: "User",
      targetId: auth.userId,
      metadata: {
        updatedFields: Object.entries(body)
          .filter(([_, v]) => v !== undefined)
          .map(([k]) => k),
      },
    });

    return success(updated);
  } catch (e) {
    return handleError(e);
  }
}
