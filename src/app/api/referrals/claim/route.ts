import { NextRequest } from 'next/server';
import { error as logError } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { success, error as apiError } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { referralSessionKey } from '@/lib/referral-conversion';
import { getClientIp } from '@/lib/client-ip';

const REFERRAL_CODE_RE = /^[A-Z0-9]{6,16}$/;

// Anonymous endpoint — small per-IP limiter so clients can't spam claims
const claimDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/referrals/claim — register a referral click/order intent.
 * Creates a pending Referral keyed by an anonymous session fingerprint so
 * repeat visits don't duplicate rows. (round88-C4: the conversion path now
 * EXISTS — the customer's phone is attached at order creation and the
 * referral converts + rewards the referrer at order completion; see
 * src/lib/referral-conversion.ts.)
 */
export async function POST(request: NextRequest) {
        try {
                const { code } = await request.json().catch(() => ({ code: '' }));
                if (!code || !REFERRAL_CODE_RE.test(code)) {
                        return apiError('كود إحالة غير صالح', 400);
                }

                // Per-IP rate limit — round91-D1: unified extraction (trust model,
                // canonicalization and validation live in the shared helper; the
                // FIRST-xff comment below applies to the session fingerprint only)
                const ip = getClientIp(request); // round91-D1: unified extraction
                const rateCheck = await claimDbLimiter.check(`claim:${ip}`);
                if (!rateCheck.success) return apiError('طلبات كثيرة جداً، حاول بعد قليل', 429);

                // Resolve the card that owns this referral code
                const card = await prisma.loyaltyCard.findUnique({
                        where: { referralCode: code },
                        select: { id: true, restaurantId: true, customerPhone: true },
                });
                if (!card) return apiError('كود الإحالة غير موجود', 404);

                // Anonymous session fingerprint — hashed so the raw IP is never
                // persisted/displayed (round-77: IP is PII, spoofable header).
                // Take ONLY the first x-forwarded-for value; the rest of the chain is
                // attacker-controlled. Same derivation as the order-create attach
                // (referral-conversion.ts) — the two MUST stay identical.
                const key = referralSessionKey(request, code);
                const existing = await prisma.referral.findFirst({
                        where: { referralCode: code, referredName: key },
                });
                if (existing) return success({ registered: false, already: true });

                await prisma.referral.create({
                        data: {
                                referralCode: code,
                                referrerId: card.id,
                                referredPhone: '',
                                referredName: key,
                                discountPercent: 10,
                                referrerRewardPct: 10,
                                restaurantId: card.restaurantId,
                                status: 'pending',
                        },
                }).catch((e: { code?: string }) => {
                        // round87-A9: unique constraint on (referralCode, referredName) —
                        // a lost find-then-create race surfaces here instead of duplicating
                        const isDup = e?.code === 'P2002';
                        if (!isDup) throw e;
                });

                return success({ registered: true });
        } catch (e) {
                logError('referral claim error', { error: String(e) });
                return apiError('تعذّر تسجيل الإحالة', 500);
        }
}
