import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requireAuth } from '@/lib/auth';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { getAdminTelegramIds } from '@/lib/telegram-admin';
import { getDecryptedBotToken } from '@/lib/config';
import { sendMessageWithKeyboard } from '@/lib/telegram-api';
import { error as logError } from '@/lib/logger';
// round88-A2: schema moved to lib (a non-handler route export breaks Webpack
// route-type generation; importing the route from tests pulled its whole dep
// tree). Behavior identical — same object, same messages.
import { createPaymentSchema } from '@/lib/payment-schema';

const subscriptionLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
        try {
                const auth = await requireAuth();
                if (!auth.authorized) return error('غير مصرح', 401);

                const ip =
                        request.headers.get('x-real-ip') ||
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        'unknown';
                const { success: allowed } = await subscriptionLimiter.check(`sub:${ip}`);
                if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

                const parsed = createPaymentSchema.safeParse(await request.json());
                if (!parsed.success) return error(parsed.error.issues[0].message, 400);
                const {
                        phone,
                        amount,
                        provider,
                        planId,
                        tempUsername,
                        tempRestaurants,
                        senderAccountName,
                        senderAccountNumber,
                        receiptImageUrl,
                } = parsed.data;

                // Bank transfers bypass the mobile-wallet 99 LYD cap
                const isBank = provider === 'bank';
                if (!isBank && Number(amount) > 99) {
                        return error(
                                'المبالغ فوق 99 د.ل تتطلب تحويل بنكي — اختر طريقة الدفع "تحويل بنكي"',
                                400
                        );
                }

                // Pre-flight uniqueness checks (defense in depth alongside client-side validation)
                if (tempUsername) {
                        const tempUser = await prisma.user.findUnique({
                                where: { username: tempUsername },
                                select: { id: true },
                        });
                        // Allow if tempUsername matches the currently authenticated user (already registered before payment)
                        if (tempUser && tempUser.id !== auth.userId) return error('اسم المستخدم مستخدم بالفعل', 409);
                }
                // Check uniqueness for ALL temp restaurant slugs (multiple menus)
                if (tempRestaurants && tempRestaurants.length > 0) {
                        for (const tr of tempRestaurants) {
                                const existingSlug = await prisma.restaurant.findUnique({
                                        where: { slug: tr.slug },
                                });
                                if (existingSlug) return error(`الرابط ${tr.slug} محجوز مسبقاً`, 409);
                                const slugPending = await prisma.subscriptionPayment.findFirst({
                                        where: {
                                                status: 'pending',
                                                metadata: { path: ['tempRestaurants'], array_contains: [{ slug: tr.slug }] },
                                        },
                                });
                                if (slugPending) return error(`الرابط ${tr.slug} محجوز بطلب دفع معلق`, 409);
                        }
                }

                // Check no pending payment for this user
                const pendingPayment = await prisma.subscriptionPayment.findFirst({
                        where: { userId: auth.userId, status: 'pending' },
                });
                if (pendingPayment) return error('لديك طلب دفع معلق بالفعل', 400);

                // Server-side price validation — never trust client-reported amount
                const plan = await prisma.subscriptionPlan.findUnique({
                        where: { id: planId, isActive: true },
                        select: { nameAr: true, price: true },
                });
                if (!plan) return error('الباقة غير صالحة', 400);
                if (Number(amount) !== Number(plan.price)) {
                        return error('المبلغ لا يطابق سعر الباقة', 400);
                }

                const payment = await prisma.subscriptionPayment.create({
                        data: {
                                userId: auth.userId,
                                phone: phone ? String(phone) : '',
                                amount: plan.price,
                                provider: provider as 'libyana' | 'madar' | 'bank',
                                planId,
                                planName: plan?.nameAr ?? '',
                                status: 'pending',
                                metadata: {
                                        tempUsername,
                                        tempRestaurants: tempRestaurants ?? [],
                                        ...(isBank
                                                ? { senderAccountName, senderAccountNumber, receiptImageUrl: receiptImageUrl ?? null }
                                                : {}),
                                        telegramMessages: [],
                                },
                        },
                });

                // Send interactive keyboard to admins (same as existing pattern)
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
                                        const msg = `🔗 *طلب اشتراك جديد* #${payment.id}\n• المستخدم: #${auth.userId}\n• الباقة: ${plan?.nameAr ?? 'غير معروف'}\n• الهاتف: ${String(phone)}\n• المبلغ: ${String(amount)} د.ل`;
                                        const telegramMessages: { chatId: number; messageId: number }[] = [];
                                        // round89-C2 (dx-2 ب-1): these sends used to be SEQUENTIAL
                                        // inside the user's payment request (response time = N ×
                                        // Telegram RTT). Now chunked allSettled — the same shape as
                                        // telegram-broadcast.ts:10/60ms — 10 concurrent sends per
                                        // batch, 60ms pause BETWEEN batches only (no trailing delay),
                                        // per-chat failure tolerated and never fails the request
                                        // (behavior locked by tests/unit/subscriptions-family).
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
                                                                                [{ text: '🟢 موافقة على التفعيل', callbackData: `sub_app:${payment.id}` }],
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
                                                                logError('[subscriptions] send failed', {
                                                                        chatId,
                                                                        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                                                                });
                                                        }
                                                });
                                        }
                                        // Store message references so webhook cleanup can remove keyboards from all copies
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
                                                                logError('[subscriptions] failed to store telegramMessages', {
                                                                        error: e instanceof Error ? e.message : String(e),
                                                                })
                                                        );
                                        }
                                }
                        }
                } catch (keyboardErr) {
                        logError('[subscriptions] keyboard error', {
                                error: keyboardErr instanceof Error ? keyboardErr.message : String(keyboardErr),
                        });
                }

                return success({ id: payment.id }, 201);
        } catch (e) {
                return handleError(e);
        }
}
