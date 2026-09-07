/**
 * round91-F-B (F9/D1) — session-scoped throttles for the two heavy
 * authenticated endpoints that had NO limiter:
 *   - GET /api/orders (the platform's heaviest authenticated read: full list
 *     + grouped item counts, 15s polls) → 60/min keyed `orders:${userId}`
 *   - PUT /api/items/[id] (up to a 200KB base64 image per request) → 20/min
 *     keyed `itemsput:${userId}`
 *
 * Mock pattern: orders-create.test.ts (controllable shared limiter factory +
 * tx-mock prisma) — no real DB. Session-scoped keys: the check runs AFTER
 * the 401 gate, so an anonymous probe never burns a bucket.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockRateCheck = vi.hoisted(() => vi.fn());

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 5 as number | null,
                userId: 10 as number | null,
                permissions: [] as string[],
        },
}));

const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemFindUnique = vi.hoisted(() => vi.fn());
const mockMenuItemUpdate = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRevalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMediaUrlError = vi.hoisted(() => vi.fn(() => null));
const mockDeleteBlob = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const mockPrisma = vi.hoisted(() => ({
        order: { findMany: mockOrderFindMany, count: mockOrderCount },
        orderItem: { groupBy: mockOrderItemGroupBy },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        menuItem: { findUnique: mockMenuItemFindUnique, update: mockMenuItemUpdate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
// every limiter the two route modules build at module scope gets the SAME
// controllable check — the route under test is the only one invoked.
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
        requirePermission: vi.fn(async () => ({ authorized: true, role: 'owner', userId: 1 })),
}));
vi.mock('@/lib/list-counts', () => ({ orderItemCountByOrder: vi.fn(async () => new Map()) }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/menu-cache', () => ({ revalidateMenu: mockRevalidate }));
vi.mock('@/lib/blob', () => ({ mediaUrlError: mockMediaUrlError, deleteBlob: mockDeleteBlob }));

// ── Fixtures ────────────────────────────────────────────────────────────

const EXISTING_ITEM = {
        id: 901,
        name: 'كابتشينو',
        price: 8,
        discountedPrice: null,
        image: '',
        isFeatured: false,
        category: { restaurantId: 7 },
};

beforeEach(() => {
        vi.clearAllMocks();
        mockRateCheck.mockResolvedValue({ success: true, remaining: 59, reset: 0 });
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 5, userId: 10, permissions: [] };
        mockOrderFindMany.mockResolvedValue([{ id: 1, orderNo: 'ORD-1', total: 50, status: 'new' }]);
        mockOrderCount.mockResolvedValue(7);
        mockOrderItemGroupBy.mockResolvedValue([{ orderId: 1, _count: { _all: 2 } }]);
        mockMenuItemFindUnique.mockResolvedValue({ ...EXISTING_ITEM });
        mockMenuItemUpdate.mockResolvedValue({ ...EXISTING_ITEM, name: 'لاتيه' });
});

// ── GET /api/orders — 60/min per user ───────────────────────────────────

describe('round91-F-B — GET /api/orders session throttle (60/min, `orders:${userId}`)', () => {
        it('allowed → 200, bucket keyed by the SESSION userId (not any header)', async () => {
                const { GET } = await import('@/app/api/orders/route');
                const res = await GET(
                        new NextRequest('http://localhost/api/orders', {
                                headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '8.8.8.8, 7.7.7.7' },
                        })
                );

                expect(res.status).toBe(200);
                expect(mockRateCheck).toHaveBeenCalledWith('orders:10');
                expect(mockOrderFindMany).toHaveBeenCalledTimes(1);
        });

        it('breach → 429 Arabic, the heavy query never runs', async () => {
                mockRateCheck.mockResolvedValueOnce({ success: false, remaining: 0, reset: 0 });
                const { GET } = await import('@/app/api/orders/route');

                const res = await GET(new NextRequest('http://localhost/api/orders'));

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('محاولات كثيرة جداً. حاول لاحقاً.');
                expect(mockOrderFindMany).not.toHaveBeenCalled();
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('unauthenticated → 401 WITHOUT burning a bucket (check runs after the 401 gate)', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };
                const { GET } = await import('@/app/api/orders/route');

                const res = await GET(new NextRequest('http://localhost/api/orders'));

                expect(res.status).toBe(401);
                expect(mockRateCheck).not.toHaveBeenCalled();
        });
});

// ── PUT /api/items/[id] — 20/min per user ───────────────────────────────

describe('round91-F-B — PUT /api/items/[id] session throttle (20/min, `itemsput:${userId}`)', () => {
        async function callPut(body: unknown) {
                const { PUT } = await import('@/app/api/items/[id]/route');
                return PUT(
                        new NextRequest('http://localhost/api/items/901', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                        }),
                        { params: Promise.resolve({ id: '901' }) }
                );
        }

        it('allowed → 200, bucket keyed by the SESSION userId', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 7, userId: 1, permissions: [] };

                const res = await callPut({ name: 'لاتيه' });

                expect(res.status).toBe(200);
                expect(mockRateCheck).toHaveBeenCalledWith('itemsput:1');
                expect(mockMenuItemUpdate).toHaveBeenCalledTimes(1);
        });

        it('breach → 429 Arabic, zero DB work (validation/read never reached)', async () => {
                mockRateCheck.mockResolvedValueOnce({ success: false, remaining: 0, reset: 0 });

                const res = await callPut({ name: 'لاتيه' });

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('محاولات كثيرة جداً. حاول لاحقاً.');
                expect(mockMenuItemFindUnique).not.toHaveBeenCalled();
                expect(mockMenuItemUpdate).not.toHaveBeenCalled();
        });
});
