import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(4),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const { hashPassword } = await import("@/lib/hash");
    const body = schema.parse(await request.json());
    await prisma.user.update({
      where: { id: body.userId },
      data: { password: hashPassword(body.newPassword) },
    });

    const ip = request.headers.get("x-forwarded-for") || "";
    await logAudit({ action: "update", targetType: "user", targetId: body.userId, actorId: auth.userId!, ip });

    return success({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}
