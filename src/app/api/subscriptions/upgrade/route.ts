import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getAdminTelegramIds } from '@/lib/telegram-admin';
import { getDecryptedBotToken } from '@/lib/config';
import { sendMessageWithKeyboard } from '@/lib/telegram-api';
import { error as logError } from '@/lib/logger';
import { z } from 'zod';
import { getClientIp } from '@/lib/client-ip';

const upgradeSchema = z
        .object({
                planId: z.number().int().positive(),
                phone: z
                        .string()
                        .regex(/^09\d{8}$/, 'رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 09')
                        .optional(),
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
                if (!parsed.success) return error(parsed.error.issues[0].message, 400);
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
                        const botToken = await getDecryptedBotToken();
                        if (botToken) {
                                const adminIds = await getAdminTelegramIds();
                                const chatIds = new Set<string>();
                                for (const id of adminIds) chatIds.add(String(id));
                                const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
                                        where: { isActive: true },
                                        select: { chatId: true },
                                });
                                for (const t of broadcastTargets) chatIds.add(t.chatId);
                                if (chatIds.size === 0) {
                                        const fallback = process.env.TELEGRAM_CHAT_ID;
                                        if (fallback) chatIds.add(fallback);
                                        const groupIds = (process.env.TELEGRAM_GROUP_IDS ?? '')
                                                .split(',')
                                                .map((s) => s.trim())
                                                .filter(Boolean);
                                        for (const gid of groupIds) chatIds.add(gid);
                                }
                                if (chatIds.size > 0) {
                                        const msg = [
                                                `⬆️ *طلب ترقية اشتراك* #${payment.id}`,
                                                `• المستخدم: #${auth.userId}`,
                                                `• المطعم: #${upgradeRestaurantId}`,
                                                `• الباقة: ${plan.nameAr}`,
                                                `• الهاتف: ${String(phone)}`,
                                                `• المبلغ: ${String(amount)} د.ل`,
                                        ].join('\n');
                                        const telegramMessages: { chatId: number; messageId: number }[] = [];
                                        // round89-C2 (dx-2 ب-1): sequential sends (N × Telegram RTT
                                        // inside the user's upgrade request) → chunked allSettled,
                                        // same shape as telegram-broadcast.ts:10/60ms — 10 concurrent
                                        // sends per batch, 60ms pause BETWEEN batches only, per-chat
                                        // failure tolerated and never fails the request (behavior
                                        // locked by tests/unit/subscriptions-upgrade).
                                        const ids = Array.from(chatIds);
                                        for (let i = 0; i < ids.length; i += 10) {
                                                if (i > 0) await new Promise((r) => setTimeout(r, 60));
                                                const settled = await Promise.allSettled(
                                                        ids.slice(i, i + 10).map((chatId) =>
                                                                sendMessageWithKeyboard(
                                                                        botToken,
                                                                        chatId,
                                                                        msg,
                                                                        [
                                                                                [{ text: '🟢 موافقة على الترقية', callbackData: `sub_app:${payment.id}` }],
                                                                                [{ text: '🔴 رفض الطلب', callbackData: `sub_rej:${payment.id}` }],
                                                                        ],
                                                                        { parseMode: 'Markdown' }
                                                                )
                                                        )
                                                );
                                                settled.forEach((result, j) => {
                                                        const chatId = ids[i + j];
                                                        if (result.status === 'fulfilled') {
                                                                if (result.value)
                                                                        telegramMessages.push({ chatId: Number(chatId), messageId: result.value.message_id });
                                                        } else {
                                                                logError('[upgrade] send failed', {
                                                                        chatId,
                                                                        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                                                                });
                                                        }
                                                });
                                        }
                                        if (telegramMessages.length > 0) {
                                                const existingMeta =
                                                        typeof payment.metadata === 'object' && payment.metadata
                                                                ? (payment.metadata as Record<string, unknown>)
                                                                : {};
                                                await prisma.subscriptionPayment
                                                        .update({
                                                                where: { id: payment.id },
                                                                data: { metadata: { ...existingMeta, telegramMessages } },
                                                        })
                                                        .catch((e: unknown) =>
                                                                logError('[upgrade] failed to store telegramMessages', {
                                                                        error: e instanceof Error ? e.message : String(e),
                                                                })
                                                        );
                                        }
                                }
                        }
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
