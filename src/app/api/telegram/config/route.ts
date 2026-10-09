import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError } from '@/lib/api-helpers';
import { requirePermission } from '@/lib/auth';
import { decryptValue, encryptValue } from '@/lib/config';
import { z } from 'zod';
import { telegramApiCall } from '@/lib/telegram-api';

const upsertSchema = z.object({
	// Optional so a masked-load save (admin edits chatId only) can omit the
	// token and keep the stored one instead of encrypting the •••• placeholder.
	botToken: z.string().min(1).optional(),
	chatId: z.string(),
	events: z.array(z.string()),
	isActive: z.boolean().default(true),
});

export async function GET() {
	try {
		const auth = await requirePermission('EDIT_SETTINGS');
		if (!auth.authorized) return error(auth.error, auth.status);
		const config = await prisma.telegramConfig.findFirst({
			select: { id: true, botToken: true, chatId: true, events: true, isActive: true },
		});
		// Never expose the bot token — only indicate whether it's configured
		return success({
			id: config?.id,
			chatId: config?.chatId,
			events: config?.events,
			isActive: config?.isActive,
			botTokenMasked: config?.botToken ? true : false,
			botToken: undefined,
		});
	} catch (e) {
		return handleError(e);
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requirePermission('EDIT_SETTINGS');
		if (!auth.authorized) return error(auth.error, auth.status);
		const body = upsertSchema.parse(await request.json());
		// No token in the payload → preserve the stored one (masked-save path).
		if (!body.botToken) {
			const existing = await prisma.telegramConfig.findFirst({ where: { id: 1 } });
			if (!existing?.botToken) return error('رمز البوت غير مُعدّ بعد — يرجى إدخاله', 422);
			await prisma.telegramConfig.update({
				where: { id: existing.id },
				data: { chatId: body.chatId, events: body.events, isActive: body.isActive },
			});
		} else {
			const encryptedToken = await encryptValue(body.botToken);
			await prisma.telegramConfig.upsert({
				where: { id: 1 },
				create: {
					botToken: encryptedToken,
					chatId: body.chatId,
					events: body.events,
					isActive: body.isActive,
				},
				update: {
					botToken: encryptedToken,
					chatId: body.chatId,
					events: body.events,
					isActive: body.isActive,
				},
			});
		}
		// Re-read so return reflects saved state without leaking ciphertext
		const saved = await prisma.telegramConfig.findFirst({
			select: { id: true, chatId: true, events: true, isActive: true },
		});

		// Register the webhook so Telegram actually delivers updates to us.
		// Without this the bot never receives messages (live: bot silent).
		// On a masked save (no new token) reuse the stored token to re-register.
		// r118-A1-P3: the webhook compares the TRIMMED env value
		// (webhook/route.ts expectedSecret) — a padded env var here registered
		// an untrimmed secret and every update 403'd. Trim at the source.
		const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
		const domain = process.env.NEXT_PUBLIC_DOMAIN;
		let webhookToken = body.botToken;
		if (!webhookToken) {
			const existingTokenRow = await prisma.telegramConfig.findFirst({
				where: { id: 1 },
				select: { botToken: true },
			});
			webhookToken = await decryptValue(existingTokenRow?.botToken ?? '');
		}
		if (secret && domain && body.isActive && webhookToken) {
			try {
				const webhookUrl = `${domain}/api/telegram/webhook`;
				// r118-A1-F1: hardened transport (10s bound, synthetic non-ok on
				// transport failure) — was a raw fetch with no timeout.
				const res = await telegramApiCall(webhookToken, 'setWebhook', {
					url: webhookUrl,
					secret_token: secret,
					allowed_updates: ['message', 'callback_query'],
				});
				const json = (await res.json()) as { ok?: boolean; description?: string };
				if (!json.ok) {
					return error(`تم الحفظ لكن تعذّر تسجيل الويب هوك: ${json.description ?? 'unknown'}`, 400);
				}
			} catch {
				return error('تم الحفظ لكن تعذّر الاتصال بـ Telegram', 500);
			}
		}

		return success(saved);
	} catch (e) {
		return handleError(e);
	}
}
