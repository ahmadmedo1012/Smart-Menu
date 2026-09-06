/**
 * round90-F1 — R-1/T1 + annexes regression lock for POST /api/orders.
 *
 * Locked behaviors (g90-D2 red-team R-1 + investigation بند 1 T1 + هـ):
 *   1. ATOMIC CAP: the restaurant row is locked `SELECT ... FOR UPDATE`
 *      INSIDE the $transaction BEFORE tx.order.count — count-then-create
 *      alone under READ COMMITTED lets N concurrent POSTs at maxOrders-1
 *      all pass and all create (plan-cap bypass).
 *   2. INACTIVE RESTAURANT: isActive:false → 409 «المطعم غير متاح حالياً»
 *      before any write (S-5: suspended restaurants kept accepting orders).
 *   3. IDEMPOTENCY RACE: two concurrent submits with the same
 *      idempotencyKey — the loser used to surface handleError's generic
 *      409 «هذا الاسم موجود مسبقاً» (a NAME message for an ORDER). The
 *      route's real contract (:225) is the inert 200 {orderNo, already:true}
 *      — P2002 on orderNo specifically now returns exactly that.
 *
 * Mock pattern: orders-create.test.ts (tx-mock prisma + controllable
 * limiter + mocked auth) — no real DB.
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
        // round90-F1 (T1): the route locks the restaurant row FOR UPDATE
        // inside the tx before the cap count.
        $queryRaw: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
        menuItem: { findMany: mockMenuItemFindMany },
        modifierOption: { findMany: mockModifierOptionFindMany },
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

const RESTAURANT = { id: 5, name: 'al-waha-cafe', slug: 'al-waha', maxOrders: 500, isActive: true };

const VALID_BODY = {
        subtotal: 20,
        total: 20,
        restaurantId: 5,
        items: [{ itemId: 1, quantity: 2, price: 10 }],
};

/** A Prisma P2002 shaped the way the client surfaces it. */
function p2002(target: string[] | string, message: string) {
        return Object.assign(new Error(message), {
                code: 'P2002',
                meta: { target },
        });
}

async function callPost(body: unknown) {
        const { POST } = await import('@/app/api/orders/route');
        return POST(
                new NextRequest('http://localhost/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                })
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
        mockMenuItemFindMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: null }]);
        mockModifierOptionFindMany.mockResolvedValue([]);
        mockOrderFindUnique.mockResolvedValue(null);
        mockRestaurantFindUnique.mockResolvedValue({ ...RESTAURANT });
        mockTransaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock));
        txMock.order.count.mockResolvedValue(10);
        txMock.order.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
                id: 900,
                orderNo: args.data.orderNo,
                ...args.data,
                items: [],
        }));
});

// ── T1: the atomic plan cap ─────────────────────────────────────────────

describe('POST /api/orders — atomic maxOrders (T1)', () => {
        it('the restaurant row is locked FOR UPDATE INSIDE the tx BEFORE the count (race serialized)', async () => {
                await callPost(VALID_BODY);

                expect(mockTransaction).toHaveBeenCalledTimes(1);
                expect(txMock.$queryRaw).toHaveBeenCalledTimes(1);
                const sql = String(txMock.$queryRaw.mock.calls[0][0]);
                expect(sql).toContain('FOR UPDATE');
                expect(sql).toContain('"Restaurant"');
                expect(txMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
                        txMock.order.count.mock.invocationCallOrder[0]
                );
        });

        it('cap exceeded → 403 unified plan message, create skipped (behavior preserved)', async () => {
                txMock.order.count.mockResolvedValue(500); // === maxOrders

                const res = await callPost(VALID_BODY);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe(
                        'لقد وصلت للحد الأقصى للطلبات (500) في خطتك. قم بترقية خطتك لإضافة المزيد.'
                );
                expect(txMock.order.create).not.toHaveBeenCalled();
        });
});

// ── S-5 annex: inactive restaurant ──────────────────────────────────────

describe('POST /api/orders — inactive restaurant', () => {
        it('isActive:false → 409 «المطعم غير متاح حالياً» before any write', async () => {
                mockRestaurantFindUnique.mockResolvedValue({ ...RESTAURANT, isActive: false });

                const res = await callPost(VALID_BODY);

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('المطعم غير متاح حالياً');
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.order.create).not.toHaveBeenCalled();
        });

        it('missing restaurant stays 404 (distinct from the inactive case)', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null);

                const res = await callPost(VALID_BODY);

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('المطعم غير موجود');
        });
});

// ── idempotency-race annex: P2002 on orderNo ────────────────────────────

describe('POST /api/orders — P2002 on orderNo → the contracted inert confirmation', () => {
        it('concurrent duplicate key: tx create throws P2002 (fields target) → 200 {orderNo, already:true}, no PII', async () => {
                txMock.order.create.mockRejectedValue(
                        p2002(['orderNo'], 'Unique constraint failed on the fields: (`orderNo`)')
                );

                const res = await callPost({ ...VALID_BODY, idempotencyKey: 'abc123' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ orderNo: 'ORD-ABC123', already: true });
                // minimal confirmation only — customer PII must NOT be echoed
                expect(json.data).not.toHaveProperty('customerName');
                expect(json.data).not.toHaveProperty('customerPhone');
        });

        it('P2002 with the CONSTRAINT-NAME target shape (Order_orderNo_key) → same inert 200', async () => {
                txMock.order.create.mockRejectedValue(
                        p2002('Order_orderNo_key', 'Unique constraint failed on the constraint: `Order_orderNo_key`')
                );

                const res = await callPost({ ...VALID_BODY, idempotencyKey: 'abc123' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({ orderNo: 'ORD-ABC123', already: true });
        });

        it('P2002 on a DIFFERENT unique field does NOT alias to already:true (falls to handleError)', async () => {
                // discrimination proof: the catch is orderNo-specific, not a
                // blanket P2002 swallow (no other unique exists on Order.create
                // today — this pins the intent for any future one)
                txMock.order.create.mockRejectedValue(
                        p2002(['someFutureField'], 'Unique constraint failed on the fields: (`someFutureField`)')
                );

                const res = await callPost({ ...VALID_BODY, idempotencyKey: 'abc123' });

                expect(res.status).not.toBe(200);
                const json = await res.json();
                expect(json.success).toBe(false);
        });
});
