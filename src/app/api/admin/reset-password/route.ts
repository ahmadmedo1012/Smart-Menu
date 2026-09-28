import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const resetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

const schema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const ip = getClientIp(request); // round91-D1: unified extraction
    const { success: allowed } = await resetLimiter.check(`reset:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);
    const { hashPassword } = await import("@/lib/hash");
    const body = schema.parse(await request.json());

    // round90-F1 (S-2 — privilege escalation): حارس الهدف — sub_admin يحمل
    // MANAGE_USERS كان يعيد كلمة مرور super_admin ويسحب جلساته = استيلاء كامل.
    // r121-E3: الحارس امتد لكل الحسابات الإدارية (super_admin/admin/sub_admin)
    // وليس super_admin فقط — حساب admin القديم يمرر كل الأذونات عدا
    // MANAGE_USERS (auth.ts) فإعادة تعيين كلمته تعني استيلاء فعلي على
    // المنصة، وإعادة تعيين sub_admin نظير يورّث أذوناته. دعم كلمات مرور
    // الطاقم يمر عبر super_admin (نفس سياسة admins/[id])؛ MANAGE_USERS يحتفظ
    // بوظيفته الموثقة: دعم owner/USER.
    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { role: true },
    });
    if (!target) return error("المستخدم غير موجود", 404);
    if (
      (target.role === "super_admin" || target.role === "admin" || target.role === "sub_admin") &&
      auth.role !== "super_admin"
    ) {
      return error(
        target.role === "super_admin" ? "لا يمكن تعديل مدير عام" : "لا يمكن تعديل كلمة مرور حساب إداري",
        403
      );
    }

    await prisma.user.update({
      where: { id: body.userId },
      data: { password: hashPassword(body.newPassword) },
    });
    // Revoke all existing sessions — password change means potential compromise
    await prisma.session.deleteMany({ where: { userId: body.userId } });

    await logAudit({ action: "update", targetType: "user", targetId: body.userId, actorId: auth.userId!, ip });

    return success({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}
