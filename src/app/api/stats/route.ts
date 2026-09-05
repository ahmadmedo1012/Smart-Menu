import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, handleError, error } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { resolveRestaurantScope, popularItemsQuery, hydratePopularItems, revenueAggregate } from '@/lib/stats-queries';

export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);

		const scope = await resolveRestaurantScope(auth, new URL(request.url).searchParams);
		if (!scope.ok) return scope.response;
		const { restaurantId } = scope;

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		// round87-B2: bound the popular-items groupBy to 90 days — the owner route's
		// twin fix (admin/stats) landed in round86-B9 but this one was missed, so a
		// mature restaurant aggregated its FULL order history on every dashboard load.
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

		const [
			totalOrders,
			todayOrders,
			totalItems,
			popularItems,
			recentOrders,
			statusCounts,
			todayRevenueAgg,
		] = await Promise.all([
			prisma.order.count({ where: { restaurantId } }),
			prisma.order.count({ where: { restaurantId, createdAt: { gte: today } } }),
			prisma.menuItem.count({ where: { category: { is: { restaurantId } } } }),
			prisma.orderItem.groupBy(popularItemsQuery({ restaurantId, take: 10, since: ninetyDaysAgo })),
			prisma.order.findMany({
				where: { restaurantId },
				orderBy: { createdAt: 'desc' },
				take: 5,
				include: { items: { include: { item: { select: { id: true, name: true } } } } },
			}),
			prisma.order.groupBy({
				by: ['status'],
				where: { restaurantId },
				_count: true,
			}),
			prisma.order.aggregate(revenueAggregate({ restaurantId, since: today })),
		]);

		const popular = await hydratePopularItems(popularItems, 'name');

		const statusBreakdown: Record<string, number> = {};
		for (const s of statusCounts) statusBreakdown[s.status] = s._count;

		const todayRevenue = Number(todayRevenueAgg._sum?.total ?? 0);

		return success({
			totalOrders,
			todayOrders,
			todayRevenue,
			totalItems,
			popularItems: popular,
			recentOrders,
			statusBreakdown,
		});
	} catch (e) {
		return handleError(e);
	}
}
