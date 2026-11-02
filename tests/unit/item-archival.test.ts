/**
 * P42-W3 (قرار المالك عبر IM، 2026-11-02) — الأرشفة الحقيقية: اختبارات العقد.
 *
 * لماذا هذا الملف: المالك رفض الحذف (الطلبات المختلطة الـ13 «بيانات يجب
 * الحفاظ عليها») ورفض sold-out (يُبقي بطاقة رمادية بقرار r135) وطلب «نظام
 * أرشفة أو إخفاء حقيقيًا يستبعد الأصناف التجريبية من واجهة العملاء» مع
 * «اختبارات تثبت اختفاء الأصناف من العرض العام وبقاء الطلبات القديمة سليمة».
 * كل اختبار أدناه يسمّي ذاك الشرط حرفيًا.
 *
 * النمط: عائلة المجموعة هرمية بلا قاعدة بيانات — (أ) مسح مصدر للأسطح
 * العامة (نفس فلسفة demo-content-guard: العقد المكتوب في الاستعلام هو
 * ما يُنفَّذ في الإنتاج)، و(ب) مسارات API بوكلاء prisma (نفس نمط
 * orders-create.test.ts) للسلوك الحرفي: الرفض عند الطلب، والكتابة عند
 * الأرشفة/الاسترجاع.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raw = (p: string) =>
        readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), 'utf8');

/* ── (أ) عقود العرض العام — مصدر الاستعلامات ─────────────────────────── */

describe('P42-W3 — الصنف المؤرشف غائب عن كل سطح عام (عقود المصدر)', () => {
        it('صفحة المنيو العامة: findMany ترشّح archivedAt: null (اختفاء من العرض، لا ترميدًا)', () => {
                const src = raw('src/app/(public)/menu/[slug]/page.tsx');
                // العقد الحرفي: قائمة WHERE الحية تشترط archivedAt: null
                expect(src).toMatch(/where:\s*\{\s*\n\s*archivedAt:\s*null,/);
        });

        it('صفحة المنيو العامة: استعلام المعرض المميز الخام يستبعد المؤرشف (AND "archivedAt" IS NULL)', () => {
                const src = raw('src/app/(public)/menu/[slug]/page.tsx');
                // raw SQL — لا يمر عبر Prisma، فالشرط صريح في النص
                expect(src).toMatch(/WHERE "isFeatured" = true\s*\n\s*AND "archivedAt" IS NULL/);
        });

        it('واجهة الجوال العامة (/api/public/menu): الحمولة ترشّح المؤرشف — التطبيق يتبع الخادم بلا إعادة بناء', () => {
                const src = raw('src/app/api/public/menu/[slug]/route.ts');
                expect(src).toMatch(/archivedAt:\s*null,/);
        });

        it('مسار الطلبات (POST /api/orders): المؤرشف غير قابل للطلب — نفس بوابة التوفر', () => {
                const src = raw('src/app/api/orders/route.ts');
                const m = src.match(/const dbItems = await prisma\.menuItem\.findMany\(\{[\s\S]*?\}\);/);
                expect(m, 'dbItems findMany غير موجود في مسار الطلبات').toBeTruthy();
                expect(m![0]).toContain("status: 'available'");
                expect(m![0]).toContain('archivedAt: null');
        });

        it('سقف أصناف الباقة (POST /api/items): المؤرشف لا يحتسب — الأرشفة لا تستهلك سقف المالك', () => {
                const src = raw('src/app/api/items/route.ts');
                const m = src.match(/const existingCount = await tx\.menuItem\.count\(\{[\s\S]*?\}\);/);
                expect(m, 'عدّاد السقف داخل المعاملة غير موجود').toBeTruthy();
                expect(m![0]).toContain('archivedAt: null');
        });

        it('لوحة المالك (GET /api/stats): عدّاد الأصناف = القائمة الحية (غير المؤرشف)', () => {
                const src = raw('src/app/api/stats/route.ts');
                expect(src).toMatch(/where:\s*\{\s*archivedAt:\s*null,/);
        });

        it('الورقة المطبوعة: المؤرشف لا يُطبع (اتساق الرقمي/المطبوع)', () => {
                const src = raw('src/app/(public)/menu/[slug]/print/page.tsx');
                expect(src).toMatch(/where:\s*\{\s*status:\s*'available',\s*archivedAt:\s*null\s*\}/);
        });

        it('بوابة محتوى sitemap: تقيس القائمة العامة الحية (WHERE "archivedAt" IS NULL)', () => {
                const src = raw('src/app/sitemap.ts');
                expect(src).toMatch(/WHERE mi\."archivedAt" IS NULL/);
        });
});

/* ── (ب) سجل الطلبات القديم يبقى سليمًا — لا فلترة أرشيف في مسارات التاريخ ── */

describe('P42-W3 — «وبقاء الطلبات القديمة سليمة» (عقود المصدر)', () => {
        it('عرض الطلبات للمالك يضم أصنافها بالاسم بلا أي شرط أرشفة (السجل التاريخي غير ممسوس)', () => {
                // أوسع مستهلكين للسجل: stats-queries (تسمية الأصناف الشائعة +
                // صفوف الطلبات) — العقد: resolve بالمعرّف دون أي archivedAt
                const statsQueries = raw('src/lib/stats-queries.ts');
                const hydrate = statsQueries.match(/prisma\.menuItem\.findMany\(\{[\s\S]*?\}\)/);
                expect(hydrate, 'استعلام تسمية الأصناف غير موجود').toBeTruthy();
                expect(hydrate![0]).not.toContain('archivedAt');
                // ولوحة المالك: الطلبات الأخيرة تضم بنودها مع item join كامل
                const statsRoute = raw('src/app/api/stats/route.ts');
                expect(statsRoute).toContain("include: { items: { include: { item: { select: { id: true, name: true } } } } }");
        });

        it('قيود قاعدة البيانات تحمي السجل: OrderItem ما زال Restrict على MenuItem + العمود قابل للإبطال', () => {
                const schema = raw('prisma/schema.prisma');
                expect(schema).toMatch(/model OrderItem[\s\S]*?item\s+MenuItem\s+@relation\(fields: \[itemId\], references: \[id\], onDelete: Restrict\)/);
                expect(schema).toMatch(/archivedAt\s+DateTime\?/);
        });

        it('الهجرة: أرشفة محروسة بالتعريف الثلاثي (معرّف + اسم + مستأجر) — لا حذف أبدًا', () => {
                const mig = raw('prisma/migrations/zz_p42w3_item_archival/migration.sql');
                // ALTER فقط + UPDATE محروس — لا DELETE في الهجرة إطلاقًا
                expect(mig).toContain('ALTER TABLE "MenuItem" ADD COLUMN "archivedAt"');
                expect(mig).toMatch(/UPDATE "MenuItem" m\s*\nSET "archivedAt" = now\(\)/);
                expect(mig).toContain('m.id IN (712, 767, 778, 779)');
                expect(mig).not.toMatch(/\bDELETE\b/);
        });
});

/* ── (ج) سلوك API حرفيًا — مسارات مُوكّلة (نمط orders-create.test.ts) ──── */

const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockMenuCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        menuItem: {
                findMany: mockMenuItemFindMany,
                count: mockMenuItemCount,
                findUnique: mockMenuItemFindUnique,
                update: mockMenuItemUpdate,
        },
        menuCategory: { findUnique: mockMenuCategoryFindUnique },
        userRestaurant: { findUnique: vi.fn(async () => ({ id: 1 })) },
        $transaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

/* بوابة الاشتراك: مالك فعّال (نفس نمط الحارس في المسار) */
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

/* isOwnerSubscriptionActive: مالك نشط افتراضيًا */
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

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true });
});

describe('P42-W3 — GET /api/items: معامل الأرشفة (سلوك المسار)', () => {
        it('الافتراضي (بلا معامل): القائمة الحية — archivedAt: null في الاستعلام', async () => {
                mockMenuItemFindMany.mockResolvedValue([]);
                mockMenuItemCount.mockResolvedValue(0);
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(makeRequest('http://localhost/api/items?restaurantId=5', 'GET'));
                expect(res.status).toBe(200);
                const where = mockMenuItemFindMany.mock.calls[0][0].where;
                expect(where.archivedAt).toBeNull();
        });

        it('‎?archived=true (مالك): المؤرشف فقط — لوحة الاسترجاع', async () => {
                mockMenuItemFindMany.mockResolvedValue([]);
                mockMenuItemCount.mockResolvedValue(0);
                const { GET } = await import('@/app/api/items/route');
                await GET(makeRequest('http://localhost/api/items?restaurantId=5&archived=true', 'GET'));
                const where = mockMenuItemFindMany.mock.calls[0][0].where;
                expect(where.archivedAt).toEqual({ not: null });
        });

        it('‎?archived=all (مالك): بلا مرشّح أرشفة — التدقيق الكامل', async () => {
                mockMenuItemFindMany.mockResolvedValue([]);
                mockMenuItemCount.mockResolvedValue(0);
                const { GET } = await import('@/app/api/items/route');
                await GET(makeRequest('http://localhost/api/items?restaurantId=5&archived=all', 'GET'));
                const where = mockMenuItemFindMany.mock.calls[0][0].where;
                expect(where).not.toHaveProperty('archivedAt');
        });

        it('قيمة غير صالحة للمعامل: 400 عربية نظيفة', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(makeRequest('http://localhost/api/items?restaurantId=5&archived=yes', 'GET'));
                expect(res.status).toBe(400);
                const j = await res.json();
                expect(j.error).toContain('الأرشفة');
        });
});

describe('P42-W3 — PUT /api/items/[id]: الأرشفة والاسترجاع (سلوك المسار)', () => {
        const ITEM = {
                id: 71,
                name: 'كابتشينو',
                nameAr: 'كابتشينو',
                price: 7,
                discountedPrice: null,
                image: '',
                status: 'available',
                archivedAt: null,
                categoryId: 9,
                isFeatured: false,
                showcaseTags: [],
                category: { id: 9, restaurantId: 5 },
        };

        it('أرشفة: PUT ‎{archivedAt: ISO}‎ يكتب تاريخًا حقيقيًا (Date) إلى Prisma', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ITEM });
                mockMenuItemUpdate.mockResolvedValue({ ...ITEM, archivedAt: new Date('2026-11-02T10:00:00Z') });
                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', {
                                archivedAt: '2026-11-02T10:00:00.000Z',
                        }),
                        { params: Promise.resolve({ id: '71' }) },
                );
                expect(res.status).toBe(200);
                const data = mockMenuItemUpdate.mock.calls[0][0].data;
                expect(data.archivedAt).toBeInstanceOf(Date);
                expect((data.archivedAt as Date).toISOString()).toBe('2026-11-02T10:00:00.000Z');
        });

        it('استرجاع: PUT ‎{archivedAt: null}‎ يكتب null حرفيًا (إبطال الأرشفة)', async () => {
                mockMenuItemFindUnique.mockResolvedValue({
                        ...ITEM,
                        archivedAt: new Date('2026-11-01T00:00:00Z'),
                });
                mockMenuItemUpdate.mockResolvedValue({ ...ITEM });
                /* P42-6b: الاسترجاع يمر الآن عبر معاملة سقف الاسترجاع (قفل صف المطعم
                 * + عدّ الحيّ + الكتابة) — المحاكاة تنفّذ رد النداء بعميل معاملة
                 * كامل؛ العقد نفسه (كتابة null حرفيًا) بلا تغيير. */
                mockPrisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
                        fn({
                                $queryRaw: vi.fn(async () => []),
                                restaurant: {
                                        findUnique: vi.fn(async () => ({ maxItems: 50, plan: { nameAr: 'الأساسية' } })),
                                },
                                menuItem: {
                                        count: vi.fn(async () => 3),
                                        update: mockMenuItemUpdate,
                                },
                        }),
                );
                const { PUT } = await import('@/app/api/items/[id]/route');
                const res = await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', { archivedAt: null }),
                        { params: Promise.resolve({ id: '71' }) },
                );
                expect(res.status).toBe(200);
                const data = mockMenuItemUpdate.mock.calls[0][0].data;
                expect(data.archivedAt).toBeNull();
        });

        it('الغياب التام للحقل: لا ملامسة — updateData بلا archivedAt (قاعدة التحديث الجزئي)', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ ...ITEM });
                mockMenuItemUpdate.mockResolvedValue({ ...ITEM });
                const { PUT } = await import('@/app/api/items/[id]/route');
                await PUT(
                        makeRequest('http://localhost/api/items/71', 'PUT', { status: 'unavailable' }),
                        { params: Promise.resolve({ id: '71' }) },
                );
                const data = mockMenuItemUpdate.mock.calls[0][0].data;
                expect(data).not.toHaveProperty('archivedAt');
        });
});

describe('P42-W3 — GET /api/items/[id]: المؤرشف للطاقم فقط (سلوك المسار)', () => {
        it('مجهول + صنف مؤرشف (حتى لو status=available): 404 — لا تعداد عام بالمعرّف', async () => {
                const { requireAuth } = await import('@/lib/auth');
                (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                        authorized: false,
                        role: null,
                });
                mockMenuItemFindUnique.mockResolvedValue({
                        id: 71,
                        status: 'available',
                        archivedAt: new Date('2026-11-02T00:00:00Z'),
                        category: { restaurantId: 5 },
                });
                const { GET } = await import('@/app/api/items/[id]/route');
                const res = await GET(makeRequest('http://localhost/api/items/71', 'GET'), {
                        params: Promise.resolve({ id: '71' }),
                });
                expect(res.status).toBe(404);
        });
});
