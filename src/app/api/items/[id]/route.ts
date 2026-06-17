import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameAr: z.string().nullable().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive().optional(),
  discountedPrice: z.number().positive().nullable().optional(),
  image: z.string().optional(),
  status: z.string().optional(),
  sortOrder: z.number().int().optional(),
  categoryId: z.number().int().positive().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.menuItem.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return notFound("Item");

    const data = await prisma.menuItem.update({
      where: { id: Number(id) },
      data: body,
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
    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return notFound("Item");

    await prisma.menuItem.delete({ where: { id: Number(id) } });
    return success({ id: Number(id) });
  } catch (e) {
    return handleError(e);
  }
}
