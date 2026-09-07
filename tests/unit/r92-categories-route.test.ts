/**
 * round92-C7 (agent 3-c) — CRUD/RBAC unit coverage for
 * GET+POST /api/categories (was 0% lcov, lines 10-131).
 *
 * The list/create route every owner dashboard calls daily. Both handlers are
 * run for real (mocked boundaries only: prisma via vi.hoisted, @/lib/auth as
 * a controllable holder that mirrors the requirePermission ladder of
 * src/lib/auth.ts — the ladder itself is pinned by rbac-matrix.test.ts —
 * plus logAudit / revalidateMenu spies). What these tests protect:
 *   - tenant scoping: an owner reads/writes ONLY restaurants they own or are
 *     linked to via UserRestaurant (multi-menu); the prisma `where`/`create`
 *     must carry the SESSION-verified restaurant, never raw client input
 *   - round86-A1: non-owner roles (USER!) must hold MANAGE_RESTAURANTS to
 *     write — previously USER could deface ANY tenant's live menu via ISR
 *   - plan ceiling (1000 categories), 404 unknown restaurant, zod 422,
 *     bad-JSON 400, and fail-closed 500 with NO internals leaked
 * Behavior notes pinned as-is (reported, not fixed): GET is read-only and
 * the restaurantId param check runs BEFORE auth (param-less request = 400
 * even for a guest).
 * round92-wave3-3: sub_admin READ now requires MANAGE_RESTAURANTS (B1-gate
 * consistency — was zero-permission passthrough, flipped deliberately).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks (orders-create / r92-subadmin-pii pattern) ─────────────

const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockMenuCategoryFindMany = vi.hoisted(() => vi.fn());
const mockMenuCategoryCount = vi.hoisted(() => vi.fn());
const mockMenuCategoryCreate = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
// list-counts runs for real: itemCountByCategory → prisma.menuItem.groupBy
const mockMenuItemGroupBy = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn(async () => {}));
const mockRevalidateMenu = vi.hoisted(() => vi.fn(async () => {}));

const mockPrisma = vi.hoisted(() => ({
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        menuCategory: { findMany: mockMenuCategoryFindMany, count: mockMenuCategoryCount, create: mockMenuCategoryCreate },
        restaurant: { findUnique: mockRestaurantFindUnique },
        menuItem: { groupBy: mockMenuItemGroupBy },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidateMenu }));

// Session persona holder — requireAuth resolves it; requirePermission mirrors
// the real ladder (src/lib/auth.ts): super_admin pass / admin full-trust
// except MANAGE_USERS / sub_admin needs the exact permission / else 403.
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
const ADMIN = persona({ userId: 1, role: 'admin', restaurantId: null });
const SUPER_ADMIN = persona({ userId: 2, role: 'super_admin', restaurantId: null });

// ── Route invocation helpers ────────────────────────────────────────────

async function callGet(query = '') {
        const { GET } = await import('@/app/api/categories/route');
        return GET(new NextRequest(`http://localhost/api/categories${query}`));
}

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
}

async function callPost(body?: unknown) {
        const { POST } = await import('@/app/api/categories/route');
        return POST(jsonRequest('http://localhost/api/categories', 'POST', body));
}

const VALID_CREATE = { name: 'مشروبات', nameAr: 'Drinks', restaurantId: 1 };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = persona(OWNER_A);
        // Default: NO UserRestaurant links → every cross-tenant attempt 403s
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockMenuCategoryFindMany.mockResolvedValue([
                { id: 11, name: 'Hot', nameAr: 'ساخن', sortOrder: 1, isActive: true, restaurantId: 1 },
        ]);
        mockMenuCategoryCount.mockResolvedValue(1);
        mockMenuItemGroupBy.mockResolvedValue([{ categoryId: 11, _count: { _all: 3 } }]);
        mockRestaurantFindUnique.mockResolvedValue({ plan: { maxItems: 100 } });
        mockMenuCategoryCreate.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
                id: 500,
                ...args.data,
        }));
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

// ── GET /api/categories — tenant-scoped list ────────────────────────────

describe('round92-C7 — GET /api/categories', () => {
        it('missing/garbage restaurantId → 400 BEFORE auth: the tenant param is mandatory (no silent platform-wide list)', async () => {
                // يحمي: قائمة بلا معرف مطعم كانت ستعني قراءة غير محدودة النطاق
                authHolder.value = persona(GUEST);
                const resMissing = await callGet('');
                expect(resMissing.status).toBe(400);
                expect((await resMissing.json()).error).toBe('معرف المطعم مطلوب');

                const resGarbage = await callGet('?restaurantId=abc');
                expect(resGarbage.status).toBe(400);
                expect((await resGarbage.json()).error).toBe('معرف المطعم مطلوب');
                expect(mockMenuCategoryFindMany).not.toHaveBeenCalled();
        });

        it('guest with a valid param → 401 Arabic envelope, no category row is read', async () => {
                // يحمي: المصادقة تسبق أي قراءة بيانات
                authHolder.value = persona(GUEST);
                const res = await callGet('?restaurantId=1');
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockMenuCategoryFindMany).not.toHaveBeenCalled();
        });

        it('USER → 403 (customers have no category read path)', async () => {
                // يحمي: دور الزبون لا يقرأ هيكل منيو الإدارة
                authHolder.value = persona(USER_PLAIN);
                const res = await callGet('?restaurantId=1');
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockMenuCategoryFindMany).not.toHaveBeenCalled();
        });

        it('owner on OWN restaurant → 200 and the where carries the session restaurant (fast path, no link lookup)', async () => {
                // يحمي: نطاق الاستعلام يأتي من الجلسة لا من العميل
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?restaurantId=1');
                expect(res.status).toBe(200);
                expect(mockMenuCategoryFindMany.mock.calls[0][0].where).toEqual({ restaurantId: 1 });
                expect(mockMenuCategoryFindMany.mock.calls[0][0].orderBy).toEqual({ sortOrder: 'asc' });
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                const json = await res.json();
                expect(json.data[0]._count.items).toBe(3);
                expect(json.meta.total).toBe(1);
        });

        it('owner on a FOREIGN restaurant without a link → 403, list never runs (tenant isolation)', async () => {
                // يحمي: منع تسريب فئات مطعم آخر عبر معرف يدخله العميل
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?restaurantId=2');
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockMenuCategoryFindMany).not.toHaveBeenCalled();
        });

        it('owner with a multi-menu UserRestaurant link → 200 reading the LINKED restaurant (verified, not trusted)', async () => {
                // يحمي: تعدد المنيوهات يُقبل فقط بعد تحقق الملكية من الجدول الرابط
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callGet('?restaurantId=2');
                expect(res.status).toBe(200);
                expect(mockMenuCategoryFindMany.mock.calls[0][0].where).toEqual({ restaurantId: 2 });
        });

        it('round92-wave3-3: sub_admin with zero permissions → 403 «لا تملك الصلاحية» (read now requires MANAGE_RESTAURANTS — B1-gate consistency)', async () => {
                // كان sub_admin يمر بلا أي إذن كالأدمن (تقرير 3-c رقم 1) — البوابة
                // اتُّحدت مع مسار POST وبوابة B1 للطلبات: إذن صريح للقراءة.
                authHolder.value = persona(SUB_ADMIN_ZERO);
                const res = await callGet('?restaurantId=2');
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا تملك الصلاحية');
                expect(mockMenuCategoryFindMany).not.toHaveBeenCalled();
        });

        it('round92-wave3-3: sub_admin WITH MANAGE_RESTAURANTS → 200 (delegated staff read)', async () => {
                // التفويض الصريح يفتح القراءة كما يفتح الكتابة
                authHolder.value = persona({ userId: 4, role: 'sub_admin', restaurantId: null, permissions: ['MANAGE_RESTAURANTS'] });
                const res = await callGet('?restaurantId=2');
                expect(res.status).toBe(200);
                expect(mockMenuCategoryFindMany).toHaveBeenCalled();
        });

        it.each([
                ['admin', ADMIN],
                ['super_admin', SUPER_ADMIN],
        ] as const)('%s → 200 (staff read, unchanged)', async (_label, user) => {
                authHolder.value = persona(user);
                const res = await callGet('?restaurantId=2');
                expect(res.status).toBe(200);
        });

        it('_count.items comes from the page-scoped groupBy (round88-A2): fetched ids counted, missing id → 0', async () => {
                // يحمي: العدّادات لصفحات القائمة فقط لا aggregate منصة كاملة
                authHolder.value = persona(OWNER_A);
                mockMenuCategoryFindMany.mockResolvedValue([
                        { id: 11, name: 'A', sortOrder: 1, restaurantId: 1 },
                        { id: 12, name: 'B', sortOrder: 2, restaurantId: 1 },
                ]);
                mockMenuItemGroupBy.mockResolvedValue([{ categoryId: 11, _count: { _all: 3 } }]);
                const res = await callGet('?restaurantId=1');
                const json = await res.json();
                expect(mockMenuItemGroupBy).toHaveBeenCalledWith({
                        by: ['categoryId'],
                        _count: { _all: true },
                        where: { categoryId: { in: [11, 12] } },
                });
                expect(json.data[0]._count.items).toBe(3);
                expect(json.data[1]._count.items).toBe(0);
        });

        it('empty page → groupBy is skipped entirely (no query for zero ids)', async () => {
                // يحمي: لا استعلام عدّ عند صفحة فارغة
                authHolder.value = persona(OWNER_A);
                mockMenuCategoryFindMany.mockResolvedValue([]);
                const res = await callGet('?restaurantId=1');
                expect(res.status).toBe(200);
                expect(mockMenuItemGroupBy).not.toHaveBeenCalled();
                expect((await res.json()).data).toEqual([]);
        });

        it('pagination reaches prisma: page=2&pageSize=5 → skip 5 / take 5', async () => {
                // يحمي: حدود الصفحة تُطبق فعليًا في الاستعلام
                authHolder.value = persona(OWNER_A);
                const res = await callGet('?restaurantId=1&page=2&pageSize=5');
                expect(res.status).toBe(200);
                const args = mockMenuCategoryFindMany.mock.calls[0][0];
                expect(args.skip).toBe(5);
                expect(args.take).toBe(5);
                expect((await res.json()).meta.pageSize).toBe(5);
        });

        it('unexpected DB failure → 500 generic Arabic message, nothing internal leaked', async () => {
                // يحمي: فشل قاعدة البيانات لا يسريب تفاصيل داخلية
                authHolder.value = persona(OWNER_A);
                mockMenuCategoryFindMany.mockRejectedValue(new Error('boom stack secret'));
                const res = await callGet('?restaurantId=1');
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('boom');
        });
});

// ── POST /api/categories — tenant-scoped create ─────────────────────────

describe('round92-C7 — POST /api/categories', () => {
        it('guest → 401 before the body is even parsed', async () => {
                // يحمي: الكتابة تتطلب جلسة دائمًا
                authHolder.value = persona(GUEST);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(401);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('owner posting into a FOREIGN restaurant without a link → 403, create never runs', async () => {
                // يحمي: لا إنشاء فئات في منيو مطعم آخر (تشويه عبر purge ISR)
                authHolder.value = persona(OWNER_A);
                const res = await callPost({ ...VALID_CREATE, restaurantId: 2 });
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('owner with a link to a second menu → 201 into that restaurant (multi-menu write)', async () => {
                // يحمي: الكتابة متعددة المنيوهات بعد تحقق الرابط
                authHolder.value = persona(OWNER_A);
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2, isPrimary: false });
                const res = await callPost({ ...VALID_CREATE, restaurantId: 2 });
                expect(res.status).toBe(201);
                expect(mockMenuCategoryCreate.mock.calls[0][0].data.restaurantId).toBe(2);
        });

        it('USER → 403 from the MANAGE_RESTAURANTS gate (round86-A1 defacement fix), create never runs', async () => {
                // يحمي: إصلاح round86 — USER كان يمر مباشرة ويكتب في أي منيو حي
                authHolder.value = persona(USER_PLAIN);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا تملك الصلاحية');
                expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_RESTAURANTS');
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('sub_admin without MANAGE_RESTAURANTS → 403 (permission, not role membership)', async () => {
                // يحمي: عضوية الدور لا تكفي للكتابة
                authHolder.value = persona(SUB_ADMIN_ZERO);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لا تملك الصلاحية');
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('sub_admin WITH MANAGE_RESTAURANTS → 201 (delegated staff write)', async () => {
                // يحمي: التفويض الصريح يعمل كما صمم
                authHolder.value = persona({ userId: 4, role: 'sub_admin', restaurantId: null, permissions: ['MANAGE_RESTAURANTS'] });
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(201);
                expect(mockMenuCategoryCreate).toHaveBeenCalled();
        });

        it('admin (legacy full-trust) → 201, no link required', async () => {
                // يحمي: سلوك الأدمن الثقة الكاملة قائم
                authHolder.value = persona(ADMIN);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(201);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('owner path bypasses requirePermission entirely (gate only guards non-owners)', async () => {
                // يحمي: المالك لا يحتاج إذن sub_admin على مطعمه
                authHolder.value = persona(OWNER_A);
                await callPost(VALID_CREATE);
                expect(mockRequirePermission).not.toHaveBeenCalled();
        });

        it('zod rejects invalid payloads → 422 Arabic envelope with details, create never runs', async () => {
                // يحمي: التحقق من الصيغة يسبق أي كتابة (name فارغ/restaurantId نص)
                authHolder.value = persona(OWNER_A);
                const res = await callPost({ name: '', restaurantId: 'x' });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة');
                expect(Array.isArray(json.details)).toBe(true);
                expect(json.details.length).toBeGreaterThan(0);
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('non-JSON body → 400 JSON envelope (not a 500)', async () => {
                // يحمي: جسم غير صالح لا يصل إلى قاعدة البيانات ولا يظهر 500
                authHolder.value = persona(OWNER_A);
                const { POST } = await import('@/app/api/categories/route');
                const res = await POST(new NextRequest('http://localhost/api/categories', { method: 'POST', body: 'not-json' }));
                expect(res.status).toBe(400);
                expect((await res.json()).error).toBe('بيانات غير صالحة — خطأ في صيغة JSON');
        });

        it('unknown restaurant → 404 Arabic «المطعم غير موجود» (no orphan create)', async () => {
                // يحمي: الفئة لا تُنشأ لمطعم غير موجود
                authHolder.value = persona(OWNER_A);
                mockRestaurantFindUnique.mockResolvedValue(null);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(404);
                expect((await res.json()).error).toBe('المطعم غير موجود');
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('category ceiling reached (1000) → 403 with the limit spelled out in Arabic', async () => {
                // يحمي: سقف تنظيمي يمنع النمو غير المحدود للفئات
                authHolder.value = persona(OWNER_A);
                mockMenuCategoryCount.mockResolvedValue(1000);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe('لقد وصلت للحد الأقصى للأقسام (1000).');
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
        });

        it('happy path side effects: 201 + defaults (icon "", sortOrder 0, isActive true) + audit + revalidateMenu(rid)', async () => {
                // يحمي: عقد الإنشاء الكامل — القيم الافتراضية + التدقيق + إبطال كاش ISR للنطاق الصحيح
                authHolder.value = persona(OWNER_A);
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(201);
                const data = mockMenuCategoryCreate.mock.calls[0][0].data;
                expect(data).toMatchObject({
                        name: 'مشروبات',
                        nameAr: 'Drinks',
                        icon: '',
                        sortOrder: 0,
                        isActive: true,
                        restaurantId: 1,
                });
                expect(mockLogAudit).toHaveBeenCalledWith(
                        expect.objectContaining({
                                action: 'create',
                                actorId: 10,
                                targetType: 'menuCategory',
                                metadata: { restaurantId: 1, name: 'مشروبات' },
                        })
                );
                expect(mockRevalidateMenu).toHaveBeenCalledWith(1);
        });

        it('created row without optionals → defaults land (nameAr null, icon "", sortOrder 0, isActive true)', async () => {
                // يحمي: عقد القيم الافتراضية عند غياب الحقول الاختيارية
                authHolder.value = persona(OWNER_A);
                const res = await callPost({ name: 'حلويات', restaurantId: 1 });
                expect(res.status).toBe(201);
                expect(mockMenuCategoryCreate.mock.calls[0][0].data).toMatchObject({
                        name: 'حلويات',
                        nameAr: null,
                        icon: '',
                        sortOrder: 0,
                        isActive: true,
                });
        });

        it('audit failure is fire-and-forget: create still 201 even if logAudit rejects', async () => {
                // يحمي: فشل التدقيق لا يفشل إنشاء الفئة ( الغرض من .catch )
                authHolder.value = persona(OWNER_A);
                mockLogAudit.mockRejectedValueOnce(new Error('audit pipe down'));
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(201);
                expect(mockMenuCategoryCreate).toHaveBeenCalled();
        });

        it('unexpected create failure → 500 generic Arabic message, no internals leaked', async () => {
                // يحمي: فشل الإنشاء لا يكشف تفاصيل قاعدة البيانات
                authHolder.value = persona(OWNER_A);
                mockMenuCategoryCreate.mockRejectedValue(new Error('prisma internals'));
                const res = await callPost(VALID_CREATE);
                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(JSON.stringify(json)).not.toContain('prisma internals');
        });
});
