import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError, paginated, parsePagination, isValidOrderStatusFilter } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { orderItemCountByOrder } from '@/lib/list-counts';
import { attachReferralPhoneToOrder, REFERRAL_CODE_RE } from '@/lib/referral-conversion';
import { normalizeCustomerPhone } from '@/lib/phone';
// r137: فرض رسوم التوصيل والحد الأدنى — نفس الحقيقة المالية للواجهة
import { deliveryFeeFor, isBelowMinOrder, minOrderMessage } from '@/lib/delivery-meta';
import { PlanLimitError } from '@/lib/plan-limit-error';
import { MAX_ITEM_QUANTITY, MAX_ITEM_QUANTITY_MESSAGE } from '@/lib/constants';
import {
        fetchServiceableModifierGroups,
        validateItemModifierSelection,
        buildModifierSnapshot,
        MAX_MODIFIER_OPTIONS_PER_ITEM,
} from '@/lib/order-modifiers';

const orderDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });
// r119-S4-P3-3: rotation-proof backstop — the per-IP limiter alone is
// defeated by IPv6/proxy rotation (unbounded garbage orders → Order+OrderItem
// writes, Telegram fan-out, owner dashboard spam). A per-RESTAURANT ceiling
// (150/min ≈ 5× the busiest real QR menu) caps the blast radius regardless
// of how many IPs the flooder mints. Checked post-parse so garbage bodies
// never cost a limiter write.
const orderRestDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 150 });

// round91-F-B (F9/D1 — unthrottled heavy GET): GET /api/orders runs the
// platform's heaviest authenticated query (full list + grouped counts, 15s
// polls) with NO limiter while POST had one — a session could self-DoS the
// DB. Session-scoped key: every caller is auth-checked first, so the bucket
// is per-user (no spoofable header component).
const ordersListDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });

const orderItemSchema = z.object({
        itemId: z.number().int().positive(),
        // r106-F1: السقف كان مفقوداً — أي عدد صحيح موجب كان مقبولاً (100000 مرّ).
        // نفس الحد المعروض في عدّادات الواجهة (OrderDialog/MenuScreen = 99).
        quantity: z.number().int().positive().max(MAX_ITEM_QUANTITY, MAX_ITEM_QUANTITY_MESSAGE).default(1),
        // round86-A7: bound free-text fields (DB bloat + receipt/telegram payload hygiene)
        notes: z.string().max(500).optional(),
        // r102-A5: client `price` dropped — the server re-prices every line from
        // its own DB rows (eff = discountedPrice ?? price, line 235) and the old
        // required field forced every client to send a fake value that was then
        // ignored. Unknown keys are stripped by zod, so existing senders keep working.
        // r118-A3-P1: bounded + server-side group-contract validation (see
        // lib/order-modifiers.ts). Raw cap is a DoS bound for the IN() lists;
        // dedupe + per-group maxSelect below bound the real selection.
        modifierOptionIds: z
                .array(z.number().int().positive())
                .max(MAX_MODIFIER_OPTIONS_PER_ITEM, 'عدد الخيارات المختارة كبير جداً')
                .optional(),
});

const createSchema = z.object({
        idempotencyKey: z.string().max(100).optional(),
        customerName: z.string().max(50).optional(),
        // r136 (ليبي أولاً): هاتف الزبون يُطوَّع قبل التخزين — الأرقام الشرقية
        // ٠٩١٢… والفواصل كانت تصل خاماً إلى إيصال واتساب المالك وروابط
        // الاتصال. تطبيع فقط (لا بوابة نمط جديدة) كي يبقى المسار متوافقاً
        // مع كل المرسلين الحاليين؛ القيمة الفارغة تصبح undefined فتُخزَّن ""
        // كما كانت (بدل تخزين "abc" خاماً سابقاً).
        customerPhone: z.string().max(30).optional().transform(normalizeCustomerPhone),
        notes: z.string().max(500).optional(),
        pickupType: z.enum(['inside', 'takeaway', 'delivery']).optional(),
        // r102-A5: subtotal/discount/total dropped — same rationale as item price
        // above (server-side recalculation is the only source of truth; the old
        // REQUIRED positive subtotal/total rejected clients that sent nothing).
        restaurantId: z.number().int().positive(),
        // round89-A2: payload cap (dx-2 #9) — an unbounded items array fed
        // giant IN lists + createMany batches into the money path; 50 covers
        // any real cart (largest plan carts observed are single digits).
        items: z.array(orderItemSchema).min(1).max(50, 'الحد الأقصى 50 صنفاً في الطلب'),
        // round88-C4 — referral link (NO money effect here): the code stored by
        // ReferralHandler (?ref=CODE → localStorage). Validated against the same
        // format the claim route enforces; used ONLY to attach the customer's
        // phone to their anonymous pending claim referral. The round-77 guard
        // (client discounts forced to 0) is untouched — rewards are granted
        // server-side at order completion (see referral-conversion.ts).
        referralCode: z.string().regex(REFERRAL_CODE_RE).optional(),
});

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                // round91-F-B (F9): 60/min per authenticated user — AFTER the 401 gate
                // so an anonymous probe never burns a bucket.
                const { success: listAllowed } = await ordersListDbLimiter.check(`orders:${auth.userId}`);
                if (!listAllowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

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
                } else if (auth.role === 'admin' || auth.role === 'super_admin') {
                        // full access (legacy admin trust — same as requirePermission semantics)
                } else if (auth.role === 'sub_admin') {
                        // round92-B1: sub_admin now needs APPROVE_ORDERS for the LIST too —
                        // the same gate /api/orders/[id]:49-51 already applies to the single
                        // order read (and whatsapp/generate). Role membership alone used to
                        // expose platform-wide customer PII (customerName/customerPhone in
                        // the select below) to zero-permission sub_admins.
                        if (!(auth.permissions ?? []).includes('APPROVE_ORDERS')) return apiError('لا تملك الصلاحية', 403);
                } else {
                        return apiError('غير مصرح', 403);
                }

                const { page, pageSize } = parsePagination(url);
                const status = searchParams.get('status') || undefined;
                // round88-B4: reject non-enum status filters with 400, not a
                // downstream Prisma validation 500.
                if (status !== undefined && !isValidOrderStatusFilter(status)) {
                        return apiError('حالة غير صحيحة', 400);
                }

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

/**
 * round91-F-B (D2-#4): in-transaction flag — the restaurant was suspended
 * (isActive→false) in the race window between the pre-tx read and the lock.
 * Mapped to the SAME 409 contract as the pre-tx fast check (S-5).
 */
class InactiveRestaurantError extends Error {}

export async function POST(request: NextRequest) {
        // round90-F1: مرئي للـcatch — مشتق داخل المحاولة قبل أي كتابة؛ التقاط
        // P2002 على orderNo يحتاجه لإرجاع تأكيد الخمول المتعاقد.
        let derivedOrderNo: string | undefined;
        try {
                // Rate limit order creation (public endpoint)
                // round91-D1: unified client-IP extraction (canonical + validated —
                // header rotation can no longer mint fresh buckets off-Vercel)
                const ip = getClientIp(request);
                const { success: allowed } = await orderDbLimiter.check(`order:${ip}`);
                if (!allowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const parsedInput = createSchema.safeParse(await request.json());
                if (!parsedInput.success) return apiError(parsedInput.error.issues[0].message, 422);
                const body = parsedInput.data;

                // r119-S4-P3-3: per-restaurant ceiling (see limiter definition)
                const { success: restAllowed } = await orderRestDbLimiter.check(`order-rest:${body.restaurantId}`);
                if (!restAllowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                // Recalc totals server-side to prevent price tampering
                // round86-A4: items must belong to the order's restaurant and be
                // available — previously items from ANY tenant (incl. hidden ones)
                // could be embedded, polluting stats/loyalty
                const dbItems = await prisma.menuItem.findMany({
                        where: {
                                id: { in: body.items.map((i) => i.itemId) },
                                status: 'available',
                                // r118-A3-P2: الفئة غير النشطة تُخفى من القائمة (الفئات
                                // تُجلب بـ isActive:true) لكن أصنافها كانت تظل قابلة
                                // للطلب مباشرة — نفس الفلتر في الصفحة وواجهة الموبايل.
                                category: { is: { restaurantId: body.restaurantId, isActive: true } },
                        },
                        select: { id: true, price: true, discountedPrice: true },
                });
                const priceMap = new Map(dbItems.map((i) => [i.id, i]));

                // r118-A3-P1: dedupe option ids per item BEFORE pricing — duplicated
                // ids stacked the same priceDelta N times (a −1 option ×15 made the
                // line negative). Every downstream consumer (pricing, group counts,
                // snapshot) works on the deduped list.
                for (const item of body.items) {
                        if (item.modifierOptionIds) {
                                item.modifierOptionIds = [...new Set(item.modifierOptionIds)];
                        }
                }

                // r118-A3-P1/A7-P2: fetch the SERVICEABLE groups (≥1 available
                // option — exactly what the public menu serializers render) so the
                // required/minSelect/maxSelect contract is enforced server-side,
                // mirroring what the customer was actually offered.
                const serviceableGroups = await fetchServiceableModifierGroups(
                        body.items.map((i) => i.itemId)
                );
                for (const item of body.items) {
                        const violation = validateItemModifierSelection(
                                serviceableGroups.get(item.itemId) ?? [],
                                item.modifierOptionIds ?? []
                        );
                        if (violation) return apiError(violation, 400);
                }

                // Fetch modifier prices for any selected options and verify ownership
                const allModIds = body.items.flatMap((i) => i.modifierOptionIds ?? []);
                const modOptionMap = new Map<number, number>();
                // r118-A7-P3: id→option snapshot map — populated alongside the
                // ownership check below, consumed by the create path to persist
                // names+deltas (order-time snapshot) instead of bare ids.
                const optionsById = new Map<
                        number,
                        { id: number; nameAr: string; name: string; priceDelta: number }
                >();
                if (allModIds.length > 0) {
                        // w3-f1 security note (coordinator fix): isAvailable:true —
                        // the public menu never offers unavailable options, so an
                        // unavailable id here means a hand-crafted payload trying
                        // to price a hidden option. Reject at the source.
                        const modOptions = await prisma.modifierOption.findMany({
                                where: { id: { in: allModIds }, isAvailable: true },
                                // r118-A7-P3: nameAr/name join the select — the create path
                                // snapshots them into modifiersJson so historical orders
                                // survive later group edits (bare ids dangled before).
                                select: { id: true, nameAr: true, name: true, priceDelta: true, group: { select: { menuItemId: true } } },
                        });
                        // Build set of valid (itemId → optionId) pairs (+ populate the
                        // pricing + snapshot maps).
                        const validForItem = new Map<number, Set<number>>();
                        for (const mo of modOptions) {
                                const g = validForItem.get(mo.group.menuItemId) ?? new Set();
                                g.add(mo.id);
                                validForItem.set(mo.group.menuItemId, g);
                                optionsById.set(mo.id, {
                                        id: mo.id,
                                        nameAr: mo.nameAr,
                                        name: mo.name,
                                        priceDelta: Number(mo.priceDelta),
                                });
                                modOptionMap.set(mo.id, Number(mo.priceDelta));
                        }
                        for (const item of body.items) {
                                const allowed = validForItem.get(item.itemId);
                                for (const mid of item.modifierOptionIds ?? []) {
                                        if (!allowed?.has(mid)) {
                                                // r103-F12: raw numeric ids leak DB internals to a
                                                // customer whose cart holds a just-unavailable
                                                // option — actionable copy instead.
                                                return apiError('أحد الخيارات المختارة لم يعد متاحاً — حدّث السلة وحاول مجدداً', 400);
                                        }
                                }
                        }
                }

                let recalcSubtotal = 0;
                for (const item of body.items) {
                        const db = priceMap.get(item.itemId);
                        if (!db) {
                                // r103-F12: same family as the modifier error above — the
                                // customer sees an actionable message, not a DB id.
                                return apiError('أحد الأصناف في سلتك لم يعد متوفراً — حدّث السلة وحاول مجدداً', 400);
                        }
                        // r118-A3-P2-3: nullish (not truthy) — discountedPrice = 0 is a
                        // stored 100%-free price and used to silently fall back to the
                        // FULL price, charging a free item.
                        const eff = db.discountedPrice != null ? Number(db.discountedPrice) : Number(db.price);
                        const modTotal = (item.modifierOptionIds ?? []).reduce(
                                (s, mid) => s + (modOptionMap.get(mid) ?? 0),
                                0
                        );
                        // r118-A3-P1: a negative unit price is never legitimate (stacked
                        // negative deltas) — reject before any write.
                        if (eff + modTotal < 0) {
                                return apiError('تعذّر احتساب سعر الطلب — حدّث السلة وحاول مجدداً', 400);
                        }
                        recalcSubtotal += (eff + modTotal) * item.quantity;
                }
                if (recalcSubtotal < 0) {
                        return apiError('تعذّر احتساب سعر الطلب — حدّث السلة وحاول مجدداً', 400);
                }

                const orderNo = body.idempotencyKey
                        ? `ORD-${body.idempotencyKey.toUpperCase().slice(0, 40)}`
                        : `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
                derivedOrderNo = orderNo;

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
                // round90-F1 (S-5): المطعم الموقوف (isActive:false) كان يستمر في
                // استقبال طلبات مباشرة تُحسب على السقف والإحصاء — فحص الحياة صريح
                // برسالة عربية واضحة (409) قبل أي كتابة.
                if (!restaurant.isActive) {
                        return apiError('المطعم غير متاح حالياً', 409);
                }

                // r137 (رسوم التوصيل + الحد الأدنى): فرض خادمي فقط — إجمالي
                // العميل لا يُوثق أبدًا (نفس مبدأ إعادة التسعير r102-A5). الرسوم
                // تُضاف إلى total بعد المجموع الفرعي، وsubtotal يبقى أسعار
                // الأصناف وحدها (فصل صادق في كل الفواتير/الإحصاءات).
                const deliveryMeta = {
                        fee: restaurant.deliveryFee == null ? null : Number(restaurant.deliveryFee),
                        minOrder: restaurant.minOrder == null ? null : Number(restaurant.minOrder),
                };
                const effectivePickupType = body.pickupType ?? 'inside';
                if (isBelowMinOrder(recalcSubtotal, effectivePickupType, deliveryMeta)) {
                        return apiError(
                                `${minOrderMessage(deliveryMeta.minOrder!)} — أضف أصنافاً أكثر ثم أعد المحاولة`,
                                422,
                        );
                }
                const feeTotal = deliveryFeeFor(effectivePickupType, deliveryMeta);

                // Check plan order limit — inside the tx with the create (round-76: TOCTOU
                // race — concurrent POSTs both passed the old outside count check)
                const data = await prisma.$transaction(async (tx) => {
                        // round90-F1 (R-1/T1): العدّ داخل المعاملة يضيّق نافذة السباق فقط
                        // بمعزل READ COMMITTED الافتراضي (لا phantom protection) —
                        // 10 طلبات متزامنة عند maxOrders-1 تعدّ كلها نفس اللقطة فتنشئ
                        // كلها. قفل صف المطعم FOR UPDATE يُسلسل إنشاء الطلبات لكل
                        // مطعم على نفس الصف الذي يُقرأ منه maxOrders أصلًا: الخاسر
                        // المتزامن ينتظر commit الفائز ثم يعيد العدّ فيرى الرقم الحقيقي.
                        await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${body.restaurantId} FOR UPDATE`;
                        // round91-F-B (D2-#4): القيم المعتمدة تُقرأ تحت القفل — كانت
                        // maxOrders/isActive تُقرآن قبل المعاملة فيمرّ الطلب بسقف قديم
                        // (fail-open بواحد) إذا التزمت تخفيض/تعليق متزامن في نافذة
                        // الملّي ثانية. القراءة السابقة تبقى فحصًا سريعًا فقط.
                        const locked = await tx.restaurant.findUnique({
                                where: { id: body.restaurantId },
                                select: { maxOrders: true, isActive: true },
                        });
                        if (locked && !locked.isActive) {
                                // same contract as the pre-tx fast check (S-5), race-proof now
                                throw new InactiveRestaurantError();
                        }
                        const effectiveMaxOrders = locked?.maxOrders ?? restaurant.maxOrders;
                        const orderCount = await tx.order.count({ where: { restaurantId: body.restaurantId } });
                        if (orderCount >= effectiveMaxOrders) {
                                // round89-E1: unified plan-cap error (was local OrderLimitError).
                                // planName stays null here — the restaurant row (already fetched
                                // for maxOrders) carries planId only, and an extra plan lookup
                                // on the money path isn't worth the display name.
                                throw new PlanLimitError({ kind: 'orders', limit: effectiveMaxOrders });
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
                                        // r137: الرسوم تُضاف بعد المجموع الفرعي (خادميًا فقط —
                                        // feeTotal محسوبة من صف المطعم أعلاه، لا من العميل)
                                        total: recalcSubtotal - discount + feeTotal,
                                        restaurantId: body.restaurantId,
                                        items: {
                                                create: body.items.map((i) => {
                                                        const db = priceMap.get(i.itemId)!;
                                                        return {
                                                                itemId: i.itemId,
                                                                quantity: i.quantity,
                                                                notes: i.notes ?? '',
                                                                // r118-A3-P2-3: nullish — discountedPrice 0 = 100% free
                                                                // item (the truthy check charged the FULL price).
                                                                // r120 (U5-F-2): store the EFFECTIVE unit price — base +
                                                                // modifier deltas — so receipt lines (price × qty) sum
                                                                // exactly to the stored subtotal/total. The old base-only
                                                                // storage made WhatsApp invoices contradict themselves
                                                                // (lines 18+5=23 while الإجمالي said 32).
                                                                price:
                                                                        (db.discountedPrice != null
                                                                                ? Number(db.discountedPrice)
                                                                                : Number(db.price)) +
                                                                        (i.modifierOptionIds ?? []).reduce(
                                                                                (s, mid) => s + (modOptionMap.get(mid) ?? 0),
                                                                                0
                                                                        ),
                                                                // r118-A7-P3: order-time snapshot (names + deltas) instead
                                                                // of bare ids — a later group edit (items PUT
                                                                // full-replaces groups) used to leave historical
                                                                // orders unreconstructable.
                                                                modifiersJson: JSON.stringify(
                                                                        buildModifierSnapshot(i.modifierOptionIds ?? [], optionsById)
                                                                ),
                                                        };
                                                }),
                                        },
                                },
                                include: {
                                        items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                },
                        });
                });

                // round88-C4 — link the customer's phone to their anonymous claim
                // referral (best-effort, never blocks/fails the created order; no
                // money effect — conversion happens at completion)
                if (body.referralCode && body.customerPhone) {
                        await attachReferralPhoneToOrder({
                                request,
                                referralCode: body.referralCode,
                                restaurantId: body.restaurantId,
                                customerPhone: body.customerPhone,
                        });
                }

                return success(data, 201);
        } catch (e) {
                if (e instanceof PlanLimitError) return apiError(e.message, 403);
                // round91-F-B (D2-#4): تعليق مطعم متزامن داخل المعاملة → نفس 409 السريع
                if (e instanceof InactiveRestaurantError) return apiError('المطعم غير متاح حالياً', 409);
                // round90-F1 (idempotency-race): إرسالان متزامنان بنفس idempotencyKey —
                // الفحص الأولي (findUnique) يجتازه كلاهما قبل أي كتابة، فيوجّه القيد
                // الفريد الخاسر إلى handleError العام: 409 «هذا الاسم موجود مسبقاً»
                // (رسالة اسم لطلب!). العقد الحقيقي للمسار (:225): تأكيد خامل 200
                // {orderNo, already:true} — نلتقط P2002 على orderNo تحديدًا ونعيده.
                if (derivedOrderNo !== undefined && isUniqueOrderNoViolation(e)) {
                        return success({ orderNo: derivedOrderNo, already: true }, 200);
                }
                return handleError(e);
        }
}

/**
 * round90-F1: P2002 على orderNo تحديدًا — لا أي قيد فريد آخر (لا يوجد غيره على
 * Order.create). meta.target قد يكون الحقول ['orderNo'] أو اسم القيد
 * 'Order_orderNo_key' — كلاهما يحمل الاسم؛ نص الرسالة شبكة أمان ثالثة.
 */
function isUniqueOrderNoViolation(e: unknown): boolean {
        const err = e as { code?: string; message?: string; meta?: { target?: unknown } };
        if (err?.code !== 'P2002') return false;
        const target = err.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(',') : String(target ?? '');
        return targetStr.includes('orderNo') || (err.message ?? '').includes('orderNo');
}
