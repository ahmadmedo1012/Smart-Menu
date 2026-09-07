/**
 * Round88-C4/C5 — referral conversion money-path unit coverage.
 *
 * Tests the REAL src/lib/referral-conversion.ts against mocked prisma +
 * $transaction (tx-mock pattern from order-lifecycle.test.ts — same style as
 * the round87 money-path tests) plus the POST /api/orders attach wiring.
 * No real DB.
 *
 * Covered behaviors (the money-path strictness requirements):
 *   - success: pending → converted, floor(total × pct/100) points granted to
 *     the referrer's card via a RewardTransaction earn row, tier recomputed,
 *     SystemEvent recorded, conversion result returned
 *   - idempotency: the conditional status flip is the grant gate — a lost
 *     race (updateMany count 0) grants nothing
 *   - one conversion per ORDER: the completed→ready→completed round-trip
 *     guard (analog of the earn-row guard)
 *   - limits: MAX_REFERRAL_USES (10 converted per code) + self-referral guard
 *     (normalized digits, round-77 pattern)
 *   - resilience: a tx failure returns null + warning SystemEvent and NEVER
 *     throws into the order-completion money path
 *   - attach: fingerprint-matched pending claim referral gets the phone at
 *     order creation (never overwrites, invalid format no-ops)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        referral: { findFirst: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
        loyaltyCard: { update: vi.fn() },
        rewardTransaction: { create: vi.fn() },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        order: { count: vi.fn(), create: vi.fn() },
        // round90-F1 (T3): the conversion tx locks the referrer's card row
        // FOR UPDATE before the code-cap count — mock just needs to resolve.
        // round91-F-B (D2-#4): the orders POST path re-reads the Restaurant
        // row under its FOR UPDATE lock — resolving nothing → pre-tx fallback.
        restaurant: { findUnique: vi.fn() },
        $queryRaw: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
        referral: { updateMany: vi.fn() },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        menuItem: { findMany: vi.fn() },
        modifierOption: { findMany: vi.fn() },
        order: { findUnique: vi.fn() },
        restaurant: { findUnique: vi.fn() },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const ORDER = { id: 42, orderNo: 'ORD-42', restaurantId: 7, customerPhone: '0922222222', total: 120 };

const REFERRAL = {
        id: 55,
        referralCode: 'WAHAXYZ',
        referrerId: 11,
        referrerRewardPct: 10,
        restaurantId: 7,
        referrer: { id: 11, customerPhone: '0911111111', points: 40 },
};

beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        // defaults: a pending referral exists, the flip wins, cap not reached.
        // findFirst answers BOTH probes: the pending-referral lookup (returns the
        // fixture) and the per-order converted-guard (returns null — nothing
        // converted for this order yet).
        txMock.referral.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                args.where.orderId !== undefined ? null : { ...REFERRAL }
        );
        txMock.referral.updateMany.mockResolvedValue({ count: 1 });
        txMock.referral.count.mockResolvedValue(3);
        txMock.loyaltyCard.update.mockResolvedValue({ id: 11, points: 52 });
        txMock.rewardTransaction.create.mockResolvedValue({ id: 900 });
        txMock.systemEvent.create.mockResolvedValue({});
        mockPrisma.systemEvent.create.mockResolvedValue({});
        mockPrisma.referral.updateMany.mockResolvedValue({ count: 0 });
});

// ── convertReferralForCompletedOrder ────────────────────────────────────

describe('convertReferralForCompletedOrder — success grant', () => {
        it('converts the referral and grants floor(total × pct/100) points with an earn row + SystemEvent', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: true, referralId: 55, points: 12 });
                // everything in ONE transaction
                expect(mockTransaction).toHaveBeenCalledTimes(1);

                // oldest pending referral for THIS phone + restaurant
                expect(txMock.referral.findFirst).toHaveBeenCalledWith({
                        where: { restaurantId: 7, referredPhone: '0922222222', status: 'pending' },
                        orderBy: { createdAt: 'asc' },
                        include: { referrer: { select: { id: true, customerPhone: true, points: true } } },
                });

                // the idempotency gate: conditional flip WHERE status='pending'
                expect(txMock.referral.updateMany).toHaveBeenCalledWith({
                        where: { id: 55, status: 'pending' },
                        data: { status: 'converted', convertedAt: expect.any(Date), orderId: 42 },
                });

                // the reward — 10% of 120 = 12 points on the referrer's card,
                // tier recomputed from stored points (40 + 12 → real computeTier)
                expect(txMock.loyaltyCard.update).toHaveBeenCalledWith({
                        where: { id: 11 },
                        data: {
                                points: { increment: 12 },
                                tier: expect.stringMatching(/^(bronze|silver|gold|platinum)$/),
                        },
                });

                // the earn row — the existing RewardTransaction pattern
                expect(txMock.rewardTransaction.create).toHaveBeenCalledWith({
                        data: {
                                cardId: 11,
                                type: 'earn',
                                points: 12,
                                description: 'مكافأة إحالة — طلب ORD-42',
                                orderId: 42,
                                restaurantId: 7,
                        },
                });

                // audited
                expect(txMock.systemEvent.create).toHaveBeenCalledWith({
                        data: expect.objectContaining({
                                eventType: 'referral.converted',
                                severity: 'info',
                                metadata: expect.objectContaining({ referralId: 55, points: 12, orderId: 42, orderNo: 'ORD-42' }),
                        }),
                });
        });

        it('accepts a Prisma Decimal total (toNumber) — same grant math', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');

                const result = await convertReferralForCompletedOrder({
                        ...ORDER,
                        total: { toNumber: () => 120 } as unknown as object,
                });

                expect(result?.points).toBe(12);
                expect(txMock.rewardTransaction.create).toHaveBeenCalledWith(
                        expect.objectContaining({ data: expect.objectContaining({ points: 12 }) })
                );
        });

        it('tiny order (reward floor = 0): converts WITHOUT points, still audited', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');

                const result = await convertReferralForCompletedOrder({ ...ORDER, total: 5 });

                expect(result).toEqual({ converted: true, referralId: 55, points: 0 });
                expect(txMock.referral.updateMany).toHaveBeenCalled();
                expect(txMock.loyaltyCard.update).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
                expect(txMock.systemEvent.create).toHaveBeenCalled();
        });
});

describe('convertReferralForCompletedOrder — guards & idempotency', () => {
        it('no pending referral for the phone → no-op, zero writes', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.referral.findFirst.mockResolvedValue(null);

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: false, reason: 'no-pending' });
                expect(txMock.referral.updateMany).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
        });

        it('lost race (flip count 0): status already converted by a concurrent request → NO grant', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.referral.updateMany.mockResolvedValue({ count: 0 });

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: false, reason: 'race-lost' });
                expect(txMock.loyaltyCard.update).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
                expect(txMock.systemEvent.create).not.toHaveBeenCalled();
        });

        it('one conversion per ORDER: an already-converted referral on this order blocks a second grant (toggle round-trip)', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                // the pending probe finds one, but the per-order guard probe ALSO
                // finds a converted row referencing THIS order (the earn-row
                // guard's analog) — the second grant is blocked
                txMock.referral.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                        args.where.orderId !== undefined ? { id: 56, orderId: 42 } : { ...REFERRAL }
                );

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: false, reason: 'order-already-converted' });
                expect(txMock.referral.updateMany).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
        });

        it('normalization edge: referrer 00218922222222 vs buyer 0922222222 — digits DIFFER, the guard must not fire', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.referral.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                        args.where.orderId !== undefined
                                ? null
                                : { ...REFERRAL, referrer: { id: 11, customerPhone: '00218922222222', points: 40 } }
                );

                const result = await convertReferralForCompletedOrder(ORDER);

                // 00218922222222 → 218922222222 vs 0922222222 → different numbers
                // (a +218 international form of ANOTHER line) — legitimate referral
                expect(result?.converted).toBe(true);
                expect(txMock.rewardTransaction.create).toHaveBeenCalled();
        });

        it('self-referral (exact same phone digits): no conversion, no grant', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.referral.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) =>
                        args.where.orderId !== undefined
                                ? null
                                : { ...REFERRAL, referrer: { id: 11, customerPhone: '092-222-2222', points: 40 } }
                );

                const result = await convertReferralForCompletedOrder(ORDER);

                // dashes stripped → identical digits → self-referral blocked
                expect(result).toEqual({ converted: false, reason: 'self-referral' });
                expect(txMock.referral.updateMany).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
        });

        it('code usage cap: 10 already converted for this code → stays pending, no grant', async () => {
                const { convertReferralForCompletedOrder, MAX_REFERRAL_USES } = await import('@/lib/referral-conversion');
                txMock.referral.count.mockResolvedValue(MAX_REFERRAL_USES);

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toEqual({ converted: false, reason: 'code-cap' });
                expect(txMock.referral.updateMany).not.toHaveBeenCalled();
        });
});

describe('convertReferralForCompletedOrder — resilience (money-path isolation)', () => {
        it('a tx failure NEVER throws: null returned + warning SystemEvent logged', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.loyaltyCard.update.mockRejectedValue(new Error('db exploded'));

                const result = await convertReferralForCompletedOrder(ORDER);

                expect(result).toBeNull();
                expect(mockPrisma.systemEvent.create).toHaveBeenCalledWith({
                        data: expect.objectContaining({
                                eventType: 'referral.converted',
                                severity: 'warning',
                                metadata: expect.objectContaining({ orderId: 42, orderNo: 'ORD-42' }),
                        }),
                });
        });

        it('even the failure logging failing must not throw into the caller', async () => {
                const { convertReferralForCompletedOrder } = await import('@/lib/referral-conversion');
                txMock.loyaltyCard.update.mockRejectedValue(new Error('db exploded'));
                mockPrisma.systemEvent.create.mockRejectedValue(new Error('events table gone'));

                await expect(convertReferralForCompletedOrder(ORDER)).resolves.toBeNull();
        });
});

// ── attachReferralPhoneToOrder + session key ────────────────────────────

describe('referralSessionKey — the round-77 fingerprint (claim ↔ attach identity)', () => {
        it('derives the same key as the claim route for the same first-hop IP + code', async () => {
                const { referralSessionKey } = await import('@/lib/referral-conversion');

                const reqA = {
                        headers: { get: (n: string) => (n === 'x-forwarded-for' ? '1.2.3.4, 9.9.9.9' : null) },
                };
                const reqB = {
                        headers: { get: (n: string) => (n === 'x-forwarded-for' ? ' 1.2.3.4 ,5.5.5.5' : null) },
                };
                const reqOther = {
                        headers: { get: (n: string) => (n === 'x-forwarded-for' ? '8.8.8.8' : null) },
                };

                const key = referralSessionKey(reqA, 'WAHAXYZ');
                // same first hop (rest of the attacker-controlled chain ignored)
                expect(referralSessionKey(reqB, 'WAHAXYZ')).toBe(key);
                // different first hop → different key
                expect(referralSessionKey(reqOther, 'WAHAXYZ')).not.toBe(key);
                // different code → different key
                expect(referralSessionKey(reqA, 'OTHERCD')).not.toBe(key);
                // shape: ref-<16 hex>-<code>; raw IP never persisted
                expect(key).toMatch(/^ref-[0-9a-f]{16}-WAHAXYZ$/);
                expect(key).not.toContain('1.2.3.4');
                // no header at all → deterministic 'unknown' bucket (same as claim)
                const reqNone = { headers: { get: () => null } };
                expect(referralSessionKey(reqNone, 'WAHAXYZ')).toMatch(/^ref-[0-9a-f]{16}-WAHAXYZ$/);
        });
});

describe('attachReferralPhoneToOrder — order-creation linking', () => {
        function makeReq(ip = '1.2.3.4'): { headers: { get(name: string): string | null } } {
                return { headers: { get: (n: string) => (n === 'x-forwarded-for' ? ip : null) } };
        }

        it('updates ONLY the matching anonymous pending claim (fingerprint key, empty phone)', async () => {
                const { attachReferralPhoneToOrder, referralSessionKey } = await import('@/lib/referral-conversion');
                mockPrisma.referral.updateMany.mockResolvedValue({ count: 1 });

                await attachReferralPhoneToOrder({
                        request: makeReq(),
                        referralCode: 'WAHAXYZ',
                        restaurantId: 7,
                        customerPhone: '0922222222',
                });

                expect(mockPrisma.referral.updateMany).toHaveBeenCalledWith({
                        where: {
                                referralCode: 'WAHAXYZ',
                                referredName: referralSessionKey(makeReq(), 'WAHAXYZ'),
                                restaurantId: 7,
                                status: 'pending',
                                referredPhone: '',
                        },
                        data: { referredPhone: '0922222222' },
                });
                // link audited
                expect(mockPrisma.systemEvent.create).toHaveBeenCalledWith({
                        data: expect.objectContaining({ eventType: 'referral.linked', severity: 'info' }),
                });
        });

        it('no matching row (count 0) → NO event, no throw', async () => {
                const { attachReferralPhoneToOrder } = await import('@/lib/referral-conversion');
                mockPrisma.referral.updateMany.mockResolvedValue({ count: 0 });

                await attachReferralPhoneToOrder({
                        request: makeReq(),
                        referralCode: 'WAHAXYZ',
                        restaurantId: 7,
                        customerPhone: '0922222222',
                });

                expect(mockPrisma.systemEvent.create).not.toHaveBeenCalled();
        });

        it('invalid code format → no DB calls at all', async () => {
                const { attachReferralPhoneToOrder } = await import('@/lib/referral-conversion');

                await attachReferralPhoneToOrder({
                        request: makeReq(),
                        referralCode: 'bad code!',
                        restaurantId: 7,
                        customerPhone: '0922222222',
                });
                await attachReferralPhoneToOrder({
                        request: makeReq(),
                        referralCode: 'WAHAXYZ',
                        restaurantId: 7,
                        customerPhone: '',
                });

                expect(mockPrisma.referral.updateMany).not.toHaveBeenCalled();
        });

        it('a link failure is swallowed (order creation must never fail on the referral link)', async () => {
                const { attachReferralPhoneToOrder } = await import('@/lib/referral-conversion');
                mockPrisma.referral.updateMany.mockRejectedValue(new Error('db down'));

                await expect(
                        attachReferralPhoneToOrder({
                                request: makeReq(),
                                referralCode: 'WAHAXYZ',
                                restaurantId: 7,
                                customerPhone: '0922222222',
                        })
                ).resolves.toBeUndefined();
        });
});

// ── POST /api/orders wiring (real route + real attach against the mocks) ─

describe('POST /api/orders — referralCode field wiring', () => {
        beforeEach(() => {
                mockRateCheck.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
                mockPrisma.menuItem.findMany.mockResolvedValue([{ id: 1, price: 10, discountedPrice: null }]);
                mockPrisma.modifierOption.findMany.mockResolvedValue([]);
                mockPrisma.order.findUnique.mockResolvedValue(null);
                mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 5, name: 'waha', slug: 'waha', maxOrders: 500, isActive: true });
                txMock.order.count.mockResolvedValue(10);
                txMock.order.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
                        id: 900,
                        orderNo: args.data.orderNo,
                        ...args.data,
                        items: [],
                }));
        });

        async function callPost(body: unknown, ip = '1.2.3.4') {
                const { POST } = await import('@/app/api/orders/route');
                const req = new NextRequest('http://localhost/api/orders', {
                        method: 'POST',
                        headers: {
                                'Content-Type': 'application/json',
                                ...(ip ? { 'x-forwarded-for': ip } : {}),
                        },
                        body: JSON.stringify(body),
                });
                return POST(req);
        }

        const validBody = {
                subtotal: 20,
                total: 20,
                restaurantId: 5,
                customerPhone: '0922222222',
                items: [{ itemId: 1, quantity: 2, price: 10 }],
        };

        it('body with referralCode → the attach runs (order still created, 201)', async () => {
                mockPrisma.referral.updateMany.mockResolvedValue({ count: 1 });

                const res = await callPost({ ...validBody, referralCode: 'WAHAXYZ' }, '4.4.4.4');

                expect(res.status).toBe(201);
                // the attach fired with the session fingerprint derived from THIS
                // request's first hop
                expect(mockPrisma.referral.updateMany).toHaveBeenCalledWith({
                        where: expect.objectContaining({
                                referralCode: 'WAHAXYZ',
                                restaurantId: 5,
                                status: 'pending',
                                referredPhone: '',
                        }),
                        data: { referredPhone: '0922222222' },
                });
                // the discount guard is untouched — round-77 still forces 0
                const createArg = txMock.order.create.mock.calls[0][0];
                expect(createArg.data.discount).toBe(0);
        });

        it('body WITHOUT referralCode → no attach (existing behavior unchanged)', async () => {
                const res = await callPost(validBody);

                expect(res.status).toBe(201);
                expect(mockPrisma.referral.updateMany).not.toHaveBeenCalled();
        });

        it('invalid referralCode format → 422 validation (never reaches the attach)', async () => {
                const res = await callPost({ ...validBody, referralCode: 'not a code' });

                expect(res.status).toBe(422);
                expect(mockPrisma.referral.updateMany).not.toHaveBeenCalled();
        });
});
