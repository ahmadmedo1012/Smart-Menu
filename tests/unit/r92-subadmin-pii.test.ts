/**
 * round92-B1 (agent 2-c) — sub_admin PII gap closure.
 *
 * Finding (security wave 1-b, B1): role membership alone let a zero-permission
 * sub_admin read platform-wide customer PII:
 *   - GET /api/orders (customerName/customerPhone for EVERY restaurant)
 *   - resolveRestaurantScope() consumers: /api/stats, /api/stats/advanced,
 *     /api/loyalty/stats (revenue + referrer names/phones)
 * while the same resource's detail route (orders/[id]:49-51) already demands
 * APPROVE_ORDERS, and admin/stats:236 / restaurants/[id]:88-90 demand
 * VIEW_ANALYTICS.
 *
 * The fix is one permission gate per position. These tests pin the new matrix:
 *   - sub_admin WITHOUT the permission → 403 «لا تملك الصلاحية» and NO prisma
 *     query runs (the gate fires before any data access)
 *   - sub_admin WITH the permission → passes exactly like before
 *   - owner / admin / super_admin → unchanged behavior
 *   - unauthenticated → 401
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ── Hoisted mocks (orders-list.test.ts pattern) ─────────────────────────

const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
// loyalty/stats models (route-level proof section)
const mockCardCount = vi.hoisted(() => vi.fn());
const mockCardGroupBy = vi.hoisted(() => vi.fn());
const mockCardFindMany = vi.hoisted(() => vi.fn());
const mockReferralGroupBy = vi.hoisted(() => vi.fn());
const mockReferralFindMany = vi.hoisted(() => vi.fn());
const mockRewardAggregate = vi.hoisted(() => vi.fn());
const mockRewardFindMany = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        order: { findMany: mockOrderFindMany, count: mockOrderCount },
        orderItem: { groupBy: mockOrderItemGroupBy },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        loyaltyCard: { count: mockCardCount, groupBy: mockCardGroupBy, findMany: mockCardFindMany },
        referral: { groupBy: mockReferralGroupBy, findMany: mockReferralFindMany },
        rewardTransaction: { aggregate: mockRewardAggregate, findMany: mockRewardFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 59, reset: 0 })),
                destroy: () => {},
        }),
}));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'sub_admin' as string,
                restaurantId: null as number | null,
                userId: 3 as number | null,
                permissions: [] as string[],
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
}));

const SUB_ADMIN = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 3, permissions: [] as string[] };

async function callList(path = '') {
        const { GET } = await import('@/app/api/orders/route');
        return GET(new NextRequest(`http://localhost/api/orders${path}`));
}

/** route-level proof that the shared scope guard protects loyalty/stats (PII:
 *  referrer customerName + referredPhone). Mocks mirror loyalty-stats.test.ts. */
async function callLoyaltyStats() {
        const { GET } = await import('@/app/api/loyalty/stats/route');
        return GET(new NextRequest(`http://localhost/api/loyalty/stats?restaurantId=7`));
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...SUB_ADMIN };
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockOrderFindMany.mockResolvedValue([
                { id: 1, orderNo: 'ORD-1', customerName: 'زبون', customerPhone: '0911111111', total: 50, status: 'new' },
        ]);
        mockOrderCount.mockResolvedValue(7);
        mockOrderItemGroupBy.mockResolvedValue([{ orderId: 1, _count: { _all: 2 } }]);
        // loyalty/stats happy-path defaults (loyalty-stats.test.ts fixtures)
        mockCardCount.mockResolvedValue(42);
        mockCardGroupBy.mockResolvedValue([{ tier: 'gold', _count: { id: 4 } }]);
        mockCardFindMany.mockResolvedValue([{ id: 11, customerName: 'صالح' }]);
        mockReferralGroupBy.mockImplementation(async (args: { by: string[] }) => {
                if (args.by[0] === 'referrerId') return [{ referrerId: 11, _count: { id: 7 } }];
                return [
                        { status: 'pending', _count: { id: 5 } },
                        { status: 'converted', _count: { id: 2 } },
                ];
        });
        mockReferralFindMany.mockResolvedValue([
                { id: 55, referredName: 'سالم', referredPhone: '0933333333', status: 'converted' },
        ]);
        mockRewardAggregate.mockResolvedValue({ _sum: { points: 250 } });
        mockRewardFindMany.mockResolvedValue([]);
});

// ── GET /api/orders — the PII list ──────────────────────────────────────

describe('round92-B1 — GET /api/orders sub_admin permission gate', () => {
        it('sub_admin WITHOUT APPROVE_ORDERS → 403 and the order query NEVER runs (PII protected)', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockOrderFindMany).not.toHaveBeenCalled();
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('sub_admin with an UNRELATED permission (VIEW_ANALYTICS) → still 403', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: ['VIEW_ANALYTICS'] };

                const res = await callList();

                expect(res.status).toBe(403);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('sub_admin WITH APPROVE_ORDERS → 200, platform-wide list as before (no restaurantId imposed)', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: ['APPROVE_ORDERS'] };

                const res = await callList();

                expect(res.status).toBe(200);
                const where = mockOrderFindMany.mock.calls[0][0].where;
                expect(where).not.toHaveProperty('restaurantId');
                const json = await res.json();
                expect(json.data[0].customerName).toBe('زبون');
        });

        it('admin (legacy full-trust) → 200 with NO permission needed (unchanged)', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(200);
        });

        it('super_admin → 200 (unchanged)', async () => {
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 2, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(200);
        });

        it('owner → 200 scoped to their OWN restaurant (works exactly as before)', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 5, userId: 10, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(200);
                expect(mockOrderFindMany.mock.calls[0][0].where.restaurantId).toBe(5);
        });

        it('unauthenticated → 401 before anything', async () => {
                authHolder.value = { authorized: false, role: 'sub_admin', restaurantId: null, userId: null, permissions: [] };

                const res = await callList();

                expect(res.status).toBe(401);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });
});

// ── resolveRestaurantScope — the stats/loyalty gate ─────────────────────

describe('round92-B1 — resolveRestaurantScope sub_admin VIEW_ANALYTICS gate', () => {
        async function callScope(auth: object) {
                const { resolveRestaurantScope } = await import('@/lib/stats-queries');
                return resolveRestaurantScope(
                        auth as { userId: number; role: string; restaurantId: number | null; permissions?: string[] },
                        new URLSearchParams('restaurantId=7')
                );
        }

        it('sub_admin WITHOUT VIEW_ANALYTICS → 403 «لا تملك الصلاحية» and NO UserRestaurant lookup even runs', async () => {
                const scope = await callScope({ userId: 3, role: 'sub_admin', restaurantId: null, permissions: [] });

                expect(scope.ok).toBe(false);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res = (scope as any).response as NextResponse;
                expect(res.status).toBe(403);
                expect(await res.json()).toEqual({ success: false, error: 'لا تملك الصلاحية' });
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('sub_admin WITH VIEW_ANALYTICS → resolves the requested restaurant', async () => {
                const scope = await callScope({ userId: 3, role: 'sub_admin', restaurantId: null, permissions: ['VIEW_ANALYTICS'] });

                expect(scope).toEqual({ ok: true, restaurantId: 7 });
        });

        it('sub_admin with an unrelated permission (APPROVE_ORDERS) → still 403', async () => {
                const scope = await callScope({ userId: 3, role: 'sub_admin', restaurantId: null, permissions: ['APPROVE_ORDERS'] });

                expect(scope.ok).toBe(false);
        });

        it('sub_admin with undefined permissions (legacy caller shape) → 403 (fail-closed)', async () => {
                const scope = await callScope({ userId: 3, role: 'sub_admin', restaurantId: null });

                expect(scope.ok).toBe(false);
        });

        it('admin / super_admin → pass with no permission needed (unchanged)', async () => {
                expect((await callScope({ userId: 1, role: 'admin', restaurantId: null })).ok).toBe(true);
                expect((await callScope({ userId: 2, role: 'super_admin', restaurantId: null })).ok).toBe(true);
        });

        it('USER role → 403 «غير مصرح» (unchanged)', async () => {
                const scope = await callScope({ userId: 55, role: 'USER', restaurantId: null });

                expect(scope.ok).toBe(false);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res = (scope as any).response as NextResponse;
                expect(res.status).toBe(403);
        });
});

// ── Route-level proof: loyalty/stats (referrer PII) ─────────────────────

describe('round92-B1 — GET /api/loyalty/stats sub_admin gate (referrer PII)', () => {
        it('sub_admin WITHOUT VIEW_ANALYTICS → 403, no loyalty query runs', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: [] };

                const res = await callLoyaltyStats();

                expect(res.status).toBe(403);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('sub_admin WITH VIEW_ANALYTICS → passes the scope guard (restaurantId resolved)', async () => {
                authHolder.value = { ...SUB_ADMIN, permissions: ['VIEW_ANALYTICS'] };

                const res = await callLoyaltyStats();

                expect(res.status).toBe(200);
        });
});
