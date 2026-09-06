import { NextRequest } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { PlanLimitError } from '@/lib/plan-limit-error';
import { categoryCountByRestaurant, orderCountByRestaurant } from '@/lib/list-counts';
import { logAudit } from '@/lib/audit';
import { notifyEvent } from '@/lib/telegram';
import { z } from 'zod';

// round90-F1 (S-1 / dx-2 ب-3): نفس حدود المخطط الموازي restaurants:22-32 —
// كانت الحقول بلا .max فتنهار متأخرة كضجيج Prisma 400 عام.
const createSchema = z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        description: z.string().max(1000).optional(),
        phone: z.string().max(30).optional(),
        whatsapp: z.string().max(30).optional(),
});

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);
                // Subscription guard: expired → 403
                if (!(await isOwnerSubscriptionActive(auth))) return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);

                // Admin sees all; owner sees ONLY their own (no IDOR — userId param is
                // ignored for owners, always bound to the authenticated user).
                // Only super_admin may pass ?userId= to view another user's restaurants;
                // sub_admin/admin fall through to their own list (privilege fix).
                const isSuperAdmin = auth.role === 'super_admin';
                const userId = isSuperAdmin ? Number(new URL(request.url).searchParams.get('userId') ?? auth.userId) : auth.userId!;

                const links = await prisma.userRestaurant.findMany({
                        where: { userId },
                        include: {
                                restaurant: {
                                        // round89-C3 (dx-2 ب-2): `_count` in this list made Prisma
                                        // LEFT-JOIN a FULL-TABLE aggregate of Order + MenuCategory on
                                        // every call (platform-wide cost for an owner-scoped page —
                                        // round88-A2 measured 6.8ms/55 buffers per page). Counts for
                                        // just this owner's rows come from the list-counts helpers
                                        // below; the response shape is identical.
                                        select: {
                                                id: true,
                                                name: true,
                                                slug: true,
                                                description: true,
                                                logo: true,
                                                isActive: true,
                                                createdAt: true,
                                        },
                                },
                        },
                        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                });
                const restIds = links.map((l) => l.restaurant.id);
                const [catCounts, orderCounts] = await Promise.all([
                        categoryCountByRestaurant(restIds),
                        orderCountByRestaurant(restIds),
                ]);

                const data = links.map((l) => ({
                        ...l.restaurant,
                        _count: {
                                categories: catCounts.get(l.restaurant.id) ?? 0,
                                orders: orderCounts.get(l.restaurant.id) ?? 0,
                        },
                        isPrimary: l.isPrimary,
                }));
                return success(data);
        } catch (e) {
                return handleError(e);
        }
}

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);
                if (!auth.userId) return error('غير مصرح', 401);
                // Subscription guard: expired → 403
                if (!(await isOwnerSubscriptionActive(auth))) return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);

                // round90-F1 (S-1 — authorization bypass): بوابة دور لإنشاء المطعم —
                // كان POST يمر بحساب USER (بلا role gate) فينشئ مطعمًا isActive:true
                // بلا تدقيق ولا إشعار. نفس نمط round86-A1 في categories POST: المالك
                // يمر، وغير المالك يحتاج MANAGE_RESTAURANTS (super_admin/admin تلقائيًا،
                // sub_admin بالإذن) — USER يسقط في 403.
                if (auth.role !== 'owner') {
                        const perm = await requirePermission('MANAGE_RESTAURANTS');
                        if (!perm.authorized) return error(perm.error, perm.status);
                }

                const body = createSchema.parse(await request.json());

                // Check plan maxMenus limit
                // (round89-E1: plan nameAr joins the same include the cap needs;
                // round90-F1: maxItems/maxOrders join too — السقوف المكتوبة أدناه)
                const user = await prisma.user.findUnique({
                        where: { id: auth.userId },
                        include: { plan: { select: { maxMenus: true, maxItems: true, maxOrders: true, nameAr: true } } },
                });
                if (!user) return error('المستخدم غير موجود', 404);

                const maxMenus = user.plan?.maxMenus ?? 1;

                // Check slug uniqueness
                const slugTaken = await prisma.restaurant.findUnique({ where: { slug: body.slug } });
                if (slugTaken) return error('الرابط محجوز مسبقاً', 409);

                const result = await prisma.$transaction(async (tx) => {
                        // round87-A3: the count+limit used to run BEFORE the transaction (TOCTOU —
                        // two concurrent POSTs both passed and both created a menu). Now inside
                        // the tx, same pattern as the order/items limit checks (round-76/86).
                        // round90-F1 (R-1/T1): العدّ داخل المعاملة يضيّق نافذة السباق فقط
                        // بمعزل READ COMMITTED (لا phantom protection) — قفل صف المستخدم
                        // FOR UPDATE يُسلسل كل إنشاء منيو لنفس المستخدم: الخاسر المتزامن
                        // يعيد العدّ بعد commit الفائز فيرى الرقم الحقيقي.
                        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${auth.userId!} FOR UPDATE`;
                        const existingCount = await tx.userRestaurant.count({ where: { userId: auth.userId! } });
                        if (existingCount >= maxMenus) {
                                // round89-E1: unified plan-cap error (was local MenuLimitError)
                                throw new PlanLimitError({
                                        kind: 'menus',
                                        limit: maxMenus,
                                        planName: user.plan?.nameAr ?? null,
                                });
                        }
                        // round90-F1 (S-1 × round87-A6): سقوف الخطة المجانية بدل حدود
                        // schema العمياء — الصف كان يُخلق بـ 50 صنفًا/500 طلب (5× سقوف
                        // الفئة المجانية المعلنة). خطة المستخدم إن وُجدت فهي المصدر،
                        // وإلا سقوف الخطة المجانية (10/100 أو المُعرَّفة في الجدول).
                        let freeCaps = { maxItems: 10, maxOrders: 100 };
                        if (!user.plan) {
                                const freePlan = await tx.subscriptionPlan.findFirst({
                                        where: { price: 0, isActive: true },
                                        orderBy: { sortOrder: 'asc' },
                                        select: { maxItems: true, maxOrders: true },
                                });
                                if (freePlan) freeCaps = { maxItems: freePlan.maxItems, maxOrders: freePlan.maxOrders };
                        }
                        const restaurant = await tx.restaurant.create({
                                data: {
                                        name: body.name,
                                        slug: body.slug,
                                        description: body.description ?? '',
                                        phone: body.phone ?? '',
                                        whatsapp: body.whatsapp ?? '',
                                        planId: user.planId ?? null,
                                        maxItems: user.plan?.maxItems ?? freeCaps.maxItems,
                                        maxOrders: user.plan?.maxOrders ?? freeCaps.maxOrders,
                                        isActive: true,
                                },
                        });
                        await tx.userRestaurant.create({
                                data: { userId: auth.userId!, restaurantId: restaurant.id, isPrimary: false },
                        });
                        // Auto-seed default categories so a fresh menu is never empty
                        await tx.menuCategory.createMany({
                                data: [
                                        { name: 'مشروبات ساخنة', icon: '☕', sortOrder: 1, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                        { name: 'مشروبات باردة', icon: '🧃', sortOrder: 2, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                        { name: 'حلويات', icon: '🍰', sortOrder: 3, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                        { name: 'وجبات خفيفة', icon: '🍔', sortOrder: 4, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
                                ],
                        });
                        return restaurant;
                });

                // round90-F1 (S-1): تدقيق + إشعار بعد الإنشاء الناجح (نمط بقية مسارات
                // owner وrestaurants POST) — إنشاء كان غير مرئي للمشغل تمامًا.
                // Best-effort: فشلهما لا يُفشل الرد أبدًا.
                logAudit({
                        action: 'create',
                        targetType: 'restaurant',
                        targetId: result.id,
                        actorId: auth.userId!,
                }).catch(() => {});
                notifyEvent(
                        'restaurant_created',
                        { name: result.name, slug: result.slug, plan: result.planId ? 'paid' : 'free' },
                        { adminOnly: true }
                ).catch(() => {});

                return success(result, 201);
        } catch (e) {
                if (e instanceof PlanLimitError) return error(e.message, 403);
                return handleError(e);
        }
}
