import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { deleteBlob } from '@/lib/blob';

const singleSchema = z.object({
	key: z.string().min(1),
	value: z.string(),
});

const batchSchema = z.array(singleSchema);

const RESTAURANT_FIELDS = [
	'name',
	'slug',
	'description',
	'logo',
	'gallery',
	'phone',
	'whatsapp',
	'email',
	'address',
	'workingHours',
	'themeColor',
	'pickupTypes',
];

export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return apiError('غير مصرح', 401);

		const { searchParams } = new URL(request.url);
		const requestedId = Number(searchParams.get('restaurantId')) || 0;

		// Regular users can't read another restaurant's settings; only owner (own) or admin (any)
		let restaurantId: number;
		if (auth.role === 'owner') {
			// Multi-menu: allow any restaurant the owner manages via UserRestaurant
			if (requestedId && requestedId !== auth.restaurantId) {
				const link = await prisma.userRestaurant.findUnique({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId: requestedId } },
				});
				if (!link) return apiError('غير مصرح', 403);
				restaurantId = requestedId;
			} else {
				if (!auth.restaurantId) return apiError('لا يوجد مطعم مرتبط', 400);
				restaurantId = auth.restaurantId;
			}
		} else if (auth.role === 'admin' || auth.role === 'super_admin' || auth.role === 'sub_admin') {
			// Staff roles may only read another restaurant's settings when they
			// hold MANAGE_RESTAURANTS (admin legacy role passes automatically).
			const perm = await requirePermission('MANAGE_RESTAURANTS');
			if (!perm.authorized) return apiError(perm.error, perm.status);
			if (!requestedId) return apiError('معرف المطعم مطلوب', 400);
			restaurantId = requestedId;
		} else {
			return apiError('غير مصرح', 403);
		}

		const [settings, restaurant] = await Promise.all([
			prisma.setting.findMany({ where: { restaurantId }, select: { key: true, value: true } }),
			prisma.restaurant.findUnique({
				where: { id: restaurantId },
				include: { plan: true, _count: { select: { orders: true, categories: true } } },
			}),
		]);

		const map: Record<string, string> = {};
		for (const s of settings) map[s.key] = s.value;

		return success({ settings: map, restaurant });
	} catch (e) {
		return handleError(e);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return apiError('غير مصرح', 401);

		const { searchParams } = new URL(request.url);
		const requestedId = Number(searchParams.get('restaurantId')) || 0;

		// Regular users can't modify another restaurant's settings; only owner (own) or admin (any)
		let restaurantId: number;
		if (auth.role === 'owner') {
			// Multi-menu: allow any restaurant the owner manages via UserRestaurant
			if (requestedId && requestedId !== auth.restaurantId) {
				const link = await prisma.userRestaurant.findUnique({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId: requestedId } },
				});
				if (!link) return apiError('غير مصرح', 403);
				restaurantId = requestedId;
			} else {
				if (!auth.restaurantId) return apiError('لا يوجد مطعم مرتبط', 400);
				restaurantId = auth.restaurantId;
			}
		} else if (auth.role === 'admin' || auth.role === 'super_admin' || auth.role === 'sub_admin') {
			// Staff roles may only write another restaurant's settings when they
			// hold MANAGE_RESTAURANTS (admin legacy role passes automatically).
			const perm = await requirePermission('MANAGE_RESTAURANTS');
			if (!perm.authorized) return apiError(perm.error, perm.status);
			if (!requestedId) return apiError('معرف المطعم مطلوب', 400);
			restaurantId = requestedId;
		} else {
			return apiError('غير مصرح', 403);
		}

		const body = await request.json();

		if (Array.isArray(body)) {
			const items = batchSchema.parse(body);
			await prisma.$transaction(
				items.map((item) =>
					prisma.setting.upsert({
						where: { restaurantId_key: { restaurantId, key: item.key } },
						create: { key: item.key, value: item.value, restaurantId },
						update: { value: item.value },
					})
				)
			);

			const restaurantFields = items.filter((i) =>
				RESTAURANT_FIELDS.includes(i.key.replace('restaurant_', ''))
			);
			let oldLogo: string | null = null;
			let oldGallery: string[] = [];
			let updateData: Record<string, unknown> = {};
			if (restaurantFields.length > 0) {
				updateData = {};
				for (const f of restaurantFields) {
					const fieldName = f.key.replace('restaurant_', '');
					if (RESTAURANT_FIELDS.includes(fieldName)) {
						updateData[fieldName] = fieldName === 'gallery' ? safeJsonParse(f.value, []) : f.value;
					}
				}
				if (Object.keys(updateData).length > 0) {
					// Snapshot previous logo + gallery BEFORE overwriting, so replaced/removed
					// assets can be cleaned from Blob after the update succeeds. restaurantId
					// is already bound to the caller's own restaurant — tenant-safe.
					const prev = await prisma.restaurant.findUnique({
						where: { id: restaurantId },
						select: { logo: true, gallery: true },
					});
					oldLogo = prev?.logo ?? null;
					oldGallery = prev?.gallery ?? [];
					await prisma.restaurant.update({ where: { id: restaurantId }, data: updateData });
				}
			}
			// Clean up the replaced logo only after the DB write succeeded
			if (oldLogo && oldLogo !== updateData.logo) {
				await deleteBlob(oldLogo);
			}
			// Removed gallery images orphan Blob objects — delete the ones that
			// were in the old gallery but are gone from the new one
			if ('gallery' in updateData && Array.isArray(updateData.gallery)) {
				const removed = oldGallery.filter((g) => !(updateData.gallery as string[]).includes(g));
				for (const url of removed) await deleteBlob(url);
			}
			return success({ updated: items.length });
		}

		const item = singleSchema.parse(body);
		await prisma.setting.upsert({
			where: { restaurantId_key: { restaurantId, key: item.key } },
			create: { key: item.key, value: item.value, restaurantId },
			update: { value: item.value },
		});
		return success(item);
	} catch (e) {
		return handleError(e);
	}
}

function safeJsonParse(val: string, fallback: unknown) {
	try {
		return JSON.parse(val);
	} catch {
		return fallback;
	}
}
