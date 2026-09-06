import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { success, error as apiError, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { nameOptional, usernamePresenceOptional } from "@/lib/validation";

const updateUserSchema = z.object({
  role: z.enum(["admin", "owner"]).optional(),
  name: nameOptional,
  username: usernamePresenceOptional,
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
    if (Number.isNaN(uid)) return apiError("معرف غير صالح", 400);
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return apiError("بيانات غير صالحة", 400);

    // Prevent privilege escalation: only super_admin can assign roles or
    // restaurantId (setting role: 'owner' + restaurantId would grant a user
    // control over a restaurant; role: 'admin' would grant full legacy access).
    if (
      (parsed.data.role !== undefined || parsed.data.restaurantId !== undefined) &&
      auth.role !== "super_admin"
    ) {
      return apiError("غير مصرح — فقط المدير العام يمكنه تعيين الأدوار أو المطاعم", 403);
    }

    // round88-B7: read the target BEFORE the write so the audit row captures
    // the previous role (a role change without its "from" is half an audit).
    // Also gives a clean 404 instead of relying on the update throw.
    const target = await prisma.user.findUnique({
      where: { id: uid },
      select: { username: true, role: true, restaurantId: true },
    });
    if (!target) return apiError("المستخدم غير موجود", 404);

    const updated = await prisma.user.update({
      where: { id: uid },
      data: parsed.data,
      select: { id: true, username: true, name: true, role: true, restaurantId: true },
    });

    // round88-B7: user-management writes were the only un-audited admin
    // mutation family left (role changes above all — a privilege event).
    await logAudit({
      action: "update",
      actorId: auth.userId,
      targetType: "user",
      targetId: uid,
      metadata: {
        action: "update_user",
        fields: Object.keys(parsed.data),
        username: target.username,
        roleFrom: target.role,
        roleTo: updated.role,
      },
    });
    // Privilege events also surface in the ops event feed (same pattern as
    // referral-conversion / subscription-decisions SystemEvents). Fire-and-
    // forget: the write already succeeded, logging must never fail it.
    if (parsed.data.role !== undefined || parsed.data.restaurantId !== undefined) {
      const roleChanged = parsed.data.role !== undefined && parsed.data.role !== target.role;
      try {
        await prisma.systemEvent.create({
          data: {
            eventType: "rbac.role_change",
            title: roleChanged ? "تغيير دور مستخدم" : "ربط مستخدم بمطعم",
            message: `المستخدم «${target.username}» — الدور: ${target.role} → ${updated.role}` +
              (parsed.data.restaurantId !== undefined
                ? ` · المطعم: ${target.restaurantId ?? "—"} → ${updated.restaurantId ?? "—"}`
                : ""),
            severity: "warning",
            metadata: {
              targetUserId: uid,
              username: target.username,
              roleFrom: target.role,
              roleTo: updated.role,
              restaurantIdFrom: target.restaurantId,
              restaurantIdTo: updated.restaurantId,
              actorId: auth.userId,
            },
          },
        });
      } catch {
        /* best-effort event — never fail the completed write */
      }
    }

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
    if (auth.role !== "super_admin") return apiError("غير مصرح — فقط المدير العام يمكنه حذف المستخدمين", 403);
    const { id } = await params;
    const uid = Number(id);
    if (Number.isNaN(uid)) return apiError("معرف غير صالح", 400);

    const target = await prisma.user.findUnique({
      where: { id: uid },
      select: { username: true, role: true },
    });
    if (!target) return apiError("المستخدم غير موجود", 404);
    if (target.role === "super_admin") return apiError("لا يمكن حذف مدير عام", 403);

    await prisma.user.delete({ where: { id: uid } });

    // round88-B7: user deletion is the most destructive user-management
    // action — it must leave an audit row (same family as admins/[id]).
    await logAudit({
      action: "delete",
      actorId: auth.userId,
      targetType: "user",
      targetId: uid,
      metadata: { username: target.username, role: target.role },
    });

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
