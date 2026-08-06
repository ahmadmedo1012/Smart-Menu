import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { toArabicNumber } from '@/lib/format';

const redeemSchema = z.object({
	cardId: z.number().int().positive(),
});

/**
 * Redeem a reward — the stamp-card promise ("اطلب 5 مرات واحصل على وجبة
 * مجانية") was display-only before this endpoint (round-76 loyalty agent).
 * Atomic: check points ≥ cost, decrement, record a redeem transaction.
 */
export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return apiError('غير مصرح', 401);

		const body = redeemSchema.parse(await request.json());

		const result = await prisma.$transaction(async (tx) => {
			const card = await tx.loyaltyCard.findUnique({ where: { id: body.cardId } });
			if (!card) throw new Error('NOT_FOUND');
			// owner of the card's restaurant only
			if (auth.role === 'owner' && auth.restaurantId !== card.restaurantId) {
				const link = await tx.userRestaurant.findUnique({
					where: { userId_restaurantId: { userId: auth.userId!, restaurantId: card.restaurantId } },
				});
				if (!link) throw new Error('UNAUTHORIZED');
			} else if (auth.role !== 'admin' && auth.role !== 'super_admin' && auth.role !== 'sub_admin') {
				throw new Error('UNAUTHORIZED');
			}

			const REWARD_COST = 5; // stamps per free meal
			if (card.totalOrders < REWARD_COST) {
				throw new Error('INSUFFICIENT');
			}

			const updated = await tx.loyaltyCard.update({
				where: { id: card.id },
				data: {
					totalOrders: { decrement: REWARD_COST },
					points: { decrement: Math.floor(REWARD_COST * 2) }, // ~2 pts/order earned rate
				},
			});

			await tx.rewardTransaction.create({
				data: {
					cardId: card.id,
					restaurantId: card.restaurantId,
					points: -REWARD_COST,
					type: 'redeem',
					description: `استبدال وجبة مجانية (${REWARD_COST} طلبات)`,
				},
			});

			return updated;
		});

		return success({ card: result, message: `تم استبدال وجبتك المجانية! رصيدك: ${toArabicNumber(result.totalOrders)} طلبات` });
	} catch (e) {
		if (e instanceof Error && ['NOT_FOUND', 'UNAUTHORIZED', 'INSUFFICIENT'].includes(e.message)) {
			const msg =
				e.message === 'NOT_FOUND'
					? 'البطاقة غير موجودة'
					: e.message === 'UNAUTHORIZED'
						? 'غير مصرح'
						: 'لا توجد طلبات كافية للاستبدال بعد';
			return apiError(msg, e.message === 'UNAUTHORIZED' ? 401 : 400);
		}
		return handleError(e);
	}
}
