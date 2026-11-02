/**
 * P42-6b (Wave-6 backend audit) — سقف الاسترجاع: اختبارات الانحدار.
 *
 * الثغرة: PUT /api/items/[id] بلا فحص سقف على الانتقال مؤرشف→حي، بينما
 * POST /api/items يعدّ الحيّ حصرًا منذ P42-W3 («المؤرشف لا يستهلك السقف») —
 * فالاسترجاع دخول جديد للمجموعة الحية بلا حارس: مالك عند maxItems=N يؤرشف
 * k ثم ينشئ k (العدّ N) ثم يسترجع فيعيش N+k صنفًا حيًّا فوق سقف خطته.
 *
 * العقد المثبَّت هنا:
 *  (أ) عقود المصدر: نفس حارس POST حرفيًا في مسار الاسترجاع (قفل صف المطعم
 *      FOR UPDATE داخل معاملة + قراءة maxItems تحت القفل + عدّ archivedAt:
 *      null + PlanLimitError(kind:'items') → 403).
 *  (ب) السلوك: الرفض عند السقف، والكتابة دونه، والمسار المباشر لأي PUT آخر
 *      (أرشفة/تحرير مؤرشف بلا استرجاع)، والسقف على مطعم الوجهة عند نقل+استرجاع.
 *
 * النمط: هرمية بلا قاعدة بيانات — نفس حاضنة item-archival.test.ts (وكيل
 * prisma + رد نداء المعاملة ينفَّذ بعميل معاملة كامل).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raw = (p: string) =>
        readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), 'utf8');

/* ── (أ) عقود المصدر — الحارس حرفيًا في المسار ─────────────────────────── */

describe('P42-6b — عقود المصدر: حارس سقف الاسترجاع في PUT /api/items/[id]', () => {
        const src = raw('src/app/api/items/[id]/route.ts');
        const postSrc = raw('src/app/api/items/route.ts');

        it('الانتقال مؤرشف→حي مُكتشَف صراحةً (شرط الاسترجاع)', () => {
                expect(src).toContain('body.archivedAt === null && existing.archivedAt !== null');
        });

        it('قفل صف المطعم FOR UPDATE داخل معاملة الاسترجاع — نفس سطر POST', () => {
                const lockLine = 'SELECT id FROM "Restaurant" WHERE id = ';
                expect(src).toContain(`tx.$queryRaw\`SELECT id FROM "Restaurant" WHERE id = \${capRestaurantId} FOR UPDATE\``);
                // اتساق عائلة: POST يقفل الصف نفسه بصيغة مطابقة
                expect(postSrc).toContain(`tx.$queryRaw\`SELECT id FROM "Restaurant" WHERE id = \${category.restaurant.id} FOR UPDATE\``);
                expect(lockLine).toBeTruthy();
        });

        it('السقف يُقرأ تحت القفل (لا قيمة ما قبل المعاملة) والعدّ يحصي الحيّ حصرًا', () => {
                const m = src.match(/const liveCount = await tx\.menuItem\.count\(\{[\s\S]*?\}\);/);
                expect(m, 'عدّاد السقف داخل معاملة الاسترجاع غير موجود').toBeTruthy();
                expect(m![0]).toContain('archivedAt: null');
                expect(m![0]).toContain('category: { is: { restaurantId: capRestaurantId } }');
                // maxItems من القراءة المقفولة حصرًا (locked.maxItems) — لا fallback مسبق
                expect(src).toMatch(/if \(liveCount >= locked\.maxItems\)/);
        });

        it('الرفض بنفس خطأ عائلة السقوف (kind items) ونفس 403', () => {
                const m = src.match(/throw new PlanLimitError\(\{[\s\S]*?\}\);/);
                expect(m, 'PlanLimitError غير مرمي في مسار الاسترجاع').toBeTruthy();
                expect(m![0]).toContain("kind: 'items'");
                expect(src).toMatch(/if \(e instanceof PlanLimitError\) return error\(e\.message, 403\)/);
        });

        it('اتساق POST: عدّاد سقف الإنشاء يشترط الحيّ حصرًا (مرآة الاسترجاع)', () => {
                const m = postSrc.match(/const existingCount = await tx\.menuItem\.count\(\{[\s\S]*?\}\);/);
                expect(m, 'عدّاد السقف في POST غير موجود').toBeTruthy();
                expect(m![0]).toContain('archivedAt: null');
        });
});

/* ── (ب) السلوك الحرفي — مسار مُوكّل ─────────────────────────────────── */

const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockMenuCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTxQueryRaw = vi.hoisted(() => vi.fn());
const mockTxRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTxMenuItemCount = vi.hoisted(() => vi.fn());
const mockTxMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());

const txClient = vi.hoisted(() => ({
        $queryRaw: mockTxQueryRaw,
        restaurant: { findUnique: mockTxRestaurantFindUnique },
        menuItem: { count: mockTxMenuItemCount, update: mockTxMenuItemUpdate },
}));

const mockPrisma = vi.hoisted(() => ({
        menuItem: {
                findUnique: mockMenuItemFindUnique,
                update: mockMenuItemUpdate,
        },
        menuCategory: { findUnique: mockMenuCategoryFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({
                authorized: true,
                role: 'owner',
                restaurantId: 5,
                userId: 1,
                permissions: [],
        })),
        requirePermission: vi.fn(async () => ({ authorized: true })),
}));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn(async () => {}) }));
vi.mock('@/lib/blob', () => ({
        deleteBlob: vi.fn(),
        mediaUrlError: vi.fn(() => null),
}));

function makeRequest(url: string, method: string, body?: unknown): NextRequest {
        return new NextRequest(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
}

const ARCHIVED_ITEM = {
        id: 71,
        name: 'كابتشينو',
        price: 7,
        discountedPrice: null,
        image: '',
        status: 'available',
        archivedAt: new Date('2026-11-01T00:00:00Z'),
        categoryId: 9,
        isFeatured: false,
        showcaseTags: [] as string[],
        category: { id: 9, restaurantId: 5 },
};

/** تنفيذ معاملة الاسترجاع بعميل كامل — تسلسل الاستدعاءات يُسجَّل للترتيب. */
function mockRestoreTx(locked: { maxItems: number; plan?: { nameAr: string } | null }) {
        mockTransaction.mockImplementationOnce(
                async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient),
        );
        mockTxQueryRaw.mockReset().mockResolvedValue([]);
        mockTxRestaurantFindUnique.mockReset().mockResolvedValue({
                maxItems: locked.maxItems,
                plan: locked.plan === undefined ? { nameAr: 'الأساسية' } : locked.plan,
        });
        mockTxMenuItemCount.mockReset();
        mockTxMenuItemUpdate.mockReset().mockResolvedValue({ ...ARCHIVED_ITEM, archivedAt: null });
}

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 99, reset: 0 });
        mockMenuItemUpdate.mockReset().mockResolvedValue({ ...ARCHIVED_ITEM, archivedAt: null });
        mockMenuItemFindUnique.mockReset();
        mockMenuCategoryFindUnique.mockReset();
        mockUserRestaurantFindUnique.mockReset().mockResolvedValue({ id: 3 });
});

describe('P42-6b — سلوك سقف الاسترجاع (PUT /api/items/[id])', () => {
        it('استرجاع عند السقف: 403 برسالة العائلة + اسم الخطة، ولا كتابة إطلاقًا', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ARCHIVED_ITEM });
                mockRestoreTx({ maxItems: 10 });
                mockTxMenuItemCount.mockResolvedValue(10); // الحيّ = السقف تمامًا

                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', { archivedAt: null }),
                        { params: Promise.resolve({ id: '71' }) },
                );

                expect(res.status).toBe(403);
                const j = await res.json();
                expect(j.success).toBe(false);
                expect(j.error).toContain('للأصناف');
                expect(j.error).toContain('الأساسية');
                expect(j.error).toContain('قم بترقية خطتك');
                // لا كتابة لا داخل المعاملة ولا خارجها
                expect(mockTxMenuItemUpdate).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });

        it('استرجاع دون السقف: الكتابة تمر — والترتيب قفل→قراءة→عدّ→كتابة', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ARCHIVED_ITEM });
                mockRestoreTx({ maxItems: 10 });
                mockTxMenuItemCount.mockResolvedValue(9);

                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', { archivedAt: null }),
                        { params: Promise.resolve({ id: '71' }) },
                );

                expect(res.status).toBe(200);
                expect(mockTxMenuItemUpdate).toHaveBeenCalledTimes(1);
                expect(mockTxMenuItemUpdate.mock.calls[0][0].data.archivedAt).toBeNull();

                // ترتيب التسلسل داخل المعاملة: القفل قبل القراءة قبل العدّ قبل الكتابة
                const order: string[] = [];
                mockTxQueryRaw.mock.calls.forEach(() => order.push('lock'));
                mockTxRestaurantFindUnique.mock.calls.forEach(() => order.push('read'));
                mockTxMenuItemCount.mock.calls.forEach(() => order.push('count'));
                mockTxMenuItemUpdate.mock.calls.forEach(() => order.push('write'));
                expect(order).toEqual(['lock', 'read', 'count', 'write']);
        });

        it('تحرير صنف مؤرشف بلا حقل archivedAt: المسار المباشر — لا معاملة سقف', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ARCHIVED_ITEM });

                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', { status: 'unavailable' }),
                        { params: Promise.resolve({ id: '71' }) },
                );

                expect(res.status).toBe(200);
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
                expect(mockMenuItemUpdate.mock.calls[0][0].data).not.toHaveProperty('archivedAt');
        });

        it('الأرشفة نفسها (archivedAt: تاريخ): المسار المباشر — نقص المجموعة الحية لا يُفحص', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ARCHIVED_ITEM, archivedAt: null });

                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', {
                                archivedAt: '2026-11-02T10:00:00.000Z',
                        }),
                        { params: Promise.resolve({ id: '71' }) },
                );

                expect(res.status).toBe(200);
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
        });

        it('نقل + استرجاع في طلب واحد: السقف على مطعم الوجهة لا المطعم الأصلي', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ARCHIVED_ITEM });
                // وجهة في مطعم آخر يملكه المالك (رابط UserRestaurant يُحلّ)
                mockMenuCategoryFindUnique.mockResolvedValue({ restaurantId: 7 });
                mockRestoreTx({ maxItems: 3 });
                mockTxMenuItemCount.mockResolvedValue(3); // مطعم الوجهة عند سقفه

                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', {
                                archivedAt: null,
                                categoryId: 12,
                        }),
                        { params: Promise.resolve({ id: '71' }) },
                );

                expect(res.status).toBe(403);
                // القفل والعدّ على مطعم الوجهة (7) — لا الأصلي (5)
                expect(mockTxQueryRaw.mock.calls[0][1]).toBe(7);
                expect(mockTxMenuItemCount.mock.calls[0][0].where.category.is.restaurantId).toBe(7);
                expect(mockTxMenuItemUpdate).not.toHaveBeenCalled();
        });
});
