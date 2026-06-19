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
    if (!(await requireAuth()).authorized) return error("غير مصرح", 401);

    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const existing = await prisma.menuCategory.findUnique({ where: { id: Number(id) } });
    if (!existing) return notFound("Category");

    const data = await prisma.menuCategory.update({ where: { id: Number(id) }, data: body });
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
    if (!(await requireAuth()).authorized) return error("غير مصرح", 401);

    const { id } = await params;
    const existing = await prisma.menuCategory.findUnique({ where: { id: Number(id) } });
    if (!existing) return notFound("Category");

    await prisma.menuCategory.delete({ where: { id: Number(id) } });
    return success({ id: Number(id) });
  } catch (e) {
    return handleError(e);
  }
}
