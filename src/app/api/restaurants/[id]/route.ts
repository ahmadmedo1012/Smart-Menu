import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { revalidateMenu } from '@/lib/menu-cache';
import { revalidatePath } from 'next/cache';
import { deleteBlob, mediaUrlError } from '@/lib/blob';
import { categoryCountByRestaurant, orderCountByRestaurant, itemCountByCategory } from '@/lib/list-counts';
// round86-A3: deleteBlob below is scoped to the deleted restaurant's tenant

// round87-A2: the PUT path previously had NO bounds at all (round86-A7 only
// bounded POST) — no .max on any string, no slug format check, and logo/gallery
// were persisted unvalidated. Bounds mirror the POST schema.
const SLUG_RE = /^[a-z0-9-]+$/;

const slugField = z
        .string()
        .min(1)
        .max(100)
        .regex(SLUG_RE, 'الرابط المختصر يجب أن يحتوي أحرفاً لاتينية صغيرة وأرقاماً وشرطات فقط');

const updateSchema = z.object({
        name: z.string().min(1).max(200).optional(),
        slug: slugField.optional(),
        description: z.string().max(1000).optional(),
        phone: z.string().max(30).optional(),
        whatsapp: z.string().max(30).optional(),
        email: z.string().max(254).email().optional(),
        address: z.string().max(300).optional(),
        workingHours: z.string().max(500).optional(),
        logo: z.string().max(2000).optional(),
        gallery: z.array(z.string().max(2000)).max(10).optional(),
});

const adminUpdateSchema = z.object({
        name: z.string().min(1).max(200).optional(),
        slug: slugField.optional(),
        description: z.string().max(1000).optional(),
        phone: z.string().max(30).optional(),
        whatsapp: z.string().max(30).optional(),
        email: z.string().max(254).email().optional(),
        address: z.string().max(300).optional(),
        workingHours: z.string().max(500).optional(),
        logo: z.string().max(2000).optional(),
        gallery: z.array(z.string().max(2000)).max(10).optional(),
        planId: z.number().int().optional(),
        planStart: z.string().datetime().optional(),
        planEnd: z.string().datetime().optional(),
        maxItems: z.number().int().positive().optional(),
        maxOrders: z.number().int().positive().optional(),
        city: z.string().max(100).optional(),
        showOnLanding: z.boolean().optional(),
        featuredRank: z.number().int().optional(),
});

/** round87-A2: validate logo/gallery media values against the acting tenant
 *  before any write (same guard items-POST has used since round86-A3). */
function restaurantMediaError(
        parsed: { logo?: string; gallery?: string[] },
        tenantId: number
): string | null {
        if (parsed.logo) {
                const e = mediaUrlError(parsed.logo, tenantId);
                if (e) return e;
        }
        for (const g of parsed.gallery ?? []) {
                const e = mediaUrlError(g, tenantId);
                if (e) return e;
        }
        return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
        try {
                const { id } = await params;
                const rId = Number(id);
                if (Number.isNaN(rId)) return apiError('معرف غير صالح', 400);
                const auth = await requireAuth();
                // round87-A5: sub_admin needs VIEW_ANALYTICS for the full-detail branch —
                // a zero-permission sub_admin used to read any restaurant's complete row
                // (contact + billing PII). super_admin/admin (legacy full-trust) and the
                // record's own owner keep full detail; everyone else gets the public
                // projection below.
                let isOwnerOrAdmin = false;
                if (auth.authorized) {
                        if (auth.role === 'super_admin' || auth.role === 'admin') isOwnerOrAdmin = true;
                        else if (auth.role === 'sub_admin') {
                                const perm = await requirePermission('VIEW_ANALYTICS');
                                isOwnerOrAdmin = perm.authorized;
                        } else if (auth.role === 'owner') {
                                isOwnerOrAdmin = auth.restaurantId === rId;
                        }
                }
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
                        if (!pub) return apiError('المطعم غير موجود', 404);
                        return success(pub);
                }
                const data = await prisma.restaurant.findUnique({
                        where: { id: rId },
                        include: {
                                // round89-C3 (dx-2 ب-2): the nested `_count` selects are gone —
                                // Prisma compiled them into FULL-TABLE aggregate LEFT JOINs of
                                // Order / MenuCategory / MenuItem (the round88-A2 finding: the
                                // aggregates run over the whole child table regardless of the
                                // parent WHERE). The row + per-category counts below use the
                                // round88-A2 list-counts helpers instead (grouped index lookups
                                // for just this row's ids) and rebuild the identical response
                                // shape: ` _count: { categories, orders }` on the restaurant +
                                // `_count: { items }` on every category.
                                categories: {
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
                if (!data) return apiError('المطعم غير موجود', 404);
                const [restCatCounts, restOrderCounts, catItemCounts] = await Promise.all([
                        categoryCountByRestaurant([rId]),
                        orderCountByRestaurant([rId]),
                        itemCountByCategory(data.categories.map((c) => c.id)),
                ]);
                return success({
                        ...data,
                        _count: {
                                categories: restCatCounts.get(rId) ?? 0,
                                orders: restOrderCounts.get(rId) ?? 0,
                        },
                        categories: data.categories.map((c) => ({
                                ...c,
                                _count: { items: catItemCounts.get(c.id) ?? 0 },
                        })),
                });
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
                if (Number.isNaN(rId)) return apiError('معرف غير صالح', 400);

                const body = await request.json();

                let data;
                if (auth.role === 'owner') {
                        // Owners can only update restaurants they manage — multi-menu aware via
                        // UserRestaurant links (same check as settings/route.ts & categories)
                        if (auth.restaurantId !== rId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: rId } },
                                });
                                if (!link) return apiError('غير مصرح', 403);
                        }
                        const parsed = updateSchema.parse(body);
                        const mediaErr = restaurantMediaError(parsed, rId);
                        if (mediaErr) return apiError(mediaErr, 422);
                        data = await prisma.restaurant.update({
                                where: { id: rId },
                                data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
                        });
                } else if (auth.role === 'super_admin' || auth.role === 'admin' || auth.role === 'sub_admin') {
                        // Staff may use the full admin schema (plan/maxItems/featuredRank/...)
                        // only when they hold MANAGE_RESTAURANTS. admin (legacy role) passes
                        // requirePermission automatically; super_admin always passes.
                        const perm = await requirePermission('MANAGE_RESTAURANTS');
                        if (perm.authorized) {
                                const parsed = adminUpdateSchema.parse(body);
                                const mediaErr = restaurantMediaError(parsed, rId);
                                if (mediaErr) return apiError(mediaErr, 422);
                                data = await prisma.restaurant.update({
                                        where: { id: rId },
                                        data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
                                });
                        } else {
                                // No permission: staff may still edit a restaurant they manage via a
                                // UserRestaurant link, but ONLY with the restricted schema — never
                                // the plan/billing fields (privilege-escalation fix).
                                if (auth.restaurantId !== rId) {
                                        const link = await prisma.userRestaurant.findUnique({
                                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: rId } },
                                        });
                                        if (!link) return apiError('لا تملك الصلاحية', 403);
                                }
                                const parsed = updateSchema.parse(body);
                                const mediaErr = restaurantMediaError(parsed, rId);
                                if (mediaErr) return apiError(mediaErr, 422);
                                data = await prisma.restaurant.update({
                                        where: { id: rId },
                                        data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
                                });
                        }
                } else {
                        // Regular USER role: no write access to restaurants at all
                        return apiError('غير مصرح', 403);
                }

                // round85-B9: restaurant profile edits (name/slug/logo/theme) feed the
                // public menu page — purge so changes are live instantly
                if (data && typeof data === 'object' && 'id' in data) {
                        revalidateMenu((data as { id: number }).id).catch(() => {});
                }
                return success(data);
        } catch (e) {
                return handleError(e);
        }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requirePermission('MANAGE_RESTAURANTS');
                if (!auth.authorized) return apiError(auth.error, auth.status);
                const { id } = await params;
                const rId = Number(id);
                if (Number.isNaN(rId)) return apiError('معرف غير صالح', 400);
                // Collect image URLs before deletion (blob URLs needed after DB delete)
                const items = await prisma.menuItem.findMany({
                        where: { category: { is: { restaurantId: rId } } },
                        select: { image: true },
                });
                const restRow = await prisma.restaurant.findUnique({
                        where: { id: rId },
                        select: { logo: true, gallery: true, slug: true },
                });

                await prisma.restaurant.delete({ where: { id: rId } });

                // round88-A2 cache-gap fix: PUT purged the ISR menu page but DELETE
                // didn't — a deleted restaurant's cached /menu/<slug> kept serving
                // (with live blob images now deleted) for up to 60s. The slug is
                // captured BEFORE the delete because revalidateMenu resolves it
                // from the row (gone post-delete); revalidatePath is fire-and-forget
                // and safe to call after the row is gone.
                if (restRow?.slug) {
                        try {
                                revalidatePath(`/menu/${restRow.slug}`);
                        } catch {
                                /* best-effort: 60s TTL bounds staleness on failure */
                        }
                }

                // Delete images from blob only after DB delete succeeds
                // round86-A3: scoped to this restaurant's tenant
                for (const item of items) deleteBlob(item.image, { restaurantId: rId });
                if (restRow) {
                        deleteBlob(restRow.logo, { restaurantId: rId });
                        if (Array.isArray(restRow.gallery)) restRow.gallery.forEach((u: string) => deleteBlob(u, { restaurantId: rId }));
                }
                return success({ deleted: true });
        } catch (e) {
                return handleError(e);
        }
}
