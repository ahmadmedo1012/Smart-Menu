import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, notFound, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { computeTier } from '@/lib/loyalty-tiers';
import { createDbRateLimiter } from '@/lib/rate-limit';

const orderDetailDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });

function generateReferralCode(): string {
        return randomBytes(4).toString('hex').toUpperCase();
}

const updateSchema = z.object({
        customerName: z.string().max(50).optional(),
        customerPhone: z.string().max(30).optional(),
        notes: z.string().max(500).optional(),
        pickupType: z.enum(['inside', 'takeaway', 'delivery']).optional(),
        status: z.enum(['new', 'preparing', 'ready', 'completed', 'cancelled']).optional(),
        whatsappSent: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                const { id } = await params;
                const oid = Number(id);
                if (Number.isNaN(oid)) return apiError('Invalid ID', 400);
                const data = await prisma.order.findUnique({
                        where: { id: oid },
                        include: {
                                items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                restaurant: { select: { id: true, name: true, slug: true } },
                        },
                });
                if (!data) return notFound('Order');

                // Only the owner (own restaurant) or platform roles may view an order
                if (auth.role === 'owner') {
                        if (auth.restaurantId !== data.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: data.restaurantId } },
                                });
                                if (!link) return apiError('غير مصرح', 401);
                        }
                } else if (auth.role === 'super_admin') {
                        // full access
                } else if (auth.role === 'admin' || auth.role === 'sub_admin') {
                        // admins need explicit permission to view any order's details
                        if (!(auth.permissions ?? []).includes('APPROVE_ORDERS')) return apiError('لا تملك الصلاحية', 403);
                } else {
                        return apiError('غير مصرح', 403);
                }

                return success(data);
        } catch (e) {
                return handleError(e);
        }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
                const ip =
                        request.headers.get('x-real-ip') ||
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        'unknown';
                const { success: allowed } = await orderDetailDbLimiter.check(`order-update:${ip}`);
                if (!allowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                const { id } = await params;
                const oid = Number(id);
                if (Number.isNaN(oid)) return apiError('Invalid ID', 400);

                const body = updateSchema.parse(await request.json());

                const existing = await prisma.order.findUnique({ where: { id: oid } });
                if (!existing) return notFound('Order');

                // Owner can only modify their own restaurant's orders; regular users can't modify any
                if (auth.role === 'owner') {
                        if (auth.restaurantId !== existing.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: existing.restaurantId } },
                                });
                                if (!link) return apiError('غير مصرح', 403);
                        }
                } else if (auth.role === 'super_admin') {
                        // full access
                } else if (auth.role === 'admin' || auth.role === 'sub_admin') {
                        // admins need explicit permission to modify any order
                        if (!(auth.permissions ?? []).includes('APPROVE_ORDERS')) return apiError('لا تملك الصلاحية', 403);
                } else {
                        return apiError('غير مصرح', 403);
                }

                // Admin/sub_admin needs APPROVE_ORDERS permission to change status
                if (auth.role !== 'owner' && body.status && body.status !== existing.status) {
                        const perm = await requirePermission('APPROVE_ORDERS');
                        if (!perm.authorized) return apiError(perm.error, perm.status);
                }

                // Accrue loyalty points when order completed. Two layers of protection
                // against double-grants:
                //   1) application: only enter this block if the request claims a transition
                //      INTO 'completed' from a non-completed state (in-memory snapshot);
                //   2) transaction: before accruing, check RewardTransaction for an existing
                //      'earn' row on this order. A second completed→ready→completed toggle
                //      passes check 1 (existing.status was 'ready') but fails check 2.
                //   3) transaction: status flip is itself conditional on the original status
                //      via updateMany — a concurrent cancel/readjust wins for its request, we
                //      win for ours, and the row state moves atomically.
                if (body.status === 'completed' && existing.status !== 'completed') {
                        const ptsEarned = Math.floor(Number(existing.total) / 10);
                        if (ptsEarned > 0 && existing.customerPhone) {
                                const result = await prisma.$transaction(async (tx) => {
                                        const alreadyAccrued = await tx.rewardTransaction.findFirst({
                                                where: { orderId: existing.id, type: 'earn' },
                                                select: { id: true },
                                        });
                                        if (alreadyAccrued) {
                                                // Idempotent re-ack: just flip the status without re-accruing.
                                                const updated = await tx.order.updateMany({
                                                        where: { id: oid, status: existing.status },
                                                        data: { ...body, status: 'completed' },
                                                });
                                                if (updated.count === 0) {
                                                        const already = await tx.order.findUnique({
                                                                where: { id: oid },
                                                                include: { restaurant: { select: { id: true, name: true, slug: true } } },
                                                        });
                                                        return { updated: already, accrued: false };
                                                }
                                                const updated2 = await tx.order.findUnique({
                                                        where: { id: oid },
                                                        include: {
                                                                items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                                                restaurant: { select: { id: true, name: true, slug: true } },
                                                        },
                                                });
                                                const effective = updated2 ?? existing;
                                                return { updated: effective, accrued: false };
                                        }
                                        const updated = await tx.order.updateMany({
                                                where: { id: oid, status: existing.status },
                                                data: { ...body, status: 'completed' },
                                        });
                                        if (updated.count === 0) {
                                                const already = await tx.order.findUnique({
                                                        where: { id: oid },
                                                        include: { restaurant: { select: { id: true, name: true, slug: true } } },
                                                });
                                                return { updated: already, accrued: false }; // caller handles null (deleted)
                                        }
                                        const updated2 = await tx.order.findUnique({
                                                where: { id: oid },
                                                include: {
                                                        items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                                        restaurant: { select: { id: true, name: true, slug: true } },
                                                },
                                        });
                                        // Order deleted between updateMany and findUnique (rare race): the
                                        // pre-update snapshot has stable id/total/customerPhone, so accrue
                                        // from it instead of crashing on a null deref.
                                        const effective = updated2 ?? existing;
                                        const existingCard = await tx.loyaltyCard.findUnique({
                                                where: {
                                                        customerPhone_restaurantId: {
                                                                customerPhone: effective.customerPhone,
                                                                restaurantId: effective.restaurantId,
                                                        },
                                                },
                                        });
                                        const newTier = computeTier(ptsEarned + (existingCard?.points ?? 0)) as 'bronze' | 'silver' | 'gold' | 'platinum';
                                        const card = await tx.loyaltyCard.upsert({
                                                where: {
                                                        customerPhone_restaurantId: {
                                                                customerPhone: effective.customerPhone,
                                                                restaurantId: effective.restaurantId,
                                                        },
                                                },
                                                update: {
                                                        points: { increment: ptsEarned },
                                                        totalOrders: { increment: 1 },
                                                        totalSpent: { increment: effective.total },
                                                        tier: newTier,
                                                },
                                                create: {
                                                        customerPhone: effective.customerPhone,
                                                        restaurantId: effective.restaurantId,
                                                        referralCode: generateReferralCode(),
                                                        points: ptsEarned,
                                                        totalOrders: 1,
                                                        totalSpent: effective.total,
                                                        tier: newTier,
                                                },
                                        });
                                        if (card) {
                                                await tx.rewardTransaction.create({
                                                        data: {
                                                                cardId: card.id,
                                                                type: 'earn',
                                                                points: ptsEarned,
                                                                description: `طلب ${effective.orderNo}`,
                                                                orderId: effective.id,
                                                                restaurantId: effective.restaurantId,
                                                        },
                                                });
                                        }
                                        return { updated: effective, accrued: true };
                                });
                                return success(result.updated);
                        }
                }

                const data = await prisma.order.update({
                        where: { id: oid },
                        data: body,
                        include: {
                                items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                restaurant: { select: { id: true, name: true, slug: true } },
                        },
                });

                return success(data);
        } catch (e) {
                return handleError(e);
        }
}
