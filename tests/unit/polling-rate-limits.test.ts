/**
 * round89-B4 (dx-4 #7) — per-user rate limiters on the four polling probes.
 *
 * user/events · orders/count · stats · stats/advanced were session-gated but
 * had NO cap at all — a single authenticated user could hammer the DB
 * unbounded (5s/12s/15s polls ≈ 5-12 req/min naturally). Each route now runs
 * a createDbRateLimiter bucket (120/min, keyed `<route>:<userId>`) AFTER the
 * auth gate (401s stay free) and BEFORE any tenant/stats DB work.
 *
 * Mocks: prisma per-model (stats/advanced needs the full aggregate set +
 * $queryRaw), requireAuth via a mutable holder, and the rate-limit factory
 * with a shared check spy (same pattern as loyalty-stats.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 7 as number | null,
                permissions: [] as string[],
        },
}));

const mockRateCheck = vi.hoisted(() => vi.fn());

const mockSystemEventFindMany = vi.hoisted(() => vi.fn());
const mockOrderCount = vi.hoisted(() => vi.fn());
const mockOrderFindMany = vi.hoisted(() => vi.fn());
const mockOrderGroupBy = vi.hoisted(() => vi.fn());
const mockOrderAggregate = vi.hoisted(() => vi.fn());
const mockOrderItemGroupBy = vi.hoisted(() => vi.fn());
const mockMenuItemCount = vi.hoisted(() => vi.fn());
const mockMenuItemFindMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
/* W7-B (G-4): بوابة «إحصائيات متقدمة» (بريميوم+) تقرأ صف خطة المطعم —
   mock النموذج الجديد مع بريميوم افتراضية كي يبقى الموجب «قراءة مسموحة»
   كما كان قبل البوابة (سلوك الاقطاع نفسه لا يتغير لمن يملك الحق). */
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        systemEvent: { findMany: mockSystemEventFindMany },
        order: {
                count: mockOrderCount,
                findMany: mockOrderFindMany,
                groupBy: mockOrderGroupBy,
                aggregate: mockOrderAggregate,
        },
        orderItem: { groupBy: mockOrderItemGroupBy },
        menuItem: { count: mockMenuItemCount, findMany: mockMenuItemFindMany },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
        $queryRaw: mockQueryRaw,
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 7, permissions: [] };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 119, reset: 0 });

        mockSystemEventFindMany.mockResolvedValue([]);
        mockOrderCount.mockResolvedValue(0);
        mockOrderFindMany.mockResolvedValue([]);
        mockOrderGroupBy.mockResolvedValue([]);
        mockOrderAggregate.mockResolvedValue({ _sum: { total: null } });
        mockOrderItemGroupBy.mockResolvedValue([]);
        mockMenuItemCount.mockResolvedValue(0);
        mockMenuItemFindMany.mockResolvedValue([]);
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockQueryRaw.mockResolvedValue([]);
        // W7-B: صاحب الاقطاع فوق الرتبة (بريميوم) — الحارس يفتح.
        mockRestaurantFindUnique.mockResolvedValue({ plan: { name: 'Premium', nameAr: 'بريميوم', sortOrder: 3 } });
});

function req(path: string) {
        return new NextRequest(`http://localhost${path}`, { method: 'GET' });
}

async function callEvents() {
        const { GET } = await import('@/app/api/user/events/route');
        return GET(req('/api/user/events?sinceId=0'));
}
async function callCount() {
        const { GET } = await import('@/app/api/orders/count/route');
        return GET(req('/api/orders/count'));
}
async function callStats() {
        const { GET } = await import('@/app/api/stats/route');
        return GET(req('/api/stats'));
}
async function callAdvanced() {
        const { GET } = await import('@/app/api/stats/advanced/route');
        return GET(req('/api/stats/advanced?range=7d'));
}

// ── user/events ─────────────────────────────────────────────────────────

describe('GET /api/user/events — per-user limiter (B-4)', () => {
        it('429 when the bucket denies, with the exact key user-events:<userId>', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callEvents();

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('user-events:7');
                const body = await res.json();
                expect(body.error).toBe('محاولات كثيرة جداً. حاول لاحقاً.');
                // gate BEFORE the events query — no DB work on a denied poll
                expect(mockSystemEventFindMany).not.toHaveBeenCalled();
        });

        it('key is per-USER, not per-IP (another user gets a different bucket)', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 8, permissions: [] };
                await callEvents();
                expect(mockRateCheck).toHaveBeenCalledWith('user-events:8');
        });

        it('unauthenticated → 401 without touching the limiter (401s stay free)', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callEvents();

                expect(res.status).toBe(401);
                expect(mockRateCheck).not.toHaveBeenCalled();
        });

        it('allowed poll → 200 with the events envelope', async () => {
                mockSystemEventFindMany.mockResolvedValue([{ id: 1, eventType: 'order_created' }]);

                const res = await callEvents();

                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.success).toBe(true);
                expect(body.data).toEqual([{ id: 1, eventType: 'order_created' }]);
        });
});

// ── orders/count ────────────────────────────────────────────────────────

describe('GET /api/orders/count — per-user limiter (B-4)', () => {
        it('429 when the bucket denies, key orders-count:<userId>, no COUNT query', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callCount();

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('orders-count:7');
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('unauthenticated → 401 without the limiter', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callCount();

                expect(res.status).toBe(401);
                expect(mockRateCheck).not.toHaveBeenCalled();
        });

        it('allowed poll → 200 with count envelope + no-store', async () => {
                mockOrderCount.mockResolvedValue(4);

                const res = await callCount();

                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.data).toEqual({ count: 4, status: 'new', restaurantId: 1 });
                expect(res.headers.get('cache-control')).toBe('no-store');
        });
});

// ── stats ───────────────────────────────────────────────────────────────

describe('GET /api/stats — per-user limiter (B-4)', () => {
        it('429 when the bucket denies, key stats:<userId>, zero aggregate queries', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callStats();

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('stats:7');
                expect(mockOrderCount).not.toHaveBeenCalled();
                expect(mockOrderItemGroupBy).not.toHaveBeenCalled();
                expect(mockOrderAggregate).not.toHaveBeenCalled();
        });

        it('unauthenticated → 401 without the limiter', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callStats();

                expect(res.status).toBe(401);
                expect(mockRateCheck).not.toHaveBeenCalled();
        });

        it('allowed read → 200 with the dashboard envelope', async () => {
                const res = await callStats();

                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.success).toBe(true);
                expect(body.data).toHaveProperty('totalOrders');
                expect(body.data).toHaveProperty('statusBreakdown');
        });
});

// ── stats/advanced ──────────────────────────────────────────────────────

describe('GET /api/stats/advanced — per-user limiter (B-4)', () => {
        it('429 when the bucket denies, key stats-advanced:<userId>, zero queries', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callAdvanced();

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('stats-advanced:7');
                expect(mockQueryRaw).not.toHaveBeenCalled();
                expect(mockOrderCount).not.toHaveBeenCalled();
        });

        it('unauthenticated → 401 without the limiter', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callAdvanced();

                expect(res.status).toBe(401);
                expect(mockRateCheck).not.toHaveBeenCalled();
        });

        it('allowed read → 200 with the analytics envelope', async () => {
                const res = await callAdvanced();

                expect(res.status).toBe(200);
                const body = await res.json();
                expect(body.success).toBe(true);
                expect(body.data).toHaveProperty('revenue7d');
                expect(body.data).toHaveProperty('topItems');
                expect(body.data).toHaveProperty('hourlyDistribution');
        });
});

// ── cross-route: the four buckets are separate (one hot route doesn't kill the others) ──

describe('polling limiters — independent buckets per route', () => {
        it('each route checks its own key namespace', async () => {
                await callEvents();
                await callCount();
                await callStats();
                await callAdvanced();

                const keys = mockRateCheck.mock.calls.map((c) => c[0]);
                expect(keys).toEqual([
                        'user-events:7',
                        'orders-count:7',
                        'stats:7',
                        'stats-advanced:7',
                ]);
        });
});
