import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createDbRateLimiter } from "@/lib/rate-limit";

const resetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

const schema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission("MANAGE_USERS");
    if (!auth.authorized) return error(auth.error, auth.status);
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = await resetLimiter.check(`reset:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);
    const { hashPassword } = await import("@/lib/hash");
    const body = schema.parse(await request.json());

    // round90-F1 (S-2 — privilege escalation): حارس الهدف — sub_admin يحمل
    // MANAGE_USERS كان يعيد كلمة مرور super_admin ويسحب جلساته = استيلاء كامل.
    // نفس نص حراسة admins/[id]:29 («لا يمكن تعديل مدير عام»)؛ التحديث نفسه
    // يظل متاحًا لsuper_admin (سند الاختبار المفروض) ولإعادة تعيين بقية
    // المستخدمين لمن يحمل MANAGE_USERS (وظيفة الدعم الأصلية للمسار).
    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { role: true },
    });
    if (!target) return error("المستخدم غير موجود", 404);
    if (target.role === "super_admin" && auth.role !== "super_admin") {
      return error("لا يمكن تعديل مدير عام", 403);
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
