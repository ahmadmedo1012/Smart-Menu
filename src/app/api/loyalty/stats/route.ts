import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    const restaurantId = auth.restaurantId || Number(request.cookies.get("smart-menu-restaurant")?.value) || 1;

    const [totalLoyaltyCards, tierDistribution, cards] = await Promise.all([
      prisma.loyaltyCard.count({ where: { restaurantId } }),
      prisma.loyaltyCard.groupBy({
        by: ["tier"],
        where: { restaurantId },
        _count: { id: true },
      }),
      prisma.loyaltyCard.findMany({
        where: { restaurantId },
        select: { id: true, customerName: true },
      }),
    ]);

    const cardIds = cards.map((c) => c.id);

    const [referralCounts, convertedReferrals] = await Promise.all([
      prisma.referral.groupBy({
        by: ["referrerId"],
        where: { referrerId: { in: cardIds } },
        _count: { id: true },
      }),
      prisma.referral.count({
        where: {
          referrerId: { in: cardIds },
          status: "converted",
        },
      }),
    ]);

    const totalReferrals = referralCounts.reduce((sum, r) => sum + r._count.id, 0);

    const nameMap = new Map(cards.map((c) => [c.id, c.customerName]));
    const topReferrers = referralCounts
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 5)
      .map((r) => ({
        customerName: nameMap.get(r.referrerId) ?? "Unknown",
        referralCount: r._count.id,
      }));

    const tierDist: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const t of tierDistribution) {
      tierDist[t.tier] = t._count.id;
    }

    const recentTransactions = await prisma.rewardTransaction.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, type: true, points: true, description: true, createdAt: true,
      },
    });

    const conversionRate = totalReferrals > 0
      ? Math.round((convertedReferrals / totalReferrals) * 100)
      : 0;

    return success({
      totalLoyaltyCards,
      totalReferrals,
      convertedReferrals,
      conversionRate,
      topReferrers,
      tierDistribution: tierDist,
      recentTransactions,
    });
  } catch (e) {
    return handleError(e);
  }
}
