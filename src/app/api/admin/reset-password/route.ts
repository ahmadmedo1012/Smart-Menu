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
