import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, handleError, error, paginated } from "@/lib/api-helpers";

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
        include: { category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } } },
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
    const { requireAuth } = await import("@/lib/auth");
    const auth = await requireAuth();
    if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });

    const body = createSchema.parse(await request.json());

    // Check plan limits: get category -> restaurant -> plan
    const category = await prisma.menuCategory.findUnique({
      where: { id: body.categoryId },
      include: { restaurant: { select: { id: true, name: true, maxItemsLimit: true, planId: true, plan: { select: { name: true, nameAr: true, maxItems: true } } } } },
    });
    if (!category) return error("التصنيف غير موجود", 404);

    // Count existing items for this restaurant
    const existingCount = await prisma.menuItem.count({
      where: { category: { restaurantId: category.restaurant.id } },
    });

    const maxItems = category.restaurant.maxItemsLimit;
    if (existingCount >= maxItems) {
      return error(
        `لقد وصلت إلى الحد الأقصى للأصناف (${maxItems}). قم بترقية خطتك لإضافة المزيد.`,
        403
      );
    }

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
      include: { category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } } },
    });
    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
