import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, notFound, handleError } from "@/lib/api-helpers";

const updateSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  pickupType: z.string().optional(),
  status: z.string().optional(),
  subtotal: z.number().positive().optional(),
  discount: z.number().min(0).optional(),
  total: z.number().positive().optional(),
  whatsappSent: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: { item: { select: { id: true, name: true, nameAr: true } } },
        },
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!data) return notFound("Order");
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
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.order.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return notFound("Order");

    const data = await prisma.order.update({
      where: { id: Number(id) },
      data: body,
      include: {
        items: {
          include: { item: { select: { id: true, name: true, nameAr: true } } },
        },
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    });
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}
