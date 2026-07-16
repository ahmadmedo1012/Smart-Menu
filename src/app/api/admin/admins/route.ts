import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { success, error, handleError } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/auth";
import { AuditAction, Permission } from "@/generated/prisma/enums";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const permissionValues = Object.values(Permission) as [string, ...string[]];

const inviteSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(permissionValues)).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);
    if (auth.role !== "super_admin") return error("غير مصرح", 403);

    const body = inviteSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) return error("اسم المستخدم موجود مسبقاً", 409);

    const hashed = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: hashed,
        name: body.name,
        role: "sub_admin",
        permissions: body.permissions as Permission[],
      },
      select: { id: true, username: true, name: true, role: true, permissions: true, createdAt: true },
    });

    await logAudit({
      action: AuditAction.create,
      actorId: auth.userId ?? undefined,
      targetType: "User",
      targetId: user.id,
      metadata: { role: "sub_admin", permissions: body.permissions },
    });

    return success(user);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET() {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);

    const admins = await prisma.user.findMany({
      where: { role: { in: ["super_admin", "sub_admin"] } },
      select: { id: true, username: true, name: true, role: true, permissions: true, createdAt: true, lastLoginAt: true },
      orderBy: { createdAt: "desc" },
    });

    return success(admins);
  } catch (e) {
    return handleError(e);
  }
}
