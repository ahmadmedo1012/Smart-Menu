/**
 * Round88-D2 — GET /api/orders + GET /api/orders/count unit coverage
 * (both were 0% lcov). These two endpoints feed the owner dashboard and its
 * 5s polling probe, so the authorization matrix (owner scope / USER denial /
 * staff pass) is the security-critical part under test:
 *   - GET /api/orders: role matrix, date-window filters, pagination, and the
 *     round86-B9 slim LIST projection (no items include, _count instead).
 *   - GET /api/orders/count (round85-B3): same role matrix with a single
 *     COUNT, plus the round86-B11 explicit no-store cache header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        order: { findMany: mockOrderFindMany, count: mockOrderCount },
        orderItem: { groupBy: mockOrderItemGroupBy },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
// the orders route module creates a limiter at import time (POST path);
// round89-B4: the orders/count GET poll probe now has one too (default allow)
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 29, reset: 0 })),
                destroy: () => {},
        }),
}));

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
}));

// ── Helpers ─────────────────────────────────────────────────────────────

async function callList(path = '') {
        const { GET } = await import('@/app/api/orders/route');
        return GET(new NextRequest(`http://localhost/api/orders${path}`));
}

async function callCount(path = '') {
        const { GET } = await import('@/app/api/orders/count/route');
        return GET(new NextRequest(`http://localhost/api/orders/count${path}`));
}

const OWNER = { authorized: true, role: 'owner', restaurantId: 5, userId: 10, permissions: [] };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...OWNER };
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockOrderFindMany.mockResolvedValue([{ id: 1, orderNo: 'ORD-1', total: 50, status: 'new' }]);
        mockOrderCount.mockResolvedValue(7);
        // round88-A2: the route now counts per-page items via one grouped query
        mockOrderItemGroupBy.mockResolvedValue([{ orderId: 1, _count: { _all: 2 } }]);
});

// ── GET /api/orders — authorization matrix ──────────────────────────────

describe('GET /api/orders — authorization matrix', () => {
        it('unauthenticated → 401', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(401);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('owner defaults to their OWN restaurant (no tenant filter sent → no link lookup needed)', async () => {
                const res = await callList();

                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
                const where = mockOrderFindMany.mock.calls[0][0].where;
                expect(where.restaurantId).toBe(5);
                expect(mockOrderCount.mock.calls[0][0].where).toEqual({ restaurantId: 5 });
        });

        it('owner requesting another restaurant WITHOUT a UserRestaurant link → 403, zero reads', async () => {
                const res = await callList('?restaurantId=9');

                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 9 } },
                });
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('owner requesting another restaurant WITH a UserRestaurant link (multi-menu) → scoped to it', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 9, isPrimary: false });

                const res = await callList('?restaurantId=9');

                expect(res.status).toBe(200);
                expect(mockOrderFindMany.mock.calls[0][0].where.restaurantId).toBe(9);
        });

        it('owner without any linked restaurant → 400 (no silent all-tenant listing)', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: null, userId: 10, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(400);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('USER role → 403 (no order visibility at all)', async () => {
                authHolder.value = { authorized: true, role: 'user', restaurantId: null, userId: 55, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(403);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('admin sees ALL orders (no restaurantId filter imposed)', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(200);
                const where = mockOrderFindMany.mock.calls[0][0].where;
                expect(where).not.toHaveProperty('restaurantId');
        });

        it('sub_admin passes the role gate (sees all)', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 3, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(200);
        });
});

// ── GET /api/orders — filters, pagination, projection ───────────────────

describe('GET /api/orders — filters, pagination, projection', () => {
        it('status param lands in the where clause', async () => {
                await callList('?status=completed');

                expect(mockOrderFindMany.mock.calls[0][0].where.status).toBe('completed');
        });

        it('invalid dateFrom → 400 with the Arabic message', async () => {
                const res = await callList('?dateFrom=not-a-date');

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('تاريخ غير صحيح');
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('invalid dateTo → 400', async () => {
                const res = await callList('?dateTo=zzz');

                expect(res.status).toBe(400);
        });

        it('valid date window → createdAt gte/lte with dateTo rounded to end of day', async () => {
                await callList('?dateFrom=2026-01-10&dateTo=2026-01-15');

                const createdAt = mockOrderFindMany.mock.calls[0][0].where.createdAt;
                expect(createdAt.gte).toEqual(new Date('2026-01-10'));
                const expectedEnd = new Date('2026-01-15');
                expectedEnd.setHours(23, 59, 59, 999);
                expect(createdAt.lte).toEqual(expectedEnd);
        });

        it('pagination: page/pageSize drive skip/take and the envelope meta', async () => {
                const res = await callList('?page=3&pageSize=10');

                expect(res.status).toBe(200);
                const findArg = mockOrderFindMany.mock.calls[0][0];
                expect(findArg.skip).toBe(20);
                expect(findArg.take).toBe(10);
                const json = await res.json();
                expect(json.meta).toEqual({ total: 7, page: 3, pageSize: 10, totalPages: 1 });
        });

        it('round86-B9 slim LIST projection: NO items include, per-page grouped items count (round88-A2)', async () => {
                const res = await callList();

                const findArg = mockOrderFindMany.mock.calls[0][0];
                expect(findArg.select.items).toBeUndefined();
                // round88-A2: _count left the findMany (Prisma compiled it into a
                // full-table LEFT JOIN aggregate — see src/lib/list-counts.ts) and is
                // now a grouped COUNT over just the fetched page ids
                expect(findArg.select._count).toBeUndefined();
                expect(findArg.select.restaurant).toEqual({ select: { id: true, name: true, slug: true } });
                expect(mockOrderItemGroupBy).toHaveBeenCalledWith({
                        by: ['orderId'],
                        _count: { _all: true },
                        where: { orderId: { in: [1] } },
                });
                const json = await res.json();
                expect(json.data[0]._count).toEqual({ items: 2 });
        });

        it('count query reuses the SAME where clause as the list query (consistent totals)', async () => {
                await callList('?status=new&restaurantId=5');

                const listWhere = mockOrderFindMany.mock.calls[0][0].where;
                const countWhere = mockOrderCount.mock.calls[0][0].where;
                expect(countWhere).toEqual(listWhere);
        });
});

// ── GET /api/orders/count (round85-B3 polling probe) ────────────────────

describe('GET /api/orders/count — polling probe (round85-B3)', () => {
        it('unauthenticated → 401', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callCount();

                expect(res.status).toBe(401);
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('owner default: single COUNT scoped to own restaurant + status "new" (the notifier question)', async () => {
                const res = await callCount();

                expect(res.status).toBe(200);
                expect(mockOrderCount).toHaveBeenCalledWith({ where: { status: 'new', restaurantId: 5 } });
                const json = await res.json();
                expect(json.data).toEqual({ count: 7, status: 'new', restaurantId: 5 });
        });

        it('round86-B11: response is explicitly no-store (a 5s poll must never be cached)', async () => {
                const res = await callCount();

                expect(res.headers.get('cache-control')).toBe('no-store');
        });

        it('status param overrides the default filter', async () => {
                await callCount('?status=completed');

                expect(mockOrderCount).toHaveBeenCalledWith({ where: { status: 'completed', restaurantId: 5 } });
        });

        it('owner cross-tenant without a link → 403, COUNT never runs', async () => {
                const res = await callCount('?restaurantId=9');

                expect(res.status).toBe(403);
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('USER role → 403 (probe exposes counts, not contents — same visibility rule)', async () => {
                authHolder.value = { authorized: true, role: 'user', restaurantId: null, userId: 55, permissions: [] };

                const res = await callCount();

                expect(res.status).toBe(403);
        });

        it('admin: no restaurantId → where carries the status filter only', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await callCount();

                expect(res.status).toBe(200);
                expect(mockOrderCount).toHaveBeenCalledWith({ where: { status: 'new' } });
        });

        it('owner with no linked restaurant → 400', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: null, userId: 10, permissions: [] };

                const res = await callCount();

                expect(res.status).toBe(400);
        });
});
