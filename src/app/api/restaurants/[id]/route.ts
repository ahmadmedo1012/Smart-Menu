import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, notFound, handleError } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await prisma.restaurant.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { orders: true, categories: true } },
        categories: {
          include: { _count: { select: { items: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!data) return notFound("Restaurant");
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await prisma.restaurant.update({
      where: { id: Number(id) },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.slug && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.workingHours !== undefined && { workingHours: body.workingHours }),
        ...(body.planId !== undefined && { planId: body.planId }),
        ...(body.planStart !== undefined && { planStart: body.planStart }),
        ...(body.planEnd !== undefined && { planEnd: body.planEnd }),
        ...(body.maxItemsLimit !== undefined && { maxItemsLimit: body.maxItemsLimit }),
        ...(body.maxOrdersLimit !== undefined && { maxOrdersLimit: body.maxOrdersLimit }),
      },
    });
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.restaurant.delete({ where: { id: Number(id) } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
