/**
 * Round88-B4 — query-parameter validation audit, locked by tests.
 *
 * The audit table (worklog 88-B) mapped every public/staff GET with query
 * params to its parser. These tests lock the fixes:
 *   - orders + orders/count: ?status= must be a real OrderStatus (was a
 *     caught Prisma validation error — 400 by accident, now explicit).
 *   - items: ?restaurantId=/?categoryId= must be positive integers (NaN
 *     used to fall through falsy guards).
 *   - users: ?restaurantId= must be valid (NaN filter was silently dropped).
 *   - restaurants: ?planFilter= must be free/all/<planId> (NaN serialized
 *     as null and aliased garbage to the free filter).
 *   - admin/subscriptions: ?status= must be pending/verified/cancelled/all.
 *   - admin/audit-logs: ?action= must be an AuditAction; ?actorId= must be
 *     a positive int (both previously caught/noisy or silently dropped).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserCount = vi.hoisted(() => vi.fn());
const mockRestaurantFindMany = vi.hoisted(() => vi.fn());
const mockRestaurantCount = vi.hoisted(() => vi.fn());
const mockOrderCountByRestaurant = vi.hoisted(() => vi.fn());
const mockCategoryCountByRestaurant = vi.hoisted(() => vi.fn());
const mockOrderItemCountByOrder = vi.hoisted(() => vi.fn());
const mockSubscriptionPaymentFindMany = vi.hoisted(() => vi.fn());
const mockSubscriptionPaymentCount = vi.hoisted(() => vi.fn());
const mockAuditLogFindMany = vi.hoisted(() => vi.fn());
const mockAuditLogCount = vi.hoisted(() => vi.fn());
const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        order: { findMany: mockOrderFindMany, count: mockOrderCount },
        orderItem: { groupBy: mockOrderItemGroupBy },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        menuItem: { findMany: mockMenuItemFindMany, count: mockMenuItemCount },
        user: { findMany: mockUserFindMany, count: mockUserCount, update: mockUserUpdate },
        restaurant: { findMany: mockRestaurantFindMany, count: mockRestaurantCount },
        subscriptionPayment: { findMany: mockSubscriptionPaymentFindMany, count: mockSubscriptionPaymentCount },
        auditLog: { findMany: mockAuditLogFindMany, count: mockAuditLogCount },
        session: { deleteMany: mockSessionDeleteMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn() }));

const mockValidateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({ validateSession: mockValidateSession }));

vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 99, reset: 0 })),
                destroy: () => {},
        }),
}));
vi.mock('@/lib/list-counts', () => ({
        orderCountByRestaurant: mockOrderCountByRestaurant,
        categoryCountByRestaurant: mockCategoryCountByRestaurant,
        orderItemCountByOrder: mockOrderItemCountByOrder,
}));

// ── Personas ────────────────────────────────────────────────────────────

const persona = (o: Record<string, unknown>) => ({
        id: 1,
        role: 'USER',
        restaurantId: null,
        subscriptionStatus: 'active',
        permissions: [],
        ...o,
});
const SUPER_ADMIN = persona({ id: 2, role: 'super_admin' });
const ADMIN = persona({ id: 1, role: 'admin' });

const setSession = (user: Record<string, unknown> | null) => {
        mockValidateSession.mockResolvedValue(
                user ? { valid: true, userId: user.id, user } : { valid: false, userId: null }
        );
};

beforeEach(() => {
        vi.clearAllMocks();
        setSession(ADMIN);
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockOrderFindMany.mockResolvedValue([]);
        mockOrderCount.mockResolvedValue(0);
        mockOrderItemGroupBy.mockResolvedValue([]);
        mockMenuItemFindMany.mockResolvedValue([]);
        mockMenuItemCount.mockResolvedValue(0);
        mockUserFindMany.mockResolvedValue([]);
        mockUserCount.mockResolvedValue(0);
        mockRestaurantFindMany.mockResolvedValue([]);
        mockRestaurantCount.mockResolvedValue(0);
        mockOrderCountByRestaurant.mockResolvedValue(new Map());
        mockCategoryCountByRestaurant.mockResolvedValue(new Map());
        mockOrderItemCountByOrder.mockResolvedValue(new Map());
        mockSubscriptionPaymentFindMany.mockResolvedValue([]);
        mockSubscriptionPaymentCount.mockResolvedValue(0);
        mockAuditLogFindMany.mockResolvedValue([]);
        mockAuditLogCount.mockResolvedValue(0);
});

// ── orders + orders/count — status whitelist ────────────────────────────

describe('B4 — GET /api/orders?status= (OrderStatus whitelist)', () => {
        it('invalid status → 400 before any query', async () => {
                const { GET } = await import('@/app/api/orders/route');
                const res = await GET(new NextRequest('http://localhost/api/orders?status=zzz'));
                expect(res.status).toBe(400);
                expect(mockOrderFindMany).not.toHaveBeenCalled();
        });

        it('valid status flows into the where clause', async () => {
                const { GET } = await import('@/app/api/orders/route');
                const res = await GET(new NextRequest('http://localhost/api/orders?status=completed'));
                expect(res.status).toBe(200);
                expect(mockOrderFindMany.mock.calls[0][0].where.status).toBe('completed');
        });

        it('count endpoint: invalid status → 400, COUNT never runs', async () => {
                const { GET } = await import('@/app/api/orders/count/route');
                const res = await GET(new NextRequest('http://localhost/api/orders/count?status=zzz'));
                expect(res.status).toBe(400);
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('count endpoint: default status stays "new"', async () => {
                const { GET } = await import('@/app/api/orders/count/route');
                const res = await GET(new NextRequest('http://localhost/api/orders/count'));
                expect(res.status).toBe(200);
                expect(mockOrderCount.mock.calls[0][0].where.status).toBe('new');
        });
});

// ── items — id params ───────────────────────────────────────────────────

describe('B4 — GET /api/items id params (explicit NaN guard)', () => {
        it('restaurantId=abc → 400', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(new NextRequest('http://localhost/api/items?restaurantId=abc'));
                expect(res.status).toBe(400);
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
        });

        it('categoryId=abc → 400', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(new NextRequest('http://localhost/api/items?categoryId=abc'));
                expect(res.status).toBe(400);
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
        });

        it('negative restaurantId → 400 (was a silent empty-list 200)', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(new NextRequest('http://localhost/api/items?restaurantId=-1'));
                expect(res.status).toBe(400);
        });

        it('valid restaurantId → 200 public available-only filter', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(new NextRequest('http://localhost/api/items?restaurantId=1'));
                expect(res.status).toBe(200);
                expect(mockMenuItemFindMany).toHaveBeenCalled();
        });
});

// ── items — status filter whitelist (round91-F-B / D2-#5) ────────────────

describe('round91-F-B — GET /api/items?status= (ItemStatus whitelist)', () => {
        it('invalid status → 400 Arabic before any query', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(new NextRequest('http://localhost/api/items?restaurantId=1&status=garbage'));
                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('حالة الصنف غير صالحة');
                expect(mockMenuItemFindMany).not.toHaveBeenCalled();
        });

        it('valid status (unavailable) flows into the where clause for staff', async () => {
                const { GET } = await import('@/app/api/items/route');
                const res = await GET(new NextRequest('http://localhost/api/items?restaurantId=1&status=unavailable'));
                expect(res.status).toBe(200);
                expect(mockMenuItemFindMany.mock.calls[0][0].where.status).toBe('unavailable');
        });
});

// ── users — restaurantId filter ─────────────────────────────────────────

describe('B4 — GET /api/users?restaurantId=', () => {
        it('non-numeric restaurantId → 400 (filter was silently dropped before)', async () => {
                const { GET } = await import('@/app/api/users/route');
                const res = await GET(new NextRequest('http://localhost/api/users?restaurantId=abc'));
                expect(res.status).toBe(400);
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });

        it('valid restaurantId lands in the where clause', async () => {
                const { GET } = await import('@/app/api/users/route');
                const res = await GET(new NextRequest('http://localhost/api/users?restaurantId=7'));
                expect(res.status).toBe(200);
                expect(mockUserFindMany.mock.calls[0][0].where.restaurantId).toBe(7);
        });
});

// ── restaurants — planFilter ────────────────────────────────────────────

describe('B4 — GET /api/restaurants?planFilter=', () => {
        it('garbage planFilter → 400 (NaN used to alias to the free filter)', async () => {
                const { GET } = await import('@/app/api/restaurants/route');
                const res = await GET(new NextRequest('http://localhost/api/restaurants?planFilter=zzz'));
                expect(res.status).toBe(400);
                expect(mockRestaurantFindMany).not.toHaveBeenCalled();
        });

        it("planFilter=free → where.planId = null", async () => {
                const { GET } = await import('@/app/api/restaurants/route');
                const res = await GET(new NextRequest('http://localhost/api/restaurants?planFilter=free'));
                expect(res.status).toBe(200);
                expect(mockRestaurantFindMany.mock.calls[0][0].where.planId).toBeNull();
        });

        it('planFilter=<planId> → where.planId = <planId>', async () => {
                const { GET } = await import('@/app/api/restaurants/route');
                const res = await GET(new NextRequest('http://localhost/api/restaurants?planFilter=3'));
                expect(res.status).toBe(200);
                expect(mockRestaurantFindMany.mock.calls[0][0].where.planId).toBe(3);
        });

        // round89-E3 (dx-1 ب-5 verification): requirePermission answers 401 for a
        // guest and 403 for an authenticated caller without the permission — the
        // route's `auth.status ?? 403` fallback is dead code, and the pass-through
        // is locked here so the 401/403 semantics can never silently flip.
        it('unauthenticated (guest session) → 401 before any query', async () => {
                setSession(null);
                const { GET } = await import('@/app/api/restaurants/route');
                const res = await GET(new NextRequest('http://localhost/api/restaurants'));
                expect(res.status).toBe(401);
                expect(mockRestaurantFindMany).not.toHaveBeenCalled();
        });

        it('authenticated OWNER without VIEW_ANALYTICS → 403 before any query', async () => {
                setSession(persona({ id: 10, role: 'owner', restaurantId: 1 }));
                const { GET } = await import('@/app/api/restaurants/route');
                const res = await GET(new NextRequest('http://localhost/api/restaurants'));
                expect(res.status).toBe(403);
                expect(mockRestaurantFindMany).not.toHaveBeenCalled();
        });
});

// ── admin/subscriptions — status whitelist ──────────────────────────────

describe('B4 — GET /api/admin/subscriptions?status=', () => {
        it('invalid status → 400 before any query', async () => {
                setSession(SUPER_ADMIN);
                const { GET } = await import('@/app/api/admin/subscriptions/route');
                const res = await GET(new NextRequest('http://localhost/api/admin/subscriptions?status=zzz'));
                expect(res.status).toBe(400);
                expect(mockSubscriptionPaymentFindMany).not.toHaveBeenCalled();
        });

        it("'all' → unfiltered listing", async () => {
                setSession(SUPER_ADMIN);
                const { GET } = await import('@/app/api/admin/subscriptions/route');
                const res = await GET(new NextRequest('http://localhost/api/admin/subscriptions?status=all'));
                expect(res.status).toBe(200);
                expect(mockSubscriptionPaymentFindMany.mock.calls[0][0].where).toEqual({});
        });
});

// ── admin/audit-logs — action/actorId filters ───────────────────────────

describe('B4 — GET /api/admin/audit-logs?action=&actorId= (super_admin)', () => {
        it('unknown action → 400 (AuditAction enum whitelist)', async () => {
                setSession(SUPER_ADMIN);
                const { GET } = await import('@/app/api/admin/audit-logs/route');
                const res = await GET(new NextRequest('http://localhost/api/admin/audit-logs?action=zzz'));
                expect(res.status).toBe(400);
                expect(mockAuditLogFindMany).not.toHaveBeenCalled();
        });

        it('non-numeric actorId → 400 (NaN was silently dropped)', async () => {
                setSession(SUPER_ADMIN);
                const { GET } = await import('@/app/api/admin/audit-logs/route');
                const res = await GET(new NextRequest('http://localhost/api/admin/audit-logs?actorId=abc'));
                expect(res.status).toBe(400);
                expect(mockAuditLogFindMany).not.toHaveBeenCalled();
        });

        it('valid action + actorId flow into the where clause', async () => {
                setSession(SUPER_ADMIN);
                const { GET } = await import('@/app/api/admin/audit-logs/route');
                const res = await GET(new NextRequest('http://localhost/api/admin/audit-logs?action=login&actorId=5'));
                expect(res.status).toBe(200);
                const where = mockAuditLogFindMany.mock.calls[0][0].where;
                expect(where.action).toBe('login');
                expect(where.actorId).toBe(5);
        });
});
