/**
 * g90-F5b (T8) — تغطية وحدة لمسار src/app/api/admin/create-owner/route.ts
 * (كان 0% lcov — إنشاء حساب مالك مرتبط بمطعم من لوحة الأدمن).
 *
 * النمط القياسي (admin-routes.test.ts): vi.hoisted + vi.mock للـprisma و
 * @/lib/session فيعمل سلّم requirePermission('MANAGE_RESTAURANTS') الحقيقي.
 * @/lib/hash مُنكَّر (PBKDF2 بـ600k تكرار ≈ 290ms لكل استدعاء) — لكن
 * الاستدعاء نفسه وسيطه إلى prisma.user.create موضع تأكيد.
 *
 * تحديث المنسق (round90): عولج اكتشاف F5b-C — المسار صار يستدعي logAudit
 * + notifyEvent (best-effort بـ.catch) بعد الإنشاء، وعُرّبت رسالة 409 —
 * الاختبار يؤكد الاستدعاءين والرسالة الجديدة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
// r93-N3: المسار صار ينشئ الحساب + رابط UserRestaurant + تنزيل السقوف داخل
// $transaction واحدة — أضفنا مطعم الهدف وأدوات المعاملة للكيّ المزيّف.
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockUserRestaurantCreate = vi.hoisted(() => vi.fn());
const mockTxPlanFindUnique = vi.hoisted(() => vi.fn());
const mockTxRestaurantUpdate = vi.hoisted(() => vi.fn());

const tx = vi.hoisted(() => ({
        user: { create: mockUserCreate },
        userRestaurant: { create: mockUserRestaurantCreate },
        subscriptionPlan: { findUnique: mockTxPlanFindUnique },
        restaurant: { update: mockTxRestaurantUpdate },
}));

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

// round90-المنسق: المسار صار يستدعي logAudit/notifyEvent — مُنكَّران للتأكيد
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent, sendTelegramNotification: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

// المسار يستورده ديناميكيًا: const { hashPassword } = await import('@/lib/hash')
vi.mock('@/lib/hash', () => ({
        hashPassword: mockHashPassword.mockImplementation((pw: string) => `hashed(${pw})`),
}));

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

const GUEST = { valid: false as const, userId: null };
const SUPER_ADMIN = persona({ id: 1, role: 'super_admin' });
const ADMIN_LEGACY = persona({ id: 2, role: 'admin' });
const SUB_ADMIN_MR = persona({ id: 4, role: 'sub_admin', permissions: ['MANAGE_RESTAURANTS'] });
const SUB_ADMIN_OTHER = persona({ id: 5, role: 'sub_admin', permissions: ['VIEW_ANALYTICS'] });
const OWNER = persona({ id: 10, role: 'owner', restaurantId: 7 });

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
                ...(body === undefined
                        ? {}
                        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        mockHashPassword.mockClear();
        setSession(SUPER_ADMIN);
        mockUserFindUnique.mockResolvedValue(null);
        mockUserCreate.mockResolvedValue(CREATED);
        // r93-N3: مطعم الهدف موجود (بلا خطة افتراضيًا) + المعاملة تُنفّذ الكاللback
        mockRestaurantFindUnique.mockResolvedValue({ id: 7, planId: null });
        mockTransaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
        mockUserRestaurantCreate.mockResolvedValue({});
        mockTxPlanFindUnique.mockResolvedValue({ maxItems: 9999, maxOrders: 99999 });
        mockTxRestaurantUpdate.mockResolvedValue({ id: 7 });
});

// ── البوابة ─────────────────────────────────────────────────────────────

describe('POST /api/admin/create-owner — بوابة MANAGE_RESTAURANTS', () => {
        it('الضيف → 401 «غير مصرح» قبل أي استعلام أو كتابة', async () => {
                setSession(null);
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
                expect(mockHashPassword).not.toHaveBeenCalled();
        });

        it.each([
                ['USER عادي', persona({ id: 55, role: 'USER' })],
                ['owner (ليس أدمن)', OWNER],
                ['sub_admin بصلاحية أخرى', SUB_ADMIN_OTHER],
        ])('%s → 403 «لا تملك الصلاحية» بلا كتابة', async (_label, user: Persona) => {
                setSession(user);
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('sub_admin يحمل MANAGE_RESTAURANTS → يعبر البوابة + logAudit/notifyEvent (round90)', async () => {
                setSession(SUB_ADMIN_MR);
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(201);
                // round90-المنسق: الإصلاح الذي حسم اكتشاف F5b-C — الإنشاء صار مُدقَّقًا
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({ action: 'create', targetType: 'user', actorId: SUB_ADMIN_MR.id })
                );
                expect(mockNotifyEvent).toHaveBeenCalledWith('owner_created', expect.anything(), expect.anything());
        });

        it('admin (legacy) → يعبر البوابة (كل الصلاحيات عدا MANAGE_USERS)', async () => {
                setSession(ADMIN_LEGACY);
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(201);
        });
});

// ── التحقق من المدخلات وتفرد الاسم ─────────────────────────────────────

describe('POST /api/admin/create-owner — التحقق والتعارض', () => {
        it('username مستخدم مسبقًا → 409 «اسم المستخدم موجود مسبقًا» قبل الهاش والإنشاء', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 42, username: 'owner123' });
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم موجود مسبقًا');
                expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { username: 'owner123' } });
                expect(mockHashPassword).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('فارق موثّق: الجسم الغائب كليًا → 400 «خطأ في صيغة JSON» (يرمي قبل zod)', async () => {
                const res = await createOwnerRoute.POST(postRequest());
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('JSON');
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it.each([
                ['username قصير (حرفان)', { ...BODY, username: 'ab' }, 'username'],
                ['password قصير (7 أحرف)', { ...BODY, password: '1234567' }, 'password'],
                ['name فارغ', { ...BODY, name: '' }, 'name'],
                ['restaurantId غير عدد صحيح موجب', { ...BODY, restaurantId: 0 }, 'restaurantId'],
        ])('%s → 422 مغلّف بتفاصيل zod', async (_label, body: Record<string, unknown>, field: string) => {
                const res = await createOwnerRoute.POST(postRequest(body));
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain(field);
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('رسائل zod عربية موحّدة (مخطط الحقول المشترك round79-D)', async () => {
                const res = await createOwnerRoute.POST(postRequest({ ...BODY, username: 'ab' }));
                const json = await res.json();
                expect(json.details[0]).toContain('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        });
});

// ── المسار السعيد ───────────────────────────────────────────────────────

describe('POST /api/admin/create-owner — الإنشاء الناجح', () => {
        it('201 + hashPassword استُدعي بكلمة المرور + user.create ببيانات المالك الصحيحة', async () => {
                const res = await createOwnerRoute.POST(postRequest(BODY));
                expect(res.status).toBe(201);

                expect(mockHashPassword).toHaveBeenCalledTimes(1);
                expect(mockHashPassword).toHaveBeenCalledWith('password123');

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

        it('الجسم يعيد بيانات الحساب الجديد كما أنشأها prisma', async () => {
                const res = await createOwnerRoute.POST(postRequest(BODY));
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ id: 42, username: 'owner123', name: 'مالك تجريبي' });
        });
});
