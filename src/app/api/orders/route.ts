import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error as apiError, handleError, paginated } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createDbRateLimiter } from "@/lib/rate-limit";

const orderDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });

const orderItemSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
  price: z.number().positive(),
  modifierOptionIds: z.array(z.number().int().positive()).optional(),
});

const createSchema = z.object({
  idempotencyKey: z.string().optional(),
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
    const auth = await requireAuth();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    let restaurantId = Number(searchParams.get("restaurantId")) || undefined;

    // Owners can only see their own restaurant's orders
    if (auth.role === "owner") {
      if (!auth.restaurantId) return apiError("لا يوجد مطعم مرتبط", 400);
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
        if (isNaN(d.getTime())) return apiError("تاريخ غير صحيح", 400);
        createdAt.gte = d;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        if (isNaN(end.getTime())) return apiError("تاريخ غير صحيح", 400);
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
    // Rate limit order creation (public endpoint)
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = await orderDbLimiter.check(`order:${ip}`);
    if (!allowed) return apiError("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const parsedInput = createSchema.safeParse(await request.json());
    if (!parsedInput.success) return apiError(parsedInput.error.issues[0].message, 422);
    const body = parsedInput.data;

    // Recalc totals server-side to prevent price tampering
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: body.items.map(i => i.itemId) } },
      select: { id: true, price: true, discountedPrice: true },
    });
    const priceMap = new Map(dbItems.map(i => [i.id, i]));

    // Fetch modifier prices for any selected options and verify ownership
    const allModIds = body.items.flatMap(i => i.modifierOptionIds ?? []);
    const modOptionMap = new Map<number, number>();
    if (allModIds.length > 0) {
      const modOptions = await prisma.modifierOption.findMany({
        where: { id: { in: allModIds } },
        select: { id: true, priceDelta: true, group: { select: { menuItemId: true } } },
      });
      // Build set of valid (itemId → optionId) pairs
      const validForItem = new Map<number, Set<number>>();
      for (const mo of modOptions) {
        const g = validForItem.get(mo.group.menuItemId) ?? new Set();
        g.add(mo.id);
        validForItem.set(mo.group.menuItemId, g);
        modOptionMap.set(mo.id, Number(mo.priceDelta));
      }
      for (const item of body.items) {
        const allowed = validForItem.get(item.itemId);
        for (const mid of item.modifierOptionIds ?? []) {
          if (!allowed?.has(mid)) {
            return apiError(`الخيار ${mid} غير متاح للصنف ${item.itemId}`, 400);
          }
        }
      }
    }

    let recalcSubtotal = 0;
    for (const item of body.items) {
      const db = priceMap.get(item.itemId);
      if (!db) {
        return apiError(`الصنف ${item.itemId} غير موجود`, 400);
      }
      const eff = db.discountedPrice ? Number(db.discountedPrice) : Number(db.price);
      const modTotal = (item.modifierOptionIds ?? []).reduce((s, mid) => s + (modOptionMap.get(mid) ?? 0), 0);
      recalcSubtotal += (eff + modTotal) * item.quantity;
    }

    const orderNo = body.idempotencyKey
      ? `ORD-${body.idempotencyKey.toUpperCase().slice(0, 40)}`
      : `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Idempotency — return existing order if this orderNo was already created
    if (body.idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { orderNo } });
      if (existing) {
        return success(existing, 200);
      }
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: body.restaurantId } });
    if (!restaurant) {
      return apiError("المطعم غير موجود", 404);
    }

    // Check plan order limit
    const orderCount = await prisma.order.count({ where: { restaurantId: body.restaurantId } });
    if (orderCount >= restaurant.maxOrders) {
      return apiError("تم الوصول للحد الأقصى للطلبات في خطتك", 403);
    }

    // Cap discount to prevent price manipulation (e.g., setting discount >= subtotal)
    const discount = Math.min(body.discount ?? 0, recalcSubtotal);

    const data = await prisma.order.create({
      data: {
        orderNo,
        customerName: body.customerName ?? "",
        customerPhone: body.customerPhone ?? "",
        notes: body.notes ?? "",
        pickupType: body.pickupType ?? "inside",
        subtotal: recalcSubtotal, // Prisma auto-converts number to Decimal for Decimal fields
        discount,
        total: recalcSubtotal - discount,
        restaurantId: body.restaurantId,
        items: {
          create: body.items.map((i) => {
            const db = priceMap.get(i.itemId)!;
            return {
              itemId: i.itemId,
              quantity: i.quantity,
              notes: i.notes ?? "",
              price: db.discountedPrice ? Number(db.discountedPrice) : Number(db.price),
              modifiersJson: JSON.stringify(i.modifierOptionIds ?? []),
            };
          }),
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
