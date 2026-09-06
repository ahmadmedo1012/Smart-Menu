import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { deleteBlob, mediaUrlError } from '@/lib/blob';
import { revalidateMenu } from '@/lib/menu-cache';
import { categoryCountByRestaurant, orderCountByRestaurant } from '@/lib/list-counts';

const singleSchema = z.object({
        key: z.string().min(1).max(100),
        // round85-A5: bounded length (gallery JSON is the longest legit value —
        // ~1.5KB for 10 blob URLs; 20KB is a generous ceiling that still blocks
        // unbounded DB bloat)
        value: z.string().max(20_000),
});

const batchSchema = z.array(singleSchema);

// round85-A5: same slug format rule as the restaurants create/update routes
const SLUG_RE = /^[a-z0-9-]+$/;

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

                const [settings, restaurantRow, orderCounts, catCounts] = await Promise.all([
                        prisma.setting.findMany({ where: { restaurantId }, select: { key: true, value: true } }),
                        // round89-C3 (dx-2 ب-2): `_count` on this findUnique compiled into
                        // FULL-TABLE aggregate LEFT JOINs of Order + MenuCategory (round88-A2
                        // finding — platform-wide cost on a tenant-scoped read). The counts
                        // come from the list-counts helpers for just this row; the response
                        // shape (`restaurant._count.orders/.categories`) is identical.
                        prisma.restaurant.findUnique({
                                where: { id: restaurantId },
                                include: { plan: true },
                        }),
                        orderCountByRestaurant([restaurantId]),
                        categoryCountByRestaurant([restaurantId]),
                ]);
                const restaurant = restaurantRow
                        ? {
                                ...restaurantRow,
                                _count: {
                                        orders: orderCounts.get(restaurantId) ?? 0,
                                        categories: catCounts.get(restaurantId) ?? 0,
                                },
                        }
                        : null;

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
                                                // round85-A5: malformed slugs would break the public /menu/[slug]
                                                // route (SEO + QR codes already printed) — enforce the same
                                                // format as restaurant create/update
                                                if (fieldName === 'slug' && !SLUG_RE.test(f.value)) {
                                                        return apiError('صيغة الرابط غير صالحة — أحرف صغيرة وأرقام وشرطات فقط', 422);
                                                }
                                                updateData[fieldName] = fieldName === 'gallery' ? safeJsonParse(f.value, []) : f.value;
                                                // round86-A3: media values must be valid URLs, and blob URLs
                                                // marked for another tenant are rejected
                                                if (fieldName === 'logo' || fieldName === 'gallery') {
                                                        const vals: string[] = fieldName === 'gallery'
                                                                ? (Array.isArray(updateData[fieldName]) ? (updateData[fieldName] as string[]) : [])
                                                                : (typeof f.value === 'string' ? [f.value] : []);
                                                        for (const v of vals) {
                                                                const err = mediaUrlError(v, restaurantId);
                                                                if (err) return apiError(err, 422);
                                                        }
                                                }
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
                        // round86-A3: scoped to this restaurant's tenant
                        if (oldLogo && oldLogo !== updateData.logo) {
                                await deleteBlob(oldLogo, { restaurantId });
                        }
                        // Removed gallery images orphan Blob objects — delete the ones that
                        // were in the old gallery but are gone from the new one
                        if ('gallery' in updateData && Array.isArray(updateData.gallery)) {
                                const removed = oldGallery.filter((g) => !(updateData.gallery as string[]).includes(g));
                                for (const url of removed) await deleteBlob(url, { restaurantId });
                        }
                        // round85-B9: settings feed the public menu (name/slug/logo/gallery/
                        // theme...) — purge so changes are live instantly
                        revalidateMenu(restaurantId).catch(() => {});
                        return success({ updated: items.length });
                }

                const item = singleSchema.parse(body);
                await prisma.setting.upsert({
                        where: { restaurantId_key: { restaurantId, key: item.key } },
                        create: { key: item.key, value: item.value, restaurantId },
                        update: { value: item.value },
                });
                revalidateMenu(restaurantId).catch(() => {});
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
