import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
// r121-A-1: the 85-line approver-keyboard block moved to the shared helper
// (audience = approvers ONLY — see the ⚠ gatherTargets note there).
import { broadcastPaymentKeyboard } from '@/lib/telegram-broadcast';
import { error as logError } from '@/lib/logger';
import { z } from 'zod';
import { getClientIp } from '@/lib/client-ip';
// (r138 — اتساق بوابة الدفع): حقل الهاتف من المصدر المشترك — كانت نسخة
// يدوية بلا تطبيع الأرقام الشرقية أصلًا (انحراف وثّقه r121-C-api).
import { paymentPhoneField } from '@/lib/payment-schema';

const upgradeSchema = z
        .object({
                planId: z.number().int().positive(),
                phone: paymentPhoneField,
                provider: z.enum(['libyana', 'madar', 'bank']),
                amount: z.number().positive(),
                upgradeRestaurantId: z.number().int().positive(),
                senderAccountName: z.string().min(1).max(100).optional(),
                senderAccountNumber: z.string().min(1).max(50).optional(),
                // round91-F-B (D2-#2): joins the R90 image-cap family — the local
                // copy of this field was unbounded (row-bloat into payment metadata).
                receiptImageUrl: z.string().url().max(2_000, 'رابط الإيصال طويل جداً — الحد الأقصى 2000 حرف').refine((u) => u.startsWith('https://'), { message: 'رابط الإيصال يجب أن يكون https' }).optional(),
        })
        .refine((d) => d.provider !== 'bank' || (d.senderAccountName && d.senderAccountNumber), {
                message: 'اسم صاحب الحساب ورقم الحساب إجباريان للتحويل البنكي',
                path: ['senderAccountName'],
        });

const upgradeLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const ip = getClientIp(request); // round91-D1: unified extraction
                const { success: allowed } = await upgradeLimiter.check(`upgrade:${ip}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const parsed = upgradeSchema.safeParse(await request.json());
                if (!parsed.success) return error(parsed.error.issues[0].message, 422);
                const {
                        planId,
                        phone,
                        provider,
                        amount,
                        upgradeRestaurantId,
                        senderAccountName,
                        senderAccountNumber,
                        receiptImageUrl,
                } = parsed.data;

                // Bank transfers bypass the mobile-wallet 99 LYD cap
                const isBank = provider === 'bank';
                if (!isBank && Number(amount) > 99) {
                        // round89-E8: same failure class as subscriptions POST — the exact
                        // cap message replaces the misleading «المبلغ لا يطابق سعر الباقة»
                        // (w1-d1 discovery 2).
                        return error(
                                'المبالغ فوق 99 د.ل تتطلب تحويل بنكي — اختر طريقة الدفع "تحويل بنكي"',
                                400
                        );
                }

                // Validate plan exists and is active
                const plan = await prisma.subscriptionPlan.findUnique({
                        where: { id: planId },
                        select: { id: true, name: true, nameAr: true, isActive: true, price: true },
                });
                if (!plan || !plan.isActive) return error('الباقة غير موجودة أو غير نشطة', 400);
                if (Number(amount) !== Number(plan.price)) {
                        return error('المبلغ لا يطابق سعر الباقة', 400);
                }

                // Validate restaurant exists and check current plan isn't paid
                const restaurant = await prisma.restaurant.findUnique({
                        where: { id: upgradeRestaurantId },
                        select: { id: true, planId: true },
                });
                if (!restaurant) return error('المطعم غير موجود', 404);

                // Check current plan — only block if the new plan is not higher
                if (restaurant.planId !== null) {
                        const currentPlan = await prisma.subscriptionPlan.findUnique({
                                where: { id: restaurant.planId },
                                select: { price: true, sortOrder: true },
                        });
                        if (currentPlan && Number(currentPlan.price) > 0) {
                                const newPlan = await prisma.subscriptionPlan.findUnique({
                                        where: { id: planId },
                                        select: { price: true, sortOrder: true },
                                });
                                if (!newPlan) return error('الباقة غير موجودة', 400);
                                // Allow upgrade only if new plan has higher sortOrder (higher tier)
                                if (newPlan.sortOrder <= currentPlan.sortOrder) {
                                        return error('الباقة المحددة ليست أعلى من باقتك الحالية', 400);
                                }
                        }
                }

                // Ownership check — prevent IDOR: only owner of restaurant or super_admin/admin can upgrade
                if (
                        auth.restaurantId !== upgradeRestaurantId &&
                        auth.role !== 'super_admin' &&
                        auth.role !== 'admin'
                ) {
                        // Multi-menu: allow if owner manages this restaurant via UserRestaurant
                        const link = await prisma.userRestaurant.findUnique({
                                where: { userId_restaurantId: { userId: auth.userId!, restaurantId: upgradeRestaurantId } },
                        });
                        if (!link) return error('لا تملك صلاحية ترقية هذا المطعم', 403);
                }

                // Check no pending upgrade for this restaurant
                // (round89-E8: scoped to the REQUESTING user — an abandoned pending
                // request from any other user used to block the whole restaurant's
                // upgrades; w1-d1 discovery 4)
                const pending = await prisma.subscriptionPayment.findFirst({
                        where: {
                                status: 'pending',
                                userId: auth.userId,
                                metadata: { path: ['upgradeRestaurantId'], equals: upgradeRestaurantId },
                        },
                });
                if (pending) return error('لديك طلب ترقية معلق بالفعل لهذا المطعم', 400);

                // Check user has no pending payment
                const userPending = await prisma.subscriptionPayment.findFirst({
                        where: { userId: auth.userId, status: 'pending' },
                });
                if (userPending) return error('لديك طلب دفع معلق بالفعل', 400);

                let payment;
                try {
                        payment = await prisma.subscriptionPayment.create({
                                data: {
                                        userId: auth.userId,
                                        phone: phone ? String(phone) : '',
                                        amount: plan.price,
                                        provider: provider as 'libyana' | 'madar' | 'bank',
                                        planId,
                                        planName: plan.nameAr ?? '',
                                        status: 'pending',
                                        metadata: {
                                                upgradeRestaurantId,
                                                currentPlanId: restaurant.planId,
                                                ...(isBank
                                                        ? { senderAccountName, senderAccountNumber, receiptImageUrl: receiptImageUrl ?? null }
                                                        : {}),
                                        },
                                },
                        });
                } catch (e) {
                        // round90-F1 (T2 — أخطر بند مالي): نفس سباق دفعة معلقة واحدة —
                        // الفحصان الأوليان (400) findFirst-then-create لا يقاومان التزامن؛
                        // الفهرس الفريد الجزئي SubscriptionPayment_pending_user_unique
                        // (هجرة add_round90_pending_payment_unique) يحسم عند الإنشاء:
                        // الخاسر المتزامن يستلم P2002 → 409 بدل ترقية تُدفع مرتين.
                        if ((e as { code?: string })?.code === 'P2002') {
                                return error('لديك طلب دفع معلق بالفعل', 409);
                        }
                        throw e;
                }

                // Send interactive keyboard to admins
                try {
                        const msg = [
                                `⬆️ *طلب ترقية اشتراك* #${payment.id}`,
                                `• المستخدم: #${auth.userId}`,
                                `• المطعم: #${upgradeRestaurantId}`,
                                `• الباقة: ${plan.nameAr}`,
                                `• الهاتف: ${phone != null ? String(phone) : 'غير محدد'}`,
                                `• المبلغ: ${String(amount)} د.ل`,
                        ].join('\n');
                        await broadcastPaymentKeyboard({
                                paymentId: payment.id,
                                paymentMetadata: payment.metadata,
                                msg,
                                approveLabel: '🟢 موافقة على الترقية',
                                logPrefix: '[upgrade]',
                        });
                } catch (keyboardErr) {
                        logError('[upgrade] keyboard error', {
                                error: keyboardErr instanceof Error ? keyboardErr.message : String(keyboardErr),
                        });
                }

                return success({ id: payment.id }, 201);
        } catch (e) {
                return handleError(e);
        }
}
