/**
 * P43 SM-2/SM-3 — عقود GET /api/stats/engagement (تحليلات التفاعل).
 *
 * بلا شبكة وبلا قاعدة حقيقية — prisma مُنكَّر، وrequirePlanFeature /
 * resolveRestaurantScope قابلان للتوجيه (نمط p42-5d للحوار حول البوابة).
 * الحالات:
 *   * الطبقة المجانية (البوابة مغلقة): الملخص فقط — عدّادات + سلسلة 7
 *     أيام + أعلى الأصناف، وصفر استعلامات الطبقة التفصيلية
 *   * الطبقة التفصيلية (advancedStats): مصطلحات البحث + عدّاد «نتائج صفر»
 *     التقريبي + قمع «مشاهدة ← طلب» بأعداد فقط
 *   * السلسلة اليومية مملوءة بالأصفار (fillDailyEventSeries عبر المسار)
 *   * حد المعدل 429 وغير المصوّر 401
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockCount = vi.hoisted(() => vi.fn());
const mockGroupBy = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockResolveScope = vi.hoisted(() => vi.fn());
const mockRequirePlanFeature = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        menuEvent: { count: mockCount, groupBy: mockGroupBy },
        order: { count: mockOrderCount },
        menuItem: { findMany: mockMenuItemFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({ requireAuth: mockRequireAuth }));
vi.mock('@/lib/stats-queries', () => ({ resolveRestaurantScope: mockResolveScope }));
vi.mock('@/lib/plan-entitlements', () => ({ requirePlanFeature: mockRequirePlanFeature }));

const engagementRoute = await import('@/app/api/stats/engagement/route');
const { lastTripoliDays } = await import('@/lib/menu-events');

// ── أدوات مساعدة ───────────────────────────────────────────────────────

const req = () => new NextRequest('http://localhost/api/stats/engagement?restaurantId=5');

async function callGet() {
        return engagementRoute.GET(req());
}

const days7 = lastTripoliDays(7);

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 59, reset: 0 });
        mockRequireAuth.mockResolvedValue({ authorized: true, role: 'owner', userId: 1, restaurantId: 5, permissions: [] });
        mockResolveScope.mockResolvedValue({ ok: true, restaurantId: 5 });
        // البوابة مفتوحة افتراضيًا (بريميوم) — اختبارات الطبقة المجانية تُغلقها
        mockRequirePlanFeature.mockResolvedValue({ ok: true, plan: 'premium' });
        // العدّادات: view 7ي=11 / 28ي=29 (يُميَّز بحد day.gte)، qr=4، item_open=6
        mockCount.mockImplementation(async (args: { where: { eventType: string; day?: { gte: string } } }) => {
                const et = args.where.eventType;
                if (et === 'view') return args.where.day?.gte === days7[0] ? 11 : 29;
                if (et === 'qr_scan') return 4;
                return 6; // item_open
        });
        // groupBy: سلسلة المشاهدات (يومان فقط لهما بيانات) ثم أعلى الأصناف
        mockGroupBy.mockImplementation(async (args: { by: string[] }) => {
                if (args.by[0] === 'day') {
                        return [
                                { day: days7[2], _count: { _all: 3 } },
                                { day: days7[5], _count: { _all: 8 } },
                        ];
                }
                if (args.by[0] === 'itemKey') {
                        return [{ itemKey: 'كابتشينو', _count: 5 }, { itemKey: 'شاي', _count: 2 }];
                }
                return [{ searchTerm: 'قهوة', _count: 4 }, { searchTerm: 'بيتزا', _count: 1 }];
        });
        mockOrderCount.mockResolvedValue(9);
        mockMenuItemFindMany.mockResolvedValue([
                { name: 'Cappuccino', nameAr: 'كابتشينو', description: '', descriptionAr: 'قهوة' },
        ]);
});

describe('GET /api/stats/engagement — البوابة والنطاق', () => {
        it('غير مصوّر → 401 وصفر استعلامات', async () => {
                mockRequireAuth.mockResolvedValue({ authorized: false });
                const res = await callGet();
                expect(res.status).toBe(401);
                expect(mockCount).not.toHaveBeenCalled();
        });

        it('حد المعدل → 429', async () => {
                mockRateCheck.mockResolvedValue({ success: false });
                const res = await callGet();
                expect(res.status).toBe(429);
        });

        it('نطاق مستأجر مرفوض (owner لا يملك المطعم) → يمرر رد الرفض كما هو', async () => {
                mockResolveScope.mockResolvedValue({ ok: false, response: new Response('denied', { status: 403 }) });
                const res = await callGet();
                expect(res.status).toBe(403);
        });
});

describe('GET /api/stats/engagement — الطبقة المجانية (البوابة مغلقة)', () => {
        it('tier=summary: العدّادات + السلسلة + أعلى الأصناف — بلا مصطلحات بحث ولا قمع', async () => {
                mockRequirePlanFeature.mockResolvedValue({ ok: false, response: new Response('locked', { status: 403 }) });

                const res = await callGet();
                expect(res.status).toBe(200);
                const json = await res.json();

                expect(json.data.tier).toBe('summary');
                expect(json.data.views7d).toBe(11);
                expect(json.data.views28d).toBe(29);
                expect(json.data.qrScans7d).toBe(4);
                expect(json.data.itemOpens7d).toBe(6);
                // أعلى الأصناف = جزء من الملخص المجاني (قرار الطبقات)
                expect(json.data.topViewedItems).toEqual([
                        { key: 'كابتشينو', count: 5 },
                        { key: 'شاي', count: 2 },
                ]);
                // الطبقة التفصيلية غائبة تمامًا
                expect(json.data.topSearchTerms).toBeUndefined();
                expect(json.data.funnel).toBeUndefined();
                expect(json.data.zeroResultSearches).toBeUndefined();

                // البوابة استُدعيت بadvancedStats على المطعم المحسوب
                expect(mockRequirePlanFeature).toHaveBeenCalledWith(expect.anything(), 5, 'advancedStats');
                // صفر استعلامات الطبقة التفصيلية (بحث/طلبات/أصناف)
                expect(mockOrderCount).not.toHaveBeenCalled();
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
                const groupByTargets = mockGroupBy.mock.calls.map((c) => c[0].by[0]);
                expect(groupByTargets).not.toContain('searchTerm');
        });

        it('السلسلة اليومية 7 أيام مملوءة بالأصفار (اليوم الأخير آخر عنصر)', async () => {
                mockRequirePlanFeature.mockResolvedValue({ ok: false, response: new Response('locked', { status: 403 }) });
                const res = await callGet();
                const json = await res.json();

                expect(json.data.viewsSeries7d).toHaveLength(7);
                expect(json.data.viewsSeries7d[6].day).toBe(days7[6]);
                // يوم بلا صف → صفر (لا فجوات في محور الرسم)
                expect(json.data.viewsSeries7d[0]).toEqual({ day: days7[0], count: 0 });
                expect(json.data.viewsSeries7d[2]).toEqual({ day: days7[2], count: 3 });
                expect(json.data.viewsSeries7d[5]).toEqual({ day: days7[5], count: 8 });
        });
});

describe('GET /api/stats/engagement — الطبقة التفصيلية (advancedStats)', () => {
        it('tier=detailed: مصطلحات البحث + عدّاد «نتائج صفر» التقريبي + قمع أعداد فقط', async () => {
                const res = await callGet();
                expect(res.status).toBe(200);
                const json = await res.json();

                expect(json.data.tier).toBe('detailed');
                // الملخص يبقى حاضرًا (استهلاك موحّد بين الطبقتين)
                expect(json.data.views7d).toBe(11);
                expect(json.data.topViewedItems).toHaveLength(2);

                expect(json.data.topSearchTerms).toEqual([
                        { term: 'قهوة', count: 4 },
                        { term: 'بيتزا', count: 1 },
                ]);
                // «بيتزا» لا تطابق أي صنف في المنيو المصغّر → عدّاد تقريبي = 1
                expect(json.data.zeroResultSearches).toBe(1);
                expect(json.data.zeroResultsApproximate).toBe(true);
                // القمع: أعداد فقط — لا نسب تحويل
                expect(json.data.funnel).toEqual({ views7d: 11, orders7d: 9 });
                expect(JSON.stringify(json.data.funnel)).not.toContain('%');
        });

        it('استعلامات الطبقة التفصيلية تُنفَّذ (طلبات 7 أيام + أصناف المنيو للمطابقة)', async () => {
                await callGet();
                expect(mockOrderCount).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: expect.objectContaining({ restaurantId: 5 }),
                        }),
                );
                expect(mockMenuItemFindMany).toHaveBeenCalledWith({
                        where: {
                                archivedAt: null,
                                category: { is: { restaurantId: 5, isActive: true } },
                        },
                        select: { name: true, nameAr: true, description: true, descriptionAr: true },
                });
        });
});
