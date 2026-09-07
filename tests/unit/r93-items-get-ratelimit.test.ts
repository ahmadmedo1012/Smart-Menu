/**
 * r93-W1a (M3 / MED-3 — تقرير التفتيش round93-inspection-b) — حد معدل على
 * GET /api/items.
 *
 * الخلل: القراءة العامة بلا حد معدل ولا كاش — requireAuth يعيد
 * authorized:false للمجهول ثم يستمر التنفيذ (المتاح فقط status:'available')
 * ويشغّل findMany مع include modifierGroups.options + count لكل طلب، دون أن
 * تُنشأ أي RateLimitEntry. حلقة curl موزعة (أو سكربت واحد) تضرب
 * /api/items?restaurantId=1&page=1..100 فتستهلك اتصالات DB وتؤثر على مسارات
 * المال (كل النقاط العامة الأخرى محمية بحد أو بكاش).
 *
 * الإصلاح المُختبر: itemsGetLimiter = createDbRateLimiter(60 دقيقة/طلب لكل IP)
 * بمفتاح `items-get:${ip}` (getClientIp r91-D1 الموحد) — بعد فروع تحقق
 * المعاملات (400) وقبل requireAuth وأي استعلام DB:
 *   - تجاوز الحد → 429 برسالة عربية
 *   - تحت الحد → 200 كما قبل (رحلة تصفح المنيو الشرعية لا تنكسر)
 *   - الطلبات الفاسدة (400) لا تحرق ميزانية الحد
 *   - المفتاح لكل IP معزول (IP آخر لا يتأثر بحجب IP)
 *
 * النمط: منكَّر قابل للتحكم على createDbRateLimiter (نفس plan-limit.test.ts
 * «controllable limiter») + mock prisma/auth — لا DB حقيقية.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: false,
                role: null as string | null,
                restaurantId: null as number | null,
                userId: null as number | null,
                permissions: [] as string[],
        },
}));
const mockRequireAuth = vi.hoisted(() => vi.fn(async () => authHolder.value));

const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
        menuItem: { findMany: mockMenuItemFindMany, count: mockMenuItemCount },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

// المنكَّر القابل للتحكم: مفاتيح محجوبة تقرر 429 (الباقي 200)
const blockedKeys = vi.hoisted(() => new Set<string>());
const checkMock = vi.hoisted(() => vi.fn(async (key: string) => ({
        success: !blockedKeys.has(key),
        remaining: blockedKeys.has(key) ? 0 : 59,
        reset: 0,
})));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ requireAuth: mockRequireAuth }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: checkMock, destroy: () => {} }),
}));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/blob', () => ({ mediaUrlError: vi.fn(() => null), deleteBlob: vi.fn() }));

// ── Fixtures / helpers ──────────────────────────────────────────────────

beforeEach(() => {
        vi.clearAllMocks();
        blockedKeys.clear();
        authHolder.value = { authorized: false, role: null, restaurantId: null, userId: null, permissions: [] };
        mockMenuItemFindMany.mockResolvedValue([{ id: 1, name: 'شاي', price: 3, status: 'available' }]);
        mockMenuItemCount.mockResolvedValue(1);
        mockUserRestaurantFindUnique.mockResolvedValue(null);
});

async function getItems(url = 'http://localhost/api/items?restaurantId=1', headers?: Record<string, string>) {
        const { GET } = await import('@/app/api/items/route');
        return GET(new NextRequest(url, { headers }));
}

// ── الحدود ──────────────────────────────────────────────────────────────

describe('r93-W1a — GET /api/items: حد المعدل 60/دقيقة/IP', () => {
        it('تحت الحد (مجهول) → 200 كما قبل: فلتر available العام والرحلة الشرعية سليمة', async () => {
                const res = await getItems();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toHaveLength(1);
                expect(json.meta).toMatchObject({ total: 1, page: 1 });
                // المجهول يرى المتاح فقط (round85-A1 دون كسر)
                expect(mockMenuItemFindMany.mock.calls[0][0].where.status).toBe('available');
                // الحد احتُسب بمفتاح IP الموحد
                expect(checkMock).toHaveBeenCalledWith('items-get:unknown');
        });

        it('تجاوز الحد → 429 برسالة عربية ولا يصل أي استعلام DB', async () => {
                blockedKeys.add('items-get:unknown');

                const res = await getItems();

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('محاولات كثيرة جداً. حاول لاحقاً.');
                // الحد قبل requireAuth (استعلام الجلسة) وقبل findMany/count
                expect(mockRequireAuth).not.toHaveBeenCalled();
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
                expect(mockMenuItemCount).not.toHaveBeenCalled();
        });

        it('المفتاح مشتق من IP العميل (x-real-ip → مفتاح خاص به)', async () => {
                const res = await getItems(undefined, { 'x-real-ip': '203.0.113.9' });

                expect(res.status).toBe(200);
                expect(checkMock).toHaveBeenCalledWith('items-get:203.0.113.9');
        });

        it('حجب IP لا يحجب غيره (عزل المفاتيح لكل IP)', async () => {
                blockedKeys.add('items-get:203.0.113.9');

                const blocked = await getItems(undefined, { 'x-real-ip': '203.0.113.9' });
                expect(blocked.status).toBe(429);

                const other = await getItems(undefined, { 'x-real-ip': '198.51.100.7' });
                expect(other.status).toBe(200);
        });

        it('معامل فاسد (restaurantId=abc) → 400 قبل الحد (لا يحرق الميزانية)', async () => {
                const res = await getItems('http://localhost/api/items?restaurantId=abc');

                expect(res.status).toBe(400);
                expect(checkMock).not.toHaveBeenCalled();
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
        });

        it('مالك مسجل تحت الحد → 200 بلا فرض status (قراءة الإدارة دون كسر)', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 10, permissions: [] };

                const res = await getItems();

                expect(res.status).toBe(200);
                expect(mockMenuItemFindMany.mock.calls[0][0].where.status).toBeUndefined();
        });
});
