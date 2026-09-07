/**
 * round92-C7 (agent 3-c) — CRUD/RBAC unit coverage for
 * GET /api/owner/reviews (was 0% lcov, lines 9-88).
 *
 * The owner's review inbox (customer PII: customerName/customerPhone of
 * reviewers) with server-side stats. The handler runs for real; boundaries
 * mocked: prisma via vi.hoisted, @/lib/auth holder honoring the
 * requireRestaurant option, @/lib/subscription-guard holder mirroring the
 * real semantics (staff bypass, owner checked). What these tests protect:
 *   - tenant scoping: the prisma where ALWAYS derives from the session
 *     restaurant (or a UserRestaurant-link-verified requested one) — a
 *     client-supplied restaurantId alone never reaches the query
 *   - reviewer PII only reaches an authenticated, restaurant-bound,
 *     subscription-active caller (this route answers 401 'Unauthorized'
 *     with its OWN English envelope, unlike the error() helper routes)
 *   - round87-C5: stats (total/avg/distribution) are computed over the FULL
 *     tenant set, independent of the star filter applied to the rows
 *   - minRating is validated (1-5) and silently ignored when garbage
 * Behavior pinned as-is (reported, not fixed): (1) there is NO moderation
 * (approve/reject) handler on this route at all — review states live in the
 * public reviews route; (2) the gate is restaurantId+subscription, NOT the
 * owner role — any session with a non-null restaurantId (e.g. a USER whose
 * role was changed without clearing the column) passes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockReviewFindMany = vi.hoisted(() => vi.fn());
const mockReviewCount = vi.hoisted(() => vi.fn());
const mockReviewAggregate = vi.hoisted(() => vi.fn());
const mockReviewGroupBy = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        review: { findMany: mockReviewFindMany, count: mockReviewCount, aggregate: mockReviewAggregate, groupBy: mockReviewGroupBy },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// Mirrors src/lib/subscription-guard.isOwnerSubscriptionActive: staff roles
// bypass; everyone else (owner/USER) is at the mercy of the holder flag.
const subHolder = vi.hoisted(() => ({ active: true }));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async (auth: { role: string }) =>
                ['super_admin', 'sub_admin', 'admin'].includes(auth.role) ? true : subHolder.active),
}));

interface AuthShape {
        authorized: boolean;
        userId: number | null;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                userId: 10 as number | null,
                role: 'owner' as string,
                restaurantId: 5 as number | null,
                subscriptionStatus: 'active' as string | null,
                permissions: [] as string[],
        },
}));

// requireAuth holder honoring the requireRestaurant option (real contract:
// authorized but no restaurantId → not authorized at all for this route)
vi.mock('@/lib/auth', () => ({
        requireAuth: async (opts?: { requireRestaurant?: boolean }) => {
                const v = authHolder.value;
                if (!v.authorized) return { authorized: false as const };
                if (opts?.requireRestaurant && v.restaurantId == null) return { authorized: false as const };
                return { ...v, authorized: true as const };
        },
}));

// ── Personas ─────────────────────────────────────────────────────────────

const persona = (o: Partial<AuthShape>): AuthShape => ({
        authorized: true,
        userId: 10,
        role: 'owner',
        restaurantId: 5,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const GUEST = persona({ authorized: false, userId: null });
const OWNER_A = persona({ userId: 10, role: 'owner', restaurantId: 5 });
const OWNER_NO_RESTAURANT = persona({ userId: 11, role: 'owner', restaurantId: null });
const ADMIN = persona({ userId: 1, role: 'admin', restaurantId: null });
const USER_BOUND = persona({ userId: 55, role: 'USER', restaurantId: 5 });

// ── Route invocation helper ─────────────────────────────────────────────

async function callGet(query = '') {
        const { GET } = await import('@/app/api/owner/reviews/route');
        return GET(new NextRequest(`http://localhost/api/owner/reviews${query}`));
}

const REVIEW_ROW = {
        id: 101,
        rating: 5,
        comment: 'ممتاز',
        customerName: 'زبون',
        customerPhone: '0911111111',
        menuItemId: 9,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        menuItem: { id: 9, name: 'Shawarma', nameAr: 'شاورما' },
};

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = persona(OWNER_A);
        subHolder.active = true;
        // Default: NO UserRestaurant links → foreign restaurantId 403s
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockReviewFindMany.mockResolvedValue([REVIEW_ROW]);
        // filtered count → 1; tenant-wide count → 3 (distinguished by the
        // rating key the route only adds to the FILTERED where)
        mockReviewCount.mockImplementation(async (args: { where: { rating?: unknown } }) =>
                args.where.rating ? 1 : 3);
        mockReviewAggregate.mockResolvedValue({ _avg: { rating: 4.26 } });
        mockReviewGroupBy.mockResolvedValue([
                { rating: 5, _count: { _all: 2 } },
                { rating: 1, _count: { _all: 1 } },
        ]);
});

// ── Auth + subscription gate ────────────────────────────────────────────

describe('round92-C7 — GET /api/owner/reviews auth gate', () => {
        it('guest → 401 with the route\'s OWN English envelope ({ success:false, error:"Unauthorized" }), no review row read', async () => {
                // يحمي: بيانات المراجعات (أسماء/هواتف) لا تُقرأ بلا جلسة — ويُثبّت مظروف المسار الخاص
                authHolder.value = persona(GUEST);
                const res = await callGet();
                expect(res.status).toBe(401);
                expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' });
                expect(mockReviewFindMany).not.toHaveBeenCalled();
        });

        it('authenticated owner WITHOUT a restaurantId → 401 (requireRestaurant contract — no platform-wide fallback)', async () => {
                // يحمي: مالك بلا منيو لا يقرأ مراجعات منصة كاملة
                authHolder.value = persona(OWNER_NO_RESTAURANT);
                const res = await callGet();
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('Unauthorized');
                expect(mockReviewFindMany).not.toHaveBeenCalled();
        });

        it('admin (no restaurantId in session) → 401 too: this surface is restaurant-bound only', async () => {
                // يثبّت: الموظفون بلا مطعم جلسة لا يمرون (مسار owner/*)
                authHolder.value = persona(ADMIN);
                const res = await callGet();
                expect(res.status).toBe(401);
        });

        it('owner with expired subscription → 403 renewal message, no query runs', async () => {
                // يحمي: إنفاذ الاشتراك على مسارات المالك
                authHolder.value = persona(OWNER_A);
                subHolder.active = false;
                const res = await callGet();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                expect(mockReviewFindMany).not.toHaveBeenCalled();
        });
});

// ── Tenant scoping ──────────────────────────────────────────────────────

describe('round92-C7 — GET /api/owner/reviews tenant scoping', () => {
        it('owner without an explicit param → 200 and the where carries the SESSION restaurant through the relation filter', async () => {
                // يحمي: نطاق الاستعلام من الجلسة — لا معرف عميل خام
                authHolder.value = persona(OWNER_A);
                const res = await callGet();
                expect(res.status).toBe(200);
                expect(mockReviewFindMany.mock.calls[0][0].where).toEqual({
                        menuItem: { is: { category: { is: { restaurantId: 5 } } } },
                });
        });

        it('owner asking for a FOREIGN restaurant without a link → 403 «غير مصرح», reviews of the other tenant NEVER read', async () => {
                // يحمي: PII مراجعين مطعم آخر محجوب
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?restaurantId=7');
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 7 } },
                });
                expect(mockReviewFindMany).not.toHaveBeenCalled();
        });

        it('owner with a multi-menu link → 200 and the where carries the VERIFIED requested restaurant', async () => {
                // يحمي: تعدد المنيوهات بعد تحقق الرابط فقط
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 7, isPrimary: false });
                const res = await callGet('?restaurantId=7');
                expect(res.status).toBe(200);
                expect(mockReviewFindMany.mock.calls[0][0].where).toEqual({
                        menuItem: { is: { category: { is: { restaurantId: 7 } } } },
                });
        });

        it('the select reads reviewer PII — so it must only ever be reachable by the scoped owner (fields pinned)', async () => {
                // يحمي: يثبّت أن الصفوف تحمل customerName/customerPhone (سبب صرامة النطاق أعلاه)
                authHolder.value = persona(OWNER_A);
                const res = await callGet();
                const json = await res.json();
                expect(json.data[0].customerName).toBe('زبون');
                expect(json.data[0].customerPhone).toBe('0911111111');
                expect(mockReviewFindMany.mock.calls[0][0].select.customerName).toBe(true);
                expect(mockReviewFindMany.mock.calls[0][0].select.customerPhone).toBe(true);
                expect(mockReviewFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
        });

        it('pinned gate quirk: the check is restaurantId+subscription, NOT the owner role — a USER with restaurantId passes (reported)', async () => {
                // يثبّت السلوك الفعلي (تقرير 3-c): لا فحص دور — الجلسة المرتبطة بمطعم كافية
                authHolder.value = persona(USER_BOUND);
                const res = await callGet();
                expect(res.status).toBe(200);
                expect(mockReviewFindMany.mock.calls[0][0].where.menuItem.is.category.is.restaurantId).toBe(5);
        });
});

// ── Star filter + stats contract ────────────────────────────────────────

describe('round92-C7 — GET /api/owner/reviews filter + stats (round87-C5)', () => {
        it('minRating=4 → rating gte applied to the ROW query and the FILTERED count only', async () => {
                // يحمي: الفلتر يفعّل على الصفوف لا على الملخص
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?minRating=4');
                expect(res.status).toBe(200);
                expect(mockReviewFindMany.mock.calls[0][0].where.rating).toEqual({ gte: 4 });
                const filteredCount = mockReviewCount.mock.calls.find(
                        (c) => c[0].where.rating !== undefined
                );
                expect(filteredCount).toBeDefined();
                expect(filteredCount![0].where.rating).toEqual({ gte: 4 });
        });

        it('stats stay FULL-TENANT under the star filter (total 3 not 1 — the round87-C5 regression)', async () => {
                // يحمي: الملخص كان يُحسب على أول 50 صف مفلتر — الآن على مجموعة المستأجر كاملة
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?minRating=4');
                const json = await res.json();
                expect(json.stats.total).toBe(3);
                // the tenant-wide count has NO rating key
                const tenantCount = mockReviewCount.mock.calls.find(
                        (c) => c[0].where.rating === undefined
                );
                expect(tenantCount).toBeDefined();
                expect(mockReviewAggregate.mock.calls[0][0].where.rating).toBeUndefined();
        });

        it.each(['abc', '0', '9'] as const)('garbage minRating=%s → silently ignored (no rating key, still 200)', async (bad) => {
                // يحمي: قيم النجوم غير الصالحة لا تكسر القائمة ولا تصل الاستعلام
                authHolder.value = persona(OWNER_A);
                const res = await callGet(`?minRating=${bad}`);
                expect(res.status).toBe(200);
                expect(mockReviewFindMany.mock.calls[0][0].where.rating).toBeUndefined();
        });

        it('stats envelope: avg rounded to 1 decimal (4.26→4.3) + distribution ordered 5..1 with missing stars as 0', async () => {
                // يحمي: عقد الملخص الحرفي للواجهة
                authHolder.value = persona(OWNER_A);
                const res = await callGet();
                const json = await res.json();
                expect(json.stats.avg).toBe(4.3);
                expect(json.stats.distribution).toEqual([
                        { star: 5, count: 2 },
                        { star: 4, count: 0 },
                        { star: 3, count: 0 },
                        { star: 2, count: 0 },
                        { star: 1, count: 1 },
                ]);
        });

        it('no reviews at all → avg 0 (null aggregate), distribution all zeros, empty rows', async () => {
                // يحمي: حالة الصفر النظيفة
                authHolder.value = persona(OWNER_A);
                mockReviewFindMany.mockResolvedValue([]);
                mockReviewCount.mockResolvedValue(0);
                mockReviewAggregate.mockResolvedValue({ _avg: { rating: null } });
                mockReviewGroupBy.mockResolvedValue([]);
                const res = await callGet();
                const json = await res.json();
                expect(json.stats.avg).toBe(0);
                expect(json.stats.total).toBe(0);
                expect(json.stats.distribution.every((d: { count: number }) => d.count === 0)).toBe(true);
                expect(json.data).toEqual([]);
        });

        it('pagination reaches prisma: page=2&pageSize=10 → skip 10 / take 10', async () => {
                // يحمي: حدود الصفحة مطبقة
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?page=2&pageSize=10');
                expect(res.status).toBe(200);
                expect(mockReviewFindMany.mock.calls[0][0].skip).toBe(10);
                expect(mockReviewFindMany.mock.calls[0][0].take).toBe(10);
                expect((await res.json()).meta.pageSize).toBe(10);
        });

        it('unexpected DB failure → 500 generic Arabic message, no internals leaked', async () => {
                // يحمي: فشل القاعدة لا يسرب
                authHolder.value = persona(OWNER_A);
                mockReviewFindMany.mockRejectedValue(new Error('boom secret'));
                const res = await callGet();
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('boom');
        });
});
