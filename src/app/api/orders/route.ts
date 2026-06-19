import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error, handleError, paginated } from "@/lib/api-helpers";

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
  pickupType: z.enum(["inside", "takeaway", "delivery"]).optional(),
  subtotal: z.number().positive(),
  discount: z.number().min(0).optional(),
  total: z.number().positive(),
  restaurantId: z.number().int().positive(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { requireAuth } = await import("@/lib/auth");
    const auth = await requireAuth();
    if (!auth.authorized) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let restaurantId = Number(searchParams.get("restaurantId")) || undefined;

    // Owners can only see their own restaurant's orders
    if (auth.role === "owner") {
      if (!auth.restaurantId) return error("لا يوجد مطعم مرتبط", 400);
      restaurantId = auth.restaurantId;
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (isNaN(d.getTime())) return error("تاريخ غير صحيح", 400);
        createdAt.gte = d;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        if (isNaN(end.getTime())) return error("تاريخ غير صحيح", 400);
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
          items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
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

    // Recalc totals server-side to prevent price tampering
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: body.items.map(i => i.itemId) } },
      select: { id: true, price: true },
    });
    const priceMap = new Map(dbItems.map(i => [i.id, i.price]));

    let recalcSubtotal = 0;
    for (const item of body.items) {
      const dbPrice = priceMap.get(item.itemId);
      if (!dbPrice) {
        return NextResponse.json({ success: false, error: `الصنف ${item.itemId} غير موجود` }, { status: 400 });
      }
      recalcSubtotal += dbPrice * item.quantity;
    }

    const orderNo = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const restaurant = await prisma.restaurant.findUnique({ where: { id: body.restaurantId } });
    if (!restaurant) {
      return NextResponse.json({ success: false, error: "المطعم غير موجود" }, { status: 404 });
    }

    // Check plan order limit
    const orderCount = await prisma.order.count({ where: { restaurantId: body.restaurantId } });
    if (orderCount >= restaurant.maxOrdersLimit) {
      return NextResponse.json({ success: false, error: "تم الوصول للحد الأقصى للطلبات في خطتك" }, { status: 403 });
    }

    const data = await prisma.order.create({
      data: {
        orderNo,
        customerName: body.customerName ?? "",
        customerPhone: body.customerPhone ?? "",
        notes: body.notes ?? "",
        pickupType: body.pickupType ?? "inside",
        subtotal: recalcSubtotal,
        discount: body.discount ?? 0,
        total: recalcSubtotal - (body.discount ?? 0),
        restaurantId: body.restaurantId,
        items: {
          create: body.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes ?? "",
            price: priceMap.get(i.itemId)!,
          })),
        },
      },
      include: {
        items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
      },
    });
    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
