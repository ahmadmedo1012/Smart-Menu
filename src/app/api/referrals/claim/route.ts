import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';
import { success, error as apiError } from '@/lib/api-helpers';
import { createDbRateLimiter } from '@/lib/rate-limit';

const REFERRAL_CODE_RE = /^[A-Z0-9]{6,16}$/;

// Anonymous endpoint — small per-IP limiter so clients can't spam claims
const claimDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/referrals/claim — register a referral click/order intent.
 * Creates a pending Referral keyed by an anonymous session fingerprint so
 * repeat visits don't duplicate rows. Converts to `converted` when the
 * referred order completes (handled in the order flow).
 */
export async function POST(request: NextRequest) {
	try {
		const { code } = await request.json().catch(() => ({ code: '' }));
		if (!code || !REFERRAL_CODE_RE.test(code)) {
			return apiError('كود إحالة غير صالح', 400);
		}

		// Per-IP rate limit — take ONLY the first x-forwarded-for value (rest
		// are attacker-controlled hop chain)
		const ip =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
			request.headers.get('x-real-ip') ??
			'unknown';
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
		// attacker-controlled.
		const fp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
		const key = `ref-${sha256(fp)}-${code}`;
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
		});

		return success({ registered: true });
	} catch (e) {
		console.error('referral claim error', e);
		return apiError('فشل تسجيل الإحالة', 500);
	}
}

function sha256(s: string): string {
	return createHash("sha256").update(s).digest("hex").slice(0, 16);
}
