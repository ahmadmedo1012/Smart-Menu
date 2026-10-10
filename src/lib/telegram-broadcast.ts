import { telegramApiCall, sendMessageWithKeyboard } from './telegram-api';
import { getAdminTelegramIds } from './telegram-admin';
import { prisma } from '@/lib/db';
import { error, warn } from '@/lib/logger';
import { getDecryptedBotToken } from '@/lib/config';

// r121-O-8: this shape used to be defined twice (identical private copies here
// and in telegram.ts) — a field added to one would silently miss the other.
export interface BroadcastResult {
        sent: number;
        failed: { chatId: string; reason: string }[];
}

interface BroadcastOpts {
        parseMode?: 'Markdown' | 'HTML';
        adminOnly?: boolean;
}

// (r138): داخلي — مستهلكها الوحيد broadcastToAll في نفس الملف.
async function sendToChat(
        botToken: string,
        chatId: string,
        message: string,
        opts?: BroadcastOpts
): Promise<void> {
        const body: Record<string, string | number> = {
                chat_id: /^-?\d+$/.test(chatId) ? Number(chatId) : chatId,
                text: message,
        };
        if (opts?.parseMode) body.parse_mode = opts.parseMode;
        // r118-A1-F1: raw fetch (NO timeout) — login/register AWAIT the broadcast
        // via notifyEvent, so a hung Telegram pinned user login until the function
        // timeout. The hardened transport bounds every call at 10s and never throws
        // on transport errors (synthetic non-ok Response instead).
        const res = await telegramApiCall(botToken, 'sendMessage', body);
        if (!res.ok) {
                const err = await res.text();
                // r118-A1-P3: surface Telegram's retry_after on 429 so the caller's
                // logs carry the flood-wait instead of a bare status code.
                if (res.status === 429) {
                        let retryAfter = '';
                        try {
                                const parsed = JSON.parse(err) as { parameters?: { retry_after?: number } };
                                if (parsed?.parameters?.retry_after) retryAfter = ` (retry_after=${parsed.parameters.retry_after}s)`;
                        } catch {
                                /* keep the bare message */
                        }
                        throw new Error(`Telegram 429 flood${retryAfter}: ${err.slice(0, 200)}`);
                }
                throw new Error(`Telegram API ${res.status}: ${err.slice(0, 300)}`);
        }
}

async function gatherTargets(opts?: BroadcastOpts): Promise<Set<string>> {
        const targets = new Set<string>();

        // Active broadcast targets (always included — these are intentional admin channels)
        const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
                where: { isActive: true },
                select: { chatId: true },
        });
        for (const t of broadcastTargets) targets.add(t.chatId);

        // Linked users — only include for non-admin broadcasts (order notifications, etc.)
        if (!opts?.adminOnly) {
                const linkedUsers = await prisma.user.findMany({
                        where: { telegramChatId: { not: null } },
                        select: { telegramChatId: true },
                });
                for (const u of linkedUsers) {
                        if (u.telegramChatId) targets.add(u.telegramChatId);
                }
        }

        return targets;
}

export async function broadcastToAll(
        message: string,
        opts?: BroadcastOpts
): Promise<BroadcastResult> {
        const config = await prisma.telegramConfig.findFirst();
        if (!config || !config.isActive) return { sent: 0, failed: [] };
        const botToken = await getDecryptedBotToken();
        if (!botToken) return { sent: 0, failed: [] };

        const targetIds = await gatherTargets(opts);
        if (targetIds.size === 0) return { sent: 0, failed: [] };

        // Batch in chunks with a short delay (round-77: Promise.allSettled fired
        // every send simultaneously — Telegram caps ~30/s → 429s with large N)
        const chunks: string[][] = [];
        const ids = Array.from(targetIds);
        for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

        const settled = [];
        for (const chunk of chunks) {
                const batch = await Promise.allSettled(
                        chunk.map((chatId) => sendToChat(botToken, chatId, message, opts))
                );
                settled.push(...batch);
                if (chunks.length > 1) await new Promise((r) => setTimeout(r, 60));
        }
        const results = settled;

        const failed: BroadcastResult['failed'] = [];
        let sent = 0;

        const chatIds = Array.from(targetIds);
        for (let i = 0; i < results.length; i++) {
                const r = results[i];
                if (r.status === 'fulfilled') {
                        sent++;
                } else {
                        const reason = r.reason?.message ?? 'Unknown';
                        error('[Telegram Broadcast] Failed:', { chatId: chatIds[i], reason });
                        // Stale target: bot was removed from the group/channel — stop retrying
                        // it forever. Only prune when the failure is a hard chat-not-found.
                        if (/chat not found|chat not accessible|bot was kicked/i.test(reason)) {
                                try {
                                        await prisma.telegramBroadcastTarget.deleteMany({
                                                where: { chatId: String(chatIds[i]) },
                                        });
                                        warn('[Telegram Broadcast] Pruned stale target:', { chatId: chatIds[i] });
                                } catch {
                                        /* prune is best-effort */
                                }
                        }
                        failed.push({ chatId: chatIds[i], reason });
                }
        }

        return { sent, failed };
}

/**
 * r121-A-1: the ~85-line approver-keyboard block that used to be copy-pasted
 * between api/subscriptions/route.ts and api/subscriptions/upgrade/route.ts
 * (X2 mapped 6 exact diffs: message text, approve-button label, log prefix —
 * all now parameters — plus the nameAr fallback and pacing-comment refs that
 * live in each caller's own message composition).
 *
 * ⚠ NOT gatherTargets(): that audience broadcasts to ALL Telegram-linked
 * users — an approval keyboard must reach APPROVERS only (admins + active
 * broadcast targets + env fallbacks), or the «موافقة» buttons would leak to
 * every linked owner. The payment-route target set is reproduced verbatim.
 *
 * Callers keep their own try/catch(keyboardErr) shells: an unexpected throw
 * here (bot-token/config failure) is logged by the route and never fails the
 * user's payment request.
 */
export interface PaymentKeyboardOpts {
        paymentId: number;
        /** payment.metadata as loaded at create time — merged with telegramMessages */
        paymentMetadata: unknown;
        /** fully composed approval message (each route builds its own) */
        msg: string;
        /** test-pinned approve wording: «موافقة على التفعيل» vs «موافقة على الترقية» */
        approveLabel: string;
        /** test-pinned log prefix: '[subscriptions]' / '[upgrade]' */
        logPrefix: string;
}

export async function broadcastPaymentKeyboard(opts: PaymentKeyboardOpts): Promise<void> {
        const botToken = await getDecryptedBotToken();
        if (!botToken) return;

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
        if (chatIds.size === 0) return;

        const telegramMessages: { chatId: number; messageId: number }[] = [];
        // round89-C2 (dx-2 ب-1): these sends used to be SEQUENTIAL inside the
        // user's payment request (response time = N × Telegram RTT). Chunked
        // allSettled — 10 concurrent sends per batch, 60ms pause BETWEEN
        // batches only (no trailing delay), per-chat failure tolerated and
        // never fails the request (behavior locked by tests/unit/subscriptions-
        // family.test.ts + subscriptions-upgrade.test.ts).
        const ids = Array.from(chatIds);
        for (let i = 0; i < ids.length; i += 10) {
                if (i > 0) await new Promise((r) => setTimeout(r, 60));
                const settled = await Promise.allSettled(
                        ids.slice(i, i + 10).map((chatId) =>
                                sendMessageWithKeyboard(
                                        botToken,
                                        chatId,
                                        opts.msg,
                                        [
                                                [{ text: opts.approveLabel, callbackData: `sub_app:${opts.paymentId}` }],
                                                [{ text: '🔴 رفض الطلب', callbackData: `sub_rej:${opts.paymentId}` }],
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
                                error(`${opts.logPrefix} send failed`, {
                                        chatId,
                                        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                                });
                        }
                });
        }
        // Store message references so webhook cleanup can remove keyboards from all copies
        if (telegramMessages.length > 0) {
                const existingMeta =
                        typeof opts.paymentMetadata === 'object' && opts.paymentMetadata
                                ? (opts.paymentMetadata as Record<string, unknown>)
                                : {};
                await prisma.subscriptionPayment
                        .update({
                                where: { id: opts.paymentId },
                                data: { metadata: { ...existingMeta, telegramMessages } },
                        })
                        .catch((e: unknown) =>
                                error(`${opts.logPrefix} failed to store telegramMessages`, {
                                        error: e instanceof Error ? e.message : String(e),
                                })
                        );
        }
}
