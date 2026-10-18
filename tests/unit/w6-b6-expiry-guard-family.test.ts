/**
 * W6-B6 — G-5 (تدقيق W6-A3): عائلة حارس الاشتراك المنتهي تكتمل.
 *
 * b44551f9 (r138) حرس items POST/PUT؛ المنقّح وجد categories POST و
 * categories/[id] PUT/DELETE وsettings PUT (مسار مال: رسوم التوصيل/الحد
 * الأدنى) وorders/[id] PUT (عمليات الحالة + إشعال تراكم الولاء) و
 * upload POST كلها مفتوحة للمالك المنتهي — بينما لافتة OwnerShell تخبره
 * أن «تعديل الأصناف والأسعار متوقف حتى التجديد».
 *
 * هذا الملف يثبّت العقد لكل موقع جديد (نفس نمط items-contract :322):
 *   - مالك منتهي → 403 بنسخة العائلة حرفيًا «اشتراكك منتهي. جدّد اشتراكك
 *     للمتابعة.» قبل أي عمل قاعدة بيانات (صفر قراءات/كتابات).
 *   - المالك النشط يمرّ (سلوك قائم لا يتغير) — عيّنتان موجبتان
 *     (categories POST + settings PUT) + تغطية موجبة موجودة في ملفات
 *     المسارات نفسها (order-lifecycle / r92-categories-route /
 *     r93-coverage-categories-id / settings-tenant / upload-route — كلها
 *     حصلت على stub الحارس النشط هذه الدفعة).
 *   - عقد المصدر: النسخة العربية نفسها في المواقع الخمسة (توحيد حرفي
 *     للعائلة) + مواقعها في مسار الخادم.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── Hoisted mocks (المشترك بين المواقع الخمسة) ──────────────────────────

const subGuardHolder = vi.hoisted(() => ({ active: true }));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                role: 'owner' as string,
                restaurantId: 7,
                userId: 1,
                permissions: [] as string[],
        },
}));

const mockMenuCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockMenuCategoryCreate = vi.hoisted(() => vi.fn());
const mockMenuCategoryCount = vi.hoisted(() => vi.fn());
const mockMenuCategoryUpdate = vi.hoisted(() => vi.fn());
const mockMenuCategoryDelete = vi.hoisted(() => vi.fn());
const mockSettingUpsert = vi.hoisted(() => vi.fn());
const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockOrderUpdateMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRateCheck = vi.hoisted(() => vi.fn(async () => ({ success: true, remaining: 9, reset: 0 })));
const mockPut = vi.hoisted(() => vi.fn(async () => ({ url: 'https://blob.example/x.jpg' })));

const prismaMock = vi.hoisted(() => ({
        menuCategory: {
                findUnique: mockMenuCategoryFindUnique,
                create: mockMenuCategoryCreate,
                count: mockMenuCategoryCount,
                update: mockMenuCategoryUpdate,
                delete: mockMenuCategoryDelete,
        },
        setting: { upsert: mockSettingUpsert },
        order: { findUnique: mockOrderFindUnique, updateMany: mockOrderUpdateMany },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        $queryRaw: mockQueryRaw,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
        requirePermission: vi.fn(async () => ({ ...authHolder.value, authorized: true })),
}));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => subGuardHolder.active),
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidate }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/blob', () => ({ deleteBlob: vi.fn(), mediaUrlError: vi.fn(() => null) }));
vi.mock('@vercel/blob', () => ({ put: mockPut }));

// ── Fixtures / helpers ─────────────────────────────────────────────────

const FAMILY_COPY = 'اشتراكك منتهي. جدّد اشتراكك للمتابعة.';

const CATEGORY_ROW = { id: 31, name: 'مشروبات', restaurantId: 7, sortOrder: 0 };
const ORDER_ROW = {
        id: 55,
        orderNo: 'ORD-1',
        status: 'new',
        restaurantId: 7,
        customerPhone: '0911111111',
        total: 40,
};

/* upload يفحص BLOB_READ_WRITE_TOKEN قبل المصادقة (فشل مغلق) — نفس عادة
   upload-route.test.ts: نضبطه لكل اختبار ونعيده بعدها. */
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

beforeEach(() => {
        vi.clearAllMocks();
        subGuardHolder.active = true;
        authHolder.value.role = 'owner';
        authHolder.value.restaurantId = 7;
        process.env.BLOB_READ_WRITE_TOKEN = 'blob-token-for-test';
        mockRestaurantFindUnique.mockResolvedValue({ id: 7, slug: 'waha', plan: { maxItems: 10 } });
        mockMenuCategoryFindUnique.mockResolvedValue({ ...CATEGORY_ROW });
        mockMenuCategoryCount.mockResolvedValue(0);
        mockMenuCategoryCreate.mockResolvedValue({ ...CATEGORY_ROW, id: 32 });
        mockMenuCategoryUpdate.mockResolvedValue({ ...CATEGORY_ROW });
        mockOrderFindUnique.mockResolvedValue({ ...ORDER_ROW });
        mockOrderUpdateMany.mockResolvedValue({ count: 1 });
        mockUserRestaurantFindUnique.mockResolvedValue({ id: 1 });
});

afterEach(() => {
        if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
        else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
});

async function callCategoriesPost() {
        const { POST } = await import('@/app/api/categories/route');
        return POST(
                new NextRequest('http://localhost/api/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'حلويات', restaurantId: 7 }),
                })
        );
}

async function callCategoryPut() {
        const { PUT } = await import('@/app/api/categories/[id]/route');
        return PUT(
                new NextRequest('http://localhost/api/categories/31', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'مشروبات باردة' }),
                }),
                { params: Promise.resolve({ id: '31' }) }
        );
}

async function callCategoryDelete() {
        const { DELETE } = await import('@/app/api/categories/[id]/route');
        return DELETE(
                new NextRequest('http://localhost/api/categories/31', { method: 'DELETE' }),
                { params: Promise.resolve({ id: '31' }) }
        );
}

async function callSettingsPut() {
        const { PUT } = await import('@/app/api/settings/route');
        return PUT(
                new NextRequest('http://localhost/api/settings?restaurantId=7', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'themeColor', value: '#8A2B1D' }),
                })
        );
}

async function callOrderPut() {
        const { PUT } = await import('@/app/api/orders/[id]/route');
        return PUT(
                new NextRequest('http://localhost/api/orders/55', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ whatsappSent: true }),
                }),
                { params: Promise.resolve({ id: '55' }) }
        );
}

async function callUploadPost() {
        const { POST } = await import('@/app/api/upload/route');
        return POST(
                new NextRequest('http://localhost/api/upload', {
                        method: 'POST',
                        // المالك المنتهي يُردّ قبل أي formData — جسم فارغ يكفي
                })
        );
}

// ── 1. المالك المنتهي → 403 نسخة العائلة + صفر عمل DB ──────────────────

describe('W6-B6 (G-5) — المالك المنتهي: كل مواقع الكتابة الخمسة تُردّ بنسخة العائلة', () => {
        it('categories POST → 403 قبل أي عمل', async () => {
                subGuardHolder.active = false;
                const res = await callCategoriesPost();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(FAMILY_COPY);
                expect(mockMenuCategoryCreate).not.toHaveBeenCalled();
                expect(mockMenuCategoryCount).not.toHaveBeenCalled();
        });

        it('categories/[id] PUT → 403 قبل جلب القسم', async () => {
                subGuardHolder.active = false;
                const res = await callCategoryPut();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(FAMILY_COPY);
                expect(mockMenuCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockMenuCategoryUpdate).not.toHaveBeenCalled();
        });

        it('categories/[id] DELETE → 403 قبل جلب القسم', async () => {
                subGuardHolder.active = false;
                const res = await callCategoryDelete();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(FAMILY_COPY);
                expect(mockMenuCategoryFindUnique).not.toHaveBeenCalled();
                expect(mockMenuCategoryDelete).not.toHaveBeenCalled();
        });

        it('settings PUT (مسار المال) → 403 قبل أي upsert', async () => {
                subGuardHolder.active = false;
                const res = await callSettingsPut();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(FAMILY_COPY);
                expect(mockSettingUpsert).not.toHaveBeenCalled();
        });

        it('orders/[id] PUT (عمليات الحالة) → 403 قبل جلب الطلب', async () => {
                subGuardHolder.active = false;
                const res = await callOrderPut();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(FAMILY_COPY);
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
                expect(mockOrderUpdateMany).not.toHaveBeenCalled();
        });

        it('upload POST → 403 قبل أي رفع (blob untouched)', async () => {
                subGuardHolder.active = false;
                const res = await callUploadPost();
                expect(res.status).toBe(403);
                expect((await res.json()).error).toBe(FAMILY_COPY);
                expect(mockPut).not.toHaveBeenCalled();
        });
});

// ── 2. المالك النشط يمرّ (لا كسر للسلوك القائم) ─────────────────────────

describe('W6-B6 (G-5) — المالك النشط: السلوك القائم لا يتغير', () => {
        it('categories POST → 201 والقسم يُنشأ', async () => {
                const res = await callCategoriesPost();
                expect(res.status).toBe(201);
                expect(mockMenuCategoryCreate).toHaveBeenCalledTimes(1);
        });

        it('settings PUT (عنصر مفرد) → 200 وupsert يُنفَّذ', async () => {
                const res = await callSettingsPut();
                expect(res.status).toBe(200);
                expect(mockSettingUpsert).toHaveBeenCalledTimes(1);
        });

        it('categories/[id] PUT → 200 والتحديث يُنفَّذ', async () => {
                const res = await callCategoryPut();
                expect(res.status).toBe(200);
                expect(mockMenuCategoryUpdate).toHaveBeenCalledTimes(1);
        });

        it('orders/[id] PUT → 200 وتحديث الحالة العادي يعمل', async () => {
                const res = await callOrderPut();
                expect(res.status).toBe(200);
                expect(mockOrderUpdateMany).toHaveBeenCalledTimes(1);
        });
});

// ── 3. عقد المصدر: النسخة الحرفية في المواقع الخمسة + المواقع القائمة ────

describe('W6-B6 (G-5) — عائلة الحارس: الخريطة كاملة في المصدر', () => {
        const GUARDED = [
                'src/app/api/items/route.ts',
                'src/app/api/items/[id]/route.ts',
                'src/app/api/categories/route.ts',
                'src/app/api/categories/[id]/route.ts',
                'src/app/api/settings/route.ts',
                'src/app/api/orders/[id]/route.ts',
                'src/app/api/upload/route.ts',
                'src/app/api/owner/restaurants/route.ts',
                'src/app/api/owner/restaurants/[id]/route.ts',
                'src/app/api/owner/reviews/route.ts',
        ];

        it.each(GUARDED)('%s يحمل الحارس ونسخة العائلة حرفيًا', (p) => {
                const s = src(p);
                expect(s).toContain('isOwnerSubscriptionActive');
                expect(s).toContain("'اشتراكك منتهي. جدّد اشتراكك للمتابعة.'");
        });

        it('النسخة موحّدة بلا انحراف (لا تهجئة بديلة في أي مسار)', () => {
                const all = src('src/app/api/owner/restaurants/route.ts');
                expect(all).not.toContain('اشتراك منتهي،');
        });
});
