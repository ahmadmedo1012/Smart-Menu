import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, handleError, paginated } from "@/lib/api-helpers";

const DEFAULT_RESTAURANT_ID = 1;

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
  restaurantId: z.number().int().optional(),
  items: z.array(orderItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const status = searchParams.get("status") || undefined;
    const restaurantId = Number(searchParams.get("restaurantId")) || DEFAULT_RESTAURANT_ID;

    const where: Record<string, unknown> = { restaurantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { item: { select: { id: true, name: true, nameAr: true } } },
          },
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
    const orderNo = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
        restaurantId: body.restaurantId ?? DEFAULT_RESTAURANT_ID,
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
