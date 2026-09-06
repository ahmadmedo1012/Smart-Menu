/**
 * Round89-D1 (w1-d1) — GET /api/loyalty/stats unit coverage (was 0% lcov,
 * 162 lines). The loyalty stats read path with mocked prisma; the REAL
 * resolveRestaurantScope guard runs against the mocked userRestaurant (same
 * approach as stats-permission.test.ts — round86-A2 tenant isolation).
 *
 * Behaviors read from the route source:
 *   - limiter bucket loyalty-stats:<ip> runs BEFORE auth (429)
 *   - RBAC via the shared scope guard: USER → 403, owner → own/linked
 *     restaurant only (403 without a link), admin → explicit id required
 *   - the 7 stat queries all run (round87-B8 single Promise.all wave)
 *   - aggregation math: conversionRate = round(converted/total × 100),
 *     0-division guard, tier/status buckets default-filled, top-5 referrers
 *     sorted desc with 'Unknown' name fallback, totalRewardPoints null → 0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true,
                role: 'owner',
                restaurantId: 7,
                userId: 1,
                permissions: [] as string[],
        } as {
                authorized: boolean;
                role: string;
                restaurantId: number | null;
                userId: number;
                permissions: string[];
        },
}));

const mockCardCount = vi.hoisted(() => vi.fn());
const mockCardGroupBy = vi.hoisted(() => vi.fn());
const mockCardFindMany = vi.hoisted(() => vi.fn());
const mockReferralGroupBy = vi.hoisted(() => vi.fn());
const mockReferralFindMany = vi.hoisted(() => vi.fn());
const mockRewardAggregate = vi.hoisted(() => vi.fn());
const mockRewardFindMany = vi.hoisted(() => vi.fn());
const mockUserRestaurantFindUnique = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        loyaltyCard: { count: mockCardCount, groupBy: mockCardGroupBy, findMany: mockCardFindMany },
        referral: { groupBy: mockReferralGroupBy, findMany: mockReferralFindMany },
        rewardTransaction: { aggregate: mockRewardAggregate, findMany: mockRewardFindMany },
        userRestaurant: { findUnique: mockUserRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));
vi.mock('@/lib/auth', () => ({ requireAuth: () => Promise.resolve(authHolder.value) }));

// ── Fixtures ────────────────────────────────────────────────────────────

async function callStatsGet(query = '', ip = '1.2.3.4') {
        const { GET } = await import('@/app/api/loyalty/stats/route');
        const req = new NextRequest(`http://localhost/api/loyalty/stats${query}`, {
                method: 'GET',
                headers: { 'x-real-ip': ip },
        });
        return GET(req);
}

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 7, userId: 1, permissions: [] };
        mockRateCheck.mockResolvedValue({ success: true, remaining: 19, reset: 0 });

        mockUserRestaurantFindUnique.mockResolvedValue(null);
        mockCardCount.mockResolvedValue(42);
        mockCardGroupBy.mockResolvedValue([{ tier: 'gold', _count: { id: 4 } }]);
        mockReferralGroupBy.mockImplementation(async (args: { by: string[] }) => {
                if (args.by[0] === 'referrerId') {
                        return [
                                { referrerId: 11, _count: { id: 7 } },
                                { referrerId: 12, _count: { id: 3 } },
                        ];
                }
                return [
                        { status: 'pending', _count: { id: 5 } },
                        { status: 'converted', _count: { id: 2 } },
                ];
        });
        mockReferralFindMany.mockResolvedValue([
                { id: 55, referredName: 'سالم', referredPhone: '0933333333', status: 'converted' },
        ]);
        mockRewardAggregate.mockResolvedValue({ _sum: { points: 250 } });
        mockRewardFindMany.mockResolvedValue([
                { id: 900, type: 'earn', points: 12, description: 'مكافأة إحالة', createdAt: new Date() },
        ]);
        mockCardFindMany.mockResolvedValue([{ id: 11, customerName: 'صالح' }]);
});

// ── Gates: limiter, auth, RBAC scope ────────────────────────────────────

describe('GET /api/loyalty/stats — gates & tenant scope', () => {
        it('rate-limited IP → 429 with the bucket key loyalty-stats:<ip> (before auth)', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callStatsGet();

                expect(res.status).toBe(429);
                expect(mockRateCheck).toHaveBeenCalledWith('loyalty-stats:1.2.3.4');
                expect(mockCardCount).not.toHaveBeenCalled();
        });

        it('unauthenticated → 401', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: 7, userId: 1, permissions: [] };

                const res = await callStatsGet();

                expect(res.status).toBe(401);
                expect(mockCardCount).not.toHaveBeenCalled();
        });

        it('regular USER role → 403, zero loyalty queries (round86-A2 PII guard)', async () => {
                authHolder.value = { authorized: true, role: 'USER', restaurantId: null, userId: 2, permissions: [] };

                const res = await callStatsGet('?restaurantId=99');

                expect(res.status).toBe(403);
                expect(mockCardCount).not.toHaveBeenCalled();
                expect(mockReferralFindMany).not.toHaveBeenCalled();
                expect(mockRewardAggregate).not.toHaveBeenCalled();
        });

        it('owner without any linked restaurant → 400 لا يوجد مطعم مرتبط', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: null, userId: 1, permissions: [] };

                const res = await callStatsGet();

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('لا يوجد مطعم مرتبط');
        });

        it('owner requesting a FOREIGN restaurant without a UserRestaurant link → 403', async () => {
                const res = await callStatsGet('?restaurantId=99');

                expect(res.status).toBe(403);
                expect(mockCardCount).not.toHaveBeenCalled();
        });

        it('owner with a legitimate link reads the managed restaurant — queries scoped to it', async () => {
                mockUserRestaurantFindUnique.mockResolvedValue({ userId: 1, restaurantId: 99, isPrimary: false });

                const res = await callStatsGet('?restaurantId=99');

                expect(res.status).toBe(200);
                expect(mockCardCount).toHaveBeenCalledWith({ where: { restaurantId: 99 } });
                expect(mockReferralFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { restaurantId: 99 } })
                );
        });

        it('admin CAN read any restaurant with an explicit id (200)', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await callStatsGet('?restaurantId=99');

                expect(res.status).toBe(200);
        });

        it('admin WITHOUT an explicit restaurant id → 400 معرف المطعم مطلوب', async () => {
                authHolder.value = { authorized: true, role: 'admin', restaurantId: null, userId: 1, permissions: [] };

                const res = await callStatsGet();

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('معرف المطعم مطلوب');
        });
});

// ── Aggregation shape & math ────────────────────────────────────────────

describe('GET /api/loyalty/stats — aggregation shape & math', () => {
        it('owner happy path: full envelope with all 10 documented fields (each stat queried once)', async () => {
                const res = await callStatsGet();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);

                expect(json.data).toEqual({
                        totalLoyaltyCards: 42,
                        totalReferrals: 10, // 7 + 3
                        convertedReferrals: 2,
                        conversionRate: 20, // round(2/10 × 100)
                        topReferrers: [
                                { customerName: 'صالح', referralCount: 7, rewardsGiven: 0 },
                                { customerName: 'Unknown', referralCount: 3, rewardsGiven: 0 },
                        ],
                        tierDistribution: { bronze: 0, silver: 0, gold: 4, platinum: 0 },
                        recentTransactions: [
                                // JSON-serialized ISO timestamp
                                { id: 900, type: 'earn', points: 12, description: 'مكافأة إحالة', createdAt: expect.any(String) },
                        ],
                        totalRewardPoints: 250,
                        referralsByStatus: { pending: 5, converted: 2, expired: 0 },
                        recentReferrals: [
                                { id: 55, referredName: 'سالم', referredPhone: '0933333333', status: 'converted' },
                        ],
                });

                // every stat query ran exactly once — the round87-B8 wave
                expect(mockCardCount).toHaveBeenCalledTimes(1);
                expect(mockCardGroupBy).toHaveBeenCalledTimes(1);
                expect(mockReferralGroupBy).toHaveBeenCalledTimes(2);
                expect(mockRewardAggregate).toHaveBeenCalledTimes(1);
                expect(mockRewardFindMany).toHaveBeenCalledTimes(1);
                expect(mockReferralFindMany).toHaveBeenCalledTimes(1);
        });

        it('zero referrals → conversionRate 0 (0-division guard), empty topReferrers, zeroed status buckets', async () => {
                mockReferralGroupBy.mockImplementation(async (args: { by: string[] }) =>
                        args.by[0] === 'referrerId' ? [] : []
                );

                const res = await callStatsGet();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.totalReferrals).toBe(0);
                expect(json.data.convertedReferrals).toBe(0);
                expect(json.data.conversionRate).toBe(0);
                expect(json.data.topReferrers).toEqual([]);
                expect(json.data.referralsByStatus).toEqual({ pending: 0, converted: 0, expired: 0 });
                // round85-B10: no top-5 hydration query when there are no referrers
                expect(mockCardFindMany).not.toHaveBeenCalled();
        });

        it('topReferrers: sorted desc, capped at 5, names hydrated only for the top ids', async () => {
                mockReferralGroupBy.mockImplementation(async (args: { by: string[] }) => {
                        if (args.by[0] === 'referrerId') {
                                return [21, 11, 31, 41, 51, 61, 71].map((referrerId, i) => ({
                                        referrerId,
                                        _count: { id: i + 1 }, // 71 has 7, 61 has 6 … 21 has 1
                                }));
                        }
                        return [];
                });
                // hydration returns names only for ids 71/61/51/41/31
                mockCardFindMany.mockResolvedValue([
                        { id: 71, customerName: 'سبعة' },
                        { id: 61, customerName: 'ستة' },
                        { id: 51, customerName: 'خمسة' },
                ]);

                const res = await callStatsGet();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.topReferrers).toHaveLength(5);
                expect(json.data.topReferrers[0]).toEqual({ customerName: 'سبعة', referralCount: 7, rewardsGiven: 0 });
                // ids without a hydrated name fall back to 'Unknown'
                expect(json.data.topReferrers[3].customerName).toBe('Unknown');
                expect(json.data.topReferrers[4].customerName).toBe('Unknown');
                // the hydration query covered exactly the top-5 ids
                expect(mockCardFindMany).toHaveBeenCalledWith({
                        where: { id: { in: [71, 61, 51, 41, 31] } },
                        select: { id: true, customerName: true },
                });
        });

        it('totalRewardPoints null sum → 0 (Decimal/null coercion)', async () => {
                mockRewardAggregate.mockResolvedValue({ _sum: { points: null } });

                const res = await callStatsGet();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data.totalRewardPoints).toBe(0);
        });
});
