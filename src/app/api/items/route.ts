import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, handleError, error, paginated } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { ItemStatus } from '@/generated/prisma/enums';

const createSchema = z.object({
	name: z.string().min(1, 'الاسم مطلوب').max(100),
	nameAr: z.string().nullable().optional(),
	description: z.string().max(1000).optional(),
	descriptionAr: z.string().max(1000).optional(),
	price: z.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
	discountedPrice: z.number().min(0).nullable().optional(),
	image: z.string().max(7000000).optional(),
	status: z.string().optional(),
	sortOrder: z.number().int().optional(),
	categoryId: z.number().int().positive(),
	dietaryTags: z.array(z.string()).optional().default([]),
	allergens: z.array(z.string()).optional().default([]),
}).superRefine((v, ctx) => {
	if (v.discountedPrice != null && v.discountedPrice > v.price) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountedPrice'], message: 'السعر المخفض لا يمكن أن يتجاوز السعر الأصلي' });
	}
});

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = Math.max(1, Number(searchParams.get('page')) || 1);
		const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 50));
		const categoryId = searchParams.get('categoryId')
			? Number(searchParams.get('categoryId'))
			: undefined;
		const restaurantId = searchParams.get('restaurantId')
			? Number(searchParams.get('restaurantId'))
			: undefined;
		const status = searchParams.get('status') || undefined;

		const where: Record<string, unknown> = {};
		const auth = await requireAuth();
		if (restaurantId) {
			// Owners can only read their own restaurant's items — multi-menu aware
			if (auth.authorized && auth.role === 'owner' && auth.restaurantId !== restaurantId) {
				const link = await prisma.userRestaurant.findUnique({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
				});
				if (!link) return error('غير مصرح', 403);
			}
			// Unauthenticated: only available items
			if (!auth.authorized) {
				where.category = { is: { restaurantId } };
				where.status = 'available';
			} else {
				where.category = { is: { restaurantId } };
			}
		} else if (categoryId) {
			if (!auth.authorized) {
				where.categoryId = categoryId;
				where.status = 'available';
			} else {
				where.categoryId = categoryId;
			}
		} else {
			if (!auth.authorized) return error('معرف التصنيف أو المطعم مطلوب', 400);
		}
		if (status) where.status = status;

		const [data, total] = await Promise.all([
			prisma.menuItem.findMany({
				where,
				orderBy: { sortOrder: 'asc' },
				include: {
					category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } },
				},
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			prisma.menuItem.count({ where }),
		]);

		return paginated(data, total, page, pageSize);
	} catch (e) {
		return handleError(e);
	}
}

class ItemLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ItemLimitError';
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);

		const body = createSchema.parse(await request.json());

		// Check plan limits: get category -> restaurant -> plan
		const category = await prisma.menuCategory.findUnique({
			where: { id: body.categoryId },
			select: { restaurant: { select: { id: true, name: true, maxItems: true } } },
		});
		if (!category) return error('التصنيف غير موجود', 404);

		// Owners can only add items to their own restaurant's categories
		if (auth.role === 'owner' && auth.restaurantId !== category.restaurant.id) {
			return error('غير مصرح', 401);
		}

		// Count + create in one transaction (round-77: TOCTOU — concurrent
		// POSTs both passed the outside count, exceeding maxItems)
		const data = await prisma.$transaction(async (tx) => {
			const existingCount = await tx.menuItem.count({
				where: { category: { is: { restaurantId: category.restaurant.id } } },
			});
			const maxItems = category.restaurant.maxItems;
			if (existingCount >= maxItems) {
				throw new ItemLimitError(
					`لقد وصلت إلى الحد الأقصى للأصناف (${maxItems}). قم بترقية خطتك لإضافة المزيد.`
				);
			}
			return tx.menuItem.create({
				data: {
					name: body.name,
					nameAr: body.nameAr ?? null,
					description: body.description ?? '',
					descriptionAr: body.descriptionAr ?? '',
					price: body.price,
					discountedPrice: body.discountedPrice ?? null,
					image: body.image ?? '',
					status: (body.status ?? 'available') as ItemStatus,
					sortOrder: body.sortOrder ?? 0,
					categoryId: body.categoryId,
					dietaryTags: body.dietaryTags ?? [],
					allergens: body.allergens ?? [],
				},
				include: {
					category: { include: { restaurant: { select: { id: true, name: true, slug: true } } } },
				},
			});
		});
		return success(data, 201);
	} catch (e) {
		if (e instanceof ItemLimitError) return error(e.message, 403);
		return handleError(e);
	}
}
