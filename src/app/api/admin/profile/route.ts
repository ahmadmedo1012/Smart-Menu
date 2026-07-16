import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { verifyHash, hashPassword } from "@/lib/hash";

const updateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
  })
  .refine(
    (d) => {
      if (d.newPassword && !d.currentPassword) return false;
      if (d.currentPassword && !d.newPassword) return false;
      return true;
    },
    { message: "يجب تقديم كلمة المرور الحالية والجديدة معاً", path: ["currentPassword"] }
  );

export async function GET() {
  try {
    const auth = await requirePermission("EDIT_SETTINGS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (!auth.userId) return error("غير مصرح", 401);

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        name: true,
        username: true,
        role: true,
        permissions: true,
        telegramChatId: true,
        telegramUsername: true,
      },
    });

    if (!user) return error("المستخدم غير موجود", 404);

    return success({
      name: user.name,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      telegramLinked: !!user.telegramChatId,
      telegramUsername: user.telegramUsername,
    });
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

    const hasName = body.name !== undefined;
    const hasEmail = body.email !== undefined;
    const hasPhone = body.phone !== undefined;
    const hasPassword = body.newPassword !== undefined;

    if (!hasName && !hasEmail && !hasPhone && !hasPassword) {
      return error("لا توجد بيانات للتحديث", 400);
    }

    // Verify current password before any update that includes a password change
    if (hasPassword) {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { password: true },
      });
      if (!user) return error("المستخدم غير موجود", 404);
      if (!verifyHash(body.currentPassword!, user.password)) {
        return error("كلمة المرور الحالية غير صحيحة", 400);
      }
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.newPassword && { password: hashPassword(body.newPassword) }),
      },
    });

    // Revoke all sessions except current one after password change
    if (body.newPassword) {
      await prisma.session.deleteMany({ where: { userId: auth.userId } });
    }

    await logAudit({
      action: AuditAction.update,
      actorId: auth.userId,
      targetType: "User",
      targetId: auth.userId,
      metadata: {
        updatedFields: [
          ...(hasName ? ["name"] : []),
          ...(hasEmail ? ["email"] : []),
          ...(hasPhone ? ["phone"] : []),
          ...(hasPassword ? ["password"] : []),
        ],
      },
    });

    return success({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}
