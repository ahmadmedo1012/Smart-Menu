import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, handleError, error } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);

		const { searchParams } = new URL(request.url);
		let restaurantId: number | undefined = Number(searchParams.get('restaurantId')) || undefined;

		if (auth.role === 'owner') {
			// Multi-menu: if a restaurantId is explicitly requested, verify the
			// owner manages it (via UserRestaurant). Otherwise default to primary.
			if (restaurantId && restaurantId !== auth.restaurantId) {
				const link = await prisma.userRestaurant.findUnique({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
				});
				if (!link) return error('غير مصرح', 403);
			} else {
				restaurantId = auth.restaurantId ?? undefined;
			}
			if (!restaurantId) return error('لا يوجد مطعم مرتبط', 400);
		}
		if (!restaurantId) return error('معرف المطعم مطلوب', 400);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

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
			prisma.orderItem.groupBy({
				by: ['itemId'],
				_sum: { quantity: true },
				orderBy: { _sum: { quantity: 'desc' } },
				take: 10,
				where: { order: { restaurantId } },
			}),
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
			prisma.order.aggregate({
				where: { restaurantId, createdAt: { gte: today } },
				_sum: { total: true },
			}),
		]);

		const itemIds = popularItems.map((p) => p.itemId);
		const items =
			itemIds.length > 0
				? await prisma.menuItem.findMany({
						where: { id: { in: itemIds } },
						select: { id: true, name: true },
					})
				: [];
		const itemMap = new Map(items.map((i) => [i.id, i.name]));

		const popular = popularItems.map((p) => ({
			itemId: p.itemId,
			name: itemMap.get(p.itemId) ?? 'Unknown',
			totalSold: p._sum.quantity ?? 0,
		}));

		const statusBreakdown: Record<string, number> = {};
		for (const s of statusCounts) statusBreakdown[s.status] = s._count;

		const todayRevenue = Number(todayRevenueAgg._sum.total ?? 0);

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
