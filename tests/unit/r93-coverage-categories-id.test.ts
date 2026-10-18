/**
 * r93-W3 — جزيرة تغطية 2: /api/categories/[id] (كان 50% أسطر — PUT مغطى
 * جزئيًا في rbac-matrix (أدوار فقط) وDELETE كله بلا اختبار إطلاقًا —
 * تقرير 1-e §3: «categories/[id]: 50% بينما الأساسي 100% ✓»).
 *
 * المعالجان يُشغَّلان حقيقيًا (منكَّرات الحدود فقط: prisma عبر vi.hoisted،
 * @/lib/auth كحامل مرآة لسلّم src/lib/auth.ts — السلّم نفسه مثبّت في
 * rbac-matrix.test.ts — وlogAudit/revalidateMenu جاسوسان). ما تحميه:
 *   - بوابة المستأجر في كلا الفعلين: المالك يمر عبر المسار السريع
 *     (مطعم الجلسة) أو عبر رابط UserRestaurant محقَّق (تعدد المنيوهات) —
 *     معرف العميل لا يُصدَّق أبدًا؛ الموظفون (admin/sub_admin) يحتاجون
 *     MANAGE_RESTAURANTS · USER/مجهول يسقطان مبكرًا
 *   - فروع round90-F6: معرف غير رقمي → 400 قبل أي استعلام، ومجهول → 404
 *     «القسم غير موجود» (لا كلمات إنجليزية للعميل)
 *   - عقد الحذف: delete بنطاق المعرف المحقَّق + صف تدقيق (delete +
 *     restaurantId + الاسم) + إبطال كاش ISR (round85-B9) + { id } في الرد
 *   - عقد التعديل: update بجزء body المُصدَّق فقط + تدقيق fields + إبطال
 *     ISR لمطعم القسم لا مطعم الجلسة
 *   - 422 صيغة (اسم فارغ/ترتيب عشري) · 400 جسم غير JSON · 500 عام بلا
 *     تسريب (put/delete)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks (r92-categories-route pattern) ────────────────────────

const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockMenuCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockMenuCategoryUpdate = vi.hoisted(() => vi.fn());
const mockMenuCategoryDelete = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn(async () => {}));
const mockRevalidateMenu = vi.hoisted(() => vi.fn(async () => {}));

const mockPrisma = vi.hoisted(() => ({
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        menuCategory: { findUnique: mockMenuCategoryFindUnique, update: mockMenuCategoryUpdate, delete: mockMenuCategoryDelete },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// W6-B6 (G-5): categories/[id] PUT/DELETE now carry the owner
// subscription-expiry guard — stubbed like the family's tests.
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidateMenu }));

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
                restaurantId: 1 as number | null,
                subscriptionStatus: 'active' as string | null,
                permissions: [] as string[],
        },
}));

const mockRequirePermission = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
        requireAuth: async () => authHolder.value,
        requirePermission: mockRequirePermission,
}));

// ── Personas ─────────────────────────────────────────────────────────────

const persona = (o: Partial<AuthShape>): AuthShape => ({
        authorized: true,
        userId: 10,
        role: 'owner',
        restaurantId: 1,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});

const GUEST = persona({ authorized: false, userId: null });
const OWNER_A = persona({ userId: 10, role: 'owner', restaurantId: 1 });
const USER_PLAIN = persona({ userId: 55, role: 'USER', restaurantId: null });
const SUB_ADMIN_ZERO = persona({ userId: 3, role: 'sub_admin', restaurantId: null, permissions: [] });
const SUB_ADMIN_MR = persona({ userId: 4, role: 'sub_admin', restaurantId: null, permissions: ['MANAGE_RESTAURANTS'] });
const ADMIN = persona({ userId: 1, role: 'admin', restaurantId: null });
const SUPER_ADMIN = persona({ userId: 2, role: 'super_admin', restaurantId: null });

/** قسم مطعم الجلسة (المسار السريع) وقسم مطعم أجنبي (يحتاج رابطًا). */
const CAT_OWN = { id: 11, restaurantId: 1, name: 'مشروبات', nameAr: 'Drinks', sortOrder: 1, isActive: true };
const CAT_FOREIGN = { id: 88, restaurantId: 2, name: 'Drinks', nameAr: 'مشروبات', sortOrder: 2, isActive: true };

// ── Route invocation helpers ────────────────────────────────────────────

const idParams = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                ...(body !== undefined ? { body: JSON.stringify(body) } : { body: 'not-json' }),
        });
}

async function callPut(id: number | string, body?: unknown) {
        const { PUT } = await import('@/app/api/categories/[id]/route');
        return PUT(jsonRequest(`http://localhost/api/categories/${id}`, 'PUT', body), idParams(id));
}

async function callDelete(id: number | string) {
        const { DELETE } = await import('@/app/api/categories/[id]/route');
        return DELETE(jsonRequest(`http://localhost/api/categories/${id}`, 'DELETE'), idParams(id));
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = persona(OWNER_A);
        // default: القسم المطلوب تابع لمطعم الجلسة (المسار السريع)
        mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_OWN });
        // default: لا روابط → أي محاولة عبور مستأجر 403
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockMenuCategoryUpdate.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
                ...CAT_OWN,
                ...args.data,
        }));
        mockMenuCategoryDelete.mockResolvedValue({ id: 11 });
        mockRequirePermission.mockImplementation(async (permission: string) => {
                const v = authHolder.value;
                if (!v.authorized) return { authorized: false as const, error: 'غير مصرح', status: 401 };
                if (v.role === 'super_admin') return { ...v, authorized: true as const };
                if (v.role === 'admin') {
                        if (permission === 'MANAGE_USERS') {
                                return { authorized: false as const, error: 'لا تملك الصلاحية', status: 403 };
                        }
                        return { ...v, authorized: true as const };
                }
                if (v.role === 'sub_admin' && v.permissions.includes(permission)) {
                        return { ...v, authorized: true as const };
                }
                return { authorized: false as const, error: 'لا تملك الصلاحية', status: 403 };
        });
});

// ── PUT — فروع البوابة المتبقية ────────────────────────────────────────

describe('r93-W3 — PUT /api/categories/[id]: بوابة الدخول', () => {
        it('مجهول → 401 «غير مصرح» قبل أي قراءة قاعدة', async () => {
                // يحمي: فرع auth غير المغطى — لا تعديل فئات بلا جلسة
                authHolder.value = persona(GUEST);
                const res = await callPut(11, { name: 'X' });
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockMenuCategoryFindUnique).not.toHaveBeenCalled();
        });

        it('معرف غير رقمي → 400 «معرّف غير صالح» (round90-F6) قبل أي استعلام', async () => {
                // يحمي: قمامة المسار لا تصل للقاعدة
                const res = await callPut('abc', { name: 'X' });
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرّف غير صالح');
                expect(mockMenuCategoryFindUnique).not.toHaveBeenCalled();
        });

        it('قسم غير موجود → 404 «القسم غير موجود» (round90-F6: لا كلمة إنجليزية للعميل)', async () => {
                // يحمي: فرع 404 — رسالة عربية للكيان الصحيح
                mockMenuCategoryFindUnique.mockResolvedValue(null);
                const res = await callPut(999, { name: 'X' });
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('القسم غير موجود');
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });
});

// ── PUT — المستأجر والدور ───────────────────────────────────────────────

describe('r93-W3 — PUT /api/categories/[id]: نطاق المستأجر', () => {
        it('مالك عبر المسار السريع (مطعم الجلسة) → 200 بلا بحث روابط إطلاقًا', async () => {
                // يحمي: المالك الشرعي لا يدفع كلفة فحص الرابط
                const res = await callPut(11, { name: 'مشروبات ساخنة', sortOrder: 3 });
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                expect(mockRequirePermission).not.toHaveBeenCalled();
                expect(mockMenuCategoryUpdate).toHaveBeenCalledWith({
                        where: { id: 11 },
                        data: { name: 'مشروبات ساخنة', sortOrder: 3 },
                });
        });

        it('مالك على قسم مطعم آخر مع رابط UserRestaurant → 200 (تعدد منيوهات محقَّق)', async () => {
                // يحمي: الرابط — لا معرف العميل — هو ما يفتح الكتابة
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callPut(88, { name: 'Drinks EN' });
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockMenuCategoryUpdate).toHaveBeenCalledWith({
                        where: { id: 88 },
                        data: { name: 'Drinks EN' },
                });
        });

        it('sub_admin WITH MANAGE_RESTAURANTS → 200 (موظف مفوَّض يعدّل قسم أي مطعم)', async () => {
                // يحمي: التفويض الصريح يعمل كما صمم
                authHolder.value = persona(SUB_ADMIN_MR);
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                const res = await callPut(88, { name: 'X' });
                expect(res.status).toBe(200);
                expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_RESTAURANTS');
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('super_admin → 200 (يتجاوز سلّم الإذن تلقائيًا)', async () => {
                authHolder.value = persona(SUPER_ADMIN);
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                const res = await callPut(88, { name: 'X' });
                expect(res.status).toBe(200);
        });
});

// ── PUT — عقد التعديل والأثر الجانبي ────────────────────────────────────

describe('r93-W3 — PUT /api/categories/[id]: عقد التعديل', () => {
        it('201-shape: update يمرر body المُصدَّق فقط والتدقيق يوثق الحقول + إبطال ISR لمطعم القسم', async () => {
                // يحمي: التعديل يوثَّق ويُبطل كاش المنيو الصحيح (مطعم القسم لا مطعم الجلسة)
                const res = await callPut(11, { name: 'حلويات', isActive: false });
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toMatchObject({ id: 11, name: 'حلويات', isActive: false });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: 'update',
                                actorId: 10,
                                targetType: 'menuCategory',
                                targetId: 11,
                                metadata: { restaurantId: 1, fields: ['name', 'isActive'] },
                        })
                );
                expect(mockRevalidateMenu).toHaveBeenCalledWith(1);
        });

        it('إبطال ISR يستهدف مطعم القسم الأجنبي عند التعديل عبر رابط (لا مطعم الجلسة)', async () => {
                // يحمي: purge للنطاق الصحيح — تعديل قسم مطعم 2 يبطل كاش 2
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                await callPut(88, { name: 'X' });
                expect(mockRevalidateMenu).toHaveBeenCalledWith(2);
                expect(mockRevalidateMenu).not.toHaveBeenCalledWith(1);
        });

        it('اسم فارغ → 422 بعربي + تفاصيل، لا update', async () => {
                // يحمي: صيغة القسم ترفض قبل الكتابة
                const res = await callPut(11, { name: '' });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة');
                expect(Array.isArray(json.details)).toBe(true);
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });

        it('sortOrder عشري (غير صحيح) → 422', async () => {
                const res = await callPut(11, { sortOrder: 1.5 });
                expect(res.status).toBe(422);
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });

        it('جسم غير JSON → 400 مغلّف (ليس 500)', async () => {
                const res = await callPut(11, undefined); // body: 'not-json'
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('بيانات غير صالحة — خطأ في صيغة JSON');
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });

        it('فشل التدقيق fire-and-forget: التعديل يظل 200 (الغرض من .catch)', async () => {
                // يحمي: انهيار أنبوب التدقيق لا يفشل تعديل المالك (نفس عقد POST
                // في r92-categories-route) — ويغطي رد نداء الابتلاع نفسه
                mockLogAudit.mockRejectedValueOnce(new Error('audit pipe down'));
                const res = await callPut(11, { name: 'X' });
                expect(res.status).toBe(200);
                expect(mockMenuCategoryUpdate).toHaveBeenCalled();
                expect(mockRevalidateMenu).toHaveBeenCalledWith(1);
        });

        it('فشل update غير متوقع → 500 عربي عام بلا تسريب', async () => {
                // يحمي: فشل التعديل لا يكشف تفاصيل القاعدة
                mockMenuCategoryUpdate.mockRejectedValue(new Error('update internals leak'));
                const res = await callPut(11, { name: 'X' });
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('internals');
        });
});

// ── DELETE — بوابة الدخول ───────────────────────────────────────────────

describe('r93-W3 — DELETE /api/categories/[id]: بوابة الدخول', () => {
        it('مجهول → 401 قبل أي قراءة', async () => {
                authHolder.value = persona(GUEST);
                const res = await callDelete(11);
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockMenuCategoryFindUnique).not.toHaveBeenCalled();
        });

        it('معرف غير رقمي → 400 «معرّف غير صالح»', async () => {
                const res = await callDelete('xyz');
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('معرّف غير صالح');
                expect(mockMenuCategoryDelete).not.toHaveBeenCalled();
        });

        it('قسم غير موجود → 404 «القسم غير موجود»، لا حذف', async () => {
                mockMenuCategoryFindUnique.mockResolvedValue(null);
                const res = await callDelete(999);
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('القسم غير موجود');
                expect(mockMenuCategoryDelete).not.toHaveBeenCalled();
        });

        it('USER → 403 من بوابة MANAGE_RESTAURANTS، لا حذف', async () => {
                // يحمي: الزبون لا يمس هيكل المنيو
                authHolder.value = persona(USER_PLAIN);
                const res = await callDelete(11);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا تملك الصلاحية');
                expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_RESTAURANTS');
                expect(mockMenuCategoryDelete).not.toHaveBeenCalled();
        });

        it('sub_admin صفر أذونات → 403 (العضوية لا تكفي)', async () => {
                authHolder.value = persona(SUB_ADMIN_ZERO);
                const res = await callDelete(11);
                expect(res.status).toBe(403);
                expect(mockMenuCategoryDelete).not.toHaveBeenCalled();
        });
});

// ── DELETE — المستأجر وعقد الحذف ────────────────────────────────────────

describe('r93-W3 — DELETE /api/categories/[id]: نطاق المستأجر', () => {
        it('مالك على قسم مطعم آخر بلا رابط → 403، الرابط يُفحص بمفتاحه الصحيح، لا حذف', async () => {
                // يحمي: عزل المستأجرين — حذف فئات مطعم آخر مستحيل بلا رابط
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                const res = await callDelete(88);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockMenuCategoryDelete).not.toHaveBeenCalled();
        });

        it('مالك عبر المسار السريع → 200: delete بالمعرف المحقَّق + تدقيق + إبطال ISR + { id }', async () => {
                // يحمي: عقد الحذف الكامل للرحلة اليومية للمالك
                const res = await callDelete(11);
                expect(res.status).toBe(200);
                expect(await res.json()).toEqual({ success: true, data: { id: 11 } });
                expect(mockMenuCategoryDelete).toHaveBeenCalledWith({ where: { id: 11 } });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: 'delete',
                                actorId: 10,
                                targetType: 'menuCategory',
                                targetId: 11,
                                metadata: { restaurantId: 1, name: 'مشروبات' },
                        })
                );
                expect(mockRevalidateMenu).toHaveBeenCalledWith(1);
        });

        it('مالك برابط لمطعم آخر → 200 والحذف لمعرف القسم الأجنبي (تعدد منيوهات)', async () => {
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callDelete(88);
                expect(res.status).toBe(200);
                expect(mockMenuCategoryDelete).toHaveBeenCalledWith({ where: { id: 88 } });
                expect(mockRevalidateMenu).toHaveBeenCalledWith(2);
        });

        it('admin → 200 (ثقة كاملة بلا فحص روابط)', async () => {
                authHolder.value = persona(ADMIN);
                mockMenuCategoryFindUnique.mockResolvedValue({ ...CAT_FOREIGN });
                const res = await callDelete(88);
                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('فشل التدقيق fire-and-forget: الحذف يظل 200 (الغرض من .catch)', async () => {
                // يحمي: نفس العقد في الحذف — التدقيق أفضل جهد لا رابعًا للفشل
                mockLogAudit.mockRejectedValueOnce(new Error('audit pipe down'));
                const res = await callDelete(11);
                expect(res.status).toBe(200);
                expect(mockMenuCategoryDelete).toHaveBeenCalled();
                expect(mockRevalidateMenu).toHaveBeenCalledWith(1);
        });

        it('فشل الحذف غير المتوقع → 500 عربي عام بلا تسريب', async () => {
                // يحمي: فشل الحذف لا يكشف شيئًا داخليًا
                mockMenuCategoryDelete.mockRejectedValue(new Error('cascade delete internals'));
                const res = await callDelete(11);
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('cascade');
        });
});
