/**
 * round90-F4 (red-team r90-D2 — key dilution) — unit coverage for the
 * per-IP total cap on /api/loyalty.
 *
 * The old keys (${ip}:${restaurantId}) let a caller ROTATE restaurantId (a
 * request-controlled value) to mint a fresh 20/min bucket per id. The route
 * now ALSO checks a restaurant-independent `loyalty-ip:${ip}` bucket (shared
 * by POST and GET, max 60/min) — rotating ids must not multiply the quota.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockCardFindUnique = vi.hoisted(() => vi.fn());
const mockCardCreate = vi.hoisted(() => vi.fn());
/** Limiter configs seen by the createDbRateLimiter factory (route import time). */
const createdConfigs = vi.hoisted(() => [] as Array<{ windowMs: number; max: number }>);
/** Every (key) the route actually checks, in call order. */
const checkedKeys = vi.hoisted(() => [] as string[]);
/** Controllable results: scoped (ip:restaurant) vs the per-IP total cap. */
const scopedResult = vi.hoisted(() => ({ value: { success: true, remaining: 19, reset: 0 } }));
const ipResult = vi.hoisted(() => ({ value: { success: true, remaining: 59, reset: 0 } }));
const cookieJar = vi.hoisted(() => ({ value: {} as Record<string, string | undefined> }));

const mockPrisma = vi.hoisted(() => ({
        restaurant: { findUnique: mockRestaurantFindUnique },
        loyaltyCard: { findUnique: mockCardFindUnique, create: mockCardCreate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: (config: { windowMs: number; max: number }) => {
                createdConfigs.push(config);
                return {
                        check: (key: string) => {
                                checkedKeys.push(key);
                                const isIpCap = key.startsWith('loyalty-ip:');
                                return Promise.resolve(
                                        isIpCap ? ipResult.value : scopedResult.value
                                );
                        },
                        destroy: () => {},
                };
        },
}));
vi.mock('next/headers', () => ({
        cookies: async () => ({ get: (name: string) => ({ value: cookieJar.value[name] }) }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const CARD = {
        id: 11,
        referralCode: 'WAHAXYZ',
        customerPhone: '0922222222',
        customerName: 'سالم',
        restaurantId: 7,
        tier: 'bronze',
        points: 0,
};

const RESTAURANT = { id: 7, name: 'مقهى الواحة', slug: 'waha' };

async function callLoyaltyPost(body: unknown, ip = '1.2.3.4') {
        const { POST } = await import('@/app/api/loyalty/route');
        const req = new NextRequest('http://localhost/api/loyalty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify(body),
        });
        return POST(req);
}

async function callLoyaltyGet(query: string, ip = '1.2.3.4') {
        const { GET } = await import('@/app/api/loyalty/route');
        const req = new NextRequest(`http://localhost/api/loyalty${query}`, {
                method: 'GET',
                headers: { 'x-real-ip': ip },
        });
        return GET(req);
}

beforeEach(() => {
        vi.clearAllMocks();
        checkedKeys.length = 0;
        scopedResult.value = { success: true, remaining: 19, reset: 0 };
        ipResult.value = { success: true, remaining: 59, reset: 0 };
        cookieJar.value = {};
        mockRestaurantFindUnique.mockResolvedValue({ ...RESTAURANT });
        mockCardFindUnique.mockResolvedValue({ ...CARD });
        mockCardCreate.mockResolvedValue({ ...CARD });
});

// ── POST ────────────────────────────────────────────────────────────────

describe('POST /api/loyalty — per-IP total cap (round90-F4)', () => {
        it('happy path checks BOTH the scoped bucket and the restaurant-independent IP bucket', async () => {
                const res = await callLoyaltyPost({ customerPhone: '0922222222', restaurantId: 7 });

                expect(res.status).toBe(200);
                expect(checkedKeys).toContain('1.2.3.4:7');
                expect(checkedKeys).toContain('loyalty-ip:1.2.3.4');
        });

        it('a 60/min per-IP limiter is created (restaurant-independent cap)', async () => {
                await callLoyaltyPost({ customerPhone: '0922222222', restaurantId: 7 });
                // the two original 20/min buckets + the new 60/min IP total
                expect(createdConfigs).toEqual(
                        expect.arrayContaining([{ windowMs: 60_000, max: 60 }])
                );
        });

        it('IP cap exceeded → 429 even when the per-restaurant bucket still has budget', async () => {
                ipResult.value = { success: false, remaining: 0, reset: 0 };

                const res = await callLoyaltyPost({ customerPhone: '0922222222', restaurantId: 7 });

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.success).toBe(false);
                // short-circuited before any DB work
                expect(mockRestaurantFindUnique).not.toHaveBeenCalled();
        });

        it('ROTATION closed: changing restaurantId changes the scoped key but NOT the IP key', async () => {
                await callLoyaltyPost({ customerPhone: '0922222222', restaurantId: 7 });
                await callLoyaltyPost({ customerPhone: '0922222222', restaurantId: 8 });

                const scoped = checkedKeys.filter((k) => !k.startsWith('loyalty-ip:'));
                const ipCaps = checkedKeys.filter((k) => k.startsWith('loyalty-ip:'));
                // attacker minted two scoped buckets…
                expect(scoped).toEqual(['1.2.3.4:7', '1.2.3.4:8']);
                // …but ONE shared IP bucket — the quota cannot be multiplied
                expect(ipCaps).toEqual(['loyalty-ip:1.2.3.4', 'loyalty-ip:1.2.3.4']);
        });

        it('existing behavior preserved: the scoped (ip:restaurant) 20/min cap still 429s on its own', async () => {
                scopedResult.value = { success: false, remaining: 0, reset: 0 };
                ipResult.value = { success: true, remaining: 59, reset: 0 };

                const res = await callLoyaltyPost({ customerPhone: '0922222222', restaurantId: 7 });

                expect(res.status).toBe(429);
        });
});

// ── GET (the phone-lookup oracle) ───────────────────────────────────────

describe('GET /api/loyalty — per-IP total cap (round90-F4)', () => {
        it('phone lookup checks the scoped bucket AND the shared IP bucket', async () => {
                const res = await callLoyaltyGet('?phone=0922222222&restaurantId=7');

                expect(res.status).toBe(200);
                expect(checkedKeys).toContain('1.2.3.4:7');
                expect(checkedKeys).toContain('loyalty-ip:1.2.3.4');
        });

        it('IP cap exceeded on the enumeration oracle → 429', async () => {
                ipResult.value = { success: false, remaining: 0, reset: 0 };

                const res = await callLoyaltyGet('?phone=0922222222&restaurantId=7');

                expect(res.status).toBe(429);
        });

        it('rotating restaurantId on GET also cannot escape the shared IP bucket', async () => {
                await callLoyaltyGet('?phone=0922222222&restaurantId=7');
                await callLoyaltyGet('?phone=0922222222&restaurantId=9');

                const ipCaps = checkedKeys.filter((k) => k.startsWith('loyalty-ip:'));
                expect(ipCaps).toEqual(['loyalty-ip:1.2.3.4', 'loyalty-ip:1.2.3.4']);
        });
});
