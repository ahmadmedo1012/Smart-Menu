import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { z } from 'zod';

const createSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
	description: z.string().optional(),
	phone: z.string().optional(),
	whatsapp: z.string().optional(),
});

export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);

		// Admin sees all; owner sees their own
		const isAdmin = ['super_admin', 'sub_admin', 'admin'].includes(auth.role);
		const userId = isAdmin ? Number(new URL(request.url).searchParams.get('userId') ?? auth.userId) : auth.userId;

		const links = await prisma.userRestaurant.findMany({
			where: { userId },
			include: {
				restaurant: {
					select: {
						id: true,
						name: true,
						slug: true,
						description: true,
						logo: true,
						isActive: true,
						createdAt: true,
						_count: { select: { categories: true, orders: true } },
					},
				},
			},
			orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
		});

		const data = links.map((l) => ({
			...l.restaurant,
			isPrimary: l.isPrimary,
		}));
		return success(data);
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);
		if (!auth.userId) return error('غير مصرح', 401);

		const body = createSchema.parse(await request.json());

		// Check plan maxMenus limit
		const user = await prisma.user.findUnique({
			where: { id: auth.userId },
			include: { plan: { select: { maxMenus: true } } },
		});
		if (!user) return error('المستخدم غير موجود', 404);

		const maxMenus = user.plan?.maxMenus ?? 1;
		const existingCount = await prisma.userRestaurant.count({ where: { userId: auth.userId } });
		if (existingCount >= maxMenus) {
			return error(`لقد وصلت للحد الأقصى للمنيوهات (${maxMenus}). قم بترقية خطتك لإضافة المزيد.`, 403);
		}

		// Check slug uniqueness
		const slugTaken = await prisma.restaurant.findUnique({ where: { slug: body.slug } });
		if (slugTaken) return error('الرابط محجوز مسبقاً', 409);

		const result = await prisma.$transaction(async (tx) => {
			const restaurant = await tx.restaurant.create({
				data: {
					name: body.name,
					slug: body.slug,
					description: body.description ?? '',
					phone: body.phone ?? '',
					whatsapp: body.whatsapp ?? '',
					planId: user.planId ?? null,
					isActive: true,
				},
			});
			await tx.userRestaurant.create({
				data: { userId: auth.userId!, restaurantId: restaurant.id, isPrimary: false },
			});
			// Auto-seed default categories so a fresh menu is never empty
			await tx.menuCategory.createMany({
				data: [
					{ name: 'مشروبات ساخنة', icon: '☕', sortOrder: 1, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
					{ name: 'مشروبات باردة', icon: '🧃', sortOrder: 2, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
					{ name: 'حلويات', icon: '🍰', sortOrder: 3, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
					{ name: 'وجبات خفيفة', icon: '🍔', sortOrder: 4, restaurantId: restaurant.id, createdAt: new Date(), updatedAt: new Date() },
				],
			});
			return restaurant;
		});

		return success(result, 201);
	} catch (e) {
		return handleError(e);
	}
}
