/**
 * P43 SM-1c — عقود POST /api/items/bulk (العمليات الجماعية على الأصناف).
 *
 * بلا شبكة وبلا قاعدة حقيقية — prisma مُنكَّر بالكامل (نمط orders-create).
 * الحالات:
 *   * التحقق: action مجهول/ids فارغة/ids > 100/حقول العملية الناقصة → 422
 *   * الملكية: صنف يعود لمطعم لا يملكه المالك → 403 وصفر كتابات
 *   * set-status: updateMany واحدة بالحالة + AuditLog واحد + تطهير ISR
 *   * archive: updateMany بarchivedAt=now (غير تدميري — لا فحص سقف: الأرشفة
 *     تنقص المجموعة الحية) + سجل تدقيق يوثّق العدد
 *   * move: حارس مستأجر الوجهة (r121-E1) — نقل عابر للمطاعم → 422؛
 *     النقل داخل المطعم يكتب ترتيبًا ذيليًا متسلسلًا داخل معاملة
 *   * صنف مفقود من الاستعلام → 404 (قائمة قديمة)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockMenuItemUpdateMany = vi.hoisted(() => vi.fn());
const mockMenuItemAggregate = vi.hoisted(() => vi.fn());
const mockMenuCategoryFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidateMenu = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockRequirePermission = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        menuItem: { update: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
        menuItem: {
                findMany: mockMenuItemFindMany,
                updateMany: mockMenuItemUpdateMany,
                aggregate: mockMenuItemAggregate,
        },
        menuCategory: { findUnique: mockMenuCategoryFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidateMenu }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/subscription-guard', () => ({
        isOwnerSubscriptionActive: vi.fn(async () => true),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: mockRequireAuth,
        requirePermission: mockRequirePermission,
}));

const bulkRoute = await import('@/app/api/items/bulk/route');

// ── أدوات مساعدة ───────────────────────────────────────────────────────

/** صنف مملوك: الفئة 10 تخص مطعم المالك 5. */
const ownedItem = (id: number) => ({
        id,
        categoryId: 10,
        category: { restaurantId: 5 },
});

function makeRequest(body: unknown): NextRequest {
        return new NextRequest('http://localhost/api/items/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
        });
}

async function callPost(body: unknown) {
        return bulkRoute.POST(makeRequest(body));
}

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 9, reset: 0 });
        mockRequireAuth.mockResolvedValue({ authorized: true, role: 'owner', userId: 1, restaurantId: 5, permissions: [] });
        // الملكية الافتراضية: كل شيء داخل المطعم الأساسي (5) — لا حاجة لروابط
        mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 5 });
        mockMenuItemFindMany.mockResolvedValue([ownedItem(1), ownedItem(2)]);
        mockMenuItemUpdateMany.mockResolvedValue({ count: 2 });
        mockMenuItemAggregate.mockResolvedValue({ _max: { sortOrder: 40 } });
        mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
        txMock.menuItem.update.mockResolvedValue({});
});

describe('POST /api/items/bulk — التحقق', () => {
        it('action مجهول → 422 برسالة عربية', async () => {
                const res = await callPost({ action: 'delete', ids: [1] });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toContain('غير صالح');
        });

        it('ids فارغة → 422 (حدد صنفًا واحدًا على الأقل)', async () => {
                const res = await callPost({ action: 'set-status', status: 'available', ids: [] });
                expect(res.status).toBe(422);
        });

        it('أكثر من 100 صنف → 422 (سقف الدفعة)', async () => {
                const ids = Array.from({ length: 101 }, (_, i) => i + 1);
                const res = await callPost({ action: 'archive', ids });
                expect(res.status).toBe(422);
                expect(mockMenuItemUpdateMany).not.toHaveBeenCalled();
        });

        it('set-status بلا status → 422 (حقل العملية مطلوب)', async () => {
                const res = await callPost({ action: 'set-status', ids: [1] });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toContain('حالة الصنف مطلوبة');
        });

        it('move بلا categoryId → 422', async () => {
                const res = await callPost({ action: 'move', ids: [1] });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toContain('التصنيف الهدف مطلوب');
        });

        it('status خارج قيم التعداد → 422 (قائمة enum من ItemStatus)', async () => {
                const res = await callPost({ action: 'set-status', status: 'sold-out', ids: [1] });
                expect(res.status).toBe(422);
        });

        it('غير مصرح → 401 وصفر كتابات', async () => {
                mockRequireAuth.mockResolvedValue({ authorized: false });
                const res = await callPost({ action: 'archive', ids: [1] });
                expect(res.status).toBe(401);
                expect(mockMenuItemUpdateMany).not.toHaveBeenCalled();
        });

        it('حد المعدل → 429', async () => {
                mockRateCheck.mockResolvedValue({ success: false });
                const res = await callPost({ action: 'archive', ids: [1] });
                expect(res.status).toBe(429);
        });
});

describe('POST /api/items/bulk — الملكية والوجود', () => {
        it('صنف مفقود من الاستعلام → 404 (قائمة قديمة — حدّث الصفحة)', async () => {
                mockMenuItemFindMany.mockResolvedValue([ownedItem(1)]); // طلبنا 2
                const res = await callPost({ action: 'archive', ids: [1, 2] });
                expect(res.status).toBe(404);
                expect(mockMenuItemUpdateMany).not.toHaveBeenCalled();
        });

        it('صنف يعود لمطعم لا يملكه المالك → 403 وصفر كتابات (سلّم UserRestaurant)', async () => {
                mockMenuItemFindMany.mockResolvedValue([ownedItem(1), { id: 2, categoryId: 11, category: { restaurantId: 9 } }]);
                mockUserRestaurantFindUnique.mockResolvedValue(null); // لا رابط للمطعم 9
                const res = await callPost({ action: 'archive', ids: [1, 2] });
                expect(res.status).toBe(403);
                expect(mockMenuItemUpdateMany).not.toHaveBeenCalled();
                expect(mockLogAudit).not.toHaveBeenCalled();
        });

        it('مالك متعدد المنيوهات يملك المطعم الآخر عبر UserRestaurant → العملية تمضي', async () => {
                mockMenuItemFindMany.mockResolvedValue([ownedItem(1), { id: 2, categoryId: 11, category: { restaurantId: 9 } }]);
                const res = await callPost({ action: 'archive', ids: [1, 2] });
                expect(res.status).toBe(200);
        });
});

describe('POST /api/items/bulk — set-status', () => {
        it('updateMany واحدة بالحالة + AuditLog واحد + تطهير ISR للمطعم', async () => {
                const res = await callPost({ action: 'set-status', status: 'unavailable', ids: [1, 2] });
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.updated).toBe(2);

                expect(mockMenuItemUpdateMany).toHaveBeenCalledTimes(1);
                expect(mockMenuItemUpdateMany).toHaveBeenCalledWith({
                        where: { id: { in: [1, 2] } },
                        data: { status: 'unavailable' },
                });
                // سجل واحد للعملية كلها (لا سجل لكل صنف)
                expect(mockLogAudit).toHaveBeenCalledTimes(1);
                const auditArg = mockLogAudit.mock.calls[0][0];
                expect(auditArg.targetType).toBe('menuItem');
                expect(auditArg.metadata).toMatchObject({ bulk: true, operation: 'set-status', count: 2 });
                expect(mockRevalidateMenu).toHaveBeenCalledWith(5);
        });
});

describe('POST /api/items/bulk — archive', () => {
        it('updateMany بarchivedAt (غير تدميري) + سجل يوثّق العملية', async () => {
                const res = await callPost({ action: 'archive', ids: [1, 2] });
                expect(res.status).toBe(200);

                expect(mockMenuItemUpdateMany).toHaveBeenCalledWith({
                        where: { id: { in: [1, 2] } },
                        data: { archivedAt: expect.any(Date) },
                });
                const auditArg = mockLogAudit.mock.calls[0][0];
                expect(auditArg.metadata).toMatchObject({ bulk: true, operation: 'archive', count: 2 });
        });
});

describe('POST /api/items/bulk — move (حارس مستأجر الوجهة r121-E1)', () => {
        it('نقل عابر للمطاعم → 422 بصراحة (محاسبة سقف الخطة)', async () => {
                mockMenuCategoryFindUnique.mockResolvedValue({ id: 99, restaurantId: 9 }); // وجهة مطعم آخر
                const res = await callPost({ action: 'move', ids: [1, 2], categoryId: 99 });
                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toContain('داخل تصنيفات المطعم نفسه فقط');
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('تصنيف الهدف غير موجود → 404', async () => {
                mockMenuCategoryFindUnique.mockResolvedValue(null);
                const res = await callPost({ action: 'move', ids: [1], categoryId: 99 });
                expect(res.status).toBe(404);
        });

        it('النقل داخل المطعم: ترتيب ذيلي متسلسل بعد آخر صنف (41، 42) داخل معاملة', async () => {
                mockMenuCategoryFindUnique.mockResolvedValue({ id: 99, restaurantId: 5 });
                const res = await callPost({ action: 'move', ids: [1, 2], categoryId: 99 });
                expect(res.status).toBe(200);

                expect(mockTransaction).toHaveBeenCalledTimes(1);
                // W6-B6 عقد menu-reorder: كل صنف يأخذ ترتيبًا صاعدًا خاصًا به
                expect(txMock.menuItem.update).toHaveBeenNthCalledWith(1, {
                        where: { id: 1 },
                        data: { categoryId: 99, sortOrder: 41 },
                });
                expect(txMock.menuItem.update).toHaveBeenNthCalledWith(2, {
                        where: { id: 2 },
                        data: { categoryId: 99, sortOrder: 42 },
                });
                const auditArg = mockLogAudit.mock.calls[0][0];
                expect(auditArg.metadata).toMatchObject({ operation: 'move', toCategoryId: 99 });
        });
});
