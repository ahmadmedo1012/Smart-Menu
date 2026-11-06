/**
 * P45-W1 (الشريحة 2) — صدق الإحصاءات المتقدمة: قاعدة r93-N5 تُفرض على
 * /api/stats/advanced + حدود يوم طرابلس الموحدة لمساري الإحصاءات.
 *
 * الخلل المرصود (BASELINE P45 §العيوب 1-2): ستة تجميعات SQL خام وعدّادات
 * النمو في /api/stats/advanced بلا أي فلتر حالة — الملغى كان ينفّخ مخطط
 * الإيراد وAOV والتوزيع الساعي وحصص الأقسام وعدّادات النمو مقابل بطاقة
 * KPI (todayRevenue من /api/stats) على الشاشة نفسها؛ وحدود «اليوم/الأسبوع/
 * الشهر» كانت تُحسب بساعة الخادم (UTC على Vercel) لا بيوم طرابلس.
 *
 * العقد بعد الإصلاح:
 *   · كل $queryRaw في المسار المتقدم يحمل ‎AND "status" != 'cancelled'‎
 *     (بادئة o. في استعلام الأقسام) — مطابقة حرفية لاستثناء
 *     revenueAggregate (stats-queries.ts) ونظيره المثبّت في
 *     tests/unit/r93-revenue-cancelled-excluded.test.ts.
 *   · عدّادات النمو (order.count) تحمل status: { not: 'cancelled' }.
 *   · /api/stats: «اليوم» يبدأ عند منتصف ليل طرابلس (tripoliDayBounds) —
 *     ساعة مثبّتة عند 23:30Z تثبت أن البداية 22:00Z (UTC+2) لا 00:00Z.
 *   · rangeBounds('month') وpreviousBounds('month') طرابلسيان (حدود
 *     الشهر بالتقويم الطرابلسي، وقراءة الشهر بالإزاحة الطرابلسية).
 *
 * النمط: r93-revenue-cancelled-excluded.test.ts (vi.hoisted + vi.mock
 * للـprisma والمصادقة) + ساعة مثبّتة (نمط session-absolute-cap: setSystemTime).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { tripoliDayBounds, rangeBounds, previousBounds } from '@/lib/chart-stats';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderAggregate = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        order: {
                count: mockOrderCount,
                findMany: mockOrderFindMany,
                groupBy: mockOrderGroupBy,
                aggregate: mockOrderAggregate,
        },
        orderItem: { groupBy: mockOrderItemGroupBy },
        menuItem: { count: mockMenuItemCount, findMany: mockMenuItemFindMany },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        $queryRaw: mockQueryRaw,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 119, reset: 0 })),
                destroy: () => {},
        }),
}));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 1 as number | null,
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
}));

/* W7-B (G-4): بوابة الخطة — تُفتح افتراضًا (الموجبات هنا ليست البوابة). */
vi.mock('@/lib/plan-entitlements', () => ({
        requirePlanFeature: vi.fn(async () => ({ ok: true, plan: null })),
}));

function makeGetRequest(path: string, restaurantId?: number): NextRequest {
        const url = restaurantId
                ? `http://localhost${path}?restaurantId=${restaurantId}`
                : `http://localhost${path}`;
        return new NextRequest(url, { method: 'GET' });
}

/** إعادة تركيب SQL الخام من استدعاء $queryRaw المكتوم: (strings, ...values). */
function rawSqlOf(call: unknown[]): { sql: string; values: unknown[] } {
        const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];
        return { sql: strings.join('⟨param⟩'), values };
}

/* ساعة مثبّتة: 2026-09-06T23:30:00Z = 2026-09-07 01:30 بتوقيت طرابلس
 * (UTC+2 — نفس اللحظة المرجعية في p43-menu-events.test.ts). منتصف ليل
 * يوم طرابلس الجاري = 2026-09-06T22:00:00.000Z. */
const FIXED_NOW = new Date('2026-09-06T23:30:00Z');

beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
        mockOrderCount.mockResolvedValue(0);
        mockMenuItemCount.mockResolvedValue(0);
        mockOrderItemGroupBy.mockResolvedValue([]);
        mockOrderFindMany.mockResolvedValue([]);
        mockOrderGroupBy.mockResolvedValue([]);
        mockOrderAggregate.mockResolvedValue({ _sum: { total: 0 } });
        mockMenuItemFindMany.mockResolvedValue([]);
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue({ plan: { name: 'Premium', nameAr: 'بريميوم', sortOrder: 3 } });
        mockQueryRaw.mockResolvedValue([]);
});

afterEach(() => {
        vi.useRealTimers();
});

// ── 1. المكتبة النقية: tripoliDayBounds + الحدود الطرابلسية ─────────────

describe('P45-W1 — tripoliDayBounds (إطار يوم طرابلس)', () => {
        it('منتصف ليل طرابلس عند إزاحة UTC+2: 23:30Z → بداية اليوم 22:00Z', () => {
                const { start, end } = tripoliDayBounds(FIXED_NOW);
                expect(start.toISOString()).toBe('2026-09-06T22:00:00.000Z');
                expect(end.toISOString()).toBe('2026-09-06T23:30:00.000Z');
        });

        it('قبل منتصف الليل الطرابلسي: 20:30Z لا يزال في يوم طرابلس السابق', () => {
                const { start } = tripoliDayBounds(new Date('2026-09-06T20:30:00Z'));
                expect(start.toISOString()).toBe('2026-09-05T22:00:00.000Z');
        });
});

describe('P45-W1 — rangeBounds/previousBounds طرابلسية', () => {
        it('week: آخر 7 أيام طرابلسية تبدأ عند منتصف ليل اليوم-6', () => {
                const week = rangeBounds('week', FIXED_NOW);
                expect(week.start.toISOString()).toBe('2026-08-31T22:00:00.000Z');
        });

        it('month: أول الشهر الطرابلسي — Sep 7 طرابلسيًا يعني 2026-08-31T22:00Z', () => {
                const month = rangeBounds('month', FIXED_NOW);
                expect(month.start.toISOString()).toBe('2026-08-31T22:00:00.000Z');
        });

        it('previousBounds(month): الشهر الطرابلسي السابق من منتصف ليل طرابلسي', () => {
                const month = rangeBounds('month', FIXED_NOW);
                const prev = previousBounds('month', month);
                expect(prev.start.toISOString()).toBe('2026-07-31T22:00:00.000Z');
                expect(prev.end.getTime()).toBe(month.start.getTime() - 1);
        });

        it('previousBounds(month) عند حدود السنة: يناير → ديسمبر السابق', () => {
                const jan = rangeBounds('month', new Date('2027-01-15T10:00:00Z'));
                const prev = previousBounds('month', jan);
                expect(prev.start.toISOString()).toBe('2026-11-30T22:00:00.000Z');
        });
});

// ── 2. /api/stats: «اليوم» = يوم طرابلس ────────────────────────────────

describe('P45-W1 — GET /api/stats: حدود اليوم طرابلسية', () => {
        it('todayRevenue/todayOrders يبدآن عند منتصف ليل طرابلس (22:00Z لا 00:00Z)', async () => {
                const { GET } = await import('@/app/api/stats/route');
                const res = await GET(makeGetRequest('/api/stats', 1));
                expect(res.status).toBe(200);

                const aggArgs = mockOrderAggregate.mock.calls[0][0];
                expect(aggArgs.where.createdAt.gte.toISOString()).toBe('2026-09-06T22:00:00.000Z');

                // todayOrders (عدّ مستقل بلا فلتر حالة — القاعدة الموثقة): نطاقه
                // طرابلسي أيضًا (النافذة ليست مسألة حالة).
                const todayCall = mockOrderCount.mock.calls.find(
                        (c: unknown[]) =>
                                (c[0] as { where?: { createdAt?: { gte?: unknown } } } | undefined)?.where?.createdAt
                                        ?.gte instanceof Date
                );
                expect(todayCall).toBeDefined();
                expect(
                        (todayCall![0] as { where: { createdAt: { gte: Date } } }).where.createdAt.gte.toISOString()
                ).toBe('2026-09-06T22:00:00.000Z');
        });

        it('عدّاد الحالة المستقل (statusBreakdown) يبقى بلا فلتر — القاعدة لا تُمسّ', async () => {
                const { GET } = await import('@/app/api/stats/route');
                await GET(makeGetRequest('/api/stats', 1));
                const statusArgs = mockOrderGroupBy.mock.calls[0][0];
                expect(JSON.stringify(statusArgs.where)).not.toContain('cancelled');
        });
});

// ── 3. /api/stats/advanced: قاعدة r93-N5 على كل تجميع خام ───────────────

describe('P45-W1 — GET /api/stats/advanced: كل SQL خام يستثني الملغى (r93-N5)', () => {
        it('تسعة استعلامات $queryRaw وكلها تحمل فلتر الحالة', async () => {
                const { GET } = await import('@/app/api/stats/advanced/route');
                const res = await GET(makeGetRequest('/api/stats/advanced', 1));
                expect(res.status).toBe(200);

                expect(mockQueryRaw).toHaveBeenCalledTimes(9);
                for (const call of mockQueryRaw.mock.calls) {
                        const { sql, values } = rawSqlOf(call);
                        expect(sql).toContain('"status" !=');
                        expect(values).toContain('cancelled');
                }
        });

        it('استعلام الأقسام يفلتر على حالة الطلب (o."status") لا على جدول آخر', async () => {
                const { GET } = await import('@/app/api/stats/advanced/route');
                await GET(makeGetRequest('/api/stats/advanced', 1));
                const categoryCall = mockQueryRaw.mock.calls.find(
                        (c: unknown[]) => rawSqlOf(c).sql.includes('"MenuCategory"')
                );
                expect(categoryCall).toBeDefined();
                const { sql, values } = rawSqlOf(categoryCall!);
                expect(sql).toContain('o."status" !=');
                expect(values).toContain('cancelled');
        });

        it('عدّادات النمو (current/prev) تستثني الملغى', async () => {
                const { GET } = await import('@/app/api/stats/advanced/route');
                await GET(makeGetRequest('/api/stats/advanced', 1));
                expect(mockOrderCount).toHaveBeenCalledTimes(2);
                for (const call of mockOrderCount.mock.calls) {
                        expect((call[0] as { where: { status: unknown } }).where).toMatchObject({
                                status: { not: 'cancelled' },
                        });
                }
        });

        it('الإيراد وأصنافه الرائجة كانا مفلترين أصلًا — يبقيان (نمط r93)', async () => {
                const { GET } = await import('@/app/api/stats/advanced/route');
                await GET(makeGetRequest('/api/stats/advanced', 1));
                for (const call of mockOrderItemGroupBy.mock.calls) {
                        expect((call[0] as { where: { order: { status: unknown } } }).where.order).toMatchObject({
                                status: { not: 'cancelled' },
                        });
                }
        });

        it('نافذة «7 أيام» = 7 أيام طرابلسية تبدأ عند منتصف ليل اليوم-6', async () => {
                const { GET } = await import('@/app/api/stats/advanced/route');
                await GET(makeGetRequest('/api/stats/advanced', 1));
                // الاستدعاء الأول = revenue7d: values = [restaurantId, weekStart, 'cancelled']
                const { values } = rawSqlOf(mockQueryRaw.mock.calls[0]);
                const weekStart = values.find((v): v is Date => v instanceof Date);
                expect(weekStart).toBeDefined();
                expect(weekStart!.toISOString()).toBe('2026-08-31T22:00:00.000Z');
        });

        it('حدود النطاق (range=month) طرابلسية: أول الشهر 2026-08-31T22:00Z', async () => {
                const { GET } = await import('@/app/api/stats/advanced/route');
                await GET(makeGetRequest('/api/stats/advanced', 1));
                // revenueRange (الاستدعاء الثالث): values = [restaurantId, current.start, 'cancelled']
                const { values } = rawSqlOf(mockQueryRaw.mock.calls[2]);
                const rangeStart = values.find(
                        (v) => v instanceof Date && v.getTime() === new Date('2026-08-31T22:00:00.000Z').getTime()
                );
                expect(rangeStart).toBeDefined();
        });
});
