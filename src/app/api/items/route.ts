import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, handleError, error, paginated } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { ItemStatus } from "@/generated/prisma/enums";

const createSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  nameAr: z.string().nullable().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  discountedPrice: z.number().min(0).nullable().optional(),
  image: z.string().max(7000000).optional(),
  status: z.string().optional(),
  sortOrder: z.number().int().optional(),
tallergens: z.array(z.string()).optional(),
tdietaryTags: z.array(z.string()).optional(),
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
    const restaurantId = searchParams.get("restaurantId")
      ? Number(searchParams.get("restaurantId"))
      : undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    // Require at least restaurantId or categoryId for public access
    if (restaurantId) {
      where.category = { restaurantId };
    } else if (categoryId) {
      where.categoryId = categoryId;
    } else {
      const auth = await requireAuth();
      if (!auth.authorized) return error("معرف التصنيف أو المطعم مطلوب", 400);
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: { sortOrder: "asc" },
tallergens: z.array(z.string()).optional(),
tdietaryTags: z.array(z.string()).optional(),
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
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const body = createSchema.parse(await request.json());

    // Check plan limits: get category -> restaurant -> plan
    const category = await prisma.menuCategory.findUnique({
      where: { id: body.categoryId },
      select: { restaurant: { select: { id: true, name: true, maxItems: true } } },
    });
    if (!category) return error("التصنيف غير موجود", 404);

    // Owners can only add items to their own restaurant's categories
    if (auth.role === "owner" && auth.restaurantId !== category.restaurant.id) {
      return error("غير مصرح", 401);
    }

    // Count existing items for this restaurant
    const existingCount = await prisma.menuItem.count({
      where: { category: { restaurantId: category.restaurant.id } },
    });

    const maxItems = category.restaurant.maxItems;
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
        status: (body.status ?? "available") as ItemStatus,
        sortOrder: body.sortOrder ?? 0,
tallergens: z.array(z.string()).optional(),
tdietaryTags: z.array(z.string()).optional(),
        categoryId: body.categoryId,
        dietaryTags: body.dietaryTags ?? [],
        allergens: body.allergens ?? [],
      },
      include: { category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } } },
    });
    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
