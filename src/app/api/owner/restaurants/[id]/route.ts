import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { z } from 'zod';

const patchSchema = z.object({
	isPrimary: z.boolean().optional(),
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
});

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);
		const { id } = await params;
		const restaurantId = Number(id);
		if (!restaurantId) return error('معرف غير صالح', 400);

		const body = patchSchema.parse(await _request.json());

		// Verify ownership (or admin)
		const isAdmin = ['super_admin', 'sub_admin', 'admin'].includes(auth.role);
		if (!isAdmin) {
			const link = await prisma.userRestaurant.findUnique({
				where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
			});
			if (!link) return error('غير مصرح', 403);
		}

		const result = await prisma.$transaction(async (tx) => {
			// Set primary: clear others first
			if (body.isPrimary && auth.userId) {
				await tx.userRestaurant.updateMany({
					where: { userId: auth.userId },
					data: { isPrimary: false },
				});
				await tx.userRestaurant.update({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
					data: { isPrimary: true },
				});
				// Mirror on User.restaurantId for backward compat
				await tx.user.update({
					where: { id: auth.userId },
					data: { restaurantId },
				});
			}
			const restaurant = await tx.restaurant.update({
				where: { id: restaurantId },
				data: {
					...(body.name !== undefined ? { name: body.name } : {}),
					...(body.description !== undefined ? { description: body.description } : {}),
					...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
				},
			});
			return restaurant;
		});

		return success(result);
	} catch (e) {
		return handleError(e);
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);
		const { id } = await params;
		const restaurantId = Number(id);
		if (!restaurantId) return error('معرف غير صالح', 400);

		const isAdmin = ['super_admin', 'sub_admin', 'admin'].includes(auth.role);
		if (!isAdmin) {
			const link = await prisma.userRestaurant.findUnique({
				where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
			});
			if (!link) return error('غير مصرح', 403);
			if (link.isPrimary) return error('لا يمكن حذف المنيو الأساسي. عيّن منيو آخر كأساسي أولاً.', 400);
		}

		// Delete the link, then the restaurant (cascade removes categories/items/orders)
		await prisma.$transaction(async (tx) => {
			if (!isAdmin) {
				await tx.userRestaurant.delete({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
				});
			}
			await tx.restaurant.delete({ where: { id: restaurantId } });
		});

		return success({ deleted: true });
	} catch (e) {
		return handleError(e);
	}
}
