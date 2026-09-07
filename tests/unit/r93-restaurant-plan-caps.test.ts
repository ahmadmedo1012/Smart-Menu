/**
 * r93-N4 (F8/M-2 من تقرير التفتيش 1-c) — إنشاء مطعم بمسار الأدمن مع خطة
 * يزامن السقوف المنزّلة (maxItems/maxOrders) من صف الخطة.
 *
 * الخلل: src/app/api/restaurants POST (مسار الأدمن) كان يكتب planId فقط
 * بينما تبقى سقوف المطعم افتراضيات المخطط (50/500) — والإنفاذ الفعلي
 * للأصناف/الطلبات يقرأ النسخة المنزّلة على صف المطعم (items/route.ts
 * وorders/route.ts) لا الخطة → مطعم على Premium (9999/99999) كان يُحاصَر
 * فعليًا عند 50 صنفًا/500 طلب.
 *
 * الإصلاح + قرار موثّق: تُنزَّل السقوف من صف الخطة (نفس آلية ترقية
 * الاشتراك) لكن WITHOUT planStart/planEnd — الإسناد الإداري بلا دفع ليس
 * اشتراكًا بمدة 30 يومًا (فرض انتهاء تلقائي سيقفل المالك بلا سبب)؛ مدة
 * الدفع تبقى مسؤولية مسار الموافقة وحده. الباقة غير الموجودة → 400
 * «الباقة غير موجودة» (نفس رسالة مسار الترقية) بدل انفجار FK لاحقًا.
 *
 * النمط القياسي: restaurants-create.test.ts (vi.hoisted + vi.mock
 * للـprisma/$transaction و@/lib/session فيعمل سلّم requirePermission الحقيقي).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── محدد التسجيل (يسمح دائمًا — اختبارنا ليس عن المحدّد) ───────────────

vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 4, reset: 0 })),
                destroy: () => {},
        }),
}));

// ── prisma + $transaction ───────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockPlanFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const txPlanFindFirst = vi.hoisted(() => vi.fn());
const txRestaurantCreate = vi.hoisted(() => vi.fn());
const txRestaurantFindUnique = vi.hoisted(() => vi.fn());
const txMenuCategoryCreateMany = vi.hoisted(() => vi.fn());

const tx = {
        subscriptionPlan: { findFirst: txPlanFindFirst },
        restaurant: { findUnique: txRestaurantFindUnique, create: txRestaurantCreate },
        menuCategory: { createMany: txMenuCategoryCreateMany },
};

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        subscriptionPlan: { findUnique: mockPlanFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent, sendTelegramNotification: vi.fn() }));
vi.mock('@/lib/hash', () => ({ hashPassword: (pw: string) => `hashed(${pw})` }));

const restaurantsRoute = await import('@/app/api/restaurants/route');

// ── Personas ────────────────────────────────────────────────────────────

const persona = (o: Partial<{ id: number; role: string; restaurantId: number | null; permissions: string[] }>) => ({
        id: 1,
        role: 'USER',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });

const setSession = (user: ReturnType<typeof persona> | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : { valid: false as const, userId: null },
        );
};

// ── أدوات مساعدة ───────────────────────────────────────────────────────

function postRequest(body?: unknown): NextRequest {
        return new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
}

const PREMIUM = { maxItems: 9999, maxOrders: 99999 };
const ADMIN_BODY = { restaurants: [{ name: 'مقهى الواحة', slug: 'al-waha-cafe' }] };

beforeEach(() => {
        vi.clearAllMocks();
        setSession(SUPER_ADMIN);
        mockTransaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
        mockUserFindUnique.mockResolvedValue(null);
        mockPlanFindUnique.mockResolvedValue({ ...PREMIUM });
        txRestaurantFindUnique.mockResolvedValue(null);
        txRestaurantCreate.mockImplementation(
                async ({ data }: { data: { name: string; slug: string } }) => ({
                        id: data.slug === 'b-2' ? 102 : 101,
                        ...data,
                }),
        );
        txMenuCategoryCreateMany.mockResolvedValue({ count: 4 });
});

// ── تنزيل السقوف ────────────────────────────────────────────────────────

describe('r93-N4 — السقوف المنزّلة تطابق الخطة عند إنشاء أدمن بخطة', () => {
        it('planId=Premium → create يتسلم maxItems/maxOrders من صف الخطة (لا 50/500 الافتراضية)', async () => {
                const res = await restaurantsRoute.POST(postRequest({ ...ADMIN_BODY, planId: 2 }));
                expect(res.status).toBe(201);

                expect(mockPlanFindUnique).toHaveBeenCalledWith({
                        where: { id: 2 },
                        select: { maxItems: true, maxOrders: true },
                });
                expect(txRestaurantCreate).toHaveBeenCalledTimes(1);
                expect(txRestaurantCreate.mock.calls[0][0].data).toMatchObject({
                        planId: 2,
                        maxItems: 9999,
                        maxOrders: 99999,
                });
        });

        it('منيهوان بنفس الخطة → كل صف مطعم ينزل سقوف الخطة نفسها', async () => {
                const res = await restaurantsRoute.POST(
                        postRequest({
                                planId: 2,
                                restaurants: [
                                        { name: 'أ', slug: 'a-1' },
                                        { name: 'ب', slug: 'b-2' },
                                ],
                        })
                );
                expect(res.status).toBe(201);
                expect(txRestaurantCreate).toHaveBeenCalledTimes(2);
                for (const call of txRestaurantCreate.mock.calls) {
                        expect(call[0].data).toMatchObject({ maxItems: 9999, maxOrders: 99999 });
                }
        });

        it('قرار موثّق: لا planStart/planEnd تُكتب (الإسناد الإداري بلا دفع ليس اشتراكًا بمدة)', async () => {
                await restaurantsRoute.POST(postRequest({ ...ADMIN_BODY, planId: 2 }));
                const data = txRestaurantCreate.mock.calls[0][0].data;
                expect(data).not.toHaveProperty('planStart');
                expect(data).not.toHaveProperty('planEnd');
        });

        it('مسار أدمن بلا خطة → السلوك كما كان: بلا حقول سقوف إطلاقًا', async () => {
                await restaurantsRoute.POST(postRequest(ADMIN_BODY));
                expect(mockPlanFindUnique).not.toHaveBeenCalled();
                const data = txRestaurantCreate.mock.calls[0][0].data;
                expect(data).not.toHaveProperty('maxItems');
                expect(data).not.toHaveProperty('maxOrders');
        });
});

// ── فحص الباقة ──────────────────────────────────────────────────────────

describe('r93-N4 — فحص وجود الباقة قبل المعاملة', () => {
        it('planId وهمي → 400 «الباقة غير موجودة» بلا معاملة ولا إنشاء', async () => {
                mockPlanFindUnique.mockResolvedValue(null);
                const res = await restaurantsRoute.POST(postRequest({ ...ADMIN_BODY, planId: 999 }));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('الباقة غير موجودة');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txRestaurantCreate).not.toHaveBeenCalled();
        });

        it('التسجيل الذاتي مع planId يظل مرفوضًا (حارس round-76 بلا مساس)', async () => {
                setSession(null);
                const res = await restaurantsRoute.POST(
                        postRequest({
                                username: 'newowner',
                                password: 'password123',
                                planId: 2,
                                restaurants: [{ name: 'م', slug: 's-1' }],
                        })
                );
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('لا يمكن تحديد الخطة أو الميزات عند التسجيل الذاتي');
                expect(mockPlanFindUnique).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});
