/**
 * r137 — فرض رسوم التوصيل والحد الأدنى في POST /api/orders (الميزة 2).
 *
 * نفس نمط orders-create.test.ts (prisma + tx مُسخران بلا قاعدة حقيقية) —
 * يثبّت العقد الجديد لمسار المال:
 *   - طلب توصيل دون الحد الأدنى → 422 عربي بنص الواجهة نفسه، صفر كتابات
 *   - طلب توصيل فوق الحد → الرسوم تُضاف إلى total خادميًا فقط
 *   - subtotal يبقى أسعار الأصناف وحدها (فصل صادق — الرسوم سطر لاحق)
 *   - غير التوصيل (سفري/داخل/افتراضي) لا يدفع رسومًا أبدًا
 *   - الميزة مطفأة (NULL) = سلوك ما قبل r137 بالبايت (توافق خلفي)
 *   - إجمالي العميل المزوّر يُهمل دائمًا (نفس مبدأ إعادة التسعير r102-A5)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks (نفس هيكل orders-create.test.ts) ──────────────────────

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

// ── Fixtures ────────────────────────────────────────────────────────────

/** المطعم الافتراضي: الميزة مطفأة — r136 وما قبله بالبايت. */
const RESTAURANT_OFF = {
        id: 5,
        name: 'al-waha-cafe',
        slug: 'al-waha',
        maxOrders: 500,
        isActive: true,
        deliveryFee: null,
        minOrder: null,
};

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

/** سلة أساسية: صنف واحد بسعر 10 (الخادم يعيد التسعير من DB). */
const baseBody = (overrides: Record<string, unknown> = {}) => ({
        restaurantId: 5,
        items: [{ itemId: 1, quantity: 1 }],
        ...overrides,
});

beforeEach(() => {
        vi.clearAllMocks();
        mockModifierGroupFindMany.mockResolvedValue([]);
        mockRateCheck.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
        mockMenuItemFindMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: null }]);
        mockModifierOptionFindMany.mockResolvedValue([]);
        mockOrderFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue({ ...RESTAURANT_OFF });
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        txMock.order.count.mockResolvedValue(10);
        txMock.order.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
                id: 900,
                orderNo: args.data.orderNo,
                ...args.data,
                items: [],
        }));
});

describe('POST /api/orders — الحد الأدنى لطلب التوصيل (فرض خادمي)', () => {
        it('توصيل دون الحد → 422 بنص الواجهة نفسه، صفر كتابات', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: 20,
                });

                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toContain('الحد الأدنى لطلب التوصيل 20 د.ل');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        it('السلة عند الحد بالضبط تمر (الأدنى لا الحصري)', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: 20,
                });

                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 2 }] }));

                expect(res.status).toBe(201);
        });

        it('الحد الأدنى لا يفحص إلا مع التوصيل — سفري تحت الحد يمر', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: 20,
                });

                const res = await callPost(baseBody({ pickupType: 'takeaway', items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                // لا رسوم أيضًا — سفري
                expect(createArg.data.total).toBe(10);
        });
});

describe('POST /api/orders — الرسوم تُضاف خادميًا إلى total فقط', () => {
        it('توصيل + رسوم 5: subtotal أسعار الأصناف، total = subtotal + fee', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: null,
                });

                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 3 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.subtotal).toBe(30); // 10 × 3 — بلا رسوم
                expect(createArg.data.total).toBe(35); // 30 + 5
                expect(createArg.data.pickupType).toBe('delivery');
        });

        it('إجمالي العميل المزوّر يُهمل — الرسوم من صف المطعم لا من الحمولة', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: null,
                });

                const res = await callPost(
                        baseBody({ pickupType: 'delivery', total: 0, subtotal: 0, items: [{ itemId: 1, quantity: 1 }] })
                );

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.subtotal).toBe(10);
                expect(createArg.data.total).toBe(15);
        });

        it('داخل المكان + رسوم موجودة → لا رسوم (total = subtotal)', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: null,
                });

                const res = await callPost(baseBody({ pickupType: 'inside', items: [{ itemId: 1, quantity: 2 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.total).toBe(20);
        });

        it('بلا pickupType (الافتراضي inside) → لا رسوم', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: 20,
                });

                const res = await callPost(baseBody({ items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.pickupType).toBe('inside');
                expect(createArg.data.total).toBe(10);
        });
});

describe('POST /api/orders — الميزة مطفأة = توافق خلفي بالبايت (r136 وما قبله)', () => {
        it('deliveryFee/minOrder = NULL → توصيل بلا رسوم وبلا حد، total = subtotal', async () => {
                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.subtotal).toBe(10);
                expect(createArg.data.total).toBe(10);
        });

        it('رسوم 0 مخزونة تعامل معاملة الإطفاء (لا إجمالي مشوه)', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 0,
                        minOrder: 0,
                });

                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.total).toBe(10);
        });
});

// ── r138 (W5-C3): توثيق الرسوم على صف الطلب (صدق مستندات المالك) ────────

describe('POST /api/orders — الرسوم تُخزَّن في Order.deliveryFee (r138)', () => {
        it('توصيل + رسوم 5 → deliveryFee = 5 (الثابت: total = subtotal - discount + fee)', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: null,
                });

                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 3 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.deliveryFee).toBe(5);
                expect(createArg.data.subtotal).toBe(30);
                expect(createArg.data.total).toBe(35); // 30 - 0 + 5 — الثابت صادق
        });

        it('سفري → deliveryFee = 0 (قيمة معروفة: لا رسوم — ليست NULL)', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: null,
                });

                const res = await callPost(baseBody({ pickupType: 'takeaway', items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.deliveryFee).toBe(0);
                expect(createArg.data.total).toBe(10);
        });

        it('داخل المكان (الافتراضي) → deliveryFee = 0 أيضًا', async () => {
                mockRestaurantFindUnique.mockResolvedValue({
                        ...RESTAURANT_OFF,
                        deliveryFee: 5,
                        minOrder: null,
                });

                const res = await callPost(baseBody({ items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.deliveryFee).toBe(0);
        });

        it('الميزة مطفأة + توصيل → deliveryFee = 0 (معروفة لا مجهولة)', async () => {
                const res = await callPost(baseBody({ pickupType: 'delivery', items: [{ itemId: 1, quantity: 1 }] }));

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.deliveryFee).toBe(0);
                expect(createArg.data.total).toBe(10);
        });
});
