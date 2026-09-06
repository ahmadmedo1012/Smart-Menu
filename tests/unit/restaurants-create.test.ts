/**
 * g90-F5b (T9) — تغطية وحدة لـPOST في src/app/api/restaurants/route.ts:128-270
 * (كانت 0% على فرع الإنشاء — GET مغطى في query-param-validation.test.ts).
 *
 * النمط القياسي: vi.hoisted + vi.mock للـprisma (بما فيه $transaction —
 * ننفّذ كاللback المتاح لنفس كائن tx المزيف فنثبت أن كل إنشاءات المنيوهات
 * تجري داخل معاملة واحدة) و@/lib/session فيعمل سلّم requirePermission
 * ('MANAGE_RESTAURANTS') الحقيقي — البوابة الفعلية (round86-A8): بلا
 * username/password يُطلب MANAGE_RESTAURANTS (ضيف 401 · USER 403)؛ ومع
 * username+password يفتح التسجيل الذاتي العام.
 *
 * منكّرات إضافية: @/lib/rate-limit (محدّد حالة قابل للتحكم — المسار يفحصه
 * أولًا) · @/lib/hash (PBKDF2 ثقيل) · @/lib/audit و@/lib/telegram
 * (logAudit/notifyEvent اللذان أضافهما r90 — موضع تأكيد، بلا شبكة).
 *
 * فوارق موثّقة عن توقعات التكليف:
 *   1) المحدّد يُفحص قبل المصادقة — ضيف يستهلك رحلة محدد ثم يُردّ 401.
 *   2) slug مكرر → 409 برسالة «بيانات مكررة — هذا الاسم موجود مسبقاً»
 *      (الخطأ يُرمى داخل المعاملة بنص Prisma ثم يعالجه handleError).
 *   3) الجسم الغائب → 400 «خطأ في صيغة JSON» لا 422 (يرمي قبل zod)؛
 *      الـ422 يظهر عند refine (بلا منيو) أو حقول ناقصة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── محدّد التسجيل (حالة قابلة للتحكم — 5/دقيقة افتراضيًا) ───────────────

const rlState = vi.hoisted(() => ({ calls: 0, limit: Infinity, keys: [] as string[] }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: async (key: string) => {
                        rlState.calls += 1;
                        rlState.keys.push(key);
                        return {
                                success: rlState.calls <= rlState.limit,
                                remaining: 0,
                                reset: 0,
                        };
                },
                destroy: () => {},
        }),
}));

// ── prisma + $transaction (كائن tx مزيّف يُمرَّر للكاللback) ────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const txPlanFindFirst = vi.hoisted(() => vi.fn());
const txRestaurantCreate = vi.hoisted(() => vi.fn());
const txRestaurantFindUnique = vi.hoisted(() => vi.fn());
const txRestaurantFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const txMenuCategoryCreateMany = vi.hoisted(() => vi.fn());
const txUserCreate = vi.hoisted(() => vi.fn());
const txUserFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const txUserRestaurantCreate = vi.hoisted(() => vi.fn());

const tx = {
        subscriptionPlan: { findFirst: txPlanFindFirst },
        restaurant: {
                findUnique: txRestaurantFindUnique,
                create: txRestaurantCreate,
                findUniqueOrThrow: txRestaurantFindUniqueOrThrow,
        },
        menuCategory: { createMany: txMenuCategoryCreateMany },
        user: { create: txUserCreate, findUniqueOrThrow: txUserFindUniqueOrThrow },
        userRestaurant: { create: txUserRestaurantCreate },
};

const mockPrisma = vi.hoisted(() => ({
        $transaction: mockTransaction,
        user: { findUnique: mockUserFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: 0, failed: [] }));
vi.mock('@/lib/telegram', () => ({
        notifyEvent: mockNotifyEvent,
        sendTelegramNotification: vi.fn(),
}));

const mockHashPassword = vi.hoisted(() => vi.fn());
vi.mock('@/lib/hash', () => ({
        hashPassword: mockHashPassword.mockImplementation((pw: string) => `hashed(${pw})`),
}));

const restaurantsRoute = await import('@/app/api/restaurants/route');

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
const USER_PLAIN = persona({ id: 55, role: 'USER' });

const setSession = (user: Persona | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true as const, userId: user.id, user } : GUEST,
        );
};

// ── أدوات مساعدة ───────────────────────────────────────────────────────

function postRequest(body?: unknown): NextRequest {
        return new NextRequest('http://localhost/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...(body === undefined
                        ? {}
                        : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
        });
}

const ADMIN_BODY = {
        restaurants: [
                { name: 'مقهى الواحة', slug: 'al-waha-cafe', description: 'قهوة مختصة' },
        ],
};

const MULTI_MENU_BODY = {
        restaurants: [
                { name: 'مقهى الواحة', slug: 'a-1' },
                { name: 'مطبخ البحر', slug: 'b-2' },
        ],
};

beforeEach(() => {
        vi.clearAllMocks();
        rlState.calls = 0;
        rlState.limit = Infinity;
        rlState.keys = [];
        setSession(SUPER_ADMIN);

        mockTransaction.mockImplementation(
                async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
        );
        mockUserFindUnique.mockResolvedValue(null);
        txRestaurantFindUnique.mockResolvedValue(null); // slug غير مأخوذ
        txRestaurantCreate.mockImplementation(
                async ({ data }: { data: { name: string; slug: string; planId: number | null } }) => {
                        const id = data.slug === 'b-2' ? 102 : 101;
                        return { id, name: data.name, slug: data.slug, planId: data.planId ?? null };
                },
        );
        txRestaurantFindUniqueOrThrow.mockImplementation(
                async ({ where }: { where: { slug: string } }) => ({
                        id: where.slug === 'b-2' ? 102 : 101,
                        slug: where.slug,
                }),
        );
        txMenuCategoryCreateMany.mockResolvedValue({ count: 4 });
        txUserCreate.mockResolvedValue({ id: 50, username: 'newowner' });
        txUserFindUniqueOrThrow.mockResolvedValue({ id: 50, username: 'newowner' });
        txUserRestaurantCreate.mockResolvedValue({});
        txPlanFindFirst.mockResolvedValue({ maxItems: 10, maxOrders: 100 });
});

// ── البوابة والمحدّد ────────────────────────────────────────────────────

describe('POST /api/restaurants — البوابة (بلا username/password → MANAGE_RESTAURANTS)', () => {
        it('الضيف → 401 «غير مصرح» — المحدد يُفحص أولًا (رحلة محدد واحدة) ولا معاملة', async () => {
                setSession(null);
                const res = await restaurantsRoute.POST(postRequest(ADMIN_BODY));
                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.error).toBe('غير مصرح');
                expect(rlState.calls).toBe(1);
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txRestaurantCreate).not.toHaveBeenCalled();
        });

        it('USER → 403 «لا تملك الصلاحية» بلا معاملة', async () => {
                setSession(USER_PLAIN);
                const res = await restaurantsRoute.POST(postRequest(ADMIN_BODY));
                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it.each([
                ['sub_admin بلا MANAGE_RESTAURANTS', SUB_ADMIN_OTHER, 403],
                ['sub_admin يحملها', SUB_ADMIN_MR, 201],
                ['admin (legacy)', ADMIN_LEGACY, 201],
                ['super_admin', SUPER_ADMIN, 201],
        ])('%s → %i', async (_label, user: Persona, code: number) => {
                setSession(user);
                const res = await restaurantsRoute.POST(postRequest(ADMIN_BODY));
                expect(res.status).toBe(code);
        });

        it('محدد التسجيل 5/دقيقة → الطلب السادس 429 بمفتاح register:ip', async () => {
                rlState.limit = 5;
                setSession(null); // الطلبات الخمسة الأولى ترتد 401 رخيصة
                for (let i = 0; i < 5; i++) {
                        await restaurantsRoute.POST(postRequest(ADMIN_BODY));
                }
                const res = await restaurantsRoute.POST(postRequest(ADMIN_BODY));
                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.error).toBe('طلبات كثيرة جدًا، حاول بعد 60 ثانية');
                expect(rlState.keys[0]).toBe('register:127.0.0.1');
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});

// ── التحقق من المخطط ────────────────────────────────────────────────────

describe('POST /api/restaurants — refine ومخطط المنيو', () => {
        it('جسم بلا منيو (لا restaurants ولا name+slug) → 422 «يجب توفير بيانات منيو واحد على الأقل»', async () => {
                const res = await restaurantsRoute.POST(postRequest({ phone: '0910' }));
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
                expect(json.details[0]).toContain('يجب توفير بيانات منيو واحد على الأقل');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('منيو ناقص الحقول (slug غائب) → 422 بتفاصيل zod', async () => {
                const res = await restaurantsRoute.POST(
                        postRequest({ restaurants: [{ name: 'مقهى بلا slug' }] }),
                );
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.details[0]).toContain('slug');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('slug بصيغة ممنوعة (أحرف كبيرة) → 422 (regex [a-z0-9-])', async () => {
                const res = await restaurantsRoute.POST(
                        postRequest({ restaurants: [{ name: 'م', slug: 'UPPER' }] }),
                );
                expect(res.status).toBe(422);
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('فارق موثّق: الجسم الغائب → 400 «خطأ في صيغة JSON» (يرمي قبل zod)', async () => {
                const res = await restaurantsRoute.POST(postRequest());
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('JSON');
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});

// ── إنشاء متعدد المنيوهات داخل معاملة واحدة ───────────────────────────

describe('POST /api/restaurants — إنشاء متعدد المنيوهات (مسار الأدمن)', () => {
        it('منيهوان داخل $transaction واحدة: create ×2 وmenuCategory.createMany ×2 والأول primary', async () => {
                const res = await restaurantsRoute.POST(postRequest(MULTI_MENU_BODY));
                expect(res.status).toBe(201);

                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(txRestaurantCreate).toHaveBeenCalledTimes(2);
                expect(txMenuCategoryCreateMany).toHaveBeenCalledTimes(2);

                // الأول هو الأساسي ويُعاد في الاستجابة
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.id).toBe(101);
                expect(json.data.slug).toBe('a-1');
        });

        it('فحص تفرد كل slug داخل المعاملة (findUnique لكل منيو بالترتيب)', async () => {
                await restaurantsRoute.POST(postRequest(MULTI_MENU_BODY));
                expect(txRestaurantFindUnique).toHaveBeenCalledTimes(2);
                expect(txRestaurantFindUnique.mock.calls[0][0]).toEqual({
                        where: { slug: 'a-1' },
                });
                expect(txRestaurantFindUnique.mock.calls[1][0]).toEqual({
                        where: { slug: 'b-2' },
                });
        });

        it('create يتسلم بيانات المنيو مع القيم الافتراضية الفارغة وplanId:null — بلا سقوف (مسار أدمن)', async () => {
                await restaurantsRoute.POST(postRequest(MULTI_MENU_BODY));
                expect(txRestaurantCreate).toHaveBeenCalledWith({
                        data: {
                                name: 'مقهى الواحة',
                                slug: 'a-1',
                                description: '',
                                phone: '',
                                whatsapp: '',
                                email: '',
                                address: '',
                                workingHours: '',
                                planId: null,
                        },
                });
                // السقوف المجانية تُطبَّق على التسجيل الذاتي فقط (round87-A6)
                const secondCreate = txRestaurantCreate.mock.calls[1][0];
                expect(secondCreate.data).not.toHaveProperty('maxItems');
                expect(secondCreate.data).not.toHaveProperty('maxOrders');
        });

        it('البذر التلقائي: 4 أقسام افتراضية لكل مطعم بمعرفه الصحيح', async () => {
                await restaurantsRoute.POST(postRequest(MULTI_MENU_BODY));
                expect(txMenuCategoryCreateMany.mock.calls[0][0]).toMatchObject({
                        data: expect.arrayContaining([
                                expect.objectContaining({ name: 'مشروبات ساخنة', restaurantId: 101 }),
                        ]),
                });
                expect(txMenuCategoryCreateMany.mock.calls[1][0]).toMatchObject({
                        data: expect.arrayContaining([
                                expect.objectContaining({ name: 'حلويات', restaurantId: 102 }),
                        ]),
                });
                for (const call of txMenuCategoryCreateMany.mock.calls) {
                        expect(call[0].data).toHaveLength(4);
                }
        });

        it('r90: بعد النجاح logAudit(create/restaurant) وnotifyEvent(restaurant_created, adminOnly) — best-effort', async () => {
                await restaurantsRoute.POST(postRequest(MULTI_MENU_BODY));
                expect(mockLogAudit).toHaveBeenCalledWith({
                        action: 'create',
                        targetType: 'restaurant',
                        targetId: 101,
                        actorId: 1,
                });
                expect(mockNotifyEvent).toHaveBeenCalledWith(
                        'restaurant_created',
                        { name: 'مقهى الواحة', slug: 'a-1', plan: 'free' },
                        { adminOnly: true },
                );
        });

        it('النموذج القديم (name+slug مباشرة بلا مصفوفة) → منيو واحد وcreate واحدة', async () => {
                const res = await restaurantsRoute.POST(
                        postRequest({ name: 'مطعم قديم النموذج', slug: 'legacy-1' }),
                );
                expect(res.status).toBe(201);
                expect(txRestaurantCreate).toHaveBeenCalledTimes(1);
                expect(txRestaurantCreate.mock.calls[0][0]).toMatchObject({
                        data: { name: 'مطعم قديم النموذج', slug: 'legacy-1' },
                });
        });
});

// ── التعارضات ───────────────────────────────────────────────────────────

describe('POST /api/restaurants — التعارضات', () => {
        it('slug مكرر → 409 برسالة «بيانات مكررة — هذا الاسم موجود مسبقاً» ولا تدقيق ولا إشعار', async () => {
                txRestaurantFindUnique.mockResolvedValue({ id: 999, slug: 'a-1' }); // داخل المعاملة
                const res = await restaurantsRoute.POST(postRequest(MULTI_MENU_BODY));
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('بيانات مكررة — هذا الاسم موجود مسبقاً');
                expect(txRestaurantCreate).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
                expect(mockNotifyEvent).not.toHaveBeenCalled();
        });

        it('اسم مستخدم محجوز (تسجيل ذاتي) → 409 «اسم المستخدم مستخدم بالفعل» قبل المعاملة', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 42, username: 'newowner' });
                const res = await restaurantsRoute.POST(
                        postRequest({ username: 'newowner', password: 'password123', ...ADMIN_BODY }),
                );
                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم مستخدم بالفعل');
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});

// ── التسجيل الذاتي العام ───────────────────────────────────────────────

describe('POST /api/restaurants — التسجيل الذاتي (username+password)', () => {
        const PUBLIC_BODY = {
                username: 'newowner',
                password: 'password123',
                restaurants: [{ name: 'مطعم جديد', slug: 'fresh-1' }],
        };

        it('ضيف مزوّد ببيانات الاعتماد → 201 بلا أي بوابة دور: مستخدم مالك + سقوف الخطة المجانية', async () => {
                setSession(null);
                const res = await restaurantsRoute.POST(postRequest(PUBLIC_BODY));
                expect(res.status).toBe(201);

                // سقوف الخطة المجانية (round87-A6) تُكتب على صف المطعم
                expect(txPlanFindFirst).toHaveBeenCalledWith({
                        where: { price: 0, isActive: true },
                        orderBy: { sortOrder: 'asc' },
                        select: { maxItems: true, maxOrders: true },
                });
                expect(txRestaurantCreate.mock.calls[0][0].data).toMatchObject({
                        maxItems: 10,
                        maxOrders: 100,
                });
        });

        it('hashPassword استُدعي + user.create بدور owner مربوط بالمطعم الأساسي + رابط UserRestaurant', async () => {
                setSession(null);
                const res = await restaurantsRoute.POST(postRequest(PUBLIC_BODY));
                expect(res.status).toBe(201);

                expect(mockHashPassword).toHaveBeenCalledWith('password123');
                expect(txUserCreate).toHaveBeenCalledWith({
                        data: {
                                username: 'newowner',
                                password: 'hashed(password123)',
                                name: 'مطعم جديد',
                                role: 'owner',
                                restaurantId: 101,
                                planId: null,
                        },
                });
                expect(txUserRestaurantCreate).toHaveBeenCalledWith({
                        data: { userId: 50, restaurantId: 101, isPrimary: true },
                });
                // التدقيق بلا فاعل (actorId undefined) — تسجيل ذاتي
                expect(mockLogAudit).toHaveBeenCalledWith({
                        action: 'create',
                        targetType: 'restaurant',
                        targetId: 101,
                        actorId: undefined,
                });
        });

        it('الإسناد الجماعي محظور: planId/showOnLanding/featuredRank → 400', async () => {
                setSession(null);
                const cases = [
                        { ...PUBLIC_BODY, planId: 3 },
                        { ...PUBLIC_BODY, showOnLanding: true },
                        { ...PUBLIC_BODY, featuredRank: 2 },
                ];
                for (const body of cases) {
                        const res = await restaurantsRoute.POST(postRequest(body));
                        expect(res.status).toBe(400);
                        const json = await res.json();
                        expect(json.error).toBe('لا يمكن تحديد الخطة أو الميزات عند التسجيل الذاتي');
                }
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('منيهوان في التسجيل الذاتي → 400 (الخطة المجانية تسمح بمنيو واحد)', async () => {
                setSession(null);
                const res = await restaurantsRoute.POST(
                        postRequest({ ...PUBLIC_BODY, restaurants: MULTI_MENU_BODY.restaurants }),
                );
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('التسجيل الذاتي يسمح بمنيو واحد فقط — رقِّ خطتك لإضافة المزيد');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('password قصير في التسجيل الذاتي → 422 (passwordOptional يفرض السياسة)', async () => {
                setSession(null);
                const res = await restaurantsRoute.POST(
                        postRequest({ ...PUBLIC_BODY, password: '1234567' }),
                );
                expect(res.status).toBe(422);
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});
