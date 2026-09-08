/**
 * round90-F3 — whatsapp receipt authorization ladder.
 *
 * The owner-without-a-link branch used to answer 401 for an AUTHENTICATED
 * caller — inverted vs PUT /api/orders/[id] (403) and the round89-E3 split
 * (unauthenticated = 401, authenticated-but-unauthorized = 403). This file
 * pins the whole ladder so the flip (and the role ladder around it) can't
 * regress silently — the route has zero coverage elsewhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));

const mockOrderFindUnique = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockOrderUpdate = vi.hoisted(() => vi.fn());
// round94-3a: المسار صار محدود المعدل — منكّر مفتوح دائماً هنا (خلايا 429
// في round94-whatsapp-generate-ratelimit.test.ts)
const mockRateCheck = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
        order: { findUnique: mockOrderFindUnique, update: mockOrderUpdate },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn(async () => authHolder.value) }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

/** Order of restaurant 2 (the owner's primary is 1). */
const ORDER_R2 = {
        id: 4242,
        orderNo: 'ORD-R2',
        customerName: 'زبون',
        customerPhone: '0910000000',
        pickupType: 'inside',
        total: 27,
        discount: 0,
        createdAt: new Date('2026-01-01T10:00:00Z'),
        restaurantId: 2,
        restaurant: { name: 'مطعم الفروع', whatsapp: '0911111111' },
        items: [],
};

const OWNER_R1 = { authorized: true, role: 'owner', restaurantId: 1, userId: 10, permissions: [] };

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { ...OWNER_R1 };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
        mockOrderFindUnique.mockResolvedValue({ ...ORDER_R2 });
        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockOrderUpdate.mockResolvedValue({ ...ORDER_R2, whatsappSent: true });
});

async function generate(orderId: number) {
        const { POST } = await import('@/app/api/whatsapp/generate/route');
        return POST(
                new NextRequest('http://localhost/api/whatsapp/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId }),
                })
        );
}

// ── The ladder ──────────────────────────────────────────────────────────

describe('POST /api/whatsapp/generate — authorization ladder (round90-F3)', () => {
        it('unauthenticated → 401 before any order read', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null };

                const res = await generate(4242);

                expect(res.status).toBe(401);
                expect(mockOrderFindUnique).not.toHaveBeenCalled();
        });

        it('owner authenticated, foreign order, NO link → 403 (was 401) + link probed + no receipt mark', async () => {
                const res = await generate(4242);

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                expect(mockUserRestaurantFindUnique).toHaveBeenCalledWith({
                        where: { userId_restaurantId: { userId: 10, restaurantId: 2 } },
                });
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('owner authenticated, foreign order, WITH a UserRestaurant link → 200 + whatsappSent marked', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 10, restaurantId: 2 });

                const res = await generate(4242);

                expect(res.status).toBe(200);
                expect(mockOrderUpdate).toHaveBeenCalledWith({
                        where: { id: 4242 },
                        data: { whatsappSent: true },
                });
                const json = await res.json();
                expect(json.data.orderId).toBe(4242);
                expect(json.data.message).toContain('ORD-R2');
        });

        it('USER role → 403 (deny-by-default, never falls through)', async () => {
                authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 55, permissions: [] };

                const res = await generate(4242);

                expect(res.status).toBe(403);
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin without APPROVE_ORDERS → 403', async () => {
                authHolder.value = { authorized: true, role: 'sub_admin', restaurantId: null, userId: 7, permissions: [] };

                const res = await generate(4242);

                expect(res.status).toBe(403);
                expect(mockOrderUpdate).not.toHaveBeenCalled();
        });

        it('sub_admin WITH APPROVE_ORDERS → 200', async () => {
                authHolder.value = {
                        authorized: true,
                        role: 'sub_admin',
                        restaurantId: null,
                        userId: 7,
                        permissions: ['APPROVE_ORDERS'],
                };

                const res = await generate(4242);

                expect(res.status).toBe(200);
        });

        it('super_admin → 200 (round86-A11 pass)', async () => {
                authHolder.value = { authorized: true, role: 'super_admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await generate(4242);

                expect(res.status).toBe(200);
                expect(mockOrderUpdate).toHaveBeenCalledTimes(1);
        });

        it('owner of the SAME restaurant (primary match) → 200 without a link lookup', async () => {
                mockOrderFindUnique.mockResolvedValue({ ...ORDER_R2, restaurantId: 1 });

                const res = await generate(4242);

                expect(res.status).toBe(200);
                expect(mockUserRestaurantFindUnique).not.toHaveBeenCalled();
        });
});
