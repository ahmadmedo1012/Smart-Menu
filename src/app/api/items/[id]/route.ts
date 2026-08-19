import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, notFound, handleError, error } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { ItemStatus } from '@/generated/prisma/enums';
import { deleteBlob } from '@/lib/blob';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const itemId = Number(id);
		if (Number.isNaN(itemId)) return error('Invalid ID', 400);

		const item = await prisma.menuItem.findUnique({
			where: { id: itemId },
			include: {
				category: true,
				reviews: {
					take: 10,
					orderBy: { createdAt: 'desc' },
					select: { id: true, rating: true, comment: true },
				},
			},
		});
		if (!item) return notFound('MenuItem');

		return success(item);
	} catch (e) {
		return handleError(e);
	}
}

const updateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	nameAr: z.string().nullable().optional(),
	description: z.string().max(1000).optional(),
	descriptionAr: z.string().max(1000).nullable().optional(),
	price: z.number().positive().optional(),
	discountedPrice: z.number().positive().nullable().optional(),
	image: z.string().max(7000000).optional(),
	status: z.string().optional(),
	sortOrder: z.number().int().optional(),
	categoryId: z.number().int().positive().optional(),
	// No .default([]) — omitted fields must not overwrite stored values.
	// A status-only toggle (no tags in body) would wipe them via ...body.
	dietaryTags: z.array(z.string()).optional(),
	allergens: z.array(z.string()).optional(),
}).superRefine((v, ctx) => {
	if (v.discountedPrice != null && v.price != null && v.discountedPrice > v.price) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountedPrice'], message: 'السعر المخفض لا يمكن أن يتجاوز السعر الأصلي' });
	}
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);
		const { id } = await params;
		const itemId = Number(id);
		if (Number.isNaN(itemId)) return error('Invalid ID', 400);

		const body = updateSchema.parse(await request.json());

		const existing = await prisma.menuItem.findUnique({
			where: { id: itemId },
			include: { category: { select: { restaurantId: true } } },
		});
		if (!existing) return notFound('Item');

		// Owners can only update their own restaurant's items
		if (auth.role === 'owner' && auth.restaurantId !== existing.category.restaurantId) {
			return error('غير مصرح', 401);
		}
		// Staff roles (admin/sub_admin — super_admin passes automatically) may only
		// update arbitrary restaurants' items when they hold MANAGE_RESTAURANTS
		if (auth.role !== 'owner') {
			const perm = await requirePermission('MANAGE_RESTAURANTS');
			if (!perm.authorized) return error(perm.error, perm.status);
		}

		// Spread only the keys actually present — undefined fields in the payload
		// must not overwrite stored values (e.g. a status-only toggle).
		const updateData: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(body)) {
			if (v !== undefined) updateData[k] = v;
		}
		if (updateData.status !== undefined) updateData.status = updateData.status as ItemStatus;

		// Final-price sanity: effective discounted price must never exceed the price
		// (covers price-only updates vs a stored discount, and vice versa)
		const finalPrice = updateData.price !== undefined ? Number(updateData.price) : Number(existing.price);
		const finalDiscounted =
			updateData.discountedPrice !== undefined
				? updateData.discountedPrice === null
					? null
					: Number(updateData.discountedPrice)
				: existing.discountedPrice != null
					? Number(existing.discountedPrice)
					: null;
		if (finalDiscounted != null && finalDiscounted > finalPrice) {
			return error('السعر المخفض لا يمكن أن يتجاوز السعر الأصلي', 422);
		}

		const data = await prisma.menuItem.update({
			where: { id: itemId },
			data: updateData,
			include: { category: { select: { id: true, name: true, nameAr: true } } },
		});

		// Delete old image from blob only after DB update succeeds
		if (body.image && existing.image && body.image !== existing.image) {
			deleteBlob(existing.image);
		}
		return success(data);
	} catch (e) {
		return handleError(e);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);
		const { id } = await params;
		const delId = Number(id);
		if (Number.isNaN(delId)) return error('Invalid ID', 400);
		const existing = await prisma.menuItem.findUnique({
			where: { id: delId },
			include: { category: { select: { restaurantId: true } } },
		});
		if (!existing) return notFound('Item');

		// Owners can only delete their own restaurant's items
		if (auth.role === 'owner' && auth.restaurantId !== existing.category.restaurantId) {
			return error('غير مصرح', 401);
		}
		// Staff roles (admin/sub_admin — super_admin passes automatically) may only
		// delete arbitrary restaurants' items when they hold MANAGE_RESTAURANTS
		if (auth.role !== 'owner') {
			const perm = await requirePermission('MANAGE_RESTAURANTS');
			if (!perm.authorized) return error(perm.error, perm.status);
		}

		await prisma.menuItem.delete({ where: { id: delId } });

		// Delete item image from blob only after DB delete succeeds
		if (existing.image) deleteBlob(existing.image);
		return success({ id: delId });
	} catch (e) {
		return handleError(e);
	}
}
