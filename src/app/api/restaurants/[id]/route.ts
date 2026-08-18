import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { deleteBlob } from '@/lib/blob';

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	slug: z.string().min(1).optional(),
	description: z.string().optional(),
	phone: z.string().optional(),
	whatsapp: z.string().optional(),
	email: z.string().optional(),
	address: z.string().optional(),
	workingHours: z.string().optional(),
	logo: z.string().optional(),
	gallery: z.array(z.string()).optional(),
});

const adminUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	slug: z.string().min(1).optional(),
	description: z.string().optional(),
	phone: z.string().optional(),
	whatsapp: z.string().optional(),
	email: z.string().optional(),
	address: z.string().optional(),
	workingHours: z.string().optional(),
	logo: z.string().optional(),
	gallery: z.array(z.string()).optional(),
	planId: z.number().int().optional(),
	planStart: z.string().datetime().optional(),
	planEnd: z.string().datetime().optional(),
	maxItems: z.number().int().positive().optional(),
	maxOrders: z.number().int().positive().optional(),
	city: z.string().optional(),
	showOnLanding: z.boolean().optional(),
	featuredRank: z.number().int().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const rId = Number(id);
		if (Number.isNaN(rId)) return apiError('Invalid ID', 400);
		const auth = await requireAuth();
		const isOwnerOrAdmin =
			auth.authorized &&
			(auth.role === 'super_admin' || auth.role === 'sub_admin' || auth.role === 'admin' ||
				(auth.role === 'owner' && auth.restaurantId === rId));
		if (!isOwnerOrAdmin) {
			// Public consumers (menu / cart pages) get only the fields needed to
			// display the menu & place an order — no operational details.
			const pub = await prisma.restaurant.findUnique({
				where: { id: rId },
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					logo: true,
					whatsapp: true,
					pickupTypes: true,
					currency: true,
					themeColor: true,
					isActive: true,
				},
			});
			if (!pub) return apiError('Restaurant not found', 404);
			return success(pub);
		}
		const data = await prisma.restaurant.findUnique({
			where: { id: rId },
			include: {
				_count: { select: { categories: true, orders: true } },
				categories: {
					include: { _count: { select: { items: true } } },
					orderBy: { sortOrder: 'asc' },
				},
				plan: {
					select: {
						id: true,
						name: true,
						nameAr: true,
						price: true,
						maxItems: true,
						maxOrders: true,
					},
				},
			},
		});
		if (!data) return apiError('Restaurant not found', 404);
		return success(data);
	} catch (e) {
		return handleError(e);
	}
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return apiError('غير مصرح', 401);

		const { id } = await params;
		const rId = Number(id);
		if (Number.isNaN(rId)) return apiError('Invalid ID', 400);

		const body = await request.json();

		let data;
		if (auth.role === 'super_admin' || auth.role === 'sub_admin' || auth.role === 'admin') {
			// Admin can update everything
			const parsed = adminUpdateSchema.parse(body);
			data = await prisma.restaurant.update({
				where: { id: rId },
				data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
			});
		} else if (auth.role === 'owner') {
			// Owners can only update restaurants they manage — multi-menu aware via
			// UserRestaurant links (same check as settings/route.ts & categories)
			if (auth.restaurantId !== rId) {
				const link = await prisma.userRestaurant.findUnique({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId: rId } },
				});
				if (!link) return apiError('غير مصرح', 403);
			}
			const parsed = updateSchema.parse(body);
			data = await prisma.restaurant.update({
				where: { id: rId },
				data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
			});
		} else {
			return apiError('غير مصرح', 401);
		}

		return success(data);
	} catch (e) {
		return handleError(e);
	}
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized || !['super_admin', 'sub_admin', 'admin'].includes(auth.role ?? '')) {
			return apiError('غير مصرح', 401);
		}
		const { id } = await params;
		const rId = Number(id);
		if (Number.isNaN(rId)) return apiError('Invalid ID', 400);
		// Collect image URLs before deletion (blob URLs needed after DB delete)
		const items = await prisma.menuItem.findMany({
			where: { category: { is: { restaurantId: rId } } },
			select: { image: true },
		});
		const restRow = await prisma.restaurant.findUnique({
			where: { id: rId },
			select: { logo: true, gallery: true },
		});

		await prisma.restaurant.delete({ where: { id: rId } });

		// Delete images from blob only after DB delete succeeds
		for (const item of items) deleteBlob(item.image);
		if (restRow) {
			deleteBlob(restRow.logo);
			if (Array.isArray(restRow.gallery)) restRow.gallery.forEach((u: string) => deleteBlob(u));
		}
		return success({ deleted: true });
	} catch (e) {
		return handleError(e);
	}
}
