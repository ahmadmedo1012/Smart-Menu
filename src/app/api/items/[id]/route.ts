import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, notFound, handleError, error } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { revalidateMenu } from '@/lib/menu-cache';
import { ItemStatus } from '@/generated/prisma/enums';
import { deleteBlob, mediaUrlError } from '@/lib/blob';

/* w3-f1 (F1-3) — same write schema as items/route.ts (shared shape, duplicated
 * locally to keep the [id] route self-contained like every other schema here).
 * `id` fields are accepted-but-ignored: the PUT applies a full REPLACE
 * (deleteMany + create) because the only writer (ItemDialog) always sends the
 * complete current list. Historical orders keep option ids in modifiersJson
 * which no surface renders (grep-verified) — replace is safe and idempotent. */
const modifierOptionSchema = z.object({
        id: z.number().int().positive().optional(),
        nameAr: z.string().min(1, 'اسم الخيار مطلوب').max(60),
        name: z.string().max(60).optional(),
        priceDelta: z.number().optional(),
        isAvailable: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
});
const modifierGroupSchema = z
        .object({
                id: z.number().int().positive().optional(),
                nameAr: z.string().min(1, 'اسم المجموعة مطلوب').max(60),
                name: z.string().max(60).optional(),
                minSelect: z.number().int().min(0, 'الحد الأدنى لا يمكن أن يكون سالبًا').max(10).optional(),
                maxSelect: z.number().int().min(1, 'الحد الأقصى يجب أن يكون 1 على الأقل').max(10).optional(),
                required: z.boolean().optional(),
                sortOrder: z.number().int().optional(),
                options: z.array(modifierOptionSchema).max(20, 'الحد الأقصى 20 خيارًا لكل مجموعة'),
        })
        .refine((v) => (v.minSelect ?? 0) <= (v.maxSelect ?? 1), {
                message: 'الحد الأدنى للاختيار لا يمكن أن يتجاوز الحد الأقصى',
        });

/** Maps a validated group to the Prisma nested-create input. */
function modifierGroupCreateInput(
        g: z.infer<typeof modifierGroupSchema>
) {
        return {
                nameAr: g.nameAr,
                name: g.name ?? '',
                minSelect: g.minSelect ?? 0,
                maxSelect: g.maxSelect ?? 1,
                required: g.required ?? false,
                sortOrder: g.sortOrder ?? 0,
                options: {
                        create: (g.options ?? []).map((o) => ({
                                nameAr: o.nameAr,
                                name: o.name ?? '',
                                priceDelta: o.priceDelta ?? 0,
                                isAvailable: o.isAvailable ?? true,
                                sortOrder: o.sortOrder ?? 0,
                        })),
                },
        };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const { id } = await params;
                const itemId = Number(id);
                if (Number.isNaN(itemId)) return error('معرف غير صالح', 400);

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

                // round87-A8: hidden/unavailable items are staff-only — an
                // unauthenticated (or USER) caller must not read draft rows by id.
                // Owners are additionally tenant-scoped (same ownership rule as
                // PUT/DELETE in this file) — an owner of restaurant A must not
                // read restaurant B's draft rows.
                if (item.status !== 'available') {
                        const auth = await requireAuth();
                        const staff =
                                auth.authorized &&
                                ['owner', 'admin', 'super_admin', 'sub_admin'].includes(auth.role);
                        if (!staff) return notFound('MenuItem');
                        if (auth.role === 'owner' && auth.restaurantId !== item.category.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: item.category.restaurantId } },
                                });
                                if (!link) return notFound('MenuItem');
                        }
                }

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
        // Stage H (round79) — showcase fields. All optional (no .default()): an
        // omitted field must never overwrite a stored showcase value (same rule
        // as the tag arrays above). The updateData loop below carries them as-is.
        isFeatured: z.boolean().optional(),
        featuredRank: z.number().int().min(1, 'الترتيب يجب أن يكون 1 على الأقل').max(5, 'الترتيب يجب ألا يتجاوز 5').nullable().optional(),
        // Round83 §2.3 — up to 3 showcase badges; omitted → untouched.
        // round88-C: legacy single showcaseTag dropped (migration 20260906055500).
        showcaseTags: z.array(z.string().max(40, 'كل شارة يجب ألا تتجاوز 40 حرفًا')).max(3, 'الحد الأقصى 3 شارات').optional(),
        // w3-f1 (F1-3): omitted → untouched (same partial-update rule as every
        // other field); sent → full replace (deleteMany + create) below.
        modifierGroups: z.array(modifierGroupSchema).max(6, 'الحد الأقصى 6 مجموعات خيارات لكل صنف').optional(),
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
                if (Number.isNaN(itemId)) return error('معرف غير صالح', 400);

                const body = updateSchema.parse(await request.json());

                const existing = await prisma.menuItem.findUnique({
                        where: { id: itemId },
                        include: { category: { select: { restaurantId: true } } },
                });
                if (!existing) return notFound('Item');

                // Owners can only update items of restaurants they manage — multi-menu aware
                // via UserRestaurant links (same check as settings/route.ts & categories)
                if (auth.role === 'owner' && auth.restaurantId !== existing.category.restaurantId) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.category.restaurantId } },
                        });
                        if (!link) return error('غير مصرح', 403);
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
                        // w3-f1: the raw array is handled below as a nested write —
                        // spreading it verbatim would hand Prisma an invalid value.
                        if (k === 'modifierGroups') continue;
                        if (v !== undefined) updateData[k] = v;
                }
                if (updateData.status !== undefined) updateData.status = updateData.status as ItemStatus;

                // w3-f1 (F1-3): full replace — the payload carries the complete list
                // (the owner dialog is the only writer). Cascade deletes take care of
                // the old options; ids echoed by the client are ignored.
                if (body.modifierGroups !== undefined) {
                        updateData.modifierGroups = {
                                deleteMany: {},
                                create: body.modifierGroups.map(modifierGroupCreateInput),
                        };
                }

                // Round83 §2.3 — normalization.
                //   * tags array SENT → array wins (trimmed, deduped, max 3);
                //     tags sent while un-featured → cleared (explicit intent).
                //   * round88-C fix (surfaced by team8): a BARE isFeatured toggle
                //     (no tags in the payload) must NOT destroy the stored badges —
                //     an OFF→ON cycle used to wipe them permanently. Tags (and
                //     featuredRank, which the dialog now also leaves un-sent on
                //     un-feature) stay stored inert while un-featured — the public
                //     showcase filters by isFeatured first — so re-featuring
                //     restores the scene exactly (rank, badges, order).
                //   * omitted entirely → untouched (partial-update rule above).
                // round88-C: no more legacy mirror — the array is the only storage.
                if (updateData.showcaseTags !== undefined) {
                        const featured = updateData.isFeatured !== undefined ? (updateData.isFeatured as boolean) : existing.isFeatured;
                        if (!featured) {
                                updateData.showcaseTags = [];
                        } else {
                                const sentTags = (updateData.showcaseTags as string[])
                                        .map((t) => t.trim())
                                        .filter(Boolean);
                                updateData.showcaseTags = [...new Set(sentTags)].slice(0, 3);
                        }
                }

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

                // round87-A1: media-URL guard must run BEFORE the write (it used to run
                // after the update — the row was already persisted by the time the 422
                // returned) and must validate ANY supplied image, including the first
                // one on items that had none (old condition required existing.image).
                if (body.image) {
                        const imgErr = mediaUrlError(body.image, existing.category.restaurantId);
                        if (imgErr) return error(imgErr, 422);
                }

                const data = await prisma.menuItem.update({
                        where: { id: itemId },
                        data: updateData,
                        include: { category: { select: { id: true, name: true, nameAr: true } } },
                });

                logAudit({
                        action: 'update',
                        actorId: auth.userId,
                        targetType: 'menuItem',
                        targetId: itemId,
                        metadata: { restaurantId: existing.category.restaurantId, fields: Object.keys(updateData) },
                }).catch(() => {});

                // Delete old image from blob only after DB update succeeds
                // round86-A3: scoped to the item's tenant (new image already
                // validated above before the write — round87-A1)
                if (body.image && existing.image && body.image !== existing.image) {
                        deleteBlob(existing.image, { restaurantId: existing.category.restaurantId });
                }
                // round85-B9: purge the ISR cache so the owner sees the edit instantly
                revalidateMenu(existing.category.restaurantId).catch(() => {});
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
                if (Number.isNaN(delId)) return error('معرف غير صالح', 400);
                const existing = await prisma.menuItem.findUnique({
                        where: { id: delId },
                        include: { category: { select: { restaurantId: true } } },
                });
                if (!existing) return notFound('Item');

                // Owners can only delete items of restaurants they manage — multi-menu aware
                // via UserRestaurant links (same check as settings/route.ts & categories)
                if (auth.role === 'owner' && auth.restaurantId !== existing.category.restaurantId) {
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.category.restaurantId } },
                        });
                        if (!link) return error('غير مصرح', 403);
                }
                // Staff roles (admin/sub_admin — super_admin passes automatically) may only
                // delete arbitrary restaurants' items when they hold MANAGE_RESTAURANTS
                if (auth.role !== 'owner') {
                        const perm = await requirePermission('MANAGE_RESTAURANTS');
                        if (!perm.authorized) return error(perm.error, perm.status);
                }

                await prisma.menuItem.delete({ where: { id: delId } });

                logAudit({
                        action: 'delete',
                        actorId: auth.userId,
                        targetType: 'menuItem',
                        targetId: delId,
                        metadata: { restaurantId: existing.category.restaurantId, name: existing.name },
                }).catch(() => {});

                // Delete item image from blob only after DB delete succeeds
                // round86-A3: scoped to the item's tenant
                if (existing.image) deleteBlob(existing.image, { restaurantId: existing.category.restaurantId });
                // round85-B9: purge the ISR cache so the removal is live immediately
                revalidateMenu(existing.category.restaurantId).catch(() => {});
                return success({ id: delId });
        } catch (e) {
                return handleError(e);
        }
}
