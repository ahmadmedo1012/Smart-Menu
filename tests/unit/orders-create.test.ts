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
const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        order: { count: vi.fn(), create: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
        menuItem: { findMany: mockMenuItemFindMany },
        modifierOption: { findMany: mockModifierOptionFindMany },
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

const RESTAURANT = { id: 5, name: 'al-waha-cafe', slug: 'al-waha', maxOrders: 500 };

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
                expect(createArg.data.items.create[0].modifiersJson).toBe('[99]');
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
        it('menuItem query is scoped to the order restaurant + available status (tenant isolation at the query level)', async () => {
                await callPost(tamperedBody);

                expect(mockMenuItemFindMany).toHaveBeenCalledWith({
                        where: {
                                id: { in: [1] },
                                status: 'available',
                                category: { is: { restaurantId: 5 } },
                        },
                        select: { id: true, price: true, discountedPrice: true },
                });
        });

        it('item missing from the tenant query (wrong restaurant OR hidden) → 400, zero writes', async () => {
                mockMenuItemFindMany.mockResolvedValue([]);

                const res = await callPost(tamperedBody);

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toContain('الصنف 1 غير موجود');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.order.create).not.toHaveBeenCalled();
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
                expect(json.error).toContain('الخيار 99 غير متاح للصنف 1');
                expect(mockTransaction).not.toHaveBeenCalled();
        });
});

describe('POST /api/orders — idempotency (round-77)', () => {
        it('duplicate idempotencyKey → 200 minimal confirmation {orderNo, already} with NO PII and no create', async () => {
                mockOrderFindUnique.mockResolvedValue({ orderNo: 'ORD-ABC123' });

                const res = await callPost({ ...tamperedBody, idempotencyKey: 'abc123' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ orderNo: 'ORD-ABC123', already: true });
                // minimal confirmation only — customer PII must NOT be echoed back
                expect(json.data).not.toHaveProperty('customerName');
                expect(json.data).not.toHaveProperty('customerPhone');
                // nothing was created / no transaction ran
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('idempotency lookup selects orderNo only (no PII columns read)', async () => {
                await callPost({ ...tamperedBody, idempotencyKey: 'abc123' });

                expect(mockOrderFindUnique).toHaveBeenCalledWith({
                        where: { orderNo: 'ORD-ABC123' },
                        select: { orderNo: true },
                });
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

        it('limiter falls back to x-forwarded-for (first hop, trimmed)', async () => {
                await callPost(tamperedBody, { 'x-forwarded-for': ' 8.8.8.8 , 10.0.0.1' });

                expect(mockRateCheck).toHaveBeenCalledWith('order:8.8.8.8');
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

        it('non-positive total → 422', async () => {
                const res = await callPost({ ...tamperedBody, total: -5 });

                expect(res.status).toBe(422);
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
