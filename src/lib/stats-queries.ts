/**
 * Shared stats query builders (round79 Stage D — merge of the د3 duplication).
 *
 * The popular-items query (+ its hydration), the today-revenue aggregate, and
 * the restaurant-scope resolution were re-implemented in parallel across:
 *   - src/app/api/stats/route.ts
 *   - src/app/api/admin/stats/route.ts
 *   - src/app/api/stats/advanced/route.ts
 *
 * Only query CONSTRUCTION and hydration moved here — every route keeps its
 * own auth guard, response shaping, and HTTP semantics, so API responses are
 * byte-identical to before the merge.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { error } from '@/lib/api-helpers';
import type { Prisma } from '@/generated/prisma/client';

/* ---------- Restaurant scope resolution ---------- */

export interface ScopeAuth {
        userId: number;
        role: string;
        restaurantId: number | null;
        /** round92-B1: sub_admin permission list (requireAuth already carries it —
         *  optional so legacy callers/tests that omit it stay type-compatible). */
        permissions?: string[];
}

export type ScopeResult =
        | { ok: true; restaurantId: number }
        | { ok: false; response: NextResponse };

/**
 * Resolve which restaurant's stats the caller may read:
 * - owner → own restaurant (or an explicitly linked one, verified via UserRestaurant)
 * - admin / super_admin → any restaurant (must be passed explicitly)
 * - sub_admin → any restaurant, but only with the VIEW_ANALYTICS permission
 *   (round92-B1 — same gate as admin/stats:236 and restaurants/[id]:88-90;
 *   role membership alone no longer unlocks revenue + referrer PII)
 * - anything else → 403
 *
 * Identical logic + error messages previously duplicated in both
 * api/stats/route.ts and api/stats/advanced/route.ts.
 */
export async function resolveRestaurantScope(
        auth: ScopeAuth,
        searchParams: URLSearchParams
): Promise<ScopeResult> {
        let restaurantId: number | undefined = Number(searchParams.get('restaurantId')) || undefined;

        if (auth.role === 'owner') {
                // Multi-menu: if a restaurantId is explicitly requested, verify the
                // owner manages it (via UserRestaurant). Otherwise default to primary.
                if (restaurantId && restaurantId !== auth.restaurantId) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId, restaurantId } },
                        });
                        if (!link) return { ok: false, response: error('غير مصرح', 403) };
                } else {
                        restaurantId = auth.restaurantId ?? undefined;
                }
                if (!restaurantId) return { ok: false, response: error('لا يوجد مطعم مرتبط', 400) };
        } else if (auth.role === 'admin' || auth.role === 'super_admin') {
                // full access (legacy admin trust — same as requirePermission semantics)
        } else if (auth.role === 'sub_admin') {
                // round92-B1: revenue + referrer names/phones (loyalty/stats) are
                // analytics-grade PII — a zero-permission sub_admin must not read
                // them. Same permission + Arabic message as the governed routes.
                if (!(auth.permissions ?? []).includes('VIEW_ANALYTICS')) {
                        return { ok: false, response: error('لا تملك الصلاحية', 403) };
                }
        } else {
                // Regular users must never read stats (revenue/orders) or customer PII of any restaurant
                return { ok: false, response: error('غير مصرح', 403) };
        }
        if (!restaurantId) return { ok: false, response: error('معرف المطعم مطلوب', 400) };

        return { ok: true, restaurantId };
}

/* ---------- Popular items (top-selling menu items) ---------- */

export interface PopularItemsOptions {
        restaurantId?: number;
        /** Inclusive lower bound on the order date (period start). */
        since?: Date;
        /** Exclusive upper bound on the order date (period end). */
        before?: Date;
        /** How many items to return. Defaults to 10. */
        take?: number;
}

/** groupBy requires orderBy to be present (TS-level) — narrow the args type. */
export type PopularItemsArgs = Prisma.OrderItemGroupByArgs & {
        orderBy: Prisma.OrderItemOrderByWithAggregationInput;
};

/**
 * Build the orderItem groupBy that ranks items by quantity sold.
 * Previously hand-written 4 times across the 3 stats routes
 * (take drifted between 10 and 15 — now explicit per call site).
 */
export function popularItemsQuery(opts: PopularItemsOptions = {}): PopularItemsArgs {
        const period: { gte?: Date; lt?: Date } = {};
        if (opts.since !== undefined) period.gte = opts.since;
        if (opts.before !== undefined) period.lt = opts.before;
        const hasPeriod = opts.since !== undefined || opts.before !== undefined;
        const hasRestaurant = opts.restaurantId !== undefined;

        const args: PopularItemsArgs = {
                by: ['itemId'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: opts.take ?? 10,
                // r93-N5 (F9/M-4): تعريف موحّد — الأصناف الرائجة تستثني الطلبات
                // الملغاة (كانت تجمع كل الحالات). الطلب الملغى ليس مبيعًا، وإدراجه
                // في «الرائج» كان يرجّح أصنافًا أُلغيت طلباتها. الحالة تُفحص
                // دائمًا (حتى بلا نطاق مطعم/فترة) والعدّادات المستقلة للملغاة
                // (statusBreakdown في stats route) خارج هذا النطاق تمامًا.
                where: {
                        order: {
                                status: { not: 'cancelled' },
                                ...(hasRestaurant ? { restaurantId: opts.restaurantId } : {}),
                                ...(hasPeriod ? { createdAt: period } : {}),
                        },
                },
        };
        return args;
}

export interface PopularItemsRow {
        itemId: number;
        _sum?: { quantity?: number | null } | null;
}

/** How to resolve the display name of an item. */
export type NameMode =
        | 'name' /** plain name field */
        | 'nameAr-fallback' /** nameAr || name */
        | 'nameAr-trimmed-fallback' /** nameAr.trim() ? nameAr : name */;

/**
 * Hydrate grouped popular-items rows with item names.
 * Previously re-implemented in all 3 stats routes (~15 lines each).
 * The three name modes preserve each route's exact pre-merge behavior.
 */
export async function hydratePopularItems(
        rows: readonly PopularItemsRow[],
        nameMode: NameMode = 'name'
): Promise<{ itemId: number; name: string; totalSold: number }[]> {
        const ids = rows.map((r) => r.itemId);
        const withNameAr = nameMode !== 'name';
        /** nameAr is only selected when a mode needs it — optional keeps both shapes assignable. */
        type NameRow = { id: number; name: string; nameAr?: string | null };
        const items: NameRow[] =
                ids.length > 0
                        ? await prisma.menuItem.findMany({
                                        where: { id: { in: ids } },
                                        select: withNameAr ? { id: true, name: true, nameAr: true } : { id: true, name: true },
                                })
                        : [];

        const map = new Map<number, string>();
        for (const i of items) {
                if (nameMode === 'name') map.set(i.id, i.name);
                else if (nameMode === 'nameAr-fallback') map.set(i.id, i.nameAr || i.name);
                else map.set(i.id, i.nameAr?.trim() ? i.nameAr : i.name);
        }

        return rows.map((r) => ({
                itemId: r.itemId,
                name: map.get(r.itemId) ?? 'Unknown',
                totalSold: r._sum?.quantity ?? 0,
        }));
}

/* ---------- Today revenue aggregate ---------- */

/**
 * Build the order aggregate for revenue-in-a-period.
 * Previously written twice (api/stats with restaurantId + api/admin/stats
 * platform-wide with _count). `_count: true` only when `withCount` —
 * preserves each route's exact aggregate shape.
 */
export function revenueAggregate(opts: {
        restaurantId?: number;
        since: Date;
        before?: Date;
        withCount?: boolean;
}): Prisma.OrderAggregateArgs {
        const args: Prisma.OrderAggregateArgs = {
                where: {
                        ...(opts.restaurantId !== undefined ? { restaurantId: opts.restaurantId } : {}),
                        // r93-N5 (F9/M-4): تعريف الإيراد الموحّد عبر المنصة — الطلبات
                        // الملغاة لا تدخل الإيراد (ولا عدّ ordersToday المزدوج معه في
                        // هذا التجميع). سابقًا كان SUM(total) يجمع الملغاة فتتعارض
                        // لوحة المالك مع تعريف الولاء totalSpent (المكتملة فقط)
                        // برقمين مختلفين لنفس اليوم. الخيار المدوّن: استثناء الملغاة
                        // فقط — طلبات اليوم الجارية (new/preparing/ready) مالٌ في
                        // طريقه فيُدرج، والإيراد "المؤكد" يبقى مسؤولية المكتملة.
                        // عدّاد الملغاة المستقل (statusBreakdown) لا يُمسّ.
                        status: { not: 'cancelled' },
                        createdAt: {
                                gte: opts.since,
                                ...(opts.before !== undefined ? { lt: opts.before } : {}),
                        },
                },
                ...(opts.withCount ? { _count: true } : {}),
                _sum: { total: true },
        };
        return args;
}

/* ---------- r143 (Phase-4 W1 D6): العدّادات العامة الصادقة ---------- */

export interface PublicStatsCount {
        totalRestaurants: number;
        totalUsers: number;
}

/**
 * صندوق الحقيقة الوحيد لعدّادَي الهبوط العلنيين («مطعم مسجل» / «صاحب مطعم») —
 * كان كل مستدعى يعدّه بنفسه (public/stats + page.tsx) وبكذبة القياس نفسها:
 * Restaurant.count() كان يحتسب حتى المطاعم المطفأة (isActive:false) و
 * User.count() كان يحتسب مدراء المنصة وحسابات USER على أنها «حساب نشط».
 *
 * التعريف الصادق:
 *  - مطعم مسجل  = Restaurant.isActive:true (المطفأ خارج المنصة عمليًا).
 *  - صاحب مطعم = User.role:'owner' — أصحاب المطاعم فقط؛ مدراء المنصة
 *    (admin/sub_admin/super_admin) وحسابات الزوار (USER) ليست «حسابات
 *    مطاعم» ولا تدخل الوعد التسويقي.
 * (التسمية «حساب نشط» استُبدلت بـ«صاحب مطعم» — العدد الفعلي لما يُحتسب.)
 * المستهلكان: /api/public/stats و (public)/page.tsx (ISR 60s).
 */
export async function countPublicStats(): Promise<PublicStatsCount> {
        const [totalRestaurants, totalUsers] = await Promise.all([
                prisma.restaurant.count({ where: { isActive: true } }),
                prisma.user.count({ where: { role: 'owner' } }),
        ]);
        return { totalRestaurants, totalUsers };
}
