/**
 * r118-A3-P1 — عقد مجموعات المعدِّلات يُطبَّق الآن على الخادم.
 *
 * الخلل: POST /api/orders كان يتحقق من ملكية الخيار (تابع للصنف ومتاح)
 * لكنه لا يتحقق من عقد المجموعة نفسها — المجموعات الإلزامية (required/
 * minSelect) كانت قابلة للتخطي كليًا بطلب مصنوع يدويًا، وmaxSelect كان
 * قابلاً لتجاوزه، وتكرار نفس معرّف الخيار كان يراكم priceDelta نفسه
 * N مرات (خيار −1 مكرر 15 مرة يجعل سطر الطلب سالبًا). الواجهة كانت
 * التطبيق الوحيد للعقد.
 *
 * العقد الجديد (lib/order-modifiers.ts): تُطبَّق قيود المجموعات «القابلة
 * للخدمة» فقط (لها خيار متاح واحد على الأقل — مرآة ما تعرضه مسلسلات
 * المنيو العام)، بعد إزالة التكرار، مع رفض الأسطر/الإجماليات السالبة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockModifierOptionFindMany = vi.hoisted(() => vi.fn());
const mockModifierGroupFindMany = vi.hoisted(() => vi.fn());
const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        order: { count: vi.fn(), create: vi.fn() },
        restaurant: { findUnique: vi.fn() },
        $queryRaw: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
        menuItem: { findMany: mockMenuItemFindMany },
        modifierOption: { findMany: mockModifierOptionFindMany },
        modifierGroup: { findMany: mockModifierGroupFindMany },
        order: { findUnique: mockOrderFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({ authorized: true, role: 'owner', restaurantId: 5, userId: 1, permissions: [] })),
}));

function makePostRequest(body: unknown): NextRequest {
        return new NextRequest('http://localhost/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
        });
}

async function callPost(body: unknown) {
        const { POST } = await import('@/app/api/orders/route');
        return POST(makePostRequest(body));
}

/**
 * Group fixture: the Prisma select shape fetchServiceableModifierGroups asks
 * for — `options` carries AVAILABLE option ids only (the where filter is
 * applied DB-side; the mock returns the post-filter rows).
 */
const group = (over: Partial<{ id: number; nameAr: string; minSelect: number; maxSelect: number; required: boolean; optionIds: number[] }>) => {
        const { optionIds = [101, 102], ...rest } = over;
        return {
                id: 10,
                nameAr: 'الحجم',
                name: '',
                minSelect: 0,
                maxSelect: 1,
                required: false,
                menuItemId: 1,
                options: optionIds.map((id) => ({ id })),
                ...rest,
        };
};

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
        mockMenuItemFindMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: null }]);
        mockRestaurantFindUnique.mockResolvedValue({ id: 5, maxOrders: 500, isActive: true });
        mockOrderFindUnique.mockResolvedValue(null);
        mockModifierGroupFindMany.mockResolvedValue([]);
        mockModifierOptionFindMany.mockResolvedValue([]);
        mockTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => fn(txMock));
        txMock.order.count.mockResolvedValue(0);
        txMock.order.create.mockResolvedValue({ id: 1 });
        txMock.restaurant.findUnique.mockResolvedValue(null);
        txMock.$queryRaw.mockResolvedValue([]);
});

describe('r118 — server-side modifier-group contract on POST /api/orders', () => {
        it('required group (minSelect=1) with NOTHING selected → 400 with the Arabic «اختر على الأقل» message', async () => {
                mockModifierGroupFindMany.mockResolvedValue([group({ minSelect: 1, required: true })]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1 }],
                });

                expect(res.status).toBe(400);
                const body = await res.json();
                expect(body.error).toContain('اختر على الأقل');
                expect(body.error).toContain('الحجم');
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        it('minSelect=2 with only ONE option selected → 400', async () => {
                mockModifierGroupFindMany.mockResolvedValue([group({ minSelect: 2, maxSelect: 3, optionIds: [101, 102] })]);
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 101, nameAr: 'صغير', name: '', priceDelta: 0, group: { menuItemId: 1 } },
                ]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1, modifierOptionIds: [101] }],
                });

                expect(res.status).toBe(400);
                expect((await res.json()).error).toContain('اختر على الأقل 2');
        });

        it('maxSelect=1 with TWO options of the same group → 400 «الحد الأقصى»', async () => {
                mockModifierGroupFindMany.mockResolvedValue([group({ minSelect: 0, maxSelect: 1 })]);
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 101, nameAr: 'صغير', name: '', priceDelta: 0, group: { menuItemId: 1 } },
                        { id: 102, nameAr: 'كبير', name: '', priceDelta: 2, group: { menuItemId: 1 } },
                ]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1, modifierOptionIds: [101, 102] }],
                });

                expect(res.status).toBe(400);
                expect((await res.json()).error).toContain('الحد الأقصى 1');
        });

        it('duplicate option ids are DEDUPED — the delta is priced once (the ×15 stacking exploit)', async () => {
                // maxSelect=10 lets 10 selections through; sending the SAME id
                // 15 times must price it ONCE, not fifteen times.
                mockModifierGroupFindMany.mockResolvedValue([group({ maxSelect: 10, optionIds: [101] })]);
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 101, nameAr: 'خصم', name: '', priceDelta: -1, group: { menuItemId: 1 } },
                ]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1, modifierOptionIds: [101, 101, 101, 101, 101, 101, 101, 101, 101, 101, 101, 101, 101, 101, 101] }],
                });

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                // 10 + (−1 × 1) = 9 — deduped, not 10 − 15 = −5
                expect(createArg.data.subtotal).toBe(9);
                // the persisted snapshot holds ONE entry
                const persisted = JSON.parse(createArg.data.items.create[0].modifiersJson);
                expect(persisted).toHaveLength(1);
                expect(persisted[0]).toMatchObject({ id: 101, priceDelta: -1, nameAr: 'خصم' });
        });

        it('a group whose options are ALL unavailable is NOT enforced (mirrors the menu serializers)', async () => {
                // required group, but zero AVAILABLE options → the public menu
                // drops it entirely; the server must not demand it either.
                mockModifierGroupFindMany.mockResolvedValue([]);
                mockModifierOptionFindMany.mockResolvedValue([]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1 }],
                });

                expect(res.status).toBe(201);
        });

        it('negative line total (stacked negative deltas within maxSelect) → 400, zero writes', async () => {
                mockModifierGroupFindMany.mockResolvedValue([group({ maxSelect: 20, optionIds: [101] })]);
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 101, nameAr: 'خصم كبير', name: '', priceDelta: -15, group: { menuItemId: 1 } },
                ]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1, modifierOptionIds: [101] }],
                });

                expect(res.status).toBe(400);
                expect((await res.json()).error).toContain('تعذّر احتساب سعر الطلب');
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        it('raw modifierOptionIds array > 100 entries → 422 at the schema layer', async () => {
                const ids = Array.from({ length: 101 }, (_, i) => i + 1);
                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1, modifierOptionIds: ids }],
                });
                expect(res.status).toBe(422);
        });

        it('discountedPrice = 0 is honored as a 100%-free item (nullish, not truthy)', async () => {
                mockMenuItemFindMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: 0 }]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 2 }],
                });

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.subtotal).toBe(0);
                expect(createArg.data.items.create[0].price).toBe(0);
        });

        it('valid selection within all group constraints → 201 (no false rejections)', async () => {
                mockModifierGroupFindMany.mockResolvedValue([
                        group({ minSelect: 1, maxSelect: 2, optionIds: [101, 102] }),
                ]);
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 101, nameAr: 'صغير', name: '', priceDelta: 0, group: { menuItemId: 1 } },
                        { id: 102, nameAr: 'كبير', name: '', priceDelta: 2, group: { menuItemId: 1 } },
                ]);

                const res = await callPost({
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 2, modifierOptionIds: [101, 102] }],
                });

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                // (10 + 0 + 2) × 2 = 24
                expect(createArg.data.subtotal).toBe(24);
        });
});
