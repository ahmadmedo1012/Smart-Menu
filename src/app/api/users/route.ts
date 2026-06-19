import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, handleError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId")
      ? Number(searchParams.get("restaurantId"))
      : undefined;

    const where: Record<string, unknown> = { role: "owner" };
    if (restaurantId) where.restaurantId = restaurantId;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        restaurantId: true,
        restaurant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(users);
  } catch (e) {
    return handleError(e);
  }
}
