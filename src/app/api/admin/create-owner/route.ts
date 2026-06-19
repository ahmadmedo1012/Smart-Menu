import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  restaurantId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) {
      return Response.json({ success: false, error: "Username already exists" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
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
