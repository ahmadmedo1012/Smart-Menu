/**
 * r93-N5 (F9/M-4 من تقرير التفتيش 1-c) — تعريف الإيراد الموحّد: الطلبات
 * الملغاة لا تدخل الإيراد ولا الأصناف الرائجة.
 *
 * الخلل: revenueAggregate (stats-queries.ts) وpopularItemsQuery كانا يجمعان
 * كل الحالات بلا فلتر — فلوحة المالك تقول إيراد اليوم = X (يشمل الملغاة)
 * بينما ولاء totalSpent (orders/[id]) يجمع المكتملة فقط → رقمان ماليان
 * متعارضان لنفس اليوم.
 *
 * القرار الموثّق (في تعليق عربي داخل stats-queries.ts): استثناء الملغاة
 * فقط — طلبات اليوم الجارية (new/preparing/ready) مالٌ في طريقه فيُدرج في
 * الإيراد، والإيراد «المؤكد» (المكتملة) يبقى مسؤولية تعريف الولاء وحده.
 * عدّاد الملغاة المستقل (statusBreakdown في stats route) لا يُمسّ إطلاقًا
 * (تحذير التكليف) — الاختبار يثبت بقاؤه بلا فلتر حالة.
 *
 * النمط: stats-permission.test.ts (vi.hoisted + vi.mock للـprisma و
 * @/lib/auth — تُستورد الدوال/المسارات الحقيقية).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderAggregate = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

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

import { popularItemsQuery, revenueAggregate } from '@/lib/stats-queries';

function makeGetRequest(restaurantId?: number): NextRequest {
        const url = restaurantId
                ? `http://localhost/api/stats?restaurantId=${restaurantId}`
                : 'http://localhost/api/stats';
        return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1 };
        mockOrderCount.mockResolvedValue(0);
        mockMenuItemCount.mockResolvedValue(0);
        mockOrderItemGroupBy.mockResolvedValue([]);
        mockOrderFindMany.mockResolvedValue([]);
        mockOrderGroupBy.mockResolvedValue([
                { status: 'completed', _count: 3 },
                { status: 'cancelled', _count: 1 },
        ]);
        // الإيراد كما سيرجعه التجميع بعد الفلتر: طلب مكتمل 100 وملغى 100 →
        // المجموع الفعال 100 فقط (الملغى استُثني من الاستعلام نفسه)
        mockOrderAggregate.mockResolvedValue({ _sum: { total: 100 } });
        mockMenuItemFindMany.mockResolvedValue([{ id: 9, name: 'قهوة' }]);
        mockUserRestaurantFindUnique.mockResolvedValue(null);
});

// ── بنّاء الاستعلامات (وحدة نقية) ──────────────────────────────────────

describe('r93-N5 — revenueAggregate يستثني الملغاة', () => {
        it('where يتضمن status: { not: "cancelled" } مع النطاق والفترة', () => {
                const since = new Date('2026-09-07T00:00:00Z');
                const args = revenueAggregate({ restaurantId: 5, since });
                expect(args.where).toMatchObject({
                        restaurantId: 5,
                        status: { not: 'cancelled' },
                        createdAt: { gte: since },
                });
                expect(args._sum).toEqual({ total: true });
        });

        it('بلا مطعم (لوحة الأدمن) الفلتر يبقى: platform-wide بلا ملغاة', () => {
                const args = revenueAggregate({ since: new Date(), withCount: true });
                expect(args.where).toMatchObject({ status: { not: 'cancelled' } });
                expect(args._count).toBe(true);
        });
});

describe('r93-N5 — popularItemsQuery يستثني ملغاة الطلبات', () => {
        it('where.order يتضمن status: { not: "cancelled" } مع المطعم والفترة', () => {
                const since = new Date('2026-09-07T00:00:00Z');
                const args = popularItemsQuery({ restaurantId: 5, since, take: 10 });
                expect(args.where).toMatchObject({
                        order: {
                                status: { not: 'cancelled' },
                                restaurantId: 5,
                                createdAt: { gte: since },
                        },
                });
                expect(args.take).toBe(10);
        });

        it('حتى بلا نطاق (استدعاء الأدمن) الحالة تُفحص دائمًا', () => {
                const args = popularItemsQuery({ take: 15 });
                expect(args.where).toMatchObject({ order: { status: { not: 'cancelled' } } });
        });
});

// ── المسار الحقيقي: /api/stats (لوحة المالك) ───────────────────────────

describe('r93-N5 — GET /api/stats: الملغى خارج الإيراد/الرائج وداخل عدّاده', () => {
        it('طلب ملغى بمبلغ 100 → لا يدخل الإيراد: الاستعلام يُبنى بفلتر status not cancelled', async () => {
                const { GET } = await import('@/app/api/stats/route');
                const res = await GET(makeGetRequest(1));
                expect(res.status).toBe(200);

                // الإيراد: التجميع الذي يمر للـprisma يحمل الفلتر (قبل أي تنفيذ)
                expect(mockOrderAggregate).toHaveBeenCalledTimes(1);
                const aggArgs = mockOrderAggregate.mock.calls[0][0];
                expect(aggArgs.where).toMatchObject({
                        restaurantId: 1,
                        status: { not: 'cancelled' },
                });

                // القيمة المعروضة تمر كما رجعها التجميع المفلتر (100 لا 200)
                const json = await res.json();
                expect(json.data.todayRevenue).toBe(100);
        });

        it('الأصناف الرائجة: groupBy يُبنى بفلتر الحالة على order', async () => {
                const { GET } = await import('@/app/api/stats/route');
                await GET(makeGetRequest(1));
                const groupArgs = mockOrderItemGroupBy.mock.calls[0][0];
                expect(groupArgs.where).toMatchObject({
                        order: {
                                status: { not: 'cancelled' },
                                restaurantId: 1,
                        },
                });
        });

        it('عدّاد الملغاة المستقل (statusBreakdown) يبقى بلا فلتر حالة — لا يُمسّ (تحذير التكليف)', async () => {
                const { GET } = await import('@/app/api/stats/route');
                const res = await GET(makeGetRequest(1));
                const json = await res.json();

                // عدادات الحالة تُجمَّع بلا فلتر: الملغى يظهر فيها
                expect(json.data.statusBreakdown).toEqual({ completed: 3, cancelled: 1 });
                const statusArgs = mockOrderGroupBy.mock.calls[0][0];
                expect(statusArgs.where).toEqual({ restaurantId: 1 });
                expect(JSON.stringify(statusArgs.where)).not.toContain('cancelled');
        });
});
