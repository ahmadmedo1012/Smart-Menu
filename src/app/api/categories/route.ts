import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error, handleError, paginated } from "@/lib/api-helpers";

const DEFAULT_RESTAURANT_ID = 1;

const createSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().nullable().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  restaurantId: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const restaurantId = Number(searchParams.get("restaurantId")) || DEFAULT_RESTAURANT_ID;

    const where = { restaurantId };
    const [data, total] = await Promise.all([
      prisma.menuCategory.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { items: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.menuCategory.count({ where }),
    ]);

    return paginated(data, total, page, pageSize);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const data = await prisma.menuCategory.create({
      data: {
        name: body.name,
        nameAr: body.nameAr ?? null,
        icon: body.icon ?? "",
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
        restaurantId: body.restaurantId ?? DEFAULT_RESTAURANT_ID,
      },
    });
    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
