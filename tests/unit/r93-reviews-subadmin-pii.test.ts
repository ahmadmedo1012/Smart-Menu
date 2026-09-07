/**
 * r93-W1a (M1 / MED-1 — تقرير التفتيش round93-inspection-b) — إغلاق بقية
 * عائلة r92-B1: بوابة PII المراجعات لـ sub_admin.
 *
 * الخلل: src/app/api/items/[id]/reviews/route.ts (السطر ~56 قبل الإصلاح) كان
 * يمنح isOwner=true لأي sub_admin بمجرد الدور — بلا فحص إذن — فيضيف
 * customerName/customerPhone إلى select الرد ويقرأ sub_admin بأذونات صفرية
 * أسماء وأرقام هواتف مُقيّمي كل مطاعم المنصة عبر أرقام أصناف متتالية.
 *
 * المصفوفة الجديدة (نفس فلسفة r92-B1: sub_admin بلا إذن → لا PII):
 *   - sub_admin صفر أذونات (وبلا ربط ملكية) → لا أسماء/هواتف في الاستجابة
 *   - sub_admin بإذن غير ذي صلة (APPROVE_ORDERS) أو أذونات غير معرّفة
 *     (شكل قديم) → لا PII (fail-closed)
 *   - sub_admin بإذن VIEW_ANALYTICS → يرى (نفس بوابة restaurants/[id]:88-90
 *     و stats-queries r92-B1)
 *   - sub_admin صفر أذونات + ربط UserRestaurant فعلي → يرى مطعمه فقط
 *   - owner مرتبط → يرى (رحلة المالك الشرعي دون كسر — round90-F3)
 *   - admin / super_admin → يرون (ثقة كاملة — دون تغيير)
 *   - USER / مجهول → 200 بلا PII (القراءة العامة محفوظة: ReviewSheet في
 *     صفحة المنيو العامة تستدعي هذا المسار للزبائن المسجلين وغير المسجلين
 *     على حد سواء — الحماية هنا إخفاء PII لا حجب الوصول، كما في round-77)
 *
 * النمط: نفس منكَّرات reviews-atomic-pii.test.ts (mock prisma + auth holder).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));

const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockReviewFindMany = vi.hoisted(() => vi.fn());
const mockReviewAggregate = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
        menuItem: { findUnique: mockMenuItemFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        review: { findMany: mockReviewFindMany, aggregate: mockReviewAggregate },
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(async () => authHolder.value) }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 99, reset: 0 })),
                destroy: () => {},
        }),
}));

// ── Personas / fixtures ─────────────────────────────────────────────────

const SUB_ADMIN = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 3, permissions: [] as string[] };
const ADMIN = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };
const SUPER_ADMIN = { authorized: true, role: 'super_admin', restaurantId: null, userId: 2, permissions: [] };
const OWNER = { authorized: true, role: 'owner', restaurantId: 7, userId: 10, permissions: [] };
const USER = { authorized: true, role: 'USER', restaurantId: null, userId: 55, permissions: [] };
const ANON = { authorized: false, role: null, restaurantId: null, userId: null, permissions: [] };

/** الصنف 55 تابع لمطعم 7 (مطعم OWNER الأساسي). */
const ITEM_R7 = { id: 55, category: { restaurantId: 7 } };

/** صف مراجعة «كامل من DB» — المنكَّر يقصّ الحقول وفق select كما تفعل Prisma. */
const REVIEW_ROW = {
        id: 1,
        rating: 5,
        comment: 'ممتاز',
        menuItemId: 55,
        createdAt: new Date('2026-09-01T10:00:00Z'),
        customerName: 'زبون سري',
        customerPhone: '0911111111',
};

function reviewRowsRespectingSelect() {
        mockReviewFindMany.mockImplementation(async (args: { select?: Record<string, boolean> }) => {
                const select = args?.select;
                if (!select) return [REVIEW_ROW];
                // محاكاة select الحقيقي: فقط الحقول المطلوبة تعود
                const projected = Object.fromEntries(
                        Object.entries(REVIEW_ROW).filter(([k]) => select[k] === true),
                );
                return [projected];
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...SUB_ADMIN };
        mockMenuItemFindUnique.mockResolvedValue({ ...ITEM_R7 });
        mockUserRestaurantFindUnique.mockResolvedValue(null); // بلا روابط افتراضيًا
        reviewRowsRespectingSelect();
        mockReviewAggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 11 });
});

async function getReviews(itemId = 55) {
        const { GET } = await import('@/app/api/items/[id]/reviews/route');
        return GET(
                new NextRequest(`http://localhost/api/items/${itemId}/reviews`),
                { params: Promise.resolve({ id: String(itemId) }) }
        );
}

/** يقرأ الاستجابة ويعيد { status, json, row } للصف الأول. */
async function readReviews(itemId?: number) {
        const res = await getReviews(itemId);
        const json = await res.json();
        return { status: res.status, json, row: json?.data?.[0] };
}

// ── sub_admin — البوابة الجديدة ─────────────────────────────────────────

describe('r93-W1a — GET /api/items/[id]/reviews: بوابة sub_admin PII', () => {
        it('sub_admin صفر أذونات (بلا ربط) → 200 بلا أسماء/هواتف في الاستجابة', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: [] };

                const { status, row } = await readReviews();

                expect(status).toBe(200);
                // القراءة العامة سليمة (الصف موجود) لكن PII مقصوص من select ومن الاستجابة
                expect(row).toMatchObject({ id: 1, rating: 5, comment: 'ممتاز' });
                expect(row).not.toHaveProperty('customerName');
                expect(row).not.toHaveProperty('customerPhone');
                const select = mockReviewFindMany.mock.calls[0][0].select;
                expect(select.customerName).toBeUndefined();
                expect(select.customerPhone).toBeUndefined();
        });

        it('sub_admin بإذن غير ذي صلة (APPROVE_ORDERS) → لا يزال بلا PII', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: ['APPROVE_ORDERS'] };

                const { row } = await readReviews();

                expect(row).not.toHaveProperty('customerName');
                expect(row).not.toHaveProperty('customerPhone');
        });

        it('sub_admin بدون حقل permissions إطلاقًا (شكل قديم) → لا PII (fail-closed)', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 3 };

                const { row } = await readReviews();

                expect(row).not.toHaveProperty('customerName');
        });

        it('sub_admin بإذن VIEW_ANALYTICS → يرى الـ PII (نفس بوابة restaurants/[id])', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: ['VIEW_ANALYTICS'] };

                const { status, row } = await readReviews();

                expect(status).toBe(200);
                expect(row).toMatchObject({ customerName: 'زبون سري', customerPhone: '0911111111' });
                // الإذن يسبق فحص الملكية: لا استعلام ملكية إطلاقًا
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('sub_admin صفر أذونات + ربط UserRestaurant فعلي → يرى مطعمه فقط (الرابط يُفحص بمفتاحه الصحيح)', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: [] };
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 3, restaurantId: 7 });

                const { status, row } = await readReviews();

                expect(status).toBe(200);
                expect(row).toMatchObject({ customerName: 'زبون سري', customerPhone: '0911111111' });
                // الرابط لمطعم الصنف نفسه (itemId → menuItem.category.restaurantId)
                expect(mockMenuItemFindUnique).toHaveBeenCalledWith({
                        where: { id: 55 },
                        select: { category: { select: { restaurantId: true } } },
                });
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 3, restaurantId: 7 } },
                });
        });

        it('sub_admin صفر أذونات و الصنف غير موجود → لا PII ولا رابط (لا ينهار المسار)', async () => {
                mockMenuItemFindUnique.mockResolvedValue(null);

                const { status, row } = await readReviews(999);

                expect(status).toBe(200);
                expect(row).not.toHaveProperty('customerName');
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });
});

// ── الرحلات الشرعية — دون كسر ───────────────────────────────────────────

describe('r93-W1a — الرحلات الشرعية محفوظة', () => {
        it('owner مرتبط بمطعم الصنف → يرى الـ PII (رحلة المالك دون تغيير)', async () => {
                authHolder.value = { ...OWNER };

                const { status, row, json } = await readReviews();

                expect(status).toBe(200);
                expect(row).toMatchObject({ customerName: 'زبون سري', customerPhone: '0911111111' });
                // شكل الاستجابة للمالك الشرعي كما هو: success/stats/meta
                expect(json.success).toBe(true);
                expect(json.stats).toEqual({ avgRating: 4.5, totalCount: 11 });
                expect(json.meta).toMatchObject({ total: 11, page: 1 });
        });

        it('owner غير مرتبط بمطعم الصنف → PII مقصوص (round-77 دون كسر)', async () => {
                authHolder.value = { ...OWNER, restaurantId: 999 };

                const { row } = await readReviews();

                expect(row).not.toHaveProperty('customerName');
        });

        it('admin → يرى الـ PII دون فحص روابط (ثقة كاملة — دون تغيير)', async () => {
                authHolder.value = { ...ADMIN };

                const { row } = await readReviews();

                expect(row).toMatchObject({ customerName: 'زبون سري' });
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
        });

        it('super_admin → يرى الـ PII (دون تغيير)', async () => {
                authHolder.value = { ...SUPER_ADMIN };

                const { row } = await readReviews();

                expect(row).toMatchObject({ customerPhone: '0911111111' });
        });

        it('USER → 200 بلا PII (القراءة العامة محفوظة — نفس المجهول)', async () => {
                authHolder.value = { ...USER };

                const { status, row } = await readReviews();

                expect(status).toBe(200);
                expect(row).toMatchObject({ id: 1, rating: 5 });
                expect(row).not.toHaveProperty('customerName');
                expect(row).not.toHaveProperty('customerPhone');
        });

        it('مجهول → 200 بلا PII (دون تغيير)', async () => {
                authHolder.value = { ...ANON };

                const { status, row } = await readReviews();

                expect(status).toBe(200);
                expect(row).not.toHaveProperty('customerName');
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
        });
});
