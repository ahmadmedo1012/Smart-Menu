import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error, notFound, handleError } from "@/lib/api-helpers";

import { requireAuth } from "@/lib/auth";
const updateSchema = z.object({
  name: z.string().min(1).optional(),
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

    // Owners can only update their own restaurant's categories
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      return error("غير مصرح", 401);
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

    // Owners can only delete their own restaurant's categories
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      return error("غير مصرح", 401);
    }

    await prisma.menuCategory.delete({ where: { id: catId } });
    return success({ id: catId });
  } catch (e) {
    return handleError(e);
  }
}
