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

const subscriptionLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

// Normalize Arabic-Indic digits (٠-٩) to Western (0-9) before validation
function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export const createPaymentSchema = z
	.object({
		phone: z
			.string()
			.regex(/^09\d{8}$/, 'رقم الهاتف يجب أن يكون 10 أرقام ويبدأ بـ 09')
			.optional()
			.transform((v) => (v ? normalizeDigits(v) : v)),
		amount: z.number().positive(),
		provider: z.enum(['libyana', 'madar', 'bank']),
		planId: z.number().int().positive(),
		tempUsername: z.string().min(3).optional(),
		tempRestaurants: z
			.array(
				z.object({
					name: z.string().min(1),
					slug: z.string().min(3),
				})
			)
			.optional(),
		// Bank transfer fields — only valid when provider === "bank"
		senderAccountName: z.string().min(1).max(100).optional(),
		senderAccountNumber: z.string().min(1).max(50).optional(),
		receiptImageUrl: z.string().url().optional(),
	})
	.refine((d) => d.provider !== 'bank' || (d.senderAccountName && d.senderAccountNumber), {
		message: 'اسم صاحب الحساب ورقم الحساب إجباريان للتحويل البنكي',
		path: ['senderAccountName'],
	});

// The 99 LYD cap is a libyana/madar network constraint — bank transfers have no cap.

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
					for (const chatId of chatIds) {
						try {
							const sent = await sendMessageWithKeyboard(
								botToken,
								chatId,
								msg,
								[
									[{ text: '🟢 موافقة على التفعيل', callbackData: `sub_app:${payment.id}` }],
									[{ text: '🔴 رفض الطلب', callbackData: `sub_rej:${payment.id}` }],
								],
								{ parseMode: 'Markdown' }
							);
							if (sent)
								telegramMessages.push({ chatId: Number(chatId), messageId: sent.message_id });
						} catch (singleErr) {
							logError('[subscriptions] send failed', {
								chatId,
								error: singleErr instanceof Error ? singleErr.message : String(singleErr),
							});
						}
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
