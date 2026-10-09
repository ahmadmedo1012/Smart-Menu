import { warn as logWarn } from './logger';

interface SendMsgOpts {
        parseMode?: 'Markdown' | 'HTML';
        replyMarkup?: Record<string, unknown>;
}

interface TelegramMessage {
        message_id: number;
        chat: { id: number };
}

async function apiCall(
        botToken: string,
        method: string,
        body: Record<string, unknown>
): Promise<Response> {
        // r116: network failures / abort timeouts used to REJECT, and every
        // caller (editMessageReplyMarkup, editMessageText, answerCallbackQuery)
        // propagated the rejection up into the webhook handler — one flaky
        // edit could skip answerCallbackQuery entirely, leaving the admin with
        // a dead spinner, so they re-tapped and hit «تمت معالجة هذا الطلب
        // مسبقاً» on a payment that had actually JUST been approved. A synthetic
        // non-ok Response routes every failure through the existing !res.ok
        // logWarn path instead — no caller can throw on transport errors.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
                return await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                });
        } catch (e) {
                logWarn('telegram apiCall transport failure', {
                        method,
                        error: e instanceof Error ? e.message : String(e),
                });
                return new Response(JSON.stringify({ ok: false, error: 'transport_failure' }), {
                        status: 599,
                        headers: { 'Content-Type': 'application/json' },
                });
        } finally {
                clearTimeout(timeout);
        }
}

/**
 * r118-A1-F1: the hardened transport (10s AbortController, never throws on
 * network errors — returns a synthetic non-ok Response instead) exposed for
 * the remaining call sites that previously used raw fetch(): broadcast
 * sendToChat (awaited by login/register via notifyEvent), config setWebhook,
 * diagnose testChatId. Response semantics are unchanged so each caller keeps
 * its own error mapping.
 */
export async function telegramApiCall(
        botToken: string,
        method: string,
        body: Record<string, unknown>
): Promise<Response> {
        return apiCall(botToken, method, body);
}

/** Coerce numeric-looking strings to numbers (Telegram API expects numeric IDs) */
function normalizeChatId(chatId: number | string): number | string {
        return typeof chatId === 'string' && /^-?\d+$/.test(chatId) ? Number(chatId) : chatId;
}

export async function sendMessageWithKeyboard(
        botToken: string,
        chatId: number | string,
        text: string,
        buttons: { text: string; callbackData: string }[][],
        opts?: SendMsgOpts
): Promise<TelegramMessage | null> {
        const payload: Record<string, unknown> = {
                chat_id: normalizeChatId(chatId),
                text,
                reply_markup: {
                        inline_keyboard: buttons.map((row) =>
                                row.map((b) => ({ text: b.text, callback_data: b.callbackData }))
                        ),
                },
        };
        if (opts?.parseMode) payload.parse_mode = opts.parseMode;
        const res = await apiCall(botToken, 'sendMessage', payload);
        if (!res.ok) {
                const err = await res.text();
                logWarn('sendMessage failed', { chatId, status: res.status, error: err.slice(0, 300) });
                return null;
        }
        return res.json();
}

export async function editMessageReplyMarkup(
        botToken: string,
        chatId: number,
        messageId: number
): Promise<void> {
        const res = await apiCall(botToken, 'editMessageReplyMarkup', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [] },
        });
        if (!res.ok) {
                const err = await res.text();
                logWarn('editMessageReplyMarkup failed', {
                        chatId,
                        messageId,
                        status: res.status,
                        error: err.slice(0, 200),
                });
        }
}

export async function editMessageText(
        botToken: string,
        chatId: number,
        messageId: number,
        text: string,
        opts?: { parseMode?: 'Markdown' | 'HTML' }
): Promise<void> {
        const payload: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text };
        if (opts?.parseMode) payload.parse_mode = opts.parseMode;
        const res = await apiCall(botToken, 'editMessageText', payload);
        if (!res.ok) {
                const err = await res.text();
                logWarn('editMessageText failed', {
                        chatId,
                        messageId,
                        status: res.status,
                        error: err.slice(0, 200),
                });
        }
}

export async function answerCallbackQuery(
        botToken: string,
        callbackQueryId: string,
        text?: string,
        showAlert?: boolean
): Promise<void> {
        const payload: Record<string, unknown> = { callback_query_id: callbackQueryId };
        if (text) payload.text = text;
        if (showAlert !== undefined) payload.show_alert = showAlert;
        const res = await apiCall(botToken, 'answerCallbackQuery', payload);
        if (!res.ok) {
                const err = await res.text();
                logWarn('answerCallbackQuery failed', { status: res.status, error: err.slice(0, 200) });
        }
}

/**
 * r117-F2: إرسال نص بسيط عبر apiCall المحصّنة (مهلة 10ث + ابتلاع أعطال
 * الشبكة) — كان معالج /start في الويبهوك يستخدم fetch خامًا بلا مهلة،
 * فتعليق تليجرام كان يعلّق استدعاء الويبهوك كله (حتى مهلة الدالة على
 * Vercel) بدل الفشل الصامت السريع. نفس عقد بقية صادرات هذا الملف:
 * لا ترمي أبدًا؛ الفشل يُسجَّل logWarn فقط.
 */
export async function sendPlainMessage(
        botToken: string,
        chatId: number | string,
        text: string,
        opts?: { parseMode?: 'Markdown' | 'HTML' }
): Promise<void> {
        const payload: Record<string, unknown> = {
                chat_id: normalizeChatId(chatId),
                text,
        };
        if (opts?.parseMode) payload.parse_mode = opts.parseMode;
        const res = await apiCall(botToken, 'sendMessage', payload);
        if (!res.ok) {
                const err = await res.text();
                logWarn('sendPlainMessage failed', { chatId, status: res.status, error: err.slice(0, 200) });
        }
}
