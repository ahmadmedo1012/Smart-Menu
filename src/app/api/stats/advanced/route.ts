import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, handleError, error } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import {
        parseAnalyticsRange,
        rangeBounds,
        previousBounds,
        fillHours,
        fillDailySeries,
        fillRevenueSeries,
        categoryShares,
} from '@/lib/chart-stats';
import { resolveRestaurantScope, popularItemsQuery, hydratePopularItems } from '@/lib/stats-queries';
// W7-B (G-4): بوابة ميزة الخطة — «إحصائيات متقدمة» بريميوم فأعلى.
import { requirePlanFeature } from '@/lib/plan-entitlements';

// round89-B4 (dx-4 #7): light per-user cap — this route runs ~14 aggregate/raw
// queries per call, so an unbounded authenticated poller hits the DB hard.
// 120/min/user; keyed on userId (session-gated), same pattern as stats route.
const statsAdvancedLimiter = createDbRateLimiter({ windowMs: 60_000, max: 120 });

/* P45-W1 (الشريحة 2 — صدق الإحصاءات المتقدمة): قاعدة r93-N5 المثبّتة
 * لـ /api/stats (tests/unit/r93-revenue-cancelled-excluded.test.ts +
 * revenueAggregate في stats-queries.ts:186-213) كانت منتهَكة هنا — ستة
 * تجميعات SQL خام + عدّادات النمو بلا أي فلتر حالة، فالملغى كان ينفّخ
 * مخطط الإيراد وAOV والتوزيع الساعي وحصص الأقسام مقابل بطاقة KPI
 * (todayRevenue) على الشاشة نفسها. كل تجميع هنا يطابق الآن حرفيًا
 * استثناء نظيره: status != 'cancelled' (الإيراد/الأصناف الرائجة عبر
 * popularItemsQuery كانا مفلترين أصلًا — البقية لحقت بهما). عدّادات
 * الحالة المستقلة (statusBreakdown في /api/stats) تبقى بلا فلتر —
 * القاعدة الموثقة نفسها. */
const CANCELLED = 'cancelled';

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                // round89-B4: per-user limiter AFTER the auth gate (401s stay free).
                const { success: allowed } = await statsAdvancedLimiter.check(
                                `stats-advanced:${auth.userId}`
                );
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const { searchParams } = new URL(request.url);
                const range = parseAnalyticsRange(searchParams.get('range'));

                const scope = await resolveRestaurantScope(auth, searchParams);
                if (!scope.ok) return scope.response;
                const { restaurantId } = scope;

                /* W7-B (G-4 — قرار بوّابة): «إحصائيات متقدمة» بريميوم فأعلى —
                   الخطط الدنيا تكتفي بوعد «إحصائيات أساسية» الصادق (تبويب نظرة
                   عامة + /api/stats مفتوح). البوابة قبل أي عمل قاعدة بيانات
                   للميزة (قراءة صف الخطة وحدها تجري)، والمالك وحده يُخضع لها
                   (عائلة الأدمن تتجاوز — دلالة isOwnerSubscriptionActive). */
                const gate = await requirePlanFeature(auth, restaurantId, 'advancedStats');
                if (!gate.ok) return gate.response;

                /* P45-W1: حدود طرابلسية — rangeBounds/previousBounds صارتا
                   تحسبان اليوم/الأسبوع/الشهر بمنتصف ليل طرابلس (نفس منطق
                   MenuEvents P43) لا بساعة الخادم (UTC على Vercel). نافذة
                   «7 أيام» صارت 7 أيام طرابلسية تقويمية (كانت 168 ساعة
                   متدحرجة تعطي 8 دلاء لنفس البطاقة). */
                const now = new Date();
                const current = rangeBounds(range, now);
                const previous = previousBounds(range, current);
                const weekStart = rangeBounds('week', now).start;

                const monthStart = rangeBounds('month', now).start;
                const prevMonth = previousBounds('month', { start: monthStart, end: now });

                const [
                        revenue7dRaw,
                        orders7dRaw,
                        revenueRangeRaw,
                        ordersRangeRaw,
                        topItemsCurrent,
                        topItemsPrev,
                        hourlyRaw,
                        aovTrendRaw,
                        currentCount,
                        prevCount,
                        categoryRaw,
                        dailyCurrentRaw,
                        dailyPrevRaw,
                ] = await Promise.all([
                        // r93-N5 (P45-W1): الإيراد يستثني الملغى — مطابقة حرفية
                        // لـ revenueAggregate في stats-queries.ts (تعريف الإيراد الموثق).
                        prisma.$queryRaw<{ date: string; revenue: number }[]>`
                                SELECT DATE("createdAt") as date, COALESCE(SUM(total), 0) as revenue
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${weekStart}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                        prisma.$queryRaw<{ date: string; count: bigint }[]>`
                                SELECT DATE("createdAt") as date, COUNT(*) as count
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${weekStart}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                        prisma.$queryRaw<{ date: string; revenue: number }[]>`
                                SELECT DATE("createdAt") as date, COALESCE(SUM(total), 0) as revenue
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${current.start}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                        prisma.$queryRaw<{ date: string; count: bigint }[]>`
                                SELECT DATE("createdAt") as date, COUNT(*) as count
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${current.start}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                        prisma.orderItem.groupBy(
                                popularItemsQuery({ restaurantId, since: current.start, take: 10 })
                                        ),
                        prisma.orderItem.groupBy(
                                popularItemsQuery({ restaurantId, since: previous.start, before: current.start, take: 10 })
                                        ),
                        prisma.$queryRaw<{ hour: number; count: bigint }[]>`
                                SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::int as count
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${current.start}
                                        AND "status" != ${CANCELLED}
                                GROUP BY hour ORDER BY hour ASC
                        `,
                        prisma.$queryRaw<{ date: string; aov: number }[]>`
                                SELECT DATE("createdAt") as date, AVG(total)::decimal(10,2) as aov
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${current.start}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                        // r93-N5 (P45-W1): عدّادات النمو تستثني الملغى — الطلب الملغى
                        // ليس نشاطًا (نفس عائلة revenueAggregate: العدّ المزدوج مع
                        // الإيراد داخل التجميع مفلتر).
                        prisma.order.count({
                                where: { restaurantId, status: { not: 'cancelled' }, createdAt: { gte: current.start } },
                        }),
                        prisma.order.count({
                                where: {
                                        restaurantId,
                                        status: { not: 'cancelled' },
                                        createdAt: { gte: previous.start, lt: current.start },
                                },
                        }),
                        prisma.$queryRaw<{ categoryId: number; name: string; count: bigint }[]>`
                                SELECT c.id as "categoryId", COALESCE(NULLIF(c."nameAr", ''), c.name) as name, COALESCE(SUM(oi.quantity), 0)::int as count
                                FROM "OrderItem" oi
                                INNER JOIN "Order" o ON o.id = oi."orderId"
                                INNER JOIN "MenuItem" mi ON mi.id = oi."itemId"
                                INNER JOIN "MenuCategory" c ON c.id = mi."categoryId"
                                WHERE o."restaurantId" = ${restaurantId} AND o."createdAt" >= ${current.start}
                                        AND o."status" != ${CANCELLED}
                                GROUP BY c.id, c."nameAr", c.name
                                ORDER BY count DESC
                        `,
                        prisma.$queryRaw<{ date: string; count: bigint }[]>`
                                SELECT DATE("createdAt") as date, COUNT(*) as count
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${monthStart}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                        prisma.$queryRaw<{ date: string; count: bigint }[]>`
                                SELECT DATE("createdAt") as date, COUNT(*) as count
                                FROM "Order"
                                WHERE "restaurantId" = ${restaurantId}
                                        AND "createdAt" >= ${prevMonth.start}
                                        AND "createdAt" < ${monthStart}
                                        AND "status" != ${CANCELLED}
                                GROUP BY DATE("createdAt") ORDER BY date ASC
                        `,
                ]);

                const topItemsCurrentNamed = await hydratePopularItems(topItemsCurrent, 'nameAr-trimmed-fallback');
                const prevMap = new Map(topItemsPrev.map((t) => [t.itemId, t._sum?.quantity ?? 0]));

                const topItems = topItemsCurrent.map((t, i) => {
                        const prev = prevMap.get(t.itemId) ?? 0;
                        const curr = t._sum?.quantity ?? 0;
                        return {
                                itemId: t.itemId,
                                name: topItemsCurrentNamed[i]?.name ?? 'Unknown',
                                totalSold: curr,
                                growth: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0,
                        };
                });

                const growthPct =
                        prevCount > 0 ? Math.round(((currentCount - prevCount) / prevCount) * 100) : 0;

                const hourlyDistribution = fillHours(
                        hourlyRaw.map((h) => ({ hour: Number(h.hour), count: Number(h.count) }))
                );

                const categoryBreakdown = categoryShares(
                        categoryRaw.map((c) => ({
                                categoryId: Number(c.categoryId),
                                name: c.name,
                                count: Number(c.count),
                        }))
                );

                const dailyCurrent = fillDailySeries(
                        dailyCurrentRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
                        monthStart,
                        now
                );
                const dailyPrevious = fillDailySeries(
                        dailyPrevRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
                        prevMonth.start,
                        prevMonth.end
                );

                const alignedPrev = dailyCurrent.map((_, i) => dailyPrevious[i]?.count ?? 0);

                return success({
                        range,
                        revenue7d: fillRevenueSeries(
                                revenue7dRaw.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
                                weekStart,
                                now
                        ),
                        orders7d: fillDailySeries(
                                orders7dRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
                                weekStart,
                                now
                        ),
                        revenueRange: fillRevenueSeries(
                                revenueRangeRaw.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
                                current.start,
                                now
                        ),
                        ordersRange: fillDailySeries(
                                ordersRangeRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
                                current.start,
                                now
                        ),
                        topItems,
                        hourlyDistribution,
                        aovTrend: aovTrendRaw.map((a) => ({ date: a.date, aov: Number(a.aov) })),
                        growthPct,
                        categoryBreakdown,
                        dailyActivity: {
                                current: dailyCurrent,
                                previous: dailyCurrent.map((d, i) => ({ date: d.date, count: alignedPrev[i] ?? 0 })),
                        },
                });
        } catch (e) {
                return handleError(e);
        }
}
