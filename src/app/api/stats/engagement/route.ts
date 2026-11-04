import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { resolveRestaurantScope } from '@/lib/stats-queries';
import { requirePlanFeature } from '@/lib/plan-entitlements';
import { normalizeArabic } from '@/lib/format';
import {
        eventCountQuery,
        eventSeriesQuery,
        hydrateEventSeries,
        topItemKeysQuery,
        hydrateItemKeyRows,
        topSearchTermsQuery,
        hydrateSearchTermRows,
        lastTripoliDays,
        fillDailyEventSeries,
        countZeroResultTerms,
} from '@/lib/menu-events';

/**
 * P43 SM-2 — تحليلات التفاعل للمالك (GET /api/stats/engagement).
 *
 * طبقتان (متوافقتان مع بوابات W7-B القائمة — لا بوابات جديدة):
 *   * ملخص (كل الخطط، حتى المجانية): مشاهدات 7/28 يومًا + السلسلة اليومية
 *     7 أيام + أعلى الأصناف مشاهدة + مسحات QR 7 أيام — يغذي بطاقة KPI
 *     «مشاهدات القائمة (7 أيام)» وقسم «التفاعل» في تبويب التحليلات.
 *   * تفصيلي (بوابة «إحصائيات متقدمة» advancedStats — بريميوم فأعلى، نفس
 *     requirePlanFeature في /api/stats/advanced): أعلى مصطلحات البحث مع
 *     عدّاد «نتائج صفر» التقريبي + بطاقة القمع «مشاهدة ← طلب فعلي»
 *     (أعداد فقط، لا نسب تحويل مزعومة).
 *
 * الأمان: resolveRestaurantScope (نفس عائلة stats — owner عبر UserRestaurant،
 * sub_admin بVIEW_ANALYTICS) + 60/min لكل مستخدم. كل الاستعلامات
 * restaurantId-scoped على فهرس (restaurantId, eventType, day).
 */

const engagementLimiter = createDbRateLimiter({ windowMs: 60_000, max: 60 });

export async function GET(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const { success: allowed } = await engagementLimiter.check(`engagement:${auth.userId}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const { searchParams } = new URL(request.url);
                const scope = await resolveRestaurantScope(auth, searchParams);
                if (!scope.ok) return scope.response;
                const { restaurantId } = scope;

                const now = new Date();
                const days7 = lastTripoliDays(7, now);
                const days28 = lastTripoliDays(28, now);
                const since7 = days7[0];
                const since28 = days28[0];

                /* ── الطبقة 1: الملخص (مجاني) — العدّادات + السلسلة + الأعلى ── */
                const [views7, views28, qrScans7, itemOpens7, viewsSeriesRaw, topItemRows] =
                        await Promise.all([
                                prisma.menuEvent.count(
                                        eventCountQuery({ restaurantId, eventType: 'view', sinceDay: since7 }),
                                ),
                                prisma.menuEvent.count(
                                        eventCountQuery({ restaurantId, eventType: 'view', sinceDay: since28 }),
                                ),
                                prisma.menuEvent.count(
                                        eventCountQuery({ restaurantId, eventType: 'qr_scan', sinceDay: since7 }),
                                ),
                                prisma.menuEvent.count(
                                        eventCountQuery({ restaurantId, eventType: 'item_open', sinceDay: since7 }),
                                ),
                                prisma.menuEvent.groupBy(
                                        eventSeriesQuery({ restaurantId, eventType: 'view', sinceDay: since7 }),
                                ),
                                prisma.menuEvent.groupBy(topItemKeysQuery(restaurantId, since7, 10)),
                        ]);

                const summary = {
                        tier: 'summary' as const,
                        views7d: views7,
                        views28d: views28,
                        qrScans7d: qrScans7,
                        itemOpens7d: itemOpens7,
                        viewsSeries7d: fillDailyEventSeries(days7, hydrateEventSeries(viewsSeriesRaw)),
                        topViewedItems: hydrateItemKeyRows(topItemRows),
                };

                /* ── الطبقة 2: التفصيلي — بوابة advancedStats (بريميوم فأعلى) ── */
                const gate = await requirePlanFeature(auth, restaurantId, 'advancedStats');
                if (!gate.ok) {
                        return success(summary);
                }

                const [topSearchRows, orders7d, menuItems] = await Promise.all([
                        prisma.menuEvent.groupBy(topSearchTermsQuery(restaurantId, since7, 10)),
                        prisma.order.count({
                                where: { restaurantId, createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
                        }),
                        prisma.menuItem.findMany({
                                where: {
                                        archivedAt: null,
                                        category: { is: { restaurantId, isActive: true } },
                                },
                                select: { name: true, nameAr: true, description: true, descriptionAr: true },
                        }),
                ]);

                const topSearches = hydrateSearchTermRows(topSearchRows);
                const zeroResultSearches = countZeroResultTerms(topSearches, menuItems, normalizeArabic);

                return success({
                        ...summary,
                        tier: 'detailed' as const,
                        topSearchTerms: topSearches,
                        zeroResultSearches,
                        zeroResultsApproximate: true,
                        /* بطاقة القمع: أعداد صادقة فقط — «مشاهدة» ← «طلب فعلي».
                         * لا نسب تحويل كنِسب مئوية (مقامات مختلطة تُوهم الدقة). */
                        funnel: {
                                views7d: views7,
                                orders7d,
                        },
                });
        } catch (e) {
                return handleError(e);
        }
}
