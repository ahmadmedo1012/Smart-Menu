import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const schema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(4),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") {
      return error("غير مصرح", 401);
    }
    const { hashPassword } = await import("@/lib/hash");
    const body = schema.parse(await request.json());
    await prisma.user.update({
      where: { id: body.userId },
      data: { password: hashPassword(body.newPassword) },
    });
    return success({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}
