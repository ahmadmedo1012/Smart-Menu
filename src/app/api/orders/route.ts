import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, handleError, paginated } from "@/lib/api-helpers";

const orderItemSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
  price: z.number().positive(),
});

const createSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  pickupType: z.string().optional(),
  subtotal: z.number().positive(),
  discount: z.number().min(0).optional(),
  total: z.number().positive(),
  restaurantId: z.number().int().positive(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const status = searchParams.get("status") || undefined;
    const restaurantId = Number(searchParams.get("restaurantId")) || undefined;

    const where: Record<string, unknown> = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { item: { select: { id: true, name: true, nameAr: true } } },
          },
          restaurant: { select: { id: true, name: true, slug: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return paginated(data, total, page, pageSize);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    const orderNo = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: body.restaurantId },
    });
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "المطعم غير موجود" },
        { status: 404 }
      );
    }

    const data = await prisma.order.create({
      data: {
        orderNo,
        customerName: body.customerName ?? "",
        customerPhone: body.customerPhone ?? "",
        notes: body.notes ?? "",
        pickupType: body.pickupType ?? "inside",
        subtotal: body.subtotal,
        discount: body.discount ?? 0,
        total: body.total,
        restaurantId: body.restaurantId,
        items: {
          create: body.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes ?? "",
            price: i.price,
          })),
        },
      },
      include: {
        items: {
          include: { item: { select: { id: true, name: true, nameAr: true } } },
        },
      },
    });
    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
