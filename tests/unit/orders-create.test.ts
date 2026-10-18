/**
 * Round88-D2 — POST /api/orders unit coverage (was 0% lcov, lines 8-250).
 *
 * The order-creation money path with mocked prisma + $transaction (tx-mock
 * pattern from order-lifecycle.test.ts) and a controllable rate limiter —
 * no real DB. Guards the highest-value regressions of rounds 76/77/86:
 *   - server-side total recalculation (client subtotal/total/discount ignored)
 *   - round86-A4 tenant/availability scoping of embedded items
 *   - round-77 idempotency minimal confirmation (no PII leak) + discount=0
 *   - round-76 plan order limit inside the create transaction (TOCTOU)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockModifierOptionFindMany = vi.hoisted(() => vi.fn());
// r118-A3-P1: the route now fetches SERVICEABLE modifier groups (min/max
// contract enforcement) — default: the item has no groups.
const mockModifierGroupFindMany = vi.hoisted(() => vi.fn());
const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        order: { count: vi.fn(), create: vi.fn() },
        // round90-F1 (T1): the route locks the restaurant row FOR UPDATE inside
        // the tx before the cap count — the mock just needs to resolve.
        // round91-F-B (D2-#4): maxOrders/isActive are re-read under the lock —
        // resolving nothing keeps the pre-tx values as the fallback.
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
// the route builds its limiter at module scope — feed it a controllable check
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: vi.fn(async () => ({ authorized: true, role: 'owner', restaurantId: 5, userId: 1, permissions: [] })),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const RESTAURANT = { id: 5, name: 'al-waha-cafe', slug: 'al-waha', maxOrders: 500, isActive: true };

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
        return new NextRequest('http://localhost/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(body),
        });
}

async function callPost(body: unknown, headers?: Record<string, string>) {
        const { POST } = await import('@/app/api/orders/route');
        return POST(makePostRequest(body, headers));
}

/** Tampered client values — server must recompute everything from DB rows. */
const tamperedBody = {
        subtotal: 1,
        total: 1,
        discount: 18,
        restaurantId: 5,
        items: [{ itemId: 1, quantity: 2, price: 0.01 }],
};

beforeEach(() => {
        vi.clearAllMocks();
        mockModifierGroupFindMany.mockResolvedValue([]);
        mockRateCheck.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
        // default: one available item, price 10, no discount, restaurant 5
        mockMenuItemFindMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: null }]);
        mockModifierOptionFindMany.mockResolvedValue([]);
        mockOrderFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue({ ...RESTAURANT });
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

describe('POST /api/orders — server-side total recalculation (anti price-tampering)', () => {
        it('client subtotal/total/discount are ignored — DB price × quantity wins', async () => {
                const res = await callPost(tamperedBody);

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);

                const createArg = txMock.order.create.mock.calls[0][0];
                // (10 × 2) = 20 — not the client's 1/1
                expect(createArg.data.subtotal).toBe(20);
                expect(createArg.data.total).toBe(20);
                // round-77 discount guard: a client-sent discount is always forced to 0
                expect(createArg.data.discount).toBe(0);
        });

        it('per-item price stored is the DB price, not the client-sent one', async () => {
                await callPost(tamperedBody);

                const createArg = txMock.order.create.mock.calls[0][0];
                const itemRow = createArg.data.items.create[0];
                expect(itemRow.price).toBe(10);
                expect(itemRow.quantity).toBe(2);
        });

        it('discountedPrice takes precedence over base price when set', async () => {
                mockMenuItemFindMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: 7 }]);

                const res = await callPost({ ...tamperedBody, items: [{ itemId: 1, quantity: 1, price: 10 }] });

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.subtotal).toBe(7);
                expect(createArg.data.items.create[0].price).toBe(7);
        });

        it('modifier priceDelta is added to the effective price and persisted in modifiersJson', async () => {
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 99, priceDelta: 2, group: { menuItemId: 1 } },
                ]);

                const res = await callPost({
                        subtotal: 1,
                        total: 1,
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 2, price: 10, modifierOptionIds: [99] }],
                });

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                // (10 + 2) × 2 = 24
                expect(createArg.data.subtotal).toBe(24);
                // r118-A7-P3: modifiersJson is now an order-time SNAPSHOT
                // (names + deltas), not bare ids — historical orders survive
                // later group edits.
                expect(createArg.data.items.create[0].modifiersJson).toBe(
                        JSON.stringify([{ id: 99, nameAr: undefined, name: undefined, priceDelta: 2 }])
                );
        });

        it('multiple items accumulate into the recalculated subtotal', async () => {
                mockMenuItemFindMany.mockResolvedValue([
                        { id: 1, price: 10, discountedPrice: null },
                        { id: 2, price: 20, discountedPrice: null },
                ]);

                const res = await callPost({
                        subtotal: 1,
                        total: 1,
                        restaurantId: 5,
                        items: [
                                { itemId: 1, quantity: 2, price: 10 },
                                { itemId: 2, quantity: 3, price: 20 },
                        ],
                });

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                // 10×2 + 20×3 = 80
                expect(createArg.data.subtotal).toBe(80);
        });

        it('pickupType and customer free-text default when omitted', async () => {
                const res = await callPost(tamperedBody);

                expect(res.status).toBe(201);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.pickupType).toBe('inside');
                expect(createArg.data.customerName).toBe('');
                expect(createArg.data.customerPhone).toBe('');
        });
});

describe('POST /api/orders — round86-A4 tenant / availability guards', () => {
        it('menuItem query is scoped to the order restaurant + available status + ACTIVE category (tenant isolation at the query level)', async () => {
                await callPost(tamperedBody);

                expect(mockMenuItemFindMany).toHaveBeenCalledWith({
                        where: {
                                id: { in: [1] },
                                status: 'available',
                                // r118-A3-P2: inactive-category items are hidden from the menu
                                // surfaces — the order path now enforces the same visibility.
                                category: { is: { restaurantId: 5, isActive: true } },
                        },
                        select: { id: true, price: true, discountedPrice: true },
                });
        });

        it('item missing from the tenant query (wrong restaurant OR hidden) → 400, zero writes', async () => {
                mockMenuItemFindMany.mockResolvedValue([]);

                const res = await callPost(tamperedBody);

                expect(res.status).toBe(400);
                const json = await res.json();
                // r103-F12: actionable copy replaces the raw-DB-id message
                expect(json.error).toContain('أحد الأصناف في سلتك لم يعد متوفراً');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        /* r139 (J5) — الرفض يسمّي الأصناف ويحمل الـids كي تسم الواجهة الأسطر:
           سلة ١٥ سطرًا كانت تعني رحلة صيد مع الرسالة العامة وحدها. */
        it('r139 (J5): named unavailable items + unavailableItemIds in the envelope, zero writes', async () => {
                // النداء الأول: استعلام التسعير (متاح فقط) — النداء الثاني: الأسماء (بلا فلتر حالة)
                mockMenuItemFindMany
                        .mockResolvedValueOnce([{ id: 1, price: 10, discountedPrice: null }])
                        .mockResolvedValueOnce([
                                { id: 7, nameAr: 'اسبريسو', name: 'Espresso' },
                                { id: 9, nameAr: 'شاي بالنعنع', name: 'Mint Tea' },
                        ]);

                const res = await callPost({
                        subtotal: 1,
                        total: 1,
                        restaurantId: 5,
                        items: [
                                { itemId: 1, quantity: 1, price: 10 },
                                { itemId: 7, quantity: 2, price: 0.01 },
                                { itemId: 9, quantity: 1, price: 0.01 },
                        ],
                });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('اسبريسو');
                expect(json.error).toContain('شاي بالنعنع');
                expect(json.error).toContain('لم تعد متوفرة');
                // الـids تُعاد مُنقّحة (سطران مكرران للصنف نفسه = id واحد)
                expect(json.unavailableItemIds).toEqual([7, 9]);
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('r139 (J5): أكثر من ٣ أصناف نافدة → أول ثلاثة تُسمّى ثم «وغيرها»', async () => {
                mockMenuItemFindMany
                        .mockResolvedValueOnce([])
                        .mockResolvedValueOnce([
                                { id: 1, nameAr: 'كبسة لحم', name: 'A' },
                                { id: 2, nameAr: 'مكرونة', name: 'B' },
                                { id: 3, nameAr: 'شوربة عدس', name: 'C' },
                                { id: 4, nameAr: 'سلطة خضراء', name: 'D' },
                        ]);

                const res = await callPost({
                        subtotal: 1,
                        total: 1,
                        restaurantId: 5,
                        items: [1, 2, 3, 4].map((id) => ({ itemId: id, quantity: 1, price: 1 })),
                });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('وغيرها');
                // الثلاثة الأوائل مُسمّاة والرابع مُختزل (لا يسافر كاملًا في التوست)
                expect(json.error).toContain('كبسة لحم');
                expect(json.error).toContain('مكرونة');
                expect(json.error).toContain('شوربة عدس');
                expect(json.error).not.toContain('سلطة خضراء');
                expect(json.unavailableItemIds).toEqual([1, 2, 3, 4]);
        });

        it('r139 (J5): صفوف بلا أسماء → الرسالة العامة (توافق الاختبار القائم)', async () => {
                mockMenuItemFindMany.mockResolvedValue([]);

                const res = await callPost(tamperedBody);

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('أحد الأصناف في سلتك لم يعد متوفراً — حدّث السلة وحاول مجدداً');
                // الـids تبقى حاضرة حتى بلا أسماء — الواجهة تسم الأسطر بالـid لا بالاسم
                expect(json.unavailableItemIds).toEqual([1]);
        });

        it('modifier option belonging to a DIFFERENT item → 400, zero writes', async () => {
                mockModifierOptionFindMany.mockResolvedValue([
                        { id: 99, priceDelta: 2, group: { menuItemId: 2 } },
                ]);

                const res = await callPost({
                        subtotal: 30,
                        total: 30,
                        restaurantId: 5,
                        items: [{ itemId: 1, quantity: 1, price: 10, modifierOptionIds: [99] }],
                });

                expect(res.status).toBe(400);
                const json = await res.json();
                // r103-F12: actionable copy replaces the raw-DB-id message
                expect(json.error).toContain('أحد الخيارات المختارة لم يعد متاحاً');
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});

describe('POST /api/orders — idempotency (round-77 + r138)', () => {
        it('duplicate idempotencyKey → 200 money-only echo from the RECORDED row, NO PII, no create', async () => {
                // r138 (W5-C3): الإعادة الخاملة تعيد أسعار الصف المسجل (لا أسعار
                // السلة المتقادمة) — مع بقاء موقف round-77: صفر PII
                // (customerName/Phone/notes كلها غائبة عن الصدى).
                mockOrderFindUnique.mockResolvedValue({
                        orderNo: 'ORD-ABC123',
                        total: 25,
                        discount: 0,
                        deliveryFee: 5,
                        pickupType: 'delivery',
                        items: [
                                {
                                        quantity: 2,
                                        price: 10,
                                        modifiersJson: '[]',
                                        item: { name: 'Latte', nameAr: 'لاتيه' },
                                },
                        ],
                });

                const res = await callPost({ ...tamperedBody, idempotencyKey: 'abc123' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.orderNo).toBe('ORD-ABC123');
                expect(json.data.already).toBe(true);
                // money truth: the DB row's itemization + totals, never the
                // client's tampered 0.01-per-line cart
                expect(json.data.items).toHaveLength(1);
                expect(json.data.items[0].price).toBe(10);
                expect(json.data.items[0].quantity).toBe(2);
                expect(json.data.total).toBe(25);
                expect(json.data.deliveryFee).toBe(5);
                expect(json.data.pickupType).toBe('delivery');
                // the round-77 PII stance is intact — customer-authored fields
                // (name/phone/order notes/item notes) are never echoed back
                expect(json.data).not.toHaveProperty('customerName');
                expect(json.data).not.toHaveProperty('customerPhone');
                expect(json.data).not.toHaveProperty('notes');
                expect(json.data.items[0]).not.toHaveProperty('notes');
                // nothing was created / no transaction ran
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('idempotency lookup reads the money select — no PII columns', async () => {
                await callPost({ ...tamperedBody, idempotencyKey: 'abc123' });

                const callArg = mockOrderFindUnique.mock.calls[0][0] as {
                        where: { orderNo: string };
                        select: Record<string, unknown>;
                };
                expect(callArg.where).toEqual({ orderNo: 'ORD-ABC123' });
                // the money itemization columns are read...
                expect(callArg.select.orderNo).toBe(true);
                expect(callArg.select.total).toBe(true);
                expect(callArg.select.deliveryFee).toBe(true);
                expect(callArg.select.items).toBeDefined();
                // ...and no PII column is (round-77 stance preserved by r138)
                expect(callArg.select).not.toHaveProperty('customerName');
                expect(callArg.select).not.toHaveProperty('customerPhone');
                expect(callArg.select).not.toHaveProperty('notes');
        });

        it('orderNo is derived from the uppercased idempotencyKey', async () => {
                await callPost({ ...tamperedBody, idempotencyKey: 'abc123' });

                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.orderNo).toBe('ORD-ABC123');
        });

        it('no idempotencyKey → generated orderNo still matches the ORD-* format', async () => {
                await callPost(tamperedBody);

                const createArg = txMock.order.create.mock.calls[0][0];
                expect(String(createArg.data.orderNo)).toMatch(/^ORD-[0-9A-Z]+-[0-9A-F]{8}$/);
        });
});

describe('POST /api/orders — items payload cap (round89-A2)', () => {
        it('51 items → 422 with the Arabic cap message, zero DB work', async () => {
                const res = await callPost({
                        ...tamperedBody,
                        items: Array.from({ length: 51 }, () => ({ itemId: 1, quantity: 1, price: 10 })),
                });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('الحد الأقصى 50 صنفاً في الطلب');
                // rejected at the schema gate — no menu lookup, no transaction
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        it('exactly 50 items stays accepted (boundary)', async () => {
                const res = await callPost({
                        ...tamperedBody,
                        items: Array.from({ length: 50 }, () => ({ itemId: 1, quantity: 1, price: 10 })),
                });

                expect(res.status).toBe(201);
                expect(txMock.order.create).toHaveBeenCalledTimes(1);
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.items.create).toHaveLength(50);
        });
});

describe('POST /api/orders — plan order limit (round-76, inside the tx)', () => {
        it('order count at maxOrders → 403 with the plan message, create skipped', async () => {
                txMock.order.count.mockResolvedValue(500); // === maxOrders

                const res = await callPost(tamperedBody);

                expect(res.status).toBe(403);
                const json = await res.json();
                // round89-E1: unified PlanLimitError message (was the local
                // OrderLimitError copy «تم الوصول للحد الأقصى للطلبات في خطتك»)
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للطلبات (500) في خطتك. قم بترقية خطتك لإضافة المزيد.'
                );
                // the count check ran INSIDE the transaction with the create
                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        it('count under the limit → create proceeds (201)', async () => {
                txMock.order.count.mockResolvedValue(499);

                const res = await callPost(tamperedBody);

                expect(res.status).toBe(201);
                expect(txMock.order.create).toHaveBeenCalledTimes(1);
        });
});

describe('POST /api/orders — guards', () => {
        it('rate-limited IP → 429 before any DB work', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callPost(tamperedBody, { 'x-real-ip': '9.9.9.9' });

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.error).toContain('محاولات كثيرة');
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
        });

        it('limiter bucket key derives from x-real-ip', async () => {
                await callPost(tamperedBody, { 'x-real-ip': '9.9.9.9' });

                expect(mockRateCheck).toHaveBeenCalledWith('order:9.9.9.9');
        });

        it('limiter falls back to x-forwarded-for (single entry, trimmed)', async () => {
                await callPost(tamperedBody, { 'x-forwarded-for': ' 8.8.8.8 ' });

                expect(mockRateCheck).toHaveBeenCalledWith('order:8.8.8.8');
        });

        it('round91-D1: multi-entry x-forwarded-for keys on the LAST entry (the hop the trusted proxy appended), not the spoofable first', async () => {
                await callPost(tamperedBody, { 'x-forwarded-for': ' 8.8.8.8 , 10.0.0.1' });

                // getClientIp trusts TRUST_PROXY_DEPTH=1 from the END: behind an
                // appending proxy the LAST entry is the proxy-controlled hop —
                // the old first-hop read let a client rotate spoofed entries to
                // mint fresh buckets (D1 HIGH finding).
                expect(mockRateCheck).toHaveBeenCalledWith('order:10.0.0.1');
        });

        it('no IP headers → bucket key "order:unknown"', async () => {
                await callPost(tamperedBody);

                expect(mockRateCheck).toHaveBeenCalledWith('order:unknown');
        });

        it('empty items array → 422 validation envelope', async () => {
                const res = await callPost({ ...tamperedBody, items: [] });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
        });

        it('non-positive client total → IGNORED (server re-prices; field dropped from schema r102-A5)', async () => {
                // r102-A5: subtotal/total/discount لم تعد حقول مخطط — أي قيمة يرسلها
                // العميل تُتجاهل (zod يطرح المفاتيح غير المعروفة) والسعر الوحيد
                // المعتمد هو إعادة الحساب من صفوف DB (اختبار منفصل أعلاه يثبّتها).
                const res = await callPost({ ...tamperedBody, total: -5 });

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);
                // المجموع من DB لا من العميل — الكتابة حدثت داخل المعاملة
                expect(mockTransaction).toHaveBeenCalled();
        });

        it('unknown restaurant → 404 before any write', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null);

                const res = await callPost(tamperedBody);

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('المطعم غير موجود');
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});
