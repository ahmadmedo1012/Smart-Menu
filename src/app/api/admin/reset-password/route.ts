import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(4),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    await prisma.user.update({
      where: { id: body.userId },
      data: { password: body.newPassword },
    });
    return success({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}
