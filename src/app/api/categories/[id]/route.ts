import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error, notFound, handleError } from "@/lib/api-helpers";

import { requireAuth, requirePermission } from "@/lib/auth";
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().nullable().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { id } = await params;
    const catId = Number(id);
    if (Number.isNaN(catId)) return error("Invalid ID", 400);
    const body = updateSchema.parse(await request.json());
    const existing = await prisma.menuCategory.findUnique({ where: { id: catId } });
    if (!existing) return notFound("Category");

    // Owners can only update categories of restaurants they manage — multi-menu
    // aware via UserRestaurant links (same check as settings/route.ts & items)
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      const link = await prisma.userRestaurant.findUnique({
        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.restaurantId } },
      });
      if (!link) return error("غير مصرح", 403);
    }
    // Staff roles (admin/sub_admin — super_admin passes automatically) may only
    // update arbitrary restaurants' categories when they hold MANAGE_RESTAURANTS
    if (auth.role !== "owner") {
      const perm = await requirePermission("MANAGE_RESTAURANTS");
      if (!perm.authorized) return error(perm.error, perm.status);
    }

    const data = await prisma.menuCategory.update({ where: { id: catId }, data: body });
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
    const catId = Number(id);
    if (Number.isNaN(catId)) return error("Invalid ID", 400);
    const existing = await prisma.menuCategory.findUnique({ where: { id: catId } });
    if (!existing) return notFound("Category");

    // Owners can only delete categories of restaurants they manage — multi-menu
    // aware via UserRestaurant links (same check as settings/route.ts & items)
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      const link = await prisma.userRestaurant.findUnique({
        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.restaurantId } },
      });
      if (!link) return error("غير مصرح", 403);
    }
    // Staff roles (admin/sub_admin — super_admin passes automatically) may only
    // delete arbitrary restaurants' categories when they hold MANAGE_RESTAURANTS
    if (auth.role !== "owner") {
      const perm = await requirePermission("MANAGE_RESTAURANTS");
      if (!perm.authorized) return error(perm.error, perm.status);
    }

    await prisma.menuCategory.delete({ where: { id: catId } });
    return success({ id: catId });
  } catch (e) {
    return handleError(e);
  }
}
