/**
 * Round87-D1 — PUT /api/orders/[id] order-lifecycle coverage (was 0% lcov).
 *
 * Tests the REAL route handler with mocked prisma + $transaction (tx-mock
 * pattern) and a per-test requireAuth/requirePermission holder — no real DB.
 *
 * round88-C4 update (documented): order completion now ALSO runs the referral
 * conversion (src/lib/referral-conversion.ts) — a SEPARATE best-effort
 * $transaction AFTER the loyalty money-path tx, never inside it. The txMock
 * below gained referral/systemEvent/loyaltyCard.update methods so the REAL
 * conversion code runs (not a stub): its default is findFirst→null (no pending
 * referral) which keeps every original loyalty assertion intact while the
 * conversion probe itself is asserted in the first test.
 *
 * Coverage map (named after the plan's wording, mapped to actual behavior):
 *   1. "pending → completed": the schema has no `pending` OrderStatus — the
 *      real pre-completed states are new/preparing/ready. Accrual block:
 *      `body.status === 'completed' && existing.status !== 'completed'`.
 *   2. Double-completion: re-PUTting completed on an ALREADY-completed order
 *      is NOT rejected (no 409) — the accrual block is skipped entirely and
 *      the request falls through to a plain row update (idempotent on points).
 *   3. Toggle round-trip: completed→ready (any reverse transition) is allowed
 *      by the plain-update path; re-completing later re-enters the accrual
 *      block but the in-tx earn-row check blocks the second grant.
 *   4. Ownership: owner cross-tenant without a UserRestaurant link → 403.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockOrderUpdate = vi.hoisted(() => vi.fn());
// r127-F2 (ADV2-3): the plain-update path is now prisma.order.updateMany
// (conditional write) + a findUnique re-read — never prisma.order.update.
const mockOrderUpdateMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockTransaction = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockRequirePermission = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        order: { findUnique: mockOrderFindUnique, update: mockOrderUpdate, updateMany: mockOrderUpdateMany },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        // round88-C4: the REAL referral-conversion lib runs against these
        // (failure-logging event + attach path share the same mock registry)
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
        referral: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
// the route builds its limiter at module scope — feed it a controllable check
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

// requireAuth resolves per-test via a mutable holder
const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 1 as number | null,
                permissions: [] as string[],
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
        requirePermission: mockRequirePermission,
}));

// ── Interactive transaction mock (captured tx object) ───────────────────
// round88-C4: referral + systemEvent + loyaltyCard.update added — the real
// conversion lib executes inside its own $transaction against this tx.

const txMock = {
        rewardTransaction: { findFirst: vi.fn(), create: vi.fn() },
        order: { updateMany: vi.fn(), findUnique: vi.fn() },
        loyaltyCard: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
        referral: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
        systemEvent: { create: vi.fn().mockResolvedValue({}) },
};

// ── Fixtures ────────────────────────────────────────────────────────────

const ORDER = {
        id: 1,
        orderNo: 'ORD-100',
        status: 'preparing',
        total: 120,
        customerPhone: '0912345678',
        customerName: 'سالم',
        restaurantId: 1,
};

const COMPLETED_ROW = {
        ...ORDER,
        status: 'completed',
        items: [],
        restaurant: { id: 1, name: 'مطعم الأصيل', slug: 'asdeel' },
};

function makePutRequest(body: unknown, id = '1'): NextRequest {
        return new NextRequest(`http://localhost/api/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
        });
}

async function callPut(body: unknown, id = '1') {
        const { PUT } = await import('@/app/api/orders/[id]/route');
        return PUT(makePutRequest(body, id), { params: Promise.resolve({ id }) });
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 1, permissions: [] };
        mockRequirePermission.mockResolvedValue({
                authorized: true,
                role: 'sub_admin',
                userId: 7,
                restaurantId: null,
                permissions: ['APPROVE_ORDERS'],
        });
        mockRateCheck.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
        mockOrderFindUnique.mockResolvedValue({ ...ORDER });
        mockOrderUpdate.mockResolvedValue({ ...COMPLETED_ROW });
        // r127-F2 default: the conditional plain write wins its race (1 row)
        mockOrderUpdateMany.mockResolvedValue({ count: 1 });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        // tx defaults: no prior earn row, conditional flip wins, row read back
        txMock.rewardTransaction.findFirst.mockResolvedValue(null);
        txMock.order.updateMany.mockResolvedValue({ count: 1 });
        txMock.order.findUnique.mockResolvedValue({ ...COMPLETED_ROW });
        txMock.loyaltyCard.findUnique.mockResolvedValue({ id: 11, points: 40, tier: 'silver' });
        txMock.loyaltyCard.upsert.mockResolvedValue({ id: 11, points: 52 });
        txMock.loyaltyCard.update.mockResolvedValue({ id: 11, points: 52 });
        txMock.rewardTransaction.create.mockResolvedValue({ id: 500 });
        // round88-C4 default: NO pending referral — conversion probes then no-ops
        // (keeps every original loyalty assertion intact)
        txMock.referral.findFirst.mockResolvedValue(null);
        txMock.referral.updateMany.mockResolvedValue({ count: 0 });
        txMock.referral.count.mockResolvedValue(0);
        txMock.systemEvent.create.mockClear();
});

describe('PUT /api/orders/[id] — loyalty accrual', () => {
        it('preparing → completed: accrues floor(total/10) points, bumps the card, writes one earn transaction', async () => {
                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data.status).toBe('completed');

                // everything loyalty-related ran inside ONE interactive transaction;
                // the round88-C4 referral conversion then runs its OWN best-effort
                // $transaction (separate by design — a referral hiccup must never
                // roll back the completed order)
                expect(mockTransaction).toHaveBeenCalledTimes(2);

                // round88-C4: the conversion probed for a pending referral for
                // this phone+restaurant (none by default → no grant)
                expect(txMock.referral.findFirst).toHaveBeenCalledWith({
                        where: {
                                restaurantId: 1,
                                referredPhone: '0912345678',
                                status: 'pending',
                        },
                        orderBy: { createdAt: 'asc' },
                        include: { referrer: { select: { id: true, customerPhone: true, points: true } } },
                });
                expect(txMock.loyaltyCard.update).not.toHaveBeenCalled();

                // earn-row idempotency probe (layer 2) with the order id
                expect(txMock.rewardTransaction.findFirst).toHaveBeenCalledWith({
                        where: { orderId: 1, type: 'earn' },
                        select: { id: true },
                });

                // status flip is conditional on the ORIGINAL status (layer 3)
                expect(txMock.order.updateMany).toHaveBeenCalledWith({
                        where: { id: 1, status: 'preparing' },
                        data: { status: 'completed' },
                });

                // tier recomputed from earned + existing points (12 + 40 = 52 → silver)
                expect(txMock.loyaltyCard.upsert).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: {
                                        customerPhone_restaurantId: { customerPhone: '0912345678', restaurantId: 1 },
                                },
                                update: {
                                        points: { increment: 12 },
                                        totalOrders: { increment: 1 },
                                        totalSpent: { increment: 120 },
                                        tier: 'silver',
                                },
                        })
                );

                // the loyalty write itself — the exact earn row
                expect(txMock.rewardTransaction.create).toHaveBeenCalledWith({
                        data: {
                                cardId: 11,
                                type: 'earn',
                                points: 12,
                                description: 'طلب ORD-100',
                                orderId: 1,
                                restaurantId: 1,
                        },
                });

                // owner path never consults requirePermission for the status change
                expect(mockRequirePermission).not.toHaveBeenCalled();
        });

        it('first-ever completion: upsert takes the create branch (new card, referral code, bronze tier)', async () => {
                // total 95 → floor(95/10) = 9 points → computeTier(9) = bronze
                mockOrderFindUnique.mockResolvedValue({ ...ORDER, total: 95 });
                txMock.order.findUnique.mockResolvedValue({ ...COMPLETED_ROW, total: 95 });
                txMock.loyaltyCard.findUnique.mockResolvedValue(null);
                txMock.loyaltyCard.upsert.mockResolvedValue({ id: 99, points: 9 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                const upsertArg = txMock.loyaltyCard.upsert.mock.calls[0][0];
                expect(upsertArg.create).toMatchObject({
                        customerPhone: '0912345678',
                        restaurantId: 1,
                        points: 9,
                        totalOrders: 1,
                        totalSpent: 95,
                        tier: 'bronze',
                });
                // referralCode from the shared generator — 16 uppercase hex chars
                expect(upsertArg.create.referralCode).toMatch(/^[0-9A-F]{16}$/);
                expect(txMock.rewardTransaction.create).toHaveBeenCalledWith({
                        data: expect.objectContaining({ cardId: 99, type: 'earn', points: 9 }),
                });
        });

        it('total under 10 points (pts 0) skips the LOYALTY accrual — conditional plain update + referral probe only', async () => {
                // read 1 (existing): tiny order, live → falls through to the
                // plain path. read 2 (re-read): the completed row the re-read
                // answers with — it is what fires the referral probe below.
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, total: 9 })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, total: 9 });

                const res = await callPut({ status: 'completed' });

                // documented behavior: tiny orders are NOT rejected — they simply
                // don't accrue loyalty (floor(9/10) = 0) and take the plain-update
                // path. round88-C4: the order still completed with real money, so
                // the referral conversion still probes (its own tx) — but with the
                // default no-pending fixture it grants nothing.
                expect(res.status).toBe(200);
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
                expect(txMock.loyaltyCard.upsert).not.toHaveBeenCalled();
                expect(txMock.referral.findFirst).toHaveBeenCalledWith(
                        expect.objectContaining({
                                where: expect.objectContaining({ referredPhone: '0912345678', status: 'pending' }),
                        })
                );
                // r127-F2: the plain write is now updateMany CONDITIONAL on the
                // row still being non-cancelled (live-status request).
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1, status: { not: 'cancelled' } }, data: { status: 'completed' } })
                );
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('order without a customerPhone accrues nothing and skips the referral probe (anonymous orders)', async () => {
                // read 1 (existing) + read 2 (re-read) both mirror the anonymous
                // row — the re-read status/phone is what suppresses the hook.
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, customerPhone: '' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, customerPhone: '' });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.referral.findFirst).not.toHaveBeenCalled();
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1, status: { not: 'cancelled' } }, data: { status: 'completed' } })
                );
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });
});

describe('PUT /api/orders/[id] — double-completion & toggle round-trips', () => {
        it('double-completion: already-completed order is NOT rejected — accrual block skipped, conditional plain update, no loyalty writes', async () => {
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, status: 'completed' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW });

                const res = await callPut({ status: 'completed' });

                // actual behavior (documented gap vs the plan's "409"): the request
                // succeeds; idempotency is achieved by skipping the accrual block
                // (existing.status === 'completed'), not by rejecting the request.
                expect(res.status).toBe(200);
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
                expect(txMock.loyaltyCard.upsert).not.toHaveBeenCalled();
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1, status: { not: 'cancelled' } }, data: { status: 'completed' } })
                );
        });

        it('toggle round-trip: completed → ready is allowed (reverse transition, conditional plain update)', async () => {
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, status: 'completed' })
                        .mockResolvedValueOnce({ ...ORDER, status: 'ready' });

                const res = await callPut({ status: 'ready' });

                expect(res.status).toBe(200);
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1, status: { not: 'cancelled' } }, data: { status: 'ready' } })
                );
                // no accrual logic on reverse transitions
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('toggle round-trip: re-completing a re-opened order hits the earn-row guard — flip happens, points do NOT', async () => {
                // second leg of completed → ready → completed: the request re-enters
                // the accrual block (ready ≠ completed) but layer 2 (existing earn
                // row on this order) blocks the second grant.
                mockOrderFindUnique.mockResolvedValue({ ...ORDER, status: 'ready' });
                txMock.rewardTransaction.findFirst.mockResolvedValue({ id: 500 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                expect(txMock.order.updateMany).toHaveBeenCalledWith({
                        where: { id: 1, status: 'ready' },
                        data: { status: 'completed' },
                });
                expect(txMock.loyaltyCard.upsert).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
        });

        it('concurrent status change (updateMany count 0): flip loses the race, NO points granted, current row returned', async () => {
                txMock.order.updateMany.mockResolvedValue({ count: 0 });
                // the "already" read-back in the count-0 branch (restaurant-only include)
                txMock.order.findUnique.mockResolvedValue({ ...COMPLETED_ROW, status: 'cancelled' });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.status).toBe('cancelled');
                expect(txMock.loyaltyCard.upsert).not.toHaveBeenCalled();
                expect(txMock.rewardTransaction.create).not.toHaveBeenCalled();
        });
});

describe('PUT /api/orders/[id] — authorization & tenant scope', () => {
        it('owner of restaurant A cannot modify restaurant B order (no UserRestaurant link) → 403, zero writes', async () => {
                mockOrderFindUnique.mockResolvedValue({ ...ORDER, restaurantId: 99 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 1, restaurantId: 99 } },
                });
                expect(mockOrderUpdate).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('owner WITH a UserRestaurant link to restaurant B CAN modify that order', async () => {
                mockOrderFindUnique.mockResolvedValue({ ...ORDER, restaurantId: 99 });
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 99, isPrimary: false });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                // loyalty tx + the round88-C4 referral-conversion tx
                expect(mockTransaction).toHaveBeenCalledTimes(2);
        });

        it('regular user role is rejected (403) before any write', async () => {
                authHolder.value = { authorized: true, role: 'user', restaurantId: null, userId: 5, permissions: [] };

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(403);
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin without APPROVE_ORDERS in permissions is rejected (403)', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 7, permissions: [] };

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(403);
                // blocked at the role gate — requirePermission never even consulted
                expect(mockRequirePermission).not.toHaveBeenCalled();
        });

        it('sub_admin holding APPROVE_ORDERS can complete orders (requirePermission consulted for the status change)', async () => {
                authHolder.value = {
                        authorized: true,
                        role: 'sub_admin',
                        restaurantId: null,
                        userId: 7,
                        permissions: ['APPROVE_ORDERS'],
                };

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                expect(mockRequirePermission).toHaveBeenCalledWith('APPROVE_ORDERS');
                // staff completion still accrues loyalty through the same tx path
                expect(txMock.rewardTransaction.create).toHaveBeenCalledTimes(1);
        });

        it('staff status change is blocked when requirePermission denies (perm error/status passthrough)', async () => {
                authHolder.value = {
                        authorized: true,
                        role: 'sub_admin',
                        restaurantId: null,
                        userId: 7,
                        permissions: ['APPROVE_ORDERS'],
                };
                mockRequirePermission.mockResolvedValue({ authorized: false, error: 'لا تملك الصلاحية', status: 403 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('unauthenticated request → 401', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(401);
        });
});

describe('PUT /api/orders/[id] — input & limiter guards', () => {
        it('missing order id → 404', async () => {
                mockOrderFindUnique.mockResolvedValue(null);

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(404);
        });

        it('non-numeric id → 400', async () => {
                const res = await callPut({ status: 'completed' }, 'abc');

                expect(res.status).toBe(400);
        });

        it('invalid status value → 422 validation envelope', async () => {
                const res = await callPut({ status: 'teleported' });

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة');
        });

        it('rate limiter blocks the ip → 429 before auth/db', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(429);
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
        });
});

// ── r121-D2: cancelled is terminal ─────────────────────────────────────
// One guard ONLY (X2 narrowing): reject any status CHANGE on a cancelled
// order. Backward transitions among the four live statuses stay allowed
// (pinned at :300/:314 above — the guard must NOT grow into a forward-only
// map) and same-status PUTs stay allowed (idempotent re-ack, current
// behavior preserved).

describe('PUT /api/orders/[id] — r121-D2: cancelled is terminal', () => {
        it('cancelled → completed → 409, NO loyalty mint (no accrual tx, no plain update, no referral conversion)', async () => {
                mockOrderFindUnique.mockResolvedValue({ ...ORDER, status: 'cancelled' });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لا يمكن تغيير حالة طلب ملغي — الطلب الملغي نهائي');
                // zero writes of any kind: neither the loyalty $transaction nor
                // the plain prisma.order.update nor the round88-C4 conversion
                expect(mockTransaction).not.toHaveBeenCalled();
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('cancelled → new (re-open) → 409 — the guard is not completed-specific', async () => {
                mockOrderFindUnique.mockResolvedValue({ ...ORDER, status: 'cancelled' });

                const res = await callPut({ status: 'new' });

                expect(res.status).toBe(409);
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('cancelled → cancelled (same-status PUT) → 200 idempotent re-ack — current behavior preserved', async () => {
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, status: 'cancelled' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, status: 'cancelled' });

                const res = await callPut({ status: 'cancelled' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.status).toBe('cancelled');
                // r127-F2: same-status re-acks write unconditionally by id — they
                // can never resurrect a terminal row (no status-not-cancelled gate)
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1 }, data: { status: 'cancelled' } })
                );
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('new → cancelled (legit cancel) → 200, then re-opening the cancelled order (cancelled → new) → 409', async () => {
                // leg 1: a live order can still be cancelled (plain update, no accrual)
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, status: 'new' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, status: 'cancelled' })
                        // leg 2's existing read (the re-open attempt)
                        .mockResolvedValueOnce({ ...ORDER, status: 'cancelled' });

                const leg1 = await callPut({ status: 'cancelled' });

                expect(leg1.status).toBe(200);
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1 }, data: { status: 'cancelled' } })
                );

                // leg 2: the cancelled order is terminal — re-opening is rejected
                const leg2 = await callPut({ status: 'new' });

                expect(leg2.status).toBe(409);
        });

        it('non-status edit on a cancelled order (whatsappSent toggle) → 200 — only status TRANSITIONS are rejected', async () => {
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, status: 'cancelled' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, status: 'cancelled', whatsappSent: true });

                const res = await callPut({ whatsappSent: true });

                expect(res.status).toBe(200);
                // r127-F2: non-status edits stay UNCONDITIONAL by id — the r121-D2
                // contract (notes/whatsappSent on a terminal row are untouched)
                // survives the race fix; they can never flip a status.
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1 }, data: { whatsappSent: true } })
                );
        });

        it('completed → ready (non-cancelled backward transition) stays allowed — the D-2 guard is not a forward-only map', async () => {
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, status: 'completed' })
                        .mockResolvedValueOnce({ ...ORDER, status: 'ready' });

                const res = await callPut({ status: 'ready' });

                expect(res.status).toBe(200);
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1, status: { not: 'cancelled' } }, data: { status: 'ready' } })
                );
        });
});

// ── r127-F2 (ADV2-3): the plain-update cancelled race is closed ─────────
// The terminal guard at the top reads a SNAPSHOT: before the conditional
// write, a cancel landing between that read and the plain
// prisma.order.update where {id} was silently overwritten (the cancelled
// row flipped to completed) and the round88-C4 referral hook then
// converted on cancelled revenue.

describe('PUT /api/orders/[id] — r127-F2 (ADV2-3): plain-update cancelled race', () => {
        it('concurrent cancel between read and write (updateMany count 0): response reflects the cancelled row, NO referral conversion, no 500', async () => {
                // read 1 (existing): a live order below the accrual threshold
                // (pts 0 → plain path; the accrual block was already race-safe).
                // read 2 (re-read): the concurrent writer's row — cancelled.
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, total: 9, status: 'preparing' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, total: 9, status: 'cancelled' });
                // the conditional write loses: 0 rows matched (row is cancelled)
                mockOrderUpdateMany.mockResolvedValue({ count: 0 });

                const res = await callPut({ status: 'completed' });

                // no 500 — the race is answered, not crashed
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                // the CURRENT (cancelled) row is the answer — never completed
                expect(json.data.status).toBe('cancelled');
                // the write was conditional on non-cancelled — proven by the where
                expect(mockOrderUpdateMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: 1, status: { not: 'cancelled' } }, data: { status: 'completed' } })
                );
                // and the unconditional update-by-id is gone from the route
                expect(mockOrderUpdate).not.toHaveBeenCalled();
                // the re-read status (cancelled ≠ completed) kills the referral
                // hook — no conversion on cancelled revenue, no referral tx
                expect(txMock.referral.findFirst).not.toHaveBeenCalled();
                expect(mockTransaction).not.toHaveBeenCalled();
        });

        it('same race on an anonymous order (no phone): cancelled answer, no referral probe, no 500', async () => {
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, customerPhone: '', status: 'ready' })
                        .mockResolvedValueOnce({ ...COMPLETED_ROW, customerPhone: '', status: 'cancelled' });
                mockOrderUpdateMany.mockResolvedValue({ count: 0 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.status).toBe('cancelled');
                expect(txMock.referral.findFirst).not.toHaveBeenCalled();
        });

        it('row deleted between the write and the re-read → clean 404 (not a P2025 500)', async () => {
                // the conditional write matches (live row), but the re-read sees
                // nothing — the row was deleted concurrently
                mockOrderFindUnique
                        .mockResolvedValueOnce({ ...ORDER, total: 9 })
                        .mockResolvedValueOnce(null);
                mockOrderUpdateMany.mockResolvedValue({ count: 1 });

                const res = await callPut({ status: 'completed' });

                expect(res.status).toBe(404);
        });
});
