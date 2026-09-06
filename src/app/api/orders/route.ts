import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError, paginated, parsePagination } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { orderItemCountByOrder } from '@/lib/list-counts';

const orderDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });

const orderItemSchema = z.object({
        itemId: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
        // round86-A7: bound free-text fields (DB bloat + receipt/telegram payload hygiene)
        notes: z.string().max(500).optional(),
        price: z.number().positive(),
        modifierOptionIds: z.array(z.number().int().positive()).optional(),
});

const createSchema = z.object({
        idempotencyKey: z.string().max(100).optional(),
        customerName: z.string().max(50).optional(),
        customerPhone: z.string().max(30).optional(),
        notes: z.string().max(500).optional(),
        pickupType: z.enum(['inside', 'takeaway', 'delivery']).optional(),
        subtotal: z.number().positive(),
        discount: z.number().min(0).optional(),
        total: z.number().positive(),
        restaurantId: z.number().int().positive(),
        items: z.array(orderItemSchema).min(1),
});

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                const url = new URL(request.url);
                const { searchParams } = url;
                let restaurantId = Number(searchParams.get('restaurantId')) || undefined;

                // Owners can only see their own restaurant's orders; regular users can't read any order history
                if (auth.role === 'owner') {
                        // Multi-menu: verify ownership of requested restaurantId via UserRestaurant
                        if (restaurantId && restaurantId !== auth.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
                                });
                                if (!link) return apiError('غير مصرح', 403);
                        } else {
                                restaurantId = auth.restaurantId ?? undefined;
                        }
                        if (!restaurantId) return apiError('لا يوجد مطعم مرتبط', 400);
                } else if (auth.role !== 'admin' && auth.role !== 'super_admin' && auth.role !== 'sub_admin') {
                        return apiError('غير مصرح', 403);
                }

                const { page, pageSize } = parsePagination(url);
                const status = searchParams.get('status') || undefined;

                const where: Record<string, unknown> = {};
                if (restaurantId) where.restaurantId = restaurantId;
                if (status) where.status = status;

                const dateFrom = searchParams.get('dateFrom');
                const dateTo = searchParams.get('dateTo');
                if (dateFrom || dateTo) {
                        const createdAt: Record<string, Date> = {};
                        if (dateFrom) {
                                const d = new Date(dateFrom);
                                if (isNaN(d.getTime())) return apiError('تاريخ غير صحيح', 400);
                                createdAt.gte = d;
                        }
                        if (dateTo) {
                                const end = new Date(dateTo);
                                if (isNaN(end.getTime())) return apiError('تاريخ غير صحيح', 400);
                                end.setHours(23, 59, 59, 999);
                                createdAt.lte = end;
                        }
                        where.createdAt = createdAt;
                }

                const [rows, total] = await Promise.all([
                        // round86-B9: slim projection for LIST views — the full items
                        // include (+item per row) was shipped on every 5-15s poll while
                        // the cards only render an items count. Detail views keep the
                        // rich shape via /api/orders/[id].
                        // round88-A2: _count left the findMany — Prisma compiled it
                        // into a full-table LEFT JOIN aggregate over OrderItem
                        // (30.2ms / 621 buffers per poll page on the round88 perf
                        // DB, growing with platform-wide data). It is now one grouped
                        // index-only COUNT over the fetched page ids (0.01ms) — see
                        // src/lib/list-counts.ts.
                        prisma.order.findMany({
                                where,
                                orderBy: { createdAt: 'desc' },
                                select: {
                                        id: true, orderNo: true, customerName: true, customerPhone: true,
                                        status: true, total: true,
                                        pickupType: true,
                                        // round88-A2 slim: notes/subtotal/discount/whatsappSent left the
                                        // LIST — zero consumers in either card list (owner/admin orders
                                        // pages, their 15s probes, CSV export, e2e security suites);
                                        // detail views get them from /api/orders/[id] (unchanged).
                                        // updatedAt stays: the round87-B1 probe signatures hash it.
                                        createdAt: true, updatedAt: true,
                                        restaurant: { select: { id: true, name: true, slug: true } },
                                },
                                skip: (page - 1) * pageSize,
                                take: pageSize,
                        }),
                        prisma.order.count({ where }),
                ]);
                const itemCounts = await orderItemCountByOrder(rows.map((r) => r.id));
                const data = rows.map((r) => ({ ...r, _count: { items: itemCounts.get(r.id) ?? 0 } }));

                return paginated(data, total, page, pageSize);
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(request: NextRequest) {
        try {
                // Rate limit order creation (public endpoint)
                const ip =
                        request.headers.get('x-real-ip') ||
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        'unknown';
                const { success: allowed } = await orderDbLimiter.check(`order:${ip}`);
                if (!allowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const parsedInput = createSchema.safeParse(await request.json());
                if (!parsedInput.success) return apiError(parsedInput.error.issues[0].message, 422);
                const body = parsedInput.data;

                // Recalc totals server-side to prevent price tampering
                // round86-A4: items must belong to the order's restaurant and be
                // available — previously items from ANY tenant (incl. hidden ones)
                // could be embedded, polluting stats/loyalty
                const dbItems = await prisma.menuItem.findMany({
                        where: {
                                id: { in: body.items.map((i) => i.itemId) },
                                status: 'available',
                                category: { is: { restaurantId: body.restaurantId } },
                        },
                        select: { id: true, price: true, discountedPrice: true },
                });
                const priceMap = new Map(dbItems.map((i) => [i.id, i]));

                // Fetch modifier prices for any selected options and verify ownership
                const allModIds = body.items.flatMap((i) => i.modifierOptionIds ?? []);
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
                        const modTotal = (item.modifierOptionIds ?? []).reduce(
                                (s, mid) => s + (modOptionMap.get(mid) ?? 0),
                                0
                        );
                        recalcSubtotal += (eff + modTotal) * item.quantity;
                }

                const orderNo = body.idempotencyKey
                        ? `ORD-${body.idempotencyKey.toUpperCase().slice(0, 40)}`
                        : `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

                // Idempotency — duplicate orderNo returns minimal confirmation only
                // (round-77: returned the FULL stored row incl. customer PII, letting
                // callers probe/enumerate order numbers)
                if (body.idempotencyKey) {
                        const existing = await prisma.order.findUnique({
                                where: { orderNo },
                                select: { orderNo: true },
                        });
                        if (existing) {
                                return success({ orderNo: existing.orderNo, already: true }, 200);
                        }
                }

                const restaurant = await prisma.restaurant.findUnique({ where: { id: body.restaurantId } });
                if (!restaurant) {
                        return apiError('المطعم غير موجود', 404);
                }

                // Check plan order limit — inside the tx with the create (round-76: TOCTOU
                // race — concurrent POSTs both passed the old outside count check)
                const data = await prisma.$transaction(async (tx) => {
                        const orderCount = await tx.order.count({ where: { restaurantId: body.restaurantId } });
                        if (orderCount >= restaurant.maxOrders) {
                                throw new OrderLimitError('تم الوصول للحد الأقصى للطلبات في خطتك');
                        }
                        // Discount guard (round-77): no server-verified coupon/referral
                        // system exists in the order flow — a client-sent discount is
                        // always abuse (discount=subtotal → free order). Force 0.
                        const discount = 0;
                        return tx.order.create({
                                data: {
                                        orderNo,
                                        customerName: body.customerName ?? '',
                                        customerPhone: body.customerPhone ?? '',
                                        notes: body.notes ?? '',
                                        pickupType: body.pickupType ?? 'inside',
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
                                                                notes: i.notes ?? '',
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
                });
                return success(data, 201);
        } catch (e) {
                if (e instanceof OrderLimitError) return apiError(e.message, 403);
                return handleError(e);
        }
}

class OrderLimitError extends Error {
        constructor(message: string) {
                super(message);
                this.name = 'OrderLimitError';
        }
}
