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
    const oid = Number(id);
    if (Number.isNaN(oid)) return apiError("Invalid ID", 400);
    const data = await prisma.order.findUnique({
      where: { id: oid },
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
    const oid = Number(id);
    if (Number.isNaN(oid)) return apiError("Invalid ID", 400);

    const body = updateSchema.parse(await request.json());

    const existing = await prisma.order.findUnique({ where: { id: oid } });
    if (!existing) return notFound("Order");

    // Owners can only modify their own restaurant's orders
    if (auth.role === "owner" && auth.restaurantId !== existing.restaurantId) {
      return apiError("غير مصرح", 401);
    }

    const data = await prisma.order.update({
      where: { id: oid },
      data: body,
      include: {
        items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    });

    // Accrue loyalty points when order completed
    if (body.status === "completed" && existing.status !== "completed") {
      const ptsEarned = Math.floor(Number(data.total) / 10);
      if (ptsEarned > 0 && data.customerPhone) {
        const card = await prisma.loyaltyCard.findUnique({
          where: { customerPhone_restaurantId: { customerPhone: data.customerPhone, restaurantId: data.restaurantId } },
        });
        if (card) {
          const newTier = ptsEarned + card.points >= 400 ? "platinum" : ptsEarned + card.points >= 150 ? "gold" : ptsEarned + card.points >= 50 ? "silver" : "bronze";
          await prisma.$transaction([
            prisma.loyaltyCard.update({
              where: { id: card.id },
              data: { points: { increment: ptsEarned }, totalOrders: { increment: 1 }, totalSpent: { increment: data.total }, tier: newTier as any },
            }),
            prisma.rewardTransaction.create({
              data: { cardId: card.id, type: "earn", points: ptsEarned, description: `طلب ${data.orderNo}`, orderId: data.id, restaurantId: data.restaurantId },
            }),
          ]);
        }
      }
    }

    return success(data);
  } catch (e) {
    return handleError(e);
  }
}
