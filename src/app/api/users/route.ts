import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error as apiError, handleError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") return apiError("غير مصرح", 401);
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId")
      ? Number(searchParams.get("restaurantId"))
      : undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const where: Record<string, unknown> = { role: "owner" };
    if (restaurantId) where.restaurantId = restaurantId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return success({ users, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}
