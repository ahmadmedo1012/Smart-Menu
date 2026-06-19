import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  restaurantId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") {
      return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      return Response.json({ success: false, error: "Username already exists" }, { status: 409 });
    }
    const { hashPassword } = await import("@/lib/hash");
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: hashPassword(body.password),
        name: body.name,
        role: "owner",
        restaurantId: body.restaurantId,
      },
    });
    return success({ id: user.id, username: user.username, name: user.name }, 201);
  } catch (e) {
    return handleError(e);
  }
}
