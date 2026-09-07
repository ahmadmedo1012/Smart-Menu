/**
 * r93-N3 (F7/M-1 من تقرير التفتيش 1-c) — create-owner ينشئ رابط UserRestaurant.
 *
 * الخلل: src/app/api/admin/create-owner كان يكتب User.restaurantId (المرآة
 * القديمة) فقط — بلا صف UserRestaurant. عدّاد سقف maxMenus في المسارات
 * الأشقيقة (owner/restaurants:123 وsubscription-decisions:183) يعدّ الروابط
 * (tx.userRestaurant.count) فلا يرى هذا المطعم → المالك الجديد يتجاوز سقف
 * منيوهاته بواحد مع كل استدعاء. كذلك getUserSubscriptionState يقرأ
 * user.restaurants عبر الرابط — فارغ → planEnd لهذا المنيو غير مرئي
 * للحارس الكسول ولكرون subscription-expiry (عمى انتهاء الاشتراك).
 *
 * الإصلاح: الحساب + الرابط (isPrimary — منيو أول/وحيد، بنمط restaurants
 * POST) + تنزيل سقوف خطة المطعم (نفس منطق ترقية الاشتراك) — كلها داخل
 * $transaction واحدة.
 *
 * النمط القياسي: create-owner.test.ts (vi.hoisted + vi.mock للـprisma
 * و@/lib/session فيعمل سلّم requirePermission الحقيقي).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockUserRestaurantCreate = vi.hoisted(() => vi.fn());
const mockPlanFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantUpdate = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());

const tx = vi.hoisted(() => ({
        user: { create: mockUserCreate },
        userRestaurant: { create: mockUserRestaurantCreate },
        subscriptionPlan: { findUnique: mockPlanFindUnique },
        restaurant: { update: mockRestaurantUpdate },
}));

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/hash', () => ({
        hashPassword: mockHashPassword.mockImplementation((pw: string) => `hashed(${pw})`),
}));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent, sendTelegramNotification: vi.fn() }));
const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

const createOwnerRoute = await import('@/app/api/admin/create-owner/route');

// ── Personas ────────────────────────────────────────────────────────────

interface Persona {
        id: number;
        role: string;
        restaurantId: number | null;
        subscriptionStatus: string | null;
        permissions: string[];
}

const persona = (o: Partial<Persona>): Persona => ({
        id: 1,
        role: 'USER',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });
const GUEST = { valid: false as const, userId: null };

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

// ── أدوات مساعدة ───────────────────────────────────────────────────────

const BODY = {
        username: 'owner123',
        password: 'password123',
        name: 'مالك تجريبي',
        restaurantId: 7,
};

const CREATED = { id: 42, username: 'owner123', name: 'مالك تجريبي' };

function postRequest(body?: unknown): NextRequest {
        return new NextRequest('http://localhost/api/admin/create-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        setSession(SUPER_ADMIN);
        mockUserFindUnique.mockResolvedValue(null);
        // مطعم الهدف: بلا خطة افتراضيًا (حالات الخطة تضبطها الاختبارات)
        mockRestaurantFindUnique.mockResolvedValue({ id: 7, planId: null });
        mockTransaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
        mockUserCreate.mockResolvedValue(CREATED);
        mockUserRestaurantCreate.mockResolvedValue({});
        mockPlanFindUnique.mockResolvedValue({ maxItems: 9999, maxOrders: 99999 });
        mockRestaurantUpdate.mockResolvedValue({ id: 7 });
});

// ── الرابط داخل المعاملة ───────────────────────────────────────────────

describe('r93-N3 — رابط UserRestaurant يُنشأ مع الحساب داخل معاملة واحدة', () => {
        it('userRestaurant.create بالبيانات الصحيحة (isPrimary=true — منيو أول/وحيد، بنمط restaurants POST)', async () => {
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(201);
                expect(mockUserRestaurantCreate).toHaveBeenCalledWith({
                        data: { userId: 42, restaurantId: 7, isPrimary: true },
                });
        });

        it('الحساب والرابط داخل $transaction واحدة (البوابة والحساب لا يفتتان على معاملتين)', async () => {
                await createOwnerRoute.POST(postRequest(BODY));
                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(
                        mockUserCreate.mock.invocationCallOrder[0] <
                        mockUserRestaurantCreate.mock.invocationCallOrder[0]
                ).toBe(true);
        });

        it('مرآة User.restaurantId القديمة تبقى تُكتب (توافق خلفي مع جلسة المالك)', async () => {
                await createOwnerRoute.POST(postRequest(BODY));
                expect(mockUserCreate).toHaveBeenCalledWith({
                        data: {
                                username: 'owner123',
                                password: 'hashed(password123)',
                                name: 'مالك تجريبي',
                                role: 'owner',
                                restaurantId: 7,
                        },
                });
        });

        it('فشل الرابط يُجهض الحساب كله (ذرّية — لا مالك بلا رابط يعود للخلل الأصلي)', async () => {
                mockUserRestaurantCreate.mockRejectedValue(
                        Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
                );
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(409);
                // المعاملة كلها ترتد — لا صف User يبقى في الكيّ المزيّف
                expect(mockLogAudit).not.toHaveBeenCalled();
        });
});

// ── السقوف المنزّلة ─────────────────────────────────────────────────────

describe('r93-N3 — تنزيل سقوف الخطة على صف المطعم', () => {
        it('مطعم بخطة: سقوف الخطة تُنزَّل على صفه (نفس منطق ترقية الاشتراك — إنفاذ الأصناف/الطلبات يقرأ المنزّلة)', async () => {
                mockRestaurantFindUnique.mockResolvedValue({ id: 7, planId: 2 });
                await createOwnerRoute.POST(postRequest(BODY));

                expect(mockPlanFindUnique).toHaveBeenCalledWith({
                        where: { id: 2 },
                        select: { maxItems: true, maxOrders: true },
                });
                expect(mockRestaurantUpdate).toHaveBeenCalledWith({
                        where: { id: 7 },
                        data: { maxItems: 9999, maxOrders: 99999 },
                });
        });

        it('مطعم بلا خطة: لا يُلمس صف السقوف (قد تكون مخصّصة يدويًا عبر PUT الأدمن)', async () => {
                await createOwnerRoute.POST(postRequest(BODY));
                expect(mockPlanFindUnique).not.toHaveBeenCalled();
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });

        it('خطة محذوفة (معرف معلق): التنزيل يُتخطى بأمان ولا يُفشل الإنشاء', async () => {
                mockRestaurantFindUnique.mockResolvedValue({ id: 7, planId: 99 });
                mockPlanFindUnique.mockResolvedValue(null);
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(201);
                expect(mockRestaurantUpdate).not.toHaveBeenCalled();
        });
});

// ── تحقق الهدف ──────────────────────────────────────────────────────────

describe('r93-N3 — التحقق من وجود مطعم الهدف', () => {
        it('معرف مطعم وهمي → 404 «المطعم غير موجود» قبل أي إنشاء حساب أو معاملة', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null);
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('المطعم غير موجود');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
                expect(mockHashPassword).not.toHaveBeenCalled();
        });
});
