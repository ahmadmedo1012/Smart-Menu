import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { success, error as apiError, notFound, handleError } from '@/lib/api-helpers';
import { requireAuth, requirePermission } from '@/lib/auth';
import { computeTier, generateReferralCode } from '@/lib/loyalty-tiers';
import { isOwnerSubscriptionActive } from '@/lib/subscription-guard';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { convertReferralForCompletedOrder } from '@/lib/referral-conversion';

const orderDetailDbLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });

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
                if (Number.isNaN(oid)) return apiError('معرف غير صالح', 400);
                const data = await prisma.order.findUnique({
                        where: { id: oid },
                        include: {
                                items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                restaurant: { select: { id: true, name: true, slug: true } },
                        },
                });
                if (!data) return notFound('الطلب');

                // Only the owner (own restaurant) or platform roles may view an order
                if (auth.role === 'owner') {
                        if (auth.restaurantId !== data.restaurantId) {
                                const link = await prisma.userRestaurant.findUnique({
                                        where: { userId_restaurantId: { userId: auth.userId!, restaurantId: data.restaurantId } },
                                });
                                if (!link) return apiError('غير مصرح', 403);
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
                // round91-D1: unified client-IP extraction (canonical + validated —
                // header rotation can no longer mint fresh buckets off-Vercel)
                const ip = getClientIp(request);
                const { success: allowed } = await orderDetailDbLimiter.check(`order-update:${ip}`);
                if (!allowed) return apiError('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const auth = await requireAuth();
                if (!auth.authorized) return apiError('غير مصرح', 401);

                /* W6-B6 (G-5 — تدقيق W6-A3): حارس الاشتراك المنتهي — نفس
                   عائلة items (r138) وowner/* (c661e707). مسار عمليات
                   المالك: تغيير الحالة (بما فيه الإكمال الذي يشعل تراكم
                   نقاط الولاء وتحويل الإحالات — مسار مكافآت مالي) وتحرير
                   الطلب. المنيو العام للمالك المنتهي يستمر باستقبال
                   الطلبات (سياسة الانتهاء المتعمدة) لكن لوحة المالك
                   لا تحرّكها — نفس ما تقوله لافتة OwnerShell. الموظفون
                   يتجاوزون داخل الحارس. GET يبقى مفتوحًا. */
                if (!(await isOwnerSubscriptionActive(auth))) {
                        return apiError('اشتراكك منتهي. جدّد اشتراكك للمتابعة.', 403);
                }

                const { id } = await params;
                const oid = Number(id);
                if (Number.isNaN(oid)) return apiError('معرف غير صالح', 400);

                const body = updateSchema.parse(await request.json());

                const existing = await prisma.order.findUnique({ where: { id: oid } });
                if (!existing) return notFound('الطلب');

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

                // r121-D2: cancelled is TERMINAL. A cancelled order must never
                // transition to another status — cancelled→completed used to
                // fall into the accrual block below and MINT loyalty points +
                // convert referrals on cancelled revenue; cancelled→new/preparing/
                // ready re-opens a voided order. Deliberately NOT a forward-only
                // map (X2 narrowing): backward transitions among the four live
                // statuses stay allowed (web timeline dots; pinned by
                // order-lifecycle :300/:314) and same-status PUTs stay allowed
                // (idempotent re-ack). Non-status edits (notes/whatsappSent) on
                // a cancelled row are untouched. One guard here covers both the
                // accrual block below AND the plain update at the bottom — but
                // it reads a SNAPSHOT: the plain update below re-checks the row
                // at write time (r127-F2 / ADV2-3) so a cancel landing between
                // the read and the write can no longer be overwritten.
                if (existing.status === 'cancelled' && body.status !== undefined && body.status !== 'cancelled') {
                        return apiError('لا يمكن تغيير حالة طلب ملغي — الطلب الملغي نهائي', 409);
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
                // round87-D10 note (kept): the accrual gate needs pts>0 AND a phone —
                // orders below 10 pts or anonymous orders fall through to the plain
                // update below (both still reach the round88-C4 referral conversion
                // hook, which only needs the phone).
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
                                // round88-C4 — referral conversion AFTER the money-path tx
                                // commits (separate tx, best-effort by contract: a referral
                                // hiccup must never fail the completed order; conversion only
                                // when the row is genuinely completed and has a phone)
                                if (result.updated?.status === 'completed' && result.updated?.customerPhone) {
                                        await convertReferralForCompletedOrder(result.updated);
                                }
                                return success(result.updated);
                        }
                }

                // r127-F2 (ADV2-3) — the plain update is now a CONDITIONAL write.
                // The read at the top is only a snapshot: a concurrent cancel
                // landing between that read and the old unconditional
                // prisma.order.update where {id} silently overwrote the terminal
                // state (a cancelled row flipped to completed, then the referral
                // hook below converted on cancelled revenue). Same pattern as the
                // accrual block above (:144-175): when the request itself targets
                // a live status, the row must STILL be non-cancelled at write
                // time — a concurrent cancel wins the race and we lose ours.
                // Same-status re-acks (cancelled→cancelled) and non-status edits
                // (notes/whatsappSent) stay unconditional: they can never
                // resurrect a terminal row (r121-D2 contract, pinned by
                // order-lifecycle :501/:533).
                // (the returned count is deliberately unused: BOTH outcomes are
                // answered by the re-read below — won → the written row, lost →
                // the concurrent writer's row — so branching on it adds nothing.)
                await prisma.order.updateMany({
                        where:
                                body.status !== undefined && body.status !== 'cancelled'
                                        ? { id: oid, status: { not: 'cancelled' } }
                                        : { id: oid },
                        data: body,
                });
                // updateMany returns only a count — re-read the row for the
                // response in BOTH outcomes (won: the freshly written row; lost:
                // the concurrent writer's row, e.g. cancelled). The re-read status
                // drives the referral hook below, so a cancel that landed between
                // our read and our write can never convert referral revenue.
                const data = await prisma.order.findUnique({
                        where: { id: oid },
                        include: {
                                items: { include: { item: { select: { id: true, name: true, nameAr: true } } } },
                                restaurant: { select: { id: true, name: true, slug: true } },
                        },
                });
                // Deleted between our write and the re-read (rare): answer a
                // clean 404 instead of the old P2025 → 500.
                if (!data) return notFound('الطلب');

                // round88-C4 — plain-update completion path (pts=0 or loyalty-less):
                // the order still completed with real money → still convert referrals
                // (guarded by the RE-READ status — a lost race answers cancelled)
                if (
                        body.status === 'completed' &&
                        existing.status !== 'completed' &&
                        data?.status === 'completed' &&
                        data?.customerPhone
                ) {
                        await convertReferralForCompletedOrder(data);
                }

                return success(data);
        } catch (e) {
                return handleError(e);
        }
}
