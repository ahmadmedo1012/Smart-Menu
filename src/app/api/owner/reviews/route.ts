import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { handleError, paginated } from '@/lib/api-helpers';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import type { Prisma } from '@/generated/prisma/client';

export async function GET(req: NextRequest) {
	try {
		const auth = await requireAuth({ requireRestaurant: true });
		if (!auth.authorized || !auth.restaurantId) {
			return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		// Subscription guard: expired → 403
		if (!(await isOwnerSubscriptionActive(auth))) {
			return NextResponse.json({ success: false, error: 'اشتراكك منتهي. جدّد اشتراكك للمتابعة.' }, { status: 403 });
		}

		const { searchParams } = new URL(req.url);
		const minRating = searchParams.get('minRating');
		// Multi-menu: allow explicit restaurantId (verify ownership), else primary
		let restaurantId = auth.restaurantId;
		const requestedId = Number(searchParams.get('restaurantId')) || 0;
		if (requestedId && requestedId !== auth.restaurantId) {
			const link = await prisma.userRestaurant.findUnique({
				where: { userId_restaurantId: { userId: auth.userId!, restaurantId: requestedId } },
			});
			if (!link) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 });
			restaurantId = requestedId;
		}

		// round87-B7: relation filter instead of materializing every item id of
		// the restaurant into an IN list (duplicated across the findMany + count).
		// The nested relation IS expressible — same pattern as items/route.ts.
		const tenantWhere: Prisma.ReviewWhereInput = {
			menuItem: { is: { category: { is: { restaurantId } } } },
		};
		const where: Prisma.ReviewWhereInput = { ...tenantWhere };
		if (minRating) {
			const min = Number(minRating);
			if (!Number.isNaN(min) && min >= 1 && min <= 5) {
				where.rating = { gte: min };
			}
		}

		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50));

		// round87-C5: stats computed server-side over the FULL tenant set — the
		// client used to compute them over the (filtered!) first 50 rows, so the
		// summary went wrong past 50 reviews and changed with the star filter.
		const [reviews, total, statsTotal, statsAvg, distGroup] = await Promise.all([
			prisma.review.findMany({
				where,
				select: {
					id: true,
					rating: true,
					comment: true,
					customerName: true,
					customerPhone: true,
					menuItemId: true,
					createdAt: true,
					menuItem: { select: { id: true, name: true, nameAr: true } },
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			prisma.review.count({ where }),
			prisma.review.count({ where: tenantWhere }),
			prisma.review.aggregate({ _avg: { rating: true }, where: tenantWhere }),
			prisma.review.groupBy({ by: ['rating'], _count: { _all: true }, where: tenantWhere }),
		]);

		const distribution = [5, 4, 3, 2, 1].map((star) => ({
			star,
			count: distGroup.find((g) => g.rating === star)?._count._all ?? 0,
		}));

		return paginated(reviews, total, page, pageSize, {
			stats: {
				total: statsTotal,
				avg: statsAvg._avg.rating ? Math.round(statsAvg._avg.rating * 10) / 10 : 0,
				distribution,
			},
		});
	} catch (e) {
		return handleError(e);
	}
}
