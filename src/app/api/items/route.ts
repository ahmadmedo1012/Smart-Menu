import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, handleError, paginated } from "@/lib/api-helpers";

const DEFAULT_RESTAURANT_ID = 1;

const createSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().nullable().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive(),
  discountedPrice: z.number().positive().nullable().optional(),
  image: z.string().optional(),
  status: z.string().optional(),
  sortOrder: z.number().int().optional(),
  categoryId: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { id: true, name: true, nameAr: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.menuItem.count({ where }),
    ]);

    return paginated(data, total, page, pageSize);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const data = await prisma.menuItem.create({
      data: {
        name: body.name,
        nameAr: body.nameAr ?? null,
        description: body.description ?? "",
        descriptionAr: body.descriptionAr ?? "",
        price: body.price,
        discountedPrice: body.discountedPrice ?? null,
        image: body.image ?? "",
        status: body.status ?? "available",
        sortOrder: body.sortOrder ?? 0,
        categoryId: body.categoryId,
      },
      include: { category: { select: { id: true, name: true, nameAr: true } } },
    });
    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
