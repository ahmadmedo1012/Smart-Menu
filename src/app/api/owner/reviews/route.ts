import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { handleError } from '@/lib/api-helpers';
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

		const where: Prisma.ReviewWhereInput = {};
		// Get all item IDs for this restaurant (relation doesn't allow nested restaurantId)
		const itemIds = await prisma.menuItem.findMany({
			where: { category: { is: { restaurantId } } },
			select: { id: true },
		});
		where.menuItemId = { in: itemIds.map((i) => i.id) };
		if (minRating) {
			const min = Number(minRating);
			if (!Number.isNaN(min) && min >= 1 && min <= 5) {
				where.rating = { gte: min };
			}
		}

		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50));

		const [reviews, total] = await Promise.all([
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
		]);

		return NextResponse.json({ success: true, data: reviews, total, page, pageSize });
	} catch (e) {
		return handleError(e);
	}
}
