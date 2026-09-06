/**
 * Referral conversion path (round88-C4 — the documented round87 deferral:
 * "مسار تحويل الإحالة إلى converted (مكافأة المُحيل)").
 *
 * ARCHITECTURAL DECISION (follows the existing system logic, nothing new
 * invented):
 *
 * 1. CONVERSION EVENT = the referred customer's ORDER reaching `completed`.
 *    This is the same money moment that already accrues loyalty points in
 *    PUT /api/orders/[id] (round87 money-path, double-grant guarded) — the
 *    restaurant has actually been paid. Not order creation (cancelable, no
 *    money — the round-77 discount guard even forces client discounts to 0),
 *    not subscriptions (those are restaurant-owner billing, not menu
 *    customers). The Referral model itself was built for this: `orderId` +
 *    `convertedAt` + `status: ReferralStatus` have existed since round79/32.
 *
 * 2. LINKAGE = pending referral matched by `referredPhone` inside the same
 *    restaurant. Claim-based pending referrals (anonymous ?ref=CODE visit —
 *    referredPhone '') get their phone attached AT ORDER CREATION (see
 *    attachReferralPhoneToOrder): the cart sends the stored referral code
 *    (ReferralHandler's documented intent: "stores it so the order flow can
 *    apply [it]"), and the server matches it to the round-77 session
 *    fingerprint key the claim route wrote into referredName. NO client
 *    money input is trusted — the round-77 guard stays; the attach only
 *    links, the reward is granted server-side at completion.
 *
 * 3. REWARD = floor(orderTotal × referrerRewardPct / 100) POINTS on the
 *    referrer's LoyaltyCard, written through the existing RewardTransaction
 *    earn-row pattern (orderId, Arabic description, tier recomputed via
 *    computeTier — the same pattern as the customer's own accrual
 *    floor(total/10)). At the default referrerRewardPct=10 the referrer
 *    earns exactly the magnitude the referred customer earns.
 *
 * 4. STRICTNESS (money path):
 *    - ONE separate $transaction (flip + points + earn row + SystemEvent
 *      are atomic together) — deliberately NOT inside the order-completion
 *      tx: a referral hiccup must never block an order completion.
 *    - IDEMPOTENT: the grant is gated by a conditional status flip
 *      (updateMany WHERE status='pending') — only the request that wins
 *      the flip grants. Re-completing a re-opened order finds no pending
 *      referral → nothing.
 *    - BOUNDED: at most ONE conversion per completed order (oldest pending
 *      first — FIFO by claim time), MAX_REFERRAL_USES=10 converted per code
 *      (the same cap /api/loyalty/referral enforces at creation), and the
 *      round-77 self-referral guard (normalized digits compare).
 *    - AUDITED: SystemEvent (info) per conversion; failures log a warning
 *      event and never break the completion.
 */
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';
import { computeTier } from '@/lib/loyalty-tiers';

/** Same cap the referral-creation route enforces (see /api/loyalty/referral). */
export const MAX_REFERRAL_USES = 10;

/** The referral-code format the claim route validates (shared guard). */
export const REFERRAL_CODE_RE = /^[A-Z0-9]{6,16}$/;

/**
 * Round-77 anonymous session key — identical derivation to the claim route:
 * first x-forwarded-for hop (rest of the chain is attacker-controlled),
 * hashed to 16 hex chars so the raw IP is never persisted.
 */
export function referralSessionKey(request: { headers: { get(name: string): string | null } }, code: string): string {
        const fp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        const hash = createHash('sha256').update(fp).digest('hex').slice(0, 16);
        return `ref-${hash}-${code}`;
}

/** Round-77 normalized-digits phone compare (leading 00 stripped). */
function phonesMatch(a: string, b: string): boolean {
        const normalize = (p: string) => p.replace(/[^\d]/g, '').replace(/^00/, '');
        const na = normalize(a);
        return !!na && na === normalize(b);
}

type OrderLike = {
        id: number;
        orderNo: string;
        restaurantId: number;
        customerPhone: string;
        total: number | { toNumber?: () => number } | unknown;
};

function orderTotalNumber(total: OrderLike['total']): number {
        if (typeof total === 'number') return total;
        if (total !== null && typeof total === 'object' && typeof (total as { toNumber?: unknown }).toNumber === 'function') {
                return (total as { toNumber: () => number }).toNumber();
        }
        return Number(total);
}

export type ConversionResult = {
        converted: boolean;
        referralId?: number;
        points?: number;
        reason?: string;
};

/**
 * Convert the OLDEST pending referral for the order's phone and grant the
 * referrer's reward. Called after an order is persisted as `completed`.
 * Best-effort by contract: returns null on failure — the ORDER stays
 * completed either way (failure is logged as a SystemEvent warning).
 */
export async function convertReferralForCompletedOrder(order: OrderLike): Promise<ConversionResult | null> {
        try {
                return await prisma.$transaction(async (tx) => {
                        // oldest pending referral for this phone in this restaurant
                        const referral = await tx.referral.findFirst({
                                where: {
                                        restaurantId: order.restaurantId,
                                        referredPhone: order.customerPhone,
                                        status: 'pending',
                                },
                                orderBy: { createdAt: 'asc' },
                                include: { referrer: { select: { id: true, customerPhone: true, points: true } } },
                        });
                        if (!referral) return { converted: false, reason: 'no-pending' };

                        // one conversion per ORDER (the earn-row guard's analog): a
                        // completed→ready→completed round-trip must not let a SECOND
                        // pending referral convert against the same revenue
                        const convertedForThisOrder = await tx.referral.findFirst({
                                where: { orderId: order.id, status: 'converted' },
                                select: { id: true },
                        });
                        if (convertedForThisOrder) return { converted: false, reason: 'order-already-converted' };

                        // self-referral guard — the referrer must not be the buyer
                        if (phonesMatch(referral.referrer.customerPhone, order.customerPhone)) {
                                return { converted: false, reason: 'self-referral' };
                        }

                        // usage cap per code (same limit enforced at creation)
                        // round90-F1 (R-1/T3): سقف الكود ذري — العدّ ثم القلب تحت
                        // READ COMMITTED قابل للتجاوز بتزامن: تحويلان لصفين مختلفين
                        // لنفس الكود عند convertedCount=9 يعدّان كلاهما 9 → 11 تحويلًا.
                        // قفل صف بطاقة المُحيل FOR UPDATE (الكود ↔ البطاقة 1:1 عبر
                        // referralCode @unique) يُسلسل كل تحويلات الكود: الخاسر
                        // المتزامن ينتظر commit الفائز ثم يعيد العدّ فيرى 10 → code-cap.
                        await tx.$queryRaw`SELECT id FROM "LoyaltyCard" WHERE id = ${referral.referrerId} FOR UPDATE`;
                        const convertedCount = await tx.referral.count({
                                where: { referralCode: referral.referralCode, status: 'converted' },
                        });
                        if (convertedCount >= MAX_REFERRAL_USES) {
                                // stays pending — a later order can convert it once the
                                // cap frees up (documented conservative choice)
                                return { converted: false, reason: 'code-cap' };
                        }

                        // conditional flip = the idempotency gate: only the winner grants
                        const flipped = await tx.referral.updateMany({
                                where: { id: referral.id, status: 'pending' },
                                data: {
                                        status: 'converted',
                                        convertedAt: new Date(),
                                        orderId: order.id,
                                },
                        });
                        if (flipped.count === 0) return { converted: false, reason: 'race-lost' };

                        // reward — referrerRewardPct% of the completed total, in points
                        const points = Math.floor((orderTotalNumber(order.total) * referral.referrerRewardPct) / 100);
                        if (points > 0) {
                                await tx.loyaltyCard.update({
                                        where: { id: referral.referrerId },
                                        data: {
                                                points: { increment: points },
                                                // same cast pattern as the accrual path (computeTier
                                                // returns string; the value is always a valid tier)
                                                tier: computeTier(referral.referrer.points + points) as 'bronze' | 'silver' | 'gold' | 'platinum',
                                        },
                                });
                                await tx.rewardTransaction.create({
                                        data: {
                                                cardId: referral.referrerId,
                                                type: 'earn',
                                                points,
                                                description: `مكافأة إحالة — طلب ${order.orderNo}`,
                                                orderId: order.id,
                                                restaurantId: referral.restaurantId,
                                        },
                                });
                        }

                        await tx.systemEvent.create({
                                data: {
                                        eventType: 'referral.converted',
                                        title: 'تحويل إحالة',
                                        message: `تم تحويل إحالة كود ${referral.referralCode} بعد إكمال الطلب ${order.orderNo}`,
                                        severity: 'info',
                                        metadata: {
                                                referralId: referral.id,
                                                referralCode: referral.referralCode,
                                                referrerCardId: referral.referrerId,
                                                points,
                                                orderId: order.id,
                                                orderNo: order.orderNo,
                                        },
                                },
                        });

                        return { converted: true, referralId: referral.id, points };
                });
        } catch (e) {
                // best-effort contract: the completed ORDER must never fail here —
                // surface the failure as a warning SystemEvent for the operator.
                try {
                        await prisma.systemEvent.create({
                                data: {
                                        eventType: 'referral.converted',
                                        title: 'فشل تحويل إحالة',
                                        message: `تعذر تحويل إحالة للطلب ${order.orderNo} — ${String(e).slice(0, 200)}`,
                                        severity: 'warning',
                                        metadata: { orderId: order.id, orderNo: order.orderNo },
                                },
                        });
                } catch {
                        /* logging must never throw into the money path */
                }
                return null;
        }
}

/**
 * Attach the ordering customer's phone to their anonymous claim referral —
 * called from POST /api/orders when the checkout carries a referral code
 * (the ReferralHandler localStorage value). Matching is by the round-77
 * session fingerprint key the claim route stored in referredName, so only
 * the same session/IP that actually visited the ref link gets linked (no
 * free phone-stuffing for other people's claims). Linking only — NO
 * discount, NO reward (those stay server-side at completion, and the
 * round-77 client-discount guard is untouched).
 */
export async function attachReferralPhoneToOrder(params: {
        request: { headers: { get(name: string): string | null } };
        referralCode: string;
        restaurantId: number;
        customerPhone: string;
}): Promise<void> {
        const { request, referralCode, restaurantId, customerPhone } = params;
        if (!REFERRAL_CODE_RE.test(referralCode) || !customerPhone) return;
        try {
                const key = referralSessionKey(request, referralCode);
                // conditional update: only the anonymous pending claim row whose
                // fingerprint matches this session, and only while the phone is
                // still empty (never overwrite an explicit /api/loyalty/referral row)
                const res = await prisma.referral.updateMany({
                        where: {
                                referralCode,
                                referredName: key,
                                restaurantId,
                                status: 'pending',
                                referredPhone: '',
                        },
                        data: { referredPhone: customerPhone },
                });
                if (res.count > 0) {
                        await prisma.systemEvent.create({
                                data: {
                                        eventType: 'referral.linked',
                                        title: 'ربط إحالة بطلب',
                                        message: `تم ربط إحالة كود ${referralCode} برقم هاتف عميل الطلب`,
                                        severity: 'info',
                                        metadata: { referralCode, restaurantId, linkedOrders: res.count },
                                },
                        });
                }
        } catch {
                // progressive enhancement — linking failures must never block
                // order creation (the order is already persisted at this point)
        }
}
