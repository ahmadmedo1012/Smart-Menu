import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { z } from 'zod';

const patchSchema = z.object({
	isPrimary: z.boolean().optional(),
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
});

// isPrimary is a UserRestaurant column (the owner's link to this restaurant).
// Admins (super_admin/admin/sub_admin) have no UserRestaurant link row — writing
// isPrimary for them would throw record-not-found inside the tx. Admins update
// restaurant fields only; isPrimary stays an owner-only concern.
const adminPatchSchema = patchSchema.omit({ isPrimary: true });

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);
		// Subscription guard: expired → 403
		if (!(await isOwnerSubscriptionActive(auth))) return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
		const { id } = await params;
		const restaurantId = Number(id);
		if (!restaurantId) return error('معرف غير صالح', 400);

		// Verify ownership (or admin with MANAGE_RESTAURANTS permission).
		// sub_admin is NOT included: it has an explicit permission list and must
		// not get free rein over any restaurant (privilege-escalation fix).
		const isAdmin = auth.role === 'super_admin' ||
			(auth.role === 'admin' && (auth.permissions ?? []).includes('MANAGE_RESTAURANTS')) ||
			(auth.role === 'sub_admin' && (auth.permissions ?? []).includes('MANAGE_RESTAURANTS'));

		const body: z.infer<typeof patchSchema> = (isAdmin ? adminPatchSchema : patchSchema).parse(await _request.json());

		if (!isAdmin) {
			const link = await prisma.userRestaurant.findUnique({
				where: { userId_restaurantId: { userId: auth.userId!, restaurantId } },
			});
			if (!link) return error('غير مصرح', 403);
		}

		const result = await prisma.$transaction(async (tx) => {
			// Set primary: clear others first — only reachable for non-admin body
			// (admins' schema strips isPrimary, so it can never appear here)
			if (body.isPrimary === true && auth.userId) {
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
		// Subscription guard: expired → 403
		if (!(await isOwnerSubscriptionActive(auth))) return error('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
		const { id } = await params;
		const restaurantId = Number(id);
		if (!restaurantId) return error('معرف غير صالح', 400);

		// Only super_admin, or admin/sub_admin with MANAGE_RESTAURANTS, may
		// delete arbitrary restaurants. sub_admin without the permission must
		// fall through to the ownership check below (privilege-escalation fix).
		const isAdmin = auth.role === 'super_admin' ||
			(auth.role === 'admin' && (auth.permissions ?? []).includes('MANAGE_RESTAURANTS')) ||
			(auth.role === 'sub_admin' && (auth.permissions ?? []).includes('MANAGE_RESTAURANTS'));
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
