/**
 * round90-F3 — reviews route: atomic counters + multi-menu PII.
 *
 *   (أ) T4 lost-update (docs/round90/diagnosis/investigation.md بند 1): the old
 *       read-then-write block (findUnique avgRating/ratingCount → absolute
 *       update) lost updates under READ COMMITTED — two concurrent reviews
 *       both read the same snapshot and both wrote ratingCount = N+1. The fix
 *       is ONE set-based SQL statement ($executeRaw): SET expressions read
 *       the OLD column values atomically, so every concurrent executor
 *       increments the current row state. The tests simulate the exact
 *       "calculate-twice" interleaving (the same stale snapshot served to
 *       every read) and prove the read path is gone.
 *
 *   (ب) multi-menu PII: an owner whose PRIMARY restaurant differs from the
 *       item's restaurant keeps review PII through the UserRestaurant link
 *       (same ownership pattern as items/[id], orders/[id], settings) —
 *       previously only auth.restaurantId was compared, so the owner of a
 *       second (linked) menu lost his own branch's PII.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));

const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockReviewFindMany = vi.hoisted(() => vi.fn());
const mockReviewAggregate = vi.hoisted(() => vi.fn());
const mockReviewCreate = vi.hoisted(() => vi.fn());
const mockExecuteRaw = vi.hoisted(() => vi.fn().mockResolvedValue(1));
const mockTransaction = vi.hoisted(() => vi.fn());
// spies proving the OLD read-then-write path is gone (they stay on the tx
// mock on purpose: if the route ever regresses, these light up).
const mockTxMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockTxMenuItemUpdate = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
        review: { create: mockReviewCreate },
        $executeRaw: mockExecuteRaw,
        menuItem: { findUnique: mockTxMenuItemFindUnique, update: mockTxMenuItemUpdate },
}));

const prismaMock = vi.hoisted(() => ({
        menuItem: { findUnique: mockMenuItemFindUnique },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        review: { findMany: mockReviewFindMany, aggregate: mockReviewAggregate },
        $transaction: mockTransaction,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(async () => authHolder.value) }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 99, reset: 0 })),
                destroy: () => {},
        }),
}));

// ── Personas / fixtures ─────────────────────────────────────────────────

const OWNER = { authorized: true, role: 'owner', restaurantId: 7, userId: 10, permissions: [] };
const ADMIN = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };

/** Item 77 belongs to the owner's SECOND (linked) restaurant 99. */
const ITEM_R99 = { id: 77, category: { restaurantId: 99 } };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...OWNER };
        mockMenuItemFindUnique.mockResolvedValue({ ...ITEM_R99 });
        mockUserRestaurantFindUnique.mockResolvedValue(null); // no links by default
        mockReviewFindMany.mockResolvedValue([{ id: 1, rating: 5, comment: '', menuItemId: 77 }]);
        mockReviewAggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 11 });
        mockReviewCreate.mockImplementation(async (args: { data: { rating: number } }) => ({
                id: 501,
                ...args.data,
        }));
        mockTransaction.mockImplementation(
                async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
        );
        mockExecuteRaw.mockResolvedValue(1);
        // the STALE snapshot the old code consumed — served to EVERY read,
        // which is exactly what a concurrent pair sees under READ COMMITTED
        mockTxMenuItemFindUnique.mockResolvedValue({ avgRating: '4.5', ratingCount: 10 });
});

// ── POST — atomic counter update (T4) ───────────────────────────────────

async function postReview(itemId: number, rating: number) {
        const { POST } = await import('@/app/api/items/[id]/reviews/route');
        return POST(
                new NextRequest(`http://localhost/api/items/${itemId}/reviews`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating }),
                }),
                { params: Promise.resolve({ id: String(itemId) }) }
        );
}

describe('POST /api/items/[id]/reviews — atomic rating counters (round90-F3)', () => {
        it('one review → 201, ONE set-based SQL statement with the increment math', async () => {
                const res = await postReview(77, 4);

                expect(res.status).toBe(201);
                expect(mockReviewCreate).toHaveBeenCalledWith({
                        data: { rating: 4, comment: '', customerName: '', customerPhone: '', menuItemId: 77 },
                });
                expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
                const [strings, rating, itemId] = mockExecuteRaw.mock.calls[0] as [
                        TemplateStringsArray,
                        number,
                        number,
                ];
                const sql = strings.join('');
                // atomic increment (never an absolute value from JS)
                expect(sql).toContain('"ratingCount" = "ratingCount" + 1');
                // the running-average formula reads the OLD column values
                expect(sql).toContain('COALESCE("avgRating", 0)');
                expect(sql).toContain('"ratingCount" + 1');
                // params: the posted rating, the reviewed item
                expect(rating).toBe(4);
                expect(itemId).toBe(77);
        });

        it('calculate-twice race: two reviews on the SAME stale snapshot both land (no read path to go stale)', async () => {
                // Under the old code both requests consumed
                // { avgRating: 4.5, ratingCount: 10 } and both wrote 11 (lost
                // update). The atomic statement has no read at all — the stale
                // mock above can never be consumed.
                const res1 = await postReview(77, 3);
                const res2 = await postReview(77, 5);

                expect(res1.status).toBe(201);
                expect(res2.status).toBe(201);
                expect(mockTxMenuItemFindUnique).not.toHaveBeenCalled();
                expect(mockTxMenuItemUpdate).not.toHaveBeenCalled();
                // two independent +1 increments on the CURRENT row values → 12
                expect(mockExecuteRaw).toHaveBeenCalledTimes(2);
                expect(mockExecuteRaw.mock.calls[0][1]).toBe(3);
                expect(mockExecuteRaw.mock.calls[1][1]).toBe(5);
                expect(mockReviewCreate).toHaveBeenCalledTimes(2);
        });

        it('review row + counters share one transaction', async () => {
                await postReview(77, 4);

                expect(mockTransaction).toHaveBeenCalledTimes(1);
                // both writes happened on the tx client passed to the callback
                expect(mockReviewCreate).toHaveBeenCalledTimes(1);
                expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
        });
});

// ── GET — multi-menu owner PII ──────────────────────────────────────────

async function getReviews(itemId: number) {
        const { GET } = await import('@/app/api/items/[id]/reviews/route');
        return GET(
                new NextRequest(`http://localhost/api/items/${itemId}/reviews`),
                { params: Promise.resolve({ id: String(itemId) }) }
        );
}

describe('GET /api/items/[id]/reviews — multi-menu owner PII (round90-F3)', () => {
        it('owner of a LINKED second restaurant keeps PII (the link is probed)', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 99 });

                const res = await getReviews(77);

                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 99 } },
                });
                const select = mockReviewFindMany.mock.calls[0][0].select;
                expect(select.customerName).toBe(true);
                expect(select.customerPhone).toBe(true);
        });

        it('owner without a link to the item restaurant → PII stays stripped', async () => {
                const res = await getReviews(77);

                expect(res.status).toBe(200);
                const select = mockReviewFindMany.mock.calls[0][0].select;
                expect(select.customerName).toBeUndefined();
                expect(select.customerPhone).toBeUndefined();
        });

        it('primary-restaurant match → PII without any link lookup', async () => {
                mockMenuItemFindUnique.mockResolvedValue({ id: 77, category: { restaurantId: 7 } });

                const res = await getReviews(77);

                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                const select = mockReviewFindMany.mock.calls[0][0].select;
                expect(select.customerName).toBe(true);
        });

        it('staff keeps the legitimate ops read (PII included, no link logic)', async () => {
                authHolder.value = { ...ADMIN };

                const res = await getReviews(77);

                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                const select = mockReviewFindMany.mock.calls[0][0].select;
                expect(select.customerName).toBe(true);
                expect(select.customerPhone).toBe(true);
        });
});
