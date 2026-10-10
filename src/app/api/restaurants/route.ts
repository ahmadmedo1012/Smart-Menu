import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError, parsePagination } from '@/lib/api-helpers';
import { requirePermission } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { notifyEvent } from '@/lib/telegram';
import { z } from 'zod';
import { createDbRateLimiter } from '@/lib/rate-limit';
import {
        usernameOptional,
        passwordOptional,
        slugField,
        restaurantFieldSchema,
        isSlugHeldByPendingPayment,
} from '@/lib/validation';
// r137: ساعات الدوام المهيكلة + رسوم التوصيل/الحد الأدنى (نفس المحللات
// المشتركة مع مسارات PUT/settings — مصدر واحد للرسائل العربية)
import { parseOpeningHoursPayload } from '@/lib/opening-hours';
import { parseDeliveryAmount } from '@/lib/delivery-meta';
import { orderCountByRestaurant, categoryCountByRestaurant } from '@/lib/list-counts';
import { getClientIp } from '@/lib/client-ip';

const registrationLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

// round91-D1: the local one-off getClientIp (Pattern B, '127.0.0.1' fallback)
// was replaced by the shared helper — same name, single trust model, and the
// no-header fallback is now 'unknown' like every other route (D1/F4: divergent
// fallbacks were the drift class). Behavior for headerless local traffic:
// register:unknown instead of register:127.0.0.1 (test expectation updated).

const restaurantInputSchema = z.object({
        name: z.string().min(1).max(200),
        // round97-X3: shared slug policy (src/lib/validation.ts) — was an inline
        // min(1) field; now the canonical min(3) + max(100) + SLUG_RE with the
        // unified Arabic messages (same tightening rule as the username fields:
        // validation runs on create input only, stored data is untouched).
        slug: slugField,
        description: z.string().max(1000).optional(),
        phone: z.string().max(30).optional(),
        whatsapp: z.string().max(30).optional(),
});

// r121-C5 (X2 §7): legacy single-menu bodies are coerced into the array form
// PRE-PARSE (in POST below) and validated once through restaurantInputSchema —
// the legacy top-level fields were bare `z.string().optional()` while the array
// form carried every cap (and legacy `name` had no max at all, on a PUBLIC
// 5/min/IP route). The top-level fields that the array form applies to EVERY
// menu (email/address/workingHours — see the create data in the tx) stay
// top-level but are now bounded by the shared canonical caps (r121-C4).
// `city` is dropped from the schema: it was accepted but never stored (dead
// field) — zod strips it exactly as silently as before.
const createSchema = z.object({
        // Support MULTIPLE menus: array form (legacy single-fields are coerced in)
        restaurants: z.array(restaurantInputSchema).optional(),
        email: restaurantFieldSchema.shape.email.optional(),
        address: restaurantFieldSchema.shape.address.optional(),
        workingHours: restaurantFieldSchema.shape.workingHours.optional(),
        planId: z.number().int().optional(),
        username: usernameOptional,
        password: passwordOptional,
        showOnLanding: z.boolean().optional(),
        featuredRank: z.number().int().optional(),
        /* r137: رسوم التوصيل/الحد الأدنى (اختياريان — null/فراغ = إطفاء؛
           لا بوابة خطة: أمانة منيو جوهرية، كل الباقات) + ساعات الدوام
           المهيكلة (مصفوفة فارغة = لا شيء). ليست حقول تسجيل حساسة — لا
           تلامس خطة/فوترة (قاعدة mass-assign round-76 تبقى على
           planId/showOnLanding/featuredRank وحدها). */
        deliveryFee: z.union([z.number(), z.string()]).optional(),
        minOrder: z.union([z.number(), z.string()]).optional(),
        hours: z.array(z.unknown()).optional(),
}).refine((d) => (d.restaurants?.length ?? 0) > 0, {
        message: 'يجب توفير بيانات منيو واحد على الأقل',
});

export async function GET(request: NextRequest) {
        try {
                // Admin-only: exposes plans, PII (phone/whatsapp/email), counts for every
                // restaurant. The public directory uses /api/public/featured instead.
                // round86-A8: permission-scoped (was requireAdmin — zero-permission
                // sub_admins could list every tenant's PII)
                const auth = await requirePermission('VIEW_ANALYTICS');
                if (!auth.authorized) return error(auth.error ?? 'غير مصرح', auth.status ?? 403);

                const url = new URL(request.url);
                const { searchParams } = url;
                const { page, pageSize } = parsePagination(url, { pageSize: 10 });
                const search = searchParams.get('search')?.trim();
                const planFilter = searchParams.get('planFilter');

                const where: Record<string, unknown> = {};
                if (search) {
                        where.OR = [
                                { name: { contains: search, mode: 'insensitive' } },
                                { slug: { contains: search, mode: 'insensitive' } },
                                { phone: { contains: search } },
                        ];
                }
                if (planFilter === 'free') {
                        where.planId = null;
                } else if (planFilter && planFilter !== 'all') {
                        // round88-B4: NaN used to serialize as null inside the where
                        // clause, silently aliasing garbage to the 'free' filter.
                        const planIdNum = Number(planFilter);
                        if (!Number.isInteger(planIdNum) || planIdNum <= 0) {
                                return error('فلتر الخطة غير صالح', 400);
                        }
                        where.planId = planIdNum;
                }

                const [rows, total] = await Promise.all([
                        // round88-A2: _count left the findMany (Prisma compiled it into
                        // TWO full-table LEFT JOIN aggregates — over Order and
                        // MenuCategory — 6.8ms / 55 buffers per 10-row admin page on
                        // the round88 perf DB, growing with platform-wide data). Now
                        // two grouped index-only COUNTs over the fetched page ids
                        // (0.08ms) — see src/lib/list-counts.ts. Response shape
                        // unchanged (restaurants + total; _count per row).
                        prisma.restaurant.findMany({
                                where,
                                orderBy: { createdAt: 'desc' },
                                include: {
                                        plan: { select: { id: true, name: true, nameAr: true, price: true } },
                                        /* r137: ساعات الدوام لصف التحرير في RestaurantFormDialog
                                           (نفس إسقاط اليوم الأربعة العام). */
                                        hours: {
                                                orderBy: { dayOfWeek: 'asc' },
                                                select: { dayOfWeek: true, closed: true, opensAt: true, closesAt: true },
                                        },
                                },
                                skip: (page - 1) * pageSize,
                                take: pageSize,
                        }),
                        prisma.restaurant.count({ where }),
                ]);
                const ids = rows.map((r) => r.id);
                const [orderCounts, catCounts] = await Promise.all([
                        orderCountByRestaurant(ids),
                        categoryCountByRestaurant(ids),
                ]);
                const data = rows.map((r) => ({
                        ...r,
                        _count: { orders: orderCounts.get(r.id) ?? 0, categories: catCounts.get(r.id) ?? 0 },
                }));
                return success({ restaurants: data, total });
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(request: NextRequest) {
        try {
                const ip = getClientIp(request); // round91-D1: unified extraction
                const { success: allowed } = await registrationLimiter.check(`register:${ip}`);
                if (!allowed) return error('طلبات كثيرة جدًا، حاول بعد 60 ثانية', 429);

                // r121-C5 (X2 §7): coerce a legacy single-menu body (name/slug/
                // description/phone/whatsapp at the top level) into the array form
                // and validate ONCE through restaurantInputSchema — the legacy
                // fields were unbounded while the array form carried every cap.
                // email/address/workingHours stay top-level (the array form applies
                // them to every menu) and are bounded by createSchema itself.
                const raw: unknown = await request.json();
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                        const r = raw as Record<string, unknown>;
                        if ((!Array.isArray(r.restaurants) || (r.restaurants as unknown[]).length === 0) &&
                            (r.name !== undefined || r.slug !== undefined)) {
                                r.restaurants = [
                                        {
                                                name: r.name,
                                                slug: r.slug,
                                                description: r.description,
                                                phone: r.phone,
                                                whatsapp: r.whatsapp,
                                        },
                                ];
                        }
                }
                const body = createSchema.parse(raw);
                // Allow public registration when username/password provided (new account)
                let actorId: number | undefined;
                let isPublicRegistration = false;
                if (!body.username || !body.password) {
                        // round86-A8: admin-created restaurants need MANAGE_RESTAURANTS
                        const auth = await requirePermission('MANAGE_RESTAURANTS');
                        if (!auth.authorized) return error(auth.error ?? 'غير مصرح', auth.status ?? 403);
                        actorId = auth.userId!;
                } else {
                        isPublicRegistration = true;
                }
                // SECURITY (round-76): public self-registration must not be able to
                // mass-assign planId/showOnLanding/featuredRank (paid plan for free).
                if (isPublicRegistration && (body.planId !== undefined || body.showOnLanding || body.featuredRank !== undefined)) {
                        return error('لا يمكن تحديد الخطة أو الميزات عند التسجيل الذاتي', 400);
                }

                // Check username uniqueness before transaction
                if (body.username && body.password) {
                        const existingUser = await prisma.user.findUnique({ where: { username: body.username } });
                        if (existingUser) return error('اسم المستخدم مستخدم بالفعل', 409);
                }

                // Round-77: public self-registration must not create N menus in one
                // POST (maxMenus bypass — free plan = 1). Admin path can pass more.
                if (isPublicRegistration && body.restaurants && body.restaurants.length > 1) {
                        return error('التسجيل الذاتي يسمح بمنيو واحد فقط — رقِّ خطتك لإضافة المزيد', 400);
                }

                // r93-N4 (F8/M-2): مسار الأدمن بخطة يزامن السقوف المنزّلة. سابقًا
                // كان يكتب planId فقط بينما تبقى maxItems/maxOrders افتراضيات
                // المخطط (50/500) — والإنفاذ الفعلي للأصناف/الطلبات يقرأ النسخة
                // المنزّلة على صف المطعم (items:255-270 وorders:286-301) لا
                // الخطة → مطعم على خطة Premium كان يُحاصَر فعليًا عند 50 صنفًا.
                // النمط: نفس آلية تنزيل سقوف الخطة في ترقية الاشتراك
                // (subscription-decisions: maxItems/maxOrders من صف الخطة).
                // قرار موثّق: لا نكتب planStart/planEnd هنا (تبقى null = بلا
                // انتهاء) — الإسناد الإداري بلا دفع ليس اشتراكًا مدفوعًا بمدة
                // 30 يومًا، وفرض انتهاء تلقائي كان سيقفل المالك خارجًا بقرار
                // لم يطلبه أحد؛ مدة الدفع تبقى مسؤولية مسار الموافقة وحده.
                let planCaps: { maxItems: number; maxOrders: number } | null = null;
                if (!isPublicRegistration && body.planId !== undefined) {
                        const plan = await prisma.subscriptionPlan.findUnique({
                                where: { id: body.planId },
                                select: { maxItems: true, maxOrders: true },
                        });
                        if (!plan) return error('الباقة غير موجودة', 400);
                        planCaps = { maxItems: plan.maxItems, maxOrders: plan.maxOrders };
                }

                // r103-F4 (pre-flight, same pattern as /api/subscriptions:60-74): a free
                // self-registration could snipe a slug held by a PENDING paid payment
                // (that path checks pending payments — this one checked only the Restaurant
                // table). The payer's later approval then failed on SLUG_TAKEN while their
                // payment stayed pending forever: no rejection event, no retry possible
                // ("لديك طلب دفع معلق"). Free registration must honor the same reservation.
                // r121-C3: the inline findFirst moved to the shared helper
                // (isSlugHeldByPendingPayment, src/lib/validation.ts).
                if (isPublicRegistration) {
                        for (const m of body.restaurants!) {
                                if (await isSlugHeldByPendingPayment(m.slug, prisma)) {
                                        return error(`الرابط ${m.slug} محجوز بطلب دفع معلق`, 409);
                                }
                        }
                }

                /* r137: تطبيع حقلي التوصيل + فك الساعات قبل المعاملة — فشل
                   التحقق يُجهض قبل أي كتابة (نفس عائلة 422 العربية كمسارات
                   PUT/settings). لا قيمة = لا عمود يُكتب (يبقى null المخطط). */
                const deliveryData: { deliveryFee?: number; minOrder?: number } = {};
                if ('deliveryFee' in body) {
                        const r = parseDeliveryAmount(body.deliveryFee);
                        if (!r.ok) return error(`رسوم التوصيل: ${r.error}`, 422);
                        if (r.value != null) deliveryData.deliveryFee = r.value;
                }
                if ('minOrder' in body) {
                        const r = parseDeliveryAmount(body.minOrder);
                        if (!r.ok) return error(`الحد الأدنى للطلب: ${r.error}`, 422);
                        if (r.value != null) deliveryData.minOrder = r.value;
                }
                const hoursParsed = parseOpeningHoursPayload(body.hours);
                if (!hoursParsed.ok) return error(hoursParsed.error, 422);
                const hoursRows = hoursParsed.rows;

                const result = await prisma.$transaction(async (tx) => {
                        // round87-A6: public self-registration must run at the FREE plan's
                        // advertised caps (10 items / 100 orders). Previously the row kept
                        // schema defaults (50/500) — 5× the advertised free tier, enforced
                        // nowhere because planId stays null until payment. planId is left
                        // untouched (payment semantics unchanged) — only the caps are written.
                        let freeCaps = { maxItems: 10, maxOrders: 100 };
                        if (isPublicRegistration) {
                                const freePlan = await tx.subscriptionPlan.findFirst({
                                        where: { price: 0, isActive: true },
                                        orderBy: { sortOrder: 'asc' },
                                        select: { maxItems: true, maxOrders: true },
                                });
                                if (freePlan) freeCaps = { maxItems: freePlan.maxItems, maxOrders: freePlan.maxOrders };
                        }

                        // r121-C5: legacy single-menu bodies were coerced into the
                        // array form pre-parse — the array is the only shape here now
                        // (createSchema's refine guarantees ≥1 menu).
                        const menus = body.restaurants!;

                        // Check ALL slugs unique inside transaction
                        for (const m of menus) {
                                const slugTaken = await tx.restaurant.findUnique({ where: { slug: m.slug } });
                                if (slugTaken) throw new Error('Unique constraint failed on slug');
                        }

                        // Create each restaurant; first = primary
                        let primary: Awaited<ReturnType<typeof tx.restaurant.create>> | null = null;
                        for (let i = 0; i < menus.length; i++) {
                                const m = menus[i];
                                const restaurant = await tx.restaurant.create({
                                        data: {
                                                name: m.name,
                                                slug: m.slug,
                                                description: m.description ?? '',
                                                phone: m.phone ?? '',
                                                whatsapp: m.whatsapp ?? '',
                                                email: body.email ?? '',
                                                address: body.address ?? '',
                                                workingHours: body.workingHours ?? '',
                                                planId: body.planId ?? null,
                                                ...(isPublicRegistration ? freeCaps : {}),
                                                // r93-N4: السقوف المنزّلة من الخطة (مسار الأدمن فقط —
                                                // التسجيل الذاتي أعلاه يفرض سقوف الخطة المجانية)
                                                ...(planCaps ?? {}),
                                                /* r137: رسوم التوصيل/الحد الأدنى مطبَّعين قبل المعاملة
                                                   (لا قيمة = لا عمود يُكتب — يبقى null المخطط)،
                                                   والساعات إنشاءً متداخلًا واحدًا ذريًا. */
                                                ...(deliveryData as Record<string, unknown>),
                                                ...(hoursRows.length > 0
                                                        ? { hours: { create: hoursRows } }
                                                        : {}),
                                        },
                                });
                                if (i === 0) primary = restaurant;

                                // Auto-seed default categories so a fresh menu is never empty
                                await tx.menuCategory.createMany({
                                        data: [
                                                { name: 'مشروبات ساخنة', icon: '☕', sortOrder: 1, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                                { name: 'مشروبات باردة', icon: '🧃', sortOrder: 2, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                                { name: 'حلويات', icon: '🍰', sortOrder: 3, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                                { name: 'وجبات خفيفة', icon: '🍔', sortOrder: 4, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                        ],
                                });
                        }

                        // Create owner user if username/password provided (linked to primary restaurant)
                        if (body.username && body.password) {
                                const { hashPassword } = await import('@/lib/hash');
                                await tx.user.create({
                                        data: {
                                                username: body.username,
                                                password: hashPassword(body.password),
                                                name: primary!.name,
                                                role: 'owner',
                                                restaurantId: primary!.id,
                                                planId: body.planId ?? null,
                                        },
                                });

                                // Link ALL restaurants to the new user via UserRestaurant (many-to-many)
                                const createdUser = await tx.user.findUniqueOrThrow({ where: { username: body.username } });
                                for (let i = 0; i < menus.length; i++) {
                                        await tx.userRestaurant.create({
                                                data: { userId: createdUser.id, restaurantId: (i === 0 ? primary! : (await tx.restaurant.findUniqueOrThrow({ where: { slug: menus[i].slug } }))).id, isPrimary: i === 0 },
                                        });
                                }
                        }

                        return primary!;
                });

                // Audit log + Telegram (best-effort, must not fail the response)
                logAudit({ action: 'create', targetType: 'restaurant', targetId: result.id, actorId }).catch(
                        () => {}
                );
                // round90-المنسق (اكتشاف F5b-B): notifyEvent وعد معلق بلا معالجة —
                // أي فشل DB فيها كان يترك رفضًا غير معالج بعد إرسال الاستجابة.
                // صار best-effort مثل logAudit المجاور.
                notifyEvent(
                        'restaurant_created',
                        { name: result.name, slug: result.slug, plan: result.planId ? 'paid' : 'free' },
                        { adminOnly: true }
                ).catch(() => {});

                return success(result, 201);
        } catch (e) {
                return handleError(e);
        }
}
