import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { ItemStatus } from "@/generated/prisma/enums";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = Number(id);
    if (Number.isNaN(itemId)) return error("Invalid ID", 400);

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true, reviews: { take: 10, orderBy: { createdAt: "desc" }, select: { id: true, rating: true, comment: true } } },
    });
    if (!item) return notFound("MenuItem");

    return success(item);
  } catch (e) {
    return handleError(e);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameAr: z.string().nullable().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive().optional(),
  discountedPrice: z.number().positive().nullable().optional(),
  image: z.string().max(7000000).optional(),
  status: z.string().optional(),
  sortOrder: z.number().int().optional(),
  categoryId: z.number().int().positive().optional(),
  dietaryTags: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);
    const { id } = await params;
    const itemId = Number(id);
    if (Number.isNaN(itemId)) return error("Invalid ID", 400);

    const body = updateSchema.parse(await request.json());

    const existing = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!existing) return notFound("Item");

    // Owners can only update their own restaurant's items
    if (auth.role === "owner" && auth.restaurantId !== existing.category.restaurantId) {
      return error("غير مصرح", 401);
    }

    const data = await prisma.menuItem.update({
      where: { id: itemId },
      data: { ...body, status: body.status as ItemStatus },
      include: { category: { select: { id: true, name: true, nameAr: true } } },
    });
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);
    const { id } = await params;
    const delId = Number(id);
    if (Number.isNaN(delId)) return error("Invalid ID", 400);
    const existing = await prisma.menuItem.findUnique({
      where: { id: delId },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!existing) return notFound("Item");

    // Owners can only delete their own restaurant's items
    if (auth.role === "owner" && auth.restaurantId !== existing.category.restaurantId) {
      return error("غير مصرح", 401);
    }

    await prisma.menuItem.delete({ where: { id: delId } });
    return success({ id: delId });
  } catch (e) {
    return handleError(e);
  }
}
