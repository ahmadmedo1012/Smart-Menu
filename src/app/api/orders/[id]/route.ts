import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, notFound, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { computeTier } from '@/lib/loyalty-tiers';
import { createDbRateLimiter } from '@/lib/rate-limit';

const orderDetailDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });

// Mirrors POST /api/referrals/claim fingerprinting — 16 hex chars of the
// SHA-256 digest — so completion can recompute the same key over the
// customer's phone and match rows created by the anonymous claim flow.
function referralFingerprint(s: string): string {
	return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

// Digits-only phone comparison (same normalization as loyalty/referral/route.ts).
function normalizePhone(p: string): string {
	return p.replace(/[^\d]/g, '').replace(/^00/, '');
}

const updateSchema = z.object({
	customerName: z.string().optional(),
	customerPhone: z.string().optional(),
	notes: z.string().optional(),
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

		// Accrue loyalty points when order completed — atomic: status flip + accrual in one
		// transaction, guarded so a second concurrent request can't double-accrue
		if (body.status === 'completed' && existing.status !== 'completed') {
			const ptsEarned = Math.floor(Number(existing.total) / 10);
			if (ptsEarned > 0 && existing.customerPhone) {
				const result = await prisma.$transaction(async (tx) => {
					// Conditional status flip: guard on the exact transition (previous status),
					// not a state predicate — only the request whose claimed transition matches
					// the current row wins; concurrent requests claiming a different transition
					// (e.g. cancelled while another completes) update 0 rows and accrue nothing
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
					const fresh = await tx.order.findUnique({
						where: { id: oid },
						include: {
							items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
							restaurant: { select: { id: true, name: true, slug: true } },
						},
					});
					// Order deleted between updateMany and findUnique (rare race): the
					// pre-update snapshot has stable id/total/customerPhone, so accrue
					// from it instead of crashing on a null deref.
					const updated2 = fresh ?? existing;
					const existingCard = await tx.loyaltyCard.findUnique({
						where: {
							customerPhone_restaurantId: {
								customerPhone: updated2.customerPhone,
								restaurantId: updated2.restaurantId,
							},
						},
					});
					const newTier = computeTier(ptsEarned + (existingCard?.points ?? 0)) as 'bronze' | 'silver' | 'gold' | 'platinum';
					const card = await tx.loyaltyCard.upsert({
						where: {
							customerPhone_restaurantId: {
								customerPhone: updated2.customerPhone,
								restaurantId: updated2.restaurantId,
							},
						},
						update: {
							points: { increment: ptsEarned },
							totalOrders: { increment: 1 },
							totalSpent: { increment: updated2.total },
							tier: newTier,
						},
						create: {
							customerPhone: updated2.customerPhone,
							restaurantId: updated2.restaurantId,
							referralCode: `RF${updated2.restaurantId}${Date.now().toString(36).toUpperCase().slice(-6)}`,
							points: ptsEarned,
							totalOrders: 1,
							totalSpent: updated2.total,
							tier: newTier,
						},
					});
					if (card) {
						await tx.rewardTransaction.create({
							data: {
								cardId: card.id,
								type: 'earn',
								points: ptsEarned,
								description: `طلب ${updated2.orderNo}`,
								orderId: updated2.id,
								restaurantId: updated2.restaurantId,
							},
						});
					}

					// Referral conversion: if this customer claimed a referral code for this
					// restaurant, flip it to converted and credit the referrer's card with
					// the reward points (referrerRewardPct of order total ÷ 10, floor ≥ 1).
					if (updated2.customerPhone) {
						const fp = referralFingerprint(normalizePhone(updated2.customerPhone));
						const pendingReferral = await tx.referral.findFirst({
							where: {
								restaurantId: updated2.restaurantId,
								status: 'pending',
								referredName: fp,
								orderId: null,
							},
							include: { referrer: { select: { id: true } } },
						});
						if (pendingReferral) {
							const rewardPts = Math.max(1, Math.floor((Number(updated2.total) * pendingReferral.referrerRewardPct) / 100 / 10));
							await tx.referral.update({
								where: { id: pendingReferral.id },
								data: { status: 'converted', convertedAt: new Date(), orderId: updated2.id },
							});
							await tx.loyaltyCard.update({
								where: { id: pendingReferral.referrer.id },
								data: { points: { increment: rewardPts } },
							});
							await tx.rewardTransaction.create({
								data: {
									cardId: pendingReferral.referrer.id,
									type: 'earn',
									points: rewardPts,
									description: `مكافأة إحالة — طلب ${updated2.orderNo}`,
									orderId: updated2.id,
									restaurantId: updated2.restaurantId,
								},
							});
						}
					}
					return { updated: updated2, accrued: true };
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
