import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { success, notFound, handleError, error } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { revalidateMenu } from '@/lib/menu-cache';
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
        // Stage H (round79) — showcase fields. All optional (no .default()): an
        // omitted field must never overwrite a stored showcase value (same rule
        // as the tag arrays above). The updateData loop below carries them as-is.
        isFeatured: z.boolean().optional(),
        featuredRank: z.number().int().min(1, 'الترتيب يجب أن يكون 1 على الأقل').max(5, 'الترتيب يجب ألا يتجاوز 5').nullable().optional(),
        showcaseTag: z.string().max(40, 'الشارة يجب ألا تتجاوز 40 حرفًا').nullable().optional(),
        // Round83 §2.3 — up to 3 showcase badges; omitted → untouched.
        showcaseTags: z.array(z.string().max(40, 'كل شارة يجب ألا تتجاوز 40 حرفًا')).max(3, 'الحد الأقصى 3 شارات').optional(),
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
                        if (v !== undefined) updateData[k] = v;
                }
                if (updateData.status !== undefined) updateData.status = updateData.status as ItemStatus;

                // Round83 §2.3 — dual-write + normalization. Whichever badge
                // field(s) the client sent, the stored pair stays consistent:
                //   * tags array sent → array wins; legacy mirrors tags[0];
                //   * only legacy tag sent → it seeds/upserts the array;
                //   * isFeatured turned off → both cleared.
                // Omitted entirely → both untouched (partial-update rule above).
                if (updateData.showcaseTags !== undefined || updateData.showcaseTag !== undefined || updateData.isFeatured !== undefined) {
                        const featured = updateData.isFeatured !== undefined ? (updateData.isFeatured as boolean) : existing.isFeatured;
                        if (!featured) {
                                updateData.showcaseTag = null;
                                updateData.showcaseTags = [];
                        } else {
                                const sentTags = (updateData.showcaseTags as string[] | undefined)
                                        ?.map((t) => t.trim())
                                        .filter(Boolean);
                                const sentLegacy = typeof updateData.showcaseTag === 'string' ? (updateData.showcaseTag as string).trim() : null;
                                const tags = sentTags !== undefined
                                        ? (sentTags.length > 0 ? sentTags : sentLegacy ? [sentLegacy] : [])
                                        : sentLegacy
                                                ? [...new Set([sentLegacy, ...(existing.showcaseTags ?? [])])]
                                                : [...new Set([...(existing.showcaseTags ?? []), existing.showcaseTag ?? null].filter((t): t is string => !!t))];
                                const normalized = [...new Set(tags)].slice(0, 3);
                                updateData.showcaseTags = normalized;
                                updateData.showcaseTag = normalized[0] ?? null;
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
                if (body.image && existing.image && body.image !== existing.image) {
                        deleteBlob(existing.image);
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
                if (Number.isNaN(delId)) return error('Invalid ID', 400);
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
                if (existing.image) deleteBlob(existing.image);
                // round85-B9: purge the ISR cache so the removal is live immediately
                revalidateMenu(existing.category.restaurantId).catch(() => {});
                return success({ id: delId });
        } catch (e) {
                return handleError(e);
        }
}
