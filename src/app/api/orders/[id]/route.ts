import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error as apiError, notFound, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const updateSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  pickupType: z.enum(["inside", "takeaway", "delivery"]).optional(),
  status: z.enum(["new", "preparing", "ready", "completed", "cancelled"]).optional(),
  whatsappSent: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    const { id } = await params;
    const data = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!data) return notFound("Order");

    // Owners can only view their own restaurant's orders
    if (auth.role === "owner" && auth.restaurantId !== data.restaurantId) {
      return apiError("غير مصرح", 401);
    }

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
    const auth = await requireAuth();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.order.findUnique({ where: { id: Number(id) } });
    if (!existing) return notFound("Order");

    // Owners can only modify their own restaurant's orders
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      return apiError("غير مصرح", 401);
    }

    const data = await prisma.order.update({
      where: { id: Number(id) },
      data: body,
      include: {
        items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    });
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}
