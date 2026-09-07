import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { resolveRestaurantScope } from '@/lib/stats-queries';
import { getClientIp } from '@/lib/client-ip';

const loyaltyStatsLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });

export async function GET(request: NextRequest) {
        try {
                const ip = getClientIp(request); // round91-D1: unified extraction
                const { success: allowed } = await loyaltyStatsLimiter.check(`loyalty-stats:${ip}`);
                if (!allowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                // round86-A2: resolve the restaurant through the shared staff/owner
                // scope guard (same as /api/stats). The previous resolution fell back
                // to the client-controlled `smart-menu-restaurant` cookie with an
                // ownership check that only ran for explicitly-requested ids — a
                // forged cookie value let USER accounts read another tenant's
                // referral names/phones (PII) and full loyalty stats.
                const scope = await resolveRestaurantScope(auth, new URL(request.url).searchParams);
                if (!scope.ok) return scope.response;
                const restaurantId = scope.restaurantId;

                // round87-B8: this route ran 7 queries in 5-6 sequential waves.
                // All of them are mutually independent (only the top-5 referrer
                // name hydration below depends on wave-1 results), so they now run
                // in ONE Promise.all — one DB round-trip instead of five.
                // Round-77 (data agent): groupBy directly by restaurantId instead of
                // materializing an unbounded IN of every card id (Postgres IN ~32k cap).
                const [
                        totalLoyaltyCards,
                        tierDistribution,
                        referralCounts,
                        referralsByStatus,
                        rewardAgg,
                        recentTransactions,
                        recentReferrals,
                ] = await Promise.all([
                        prisma.loyaltyCard.count({ where: { restaurantId } }),
                        prisma.loyaltyCard.groupBy({
                                by: ['tier'],
                                where: { restaurantId },
                                _count: { id: true },
                        }),
                        prisma.referral.groupBy({
                                by: ['referrerId'],
                                where: { restaurantId },
                                _count: { id: true },
                        }),
                        prisma.referral.groupBy({
                                by: ['status'],
                                where: { restaurantId },
                                _count: { id: true },
                        }),
                        prisma.rewardTransaction.aggregate({
                                where: { restaurantId },
                                _sum: { points: true },
                        }),
                        prisma.rewardTransaction.findMany({
                                where: { restaurantId },
                                orderBy: { createdAt: 'desc' },
                                take: 10,
                                select: {
                                        id: true,
                                        type: true,
                                        points: true,
                                        description: true,
                                        createdAt: true,
                                },
                        }),
                        prisma.referral.findMany({
                                where: { restaurantId },
                                orderBy: { createdAt: 'desc' },
                                take: 50,
                                select: {
                                        id: true,
                                        referredName: true,
                                        referredPhone: true,
                                        status: true,
                                        discountPercent: true,
                                        referrerRewardPct: true,
                                        createdAt: true,
                                        convertedAt: true,
                                        referrer: { select: { customerName: true } },
                                },
                        }),
                ]);

                const totalReferrals = referralCounts.reduce((sum, r) => sum + r._count.id, 0);
                const convertedReferrals =
                        referralsByStatus.find((r) => r.status === 'converted')?._count.id ?? 0;

                // round85-B10: names for ONLY the top-5 referrer ids (was: findMany of
                // every loyalty card row just to build a name map for 5 entries)
                const topIds = [...referralCounts]
                        .sort((a, b) => b._count.id - a._count.id)
                        .slice(0, 5)
                        .map((r) => r.referrerId);
                const topCards = topIds.length
                        ? await prisma.loyaltyCard.findMany({
                                  where: { id: { in: topIds } },
                                  select: { id: true, customerName: true },
                          })
                        : [];
                const nameMap = new Map(topCards.map((c) => [c.id, c.customerName]));
                const topReferrers = referralCounts
                        .sort((a, b) => b._count.id - a._count.id)
                        .slice(0, 5)
                        .map((r) => ({
                                customerName: nameMap.get(r.referrerId) ?? 'Unknown',
                                referralCount: r._count.id,
                                rewardsGiven: 0, // simplified — could sum RewardTransaction per card
                        }));

                const tierDist: Record<string, number> = {
                        bronze: 0,
                        silver: 0,
                        gold: 0,
                        platinum: 0,
                };
                for (const t of tierDistribution) {
                        tierDist[t.tier] = t._count.id;
                }

                // round87-B8: recentTransactions was a separate sequential await
                // here — now part of the single Promise.all above.

                const conversionRate =
                        totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0;

                const totalRewardPoints = Number(rewardAgg._sum.points ?? 0);

                const rbs: Record<string, number> = { pending: 0, converted: 0, expired: 0 };
                for (const r of referralsByStatus) {
                        rbs[r.status] = r._count.id;
                }

                // round87-B8: recentReferrals was a separate sequential await here
                // — now part of the single Promise.all above.

                return success({
                        totalLoyaltyCards,
                        totalReferrals,
                        convertedReferrals,
                        conversionRate,
                        topReferrers,
                        tierDistribution: tierDist,
                        recentTransactions,
                        totalRewardPoints,
                        referralsByStatus: rbs,
                        recentReferrals,
                });
        } catch (e) {
                return handleError(e);
        }
}
