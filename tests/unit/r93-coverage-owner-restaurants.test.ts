/**
 * r93-W3 — جزيرة تغطية 3: GET /api/owner/restaurants (كان 73.3% أسطر —
 * POST مغطى بعمق في owner-restaurants-gate بينما GET كلها بلا اختبار،
 * تقرير 1-e §3) + فروع POST غير المغطاة (401×2، اشتراك منتهي، مستخدم
 * غائب، slug محجوز، خطة مدفوعة في الإشعار).
 *
 * المعالجان يُشغَّلان حقيقيًا (نمط owner-restaurants-gate: prisma عبر
 * vi.hoisted مع tx-mock لـ$transaction، حاملا auth وsubscription-guard
 * قابلان للتحكم، logAudit/notifyEvent جاسوسان — مساعدو list-counts
 * يعملون حقيقيين فوق الـgroupBy المنكَّر كنمط r92-categories-route). ما
 * تحميه هذه الاختبارات:
 *   - عزل المستأجر في القراءة: userId المعامل يُقبله super_admin وحده —
 *     المالك/الأدمن يقرآن قائمتهما الخاصة دومًا (إصلاح الامتياز الموثق
 *     في تعليق المسار) · الارتباط عبر userRestaurant بترتيب isPrimary
 *   - شكل الرد: _count.categories/orders من مساعدي round88-A2 (خريطة
 *     groupBy لصفحة المالك فقط — الفقد من الخريطة = 0) + isPrimary
 *   - اشتراك منتهٍ → 403 عربي قبل أي استعلام · مجهول → 401
 *   - فروع POST: لا userId في الجلسة → 401 · مستخدم محذوف → 404 · slug
 *     محجوز → 409 (لا معاملة تُفتح) · الإشعار يقول paid عند خطة مدفوعة
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks (owner-restaurants-gate pattern) ───────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 10 as number | null,
                permissions: [] as string[],
        },
}));

const permHolder = vi.hoisted(() => ({
        value: { authorized: true, role: 'sub_admin', userId: 4, error: '', status: 200 },
}));

// GET/POST subscription guard — controllable per-test
const subGuardHolder = vi.hoisted(() => ({ active: true }));

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSlugFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindMany = vi.hoisted(() => vi.fn());
// list-counts helpers run for real: categoryCountByRestaurant /
// orderCountByRestaurant → prisma.menuCategory.groupBy / prisma.order.groupBy
const mockMenuCategoryGroupBy = vi.hoisted(() => vi.fn());
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));

const txMock = vi.hoisted(() => ({
        $queryRaw: vi.fn(),
        userRestaurant: { count: vi.fn(), create: vi.fn() },
        subscriptionPlan: { findFirst: vi.fn() },
        restaurant: { create: vi.fn() },
        menuCategory: { createMany: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockSlugFindUnique },
        userRestaurant: { findMany: mockUserRestaurantFindMany },
        menuCategory: { groupBy: mockMenuCategoryGroupBy },
        order: { groupBy: mockOrderGroupBy },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => authHolder.value),
        requirePermission: vi.fn(async () => permHolder.value),
}));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => subGuardHolder.active),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));

// ── Fixtures ────────────────────────────────────────────────────────────

const LINKS = [
        {
                isPrimary: true,
                createdAt: new Date('2026-01-01T00:00:00Z'),
                restaurant: { id: 55, name: 'المطعم الأساسي', slug: 'primary', description: 'د', logo: 'l.png', isActive: true, createdAt: new Date('2026-01-01T00:00:00Z') },
        },
        {
                isPrimary: false,
                createdAt: new Date('2026-03-01T00:00:00Z'),
                restaurant: { id: 56, name: 'منيو فرعي', slug: 'secondary', description: '', logo: null, isActive: false, createdAt: new Date('2026-03-01T00:00:00Z') },
        },
];

const MENU_BODY = { name: 'مطعم جديد', slug: 'new-menu', description: 'قهوة', phone: '', whatsapp: '' };

const CREATED = { id: 77, name: 'مطعم جديد', slug: 'new-menu', planId: null };

// ── Route invocation helpers ────────────────────────────────────────────

async function callGet(query = '') {
        const { GET } = await import('@/app/api/owner/restaurants/route');
        return GET(new NextRequest(`http://localhost/api/owner/restaurants${query}`));
}

async function callPost(body: unknown) {
        const { POST } = await import('@/app/api/owner/restaurants/route');
        return POST(
                new NextRequest('http://localhost/api/owner/restaurants', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                })
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 10, permissions: [] };
        permHolder.value = { authorized: true, role: 'sub_admin', userId: 4, error: '', status: 200 };
        subGuardHolder.active = true;
        // GET defaults: the owner's two links with counts only for id 55
        mockUserRestaurantFindMany.mockResolvedValue(LINKS.map((l) => ({ ...l, restaurant: { ...l.restaurant } })));
        mockMenuCategoryGroupBy.mockResolvedValue([{ restaurantId: 55, _count: { _all: 4 } }]);
        mockOrderGroupBy.mockResolvedValue([{ restaurantId: 55, _count: { _all: 12 } }]);
        // POST defaults: owner with no plan → free-tier caps path
        mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
        mockUserFindUnique.mockResolvedValue({ id: 10, planId: null, plan: null });
        mockSlugFindUnique.mockResolvedValue(null);
        txMock.userRestaurant.count.mockResolvedValue(0);
        txMock.userRestaurant.create.mockResolvedValue({});
        txMock.subscriptionPlan.findFirst.mockResolvedValue(null);
        txMock.restaurant.create.mockResolvedValue({ ...CREATED });
        txMock.menuCategory.createMany.mockResolvedValue({ count: 4 });
});

// ── GET — البوابة ───────────────────────────────────────────────────────

describe('r93-W3 — GET /api/owner/restaurants: البوابة', () => {
        it('مجهول → 401 «غير مصرح» قبل أي استعلام روابط', async () => {
                // يحمي: قائمة مطاعم المالك تتطلب جلسة
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };
                const res = await callGet();
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindMany).not.toHaveBeenCalled();
        });

        it('اشتراك منتهٍ → 403 عربي قبل أي استعلام', async () => {
                // يحمي: حارس الاشتراك يحجب القراءة كالكتابة
                subGuardHolder.active = false;
                const res = await callGet();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                expect(mockUserRestaurantFindMany).not.toHaveBeenCalled();
        });
});

// ── GET — عزل المستأجر ──────────────────────────────────────────────────

describe('r93-W3 — GET /api/owner/restaurants: عزل المستأجر (userId من الجلسة لا العميل)', () => {
        it('owner: الاستعلام بروابط الجلسة فقط — ?userId يتجاهل تمامًا', async () => {
                // يحمي: لا IDOR — معامل userId العميل لا يُقرأ لغير super_admin
                const res = await callGet('?userId=999');
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindMany.mock.calls[0][0].where).toEqual({ userId: 10 });
                expect(mockUserRestaurantFindMany.mock.calls[0][0].orderBy).toEqual([{ isPrimary: 'desc' }, { createdAt: 'asc' }]);
        });

        it('admin مع ?userId=999 → يتجاهله أيضًا (إصلاح الامتياز) ويقرأ روابطه هو', async () => {
                // يحمي: admin/sub_admin يقرآن قائمتهما الخاصة فقط — الفرع
                // الموثق في تعليق المسار «privilege fix»
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };
                const res = await callGet('?userId=999');
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindMany.mock.calls[0][0].where).toEqual({ userId: 1 });
        });

        it('super_admin مع ?userId=77 → يقرأ قائمة مستخدم آخر (مشهد الدعم)', async () => {
                // يحمي: الفرع الوحيد الذي يُقبل فيه المعامل — حصرًا للدور الأعلى
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 2, permissions: [] };
                const res = await callGet('?userId=77');
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindMany.mock.calls[0][0].where).toEqual({ userId: 77 });
        });

        it('super_admin بلا معامل → روابطه هو (فرع ?? في المعامل)', async () => {
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 2, permissions: [] };
                const res = await callGet();
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindMany.mock.calls[0][0].where).toEqual({ userId: 2 });
        });
});

// ── GET — شكل الرد والعدّادات ───────────────────────────────────────────

describe('r93-W3 — GET /api/owner/restaurants: العدّادات والشكل', () => {
        it('_count من مساعدات round88-A2: الفئات/الطلبات لصفحة المالك فقط، الفقد = 0', async () => {
                // يحمي: لا aggregate منصة كاملة (تعليق r89-C3 في المسار) —
                // groupBy بنطاق ids الصفحة بالضبط، والصف بلا عدّ = 0
                const res = await callGet();
                const json = await res.json();
                expect(mockMenuCategoryGroupBy).toHaveBeenCalledWith({
                        by: ['restaurantId'],
                        _count: { _all: true },
                        where: { restaurantId: { in: [55, 56] } },
                });
                expect(mockOrderGroupBy).toHaveBeenCalledWith({
                        by: ['restaurantId'],
                        _count: { _all: true },
                        where: { restaurantId: { in: [55, 56] } },
                });
                expect(json.data).toHaveLength(2);
                expect(json.data[0]).toMatchObject({
                        id: 55,
                        isPrimary: true,
                        _count: { categories: 4, orders: 12 },
                });
                expect(json.data[1]).toMatchObject({
                        id: 56,
                        isPrimary: false,
                        _count: { categories: 0, orders: 0 },
                });
                expect(json.success).toBe(true);
        });

        it('الروابط فارغة → data [] ولا groupBy إطلاقًا (مساعدو الصفر ids)', async () => {
                // يحمي: مالك بلا مطاعم لا يشغل أي عدّ
                mockUserRestaurantFindMany.mockResolvedValue([]);
                const res = await callGet();
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: [] });
                expect(mockMenuCategoryGroupBy).not.toHaveBeenCalled();
                expect(mockOrderGroupBy).not.toHaveBeenCalled();
        });

        it('فشل findMany → 500 عربي عام بلا تسريب', async () => {
                // يحمي: فشل القائمة لا يكشف تفاصيل القاعدة
                mockUserRestaurantFindMany.mockRejectedValue(new Error('links table internals'));
                const res = await callGet();
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('internals');
        });
});

// ── POST — فروع البوابة المتبقية ────────────────────────────────────────

describe('r93-W3 — POST /api/owner/restaurants: فروع البوابة المتبقية', () => {
        it('مجهول → 401 قبل أي عمل (فرع !authorized)', async () => {
                // يحمي: الإنشاء يتطلب جلسة — قبل تحليل الجسم
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };
                const res = await callPost(MENU_BODY);
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('جلسة بلا userId → 401 (فرع !auth.userId — لا معامل userId للعميل هنا)', async () => {
                // يحمي: الجلسة ناقصة المعرف لا تنشئ شيئًا (كل الكتابات اللاحقة
                // تستخدم auth.userId! فوجوده شرط صحة)
                authHolder.value = { authorized: true, role: 'owner', restaurantId: null, userId: null, permissions: [] };
                const res = await callPost(MENU_BODY);
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
        });

        it('اشتراك منتهٍ → 403 قبل أي عمل (نفس حارس القراءة)', async () => {
                subGuardHolder.active = false;
                const res = await callPost(MENU_BODY);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('اشتراكك منتهي. جدّد اشتراكك للمتابعة.');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('المستخدم محذوف بين الجلسة والاستعلام → 404 «المستخدم غير موجود»', async () => {
                // يحمي: فرع اختفاء الصف — رسالة عربية نظيفة ولا معاملة
                mockUserFindUnique.mockResolvedValue(null);
                const res = await callPost(MENU_BODY);
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('المستخدم غير موجود');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('slug محجوز → 409 «الرابط محجوز مسبقاً»، لا معاملة ولا إنشاء', async () => {
                // يحمي: تفرد الرابط يُفحص قبل فتح معاملة الإنشاء
                mockSlugFindUnique.mockResolvedValue({ id: 9, slug: 'new-menu' });
                const res = await callPost(MENU_BODY);
                expect(res.status).toBe(409);
                expect((await res.json()).error).toBe('الرابط محجوز مسبقاً');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.restaurant.create).not.toHaveBeenCalled();
        });

        it('خطة مدفوعة → الإشعار يقول paid (فرع planId في notifyEvent)', async () => {
                // يحمي: المشغل يميّن إنشاء مدفوعًا من مجانيًا في قناة الموافقة
                mockUserFindUnique.mockResolvedValue({
                        id: 10, planId: 3,
                        plan: { maxMenus: 5, maxItems: 30, maxOrders: 300, nameAr: 'احترافية' },
                });
                txMock.restaurant.create.mockResolvedValue({ ...CREATED, planId: 3 });
                const res = await callPost(MENU_BODY);
                expect(res.status).toBe(201);
                expect(mockNotifyEvent).toHaveBeenCalledWith(
                        'restaurant_created',
                        { name: 'مطعم جديد', slug: 'new-menu', plan: 'paid' },
                        { adminOnly: true }
                );
        });
});
