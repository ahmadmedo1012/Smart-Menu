import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { success, handleError, error } from '@/lib/api-helpers';
import { z } from 'zod';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getNextTierInfo, generateReferralCode } from '@/lib/loyalty-tiers';

const loyaltyDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });
// round85-A2: GET is an unauthenticated phone-to-card lookup — without a
// limiter it is a free enumeration oracle (200 vs 404 reveals which phones
// have loyalty cards, tier, points, referral code).
const loyaltyGetLimiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });

const PHONE_RE = /^\+?[0-9]{7,15}$/;

const createSchema = z.object({
        customerPhone: z.string().regex(PHONE_RE, 'رقم هاتف غير صالح'),
        // round87-A4: bound public free-text (values render in the owner's
        // loyalty dashboard — unbounded strings were a client-side DoS vector)
        customerName: z.string().max(50).optional(),
        restaurantId: z.number().int().positive().optional(),
});



export async function POST(request: NextRequest) {
        try {
                const body = createSchema.parse(await request.json());
                const { customerPhone, customerName } = body;
                const cookieStore = await cookies();
                const cookieId = cookieStore.get('smart-menu-restaurant')?.value;
                const restaurantId = body.restaurantId ?? (cookieId ? Number(cookieId) : null);
                if (!restaurantId) return error('معرف المطعم مطلوب', 400);

                // Rate limit per IP + restaurant (restaurantId in key) so one
                // restaurant's traffic can't starve others behind the same IP (kiosk/NAT)
                const ip =
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                        request.headers.get('x-real-ip') ??
                        'unknown';
                const rateCheck = await loyaltyDbLimiter.check(`${ip}:${restaurantId}`);
                if (!rateCheck.success) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                // Verify restaurant exists
                const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
                if (!restaurant) return error('المطعم غير موجود', 404);

                let card = await prisma.loyaltyCard.findUnique({
                        where: {
                                customerPhone_restaurantId: { customerPhone, restaurantId },
                        },
                });

                if (!card) {
                        let referralCode = generateReferralCode();
                        let attempts = 0;
                        while (await prisma.loyaltyCard.findUnique({ where: { referralCode } })) {
                                referralCode = generateReferralCode();
                                attempts++;
                                if (attempts > 10) return error('تعذر توليد كود إحالة فريد', 500);
                        }

                        card = await prisma.loyaltyCard.create({
                                data: {
                                        customerPhone,
                                        customerName: customerName ?? '',
                                        restaurantId,
                                        referralCode,
                                },
                        });
                }

                const { nextTier, pointsToNext } = getNextTierInfo(card.tier);

                // Public endpoint — never expose PII (customerName/phone) to unauthenticated callers
                const { customerName: _n, customerPhone: _p, ...publicCard } = card;

                return success({
                        card: publicCard,
                        tier: card.tier,
                        nextTier,
                        pointsToNext,
                        referralUrl: `/loyalty?ref=${card.referralCode}`,
                });
        } catch (e) {
                return handleError(e);
        }
}

export async function GET(request: NextRequest) {
        try {
                const { searchParams } = new URL(request.url);
                const phone = searchParams.get('phone');
                const cookieStore2 = await cookies();
                const restaurantId =
                        Number(searchParams.get('restaurantId')) ||
                        Number(cookieStore2.get('smart-menu-restaurant')?.value);
                if (!restaurantId) return error('معرف المطعم مطلوب', 400);
                if (!phone || !PHONE_RE.test(phone)) return error('رقم هاتف غير صالح', 400);

                // round85-A2: rate limit the phone lookup (per IP+restaurant)
                const getIp =
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                        request.headers.get('x-real-ip') ??
                        'unknown';
                const getRateCheck = await loyaltyGetLimiter.check(`${getIp}:${restaurantId}`);
                if (!getRateCheck.success) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const card = await prisma.loyaltyCard.findUnique({
                        where: {
                                customerPhone_restaurantId: { customerPhone: phone, restaurantId },
                        },
                });

                if (!card) return error('بطاقة الولاء غير موجودة', 404);

                const { nextTier, pointsToNext } = getNextTierInfo(card.tier);

                // Public endpoint — never expose PII (customerName/phone) to unauthenticated callers
                const { customerName: _n, customerPhone: _p, ...publicCard } = card;

                return success({
                        card: publicCard,
                        tier: card.tier,
                        nextTier,
                        pointsToNext,
                        referralUrl: `/loyalty?ref=${card.referralCode}`,
                });
        } catch (e) {
                return handleError(e);
        }
}
