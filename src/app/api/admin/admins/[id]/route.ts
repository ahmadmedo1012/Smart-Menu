import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { AuditAction } from "@/generated/prisma/enums";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  permissions: z.array(z.string()),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return error("Invalid ID", 400);

    const body = updateSchema.parse(await request.json());

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return error("المستخدم غير موجود", 404);
    if (target.role === "super_admin") return error("لا يمكن تعديل مدير عام", 403);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { permissions: body.permissions as any },
      select: { id: true, username: true, name: true, role: true, permissions: true },
    });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: userId,
      metadata: { action: "update_permissions", permissions: body.permissions },
    });

    return success(updated);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return error("Invalid ID", 400);

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return error("المستخدم غير موجود", 404);
    if (target.role === "super_admin") return error("لا يمكن حذف مدير عام", 403);

    await prisma.user.delete({ where: { id: userId } });

    await logAudit({
      action: AuditAction.delete,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: userId,
    });

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) return error("Invalid ID", 400);

    const { count } = await prisma.session.deleteMany({ where: { userId } });

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: userId,
      metadata: { action: "revoke_sessions", deletedCount: count },
    });

    return success({ revokedSessions: count });
  } catch (e) {
    return handleError(e);
  }
}
