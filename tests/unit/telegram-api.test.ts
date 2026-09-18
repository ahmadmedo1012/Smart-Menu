/**
 * Round89-D1 (w1-d1) — src/lib/telegram-api.ts unit coverage (was 0% lcov,
 * 119 lines — the lowest-level money notification transport). Global fetch
 * is stubbed with Response-like objects; the logger is mocked; the 10s
 * timeout path uses fake timers + a signal-aware fetch mock.
 *
 * Behaviors read from the source:
 *   - apiCall: POST to https://api.telegram.org/bot<token>/<method> with a
 *     JSON body, driven through a REAL AbortController that fires at 10s
 *   - numeric-string chat ids are coerced to numbers; non-numeric kept
 *   - sendMessageWithKeyboard: inline_keyboard mapping, parse_mode, success
 *     → parsed message; !ok → null + warn (error text sliced to 300)
 *   - editMessageReplyMarkup / editMessageText / answerCallbackQuery: payload
 *     shape (including the keyboard-removal empty inline_keyboard), warn on
 *     !ok — never throw
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockWarn = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({
        warn: mockWarn,
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

const fetchMock = vi.hoisted(() => vi.fn());

type FetchBody = Record<string, unknown>;

function okResponse(json: unknown): { ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> } {
        return { ok: true, json: async () => json, text: async () => '' };
}

function failResponse(status: number, text: string): { ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> } {
        return { ok: false, status, json: async () => ({}), text: async () => text };
}

function lastFetchArgs(): [string, RequestInit] {
        const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
        return calls[calls.length - 1];
}

function lastFetchBody(): FetchBody {
        const [, init] = lastFetchArgs();
        return JSON.parse(String(init.body)) as FetchBody;
}

const BUTTONS = [[{ text: '🟢 موافقة', callbackData: 'sub_app:501' }]] as {
        text: string;
        callbackData: string;
}[][];

beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockResolvedValue(okResponse({ message_id: 77, chat: { id: 123 } }));
});

afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
});

// ── sendMessageWithKeyboard ─────────────────────────────────────────────

describe('sendMessageWithKeyboard', () => {
        it('success: POSTs the payload and returns the parsed message', async () => {
                const { sendMessageWithKeyboard } = await import('@/lib/telegram-api');

                const result = await sendMessageWithKeyboard('111:ABC', 123, 'طلب ترقية #501', BUTTONS, {
                        parseMode: 'Markdown',
                });

                expect(result).toEqual({ message_id: 77, chat: { id: 123 } });
                const [url, init] = lastFetchArgs();
                expect(url).toBe('https://api.telegram.org/bot111:ABC/sendMessage');
                expect(init.method).toBe('POST');
                expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
                expect(lastFetchBody()).toEqual({
                        chat_id: 123,
                        text: 'طلب ترقية #501',
                        reply_markup: {
                                inline_keyboard: [[{ text: '🟢 موافقة', callback_data: 'sub_app:501' }]],
                        },
                        parse_mode: 'Markdown',
                });
        });

        it('parse_mode omitted when no opts → payload has no parse_mode key', async () => {
                const { sendMessageWithKeyboard } = await import('@/lib/telegram-api');

                await sendMessageWithKeyboard('111:ABC', 123, 'hi', BUTTONS);

                expect(lastFetchBody()).not.toHaveProperty('parse_mode');
        });

        it('numeric-string chat ids are coerced to numbers; non-numeric ids stay strings', async () => {
                const { sendMessageWithKeyboard } = await import('@/lib/telegram-api');

                await sendMessageWithKeyboard('111:ABC', '12345', 'a', BUTTONS);
                expect(lastFetchBody().chat_id).toBe(12345);

                await sendMessageWithKeyboard('111:ABC', '@my_channel', 'b', BUTTONS);
                expect(lastFetchBody().chat_id).toBe('@my_channel');
        });

        it('HTTP failure → null (never throws) + warn with status and the 300-char sliced error', async () => {
                const { sendMessageWithKeyboard } = await import('@/lib/telegram-api');
                const longError = 'x'.repeat(500);
                fetchMock.mockResolvedValue(failResponse(400, longError));

                const result = await sendMessageWithKeyboard('111:ABC', 123, 'hi', BUTTONS);

                expect(result).toBeNull();
                expect(mockWarn).toHaveBeenCalledWith('sendMessage failed', {
                        chatId: 123,
                        status: 400,
                        error: 'x'.repeat(300), // sliced
                });
        });

        it('r116: network rejection is SWALLOWED — caller gets null + a warn (no thrown rejection can skip answerCallbackQuery anymore)', async () => {
                // كان العقد القديم «الرفض يتسرب للمنادِ» — أي تعديل بطيء/فاشل في
                // الويبهوك كان يقفز فوق answerCallbackQuery فيرى المشرف سبينرًا
                // ميتًا فيضغط ثانية ويصطدم بـ«تمت معالجة هذا الطلب مسبقاً».
                const { sendMessageWithKeyboard } = await import('@/lib/telegram-api');
                fetchMock.mockRejectedValue(new Error('ECONNRESET'));

                await expect(sendMessageWithKeyboard('111:ABC', 123, 'hi', BUTTONS)).resolves.toBeNull();
                expect(mockWarn).toHaveBeenCalledWith(
                        'telegram apiCall transport failure',
                        expect.objectContaining({ method: 'sendMessage', error: 'ECONNRESET' })
                );
        });

        it('r116: 10s timeout aborts the in-flight fetch → resolves null (synthetic non-ok), never rejects (fake timers, no real sleep)', async () => {
                const { sendMessageWithKeyboard } = await import('@/lib/telegram-api');
                vi.useFakeTimers();

                let capturedSignal: AbortSignal | undefined;
                fetchMock.mockImplementation(
                        (_url: string, init: RequestInit) =>
                                new Promise((_resolve, reject) => {
                                        const signal = init.signal ?? undefined;
                                        capturedSignal = signal;
                                        signal?.addEventListener('abort', () =>
                                                reject(new Error('The operation was aborted'))
                                        );
                                })
                );

                const pending = sendMessageWithKeyboard('111:ABC', 123, 'hi', BUTTONS);
                const expectNull = expect(pending).resolves.toBeNull();

                await vi.advanceTimersByTimeAsync(10_000);

                await expectNull;
                expect(capturedSignal?.aborted).toBe(true);
                expect(mockWarn).toHaveBeenCalledWith(
                        'telegram apiCall transport failure',
                        expect.objectContaining({ method: 'sendMessage' })
                );
        });
});

// ── editMessageReplyMarkup ──────────────────────────────────────────────

describe('editMessageReplyMarkup', () => {
        it('success: sends the keyboard-REMOVAL payload (empty inline_keyboard)', async () => {
                const { editMessageReplyMarkup } = await import('@/lib/telegram-api');

                await editMessageReplyMarkup('111:ABC', 123, 77);

                const [url] = lastFetchArgs();
                expect(url).toBe('https://api.telegram.org/bot111:ABC/editMessageReplyMarkup');
                expect(lastFetchBody()).toEqual({
                        chat_id: 123,
                        message_id: 77,
                        reply_markup: { inline_keyboard: [] },
                });
                expect(mockWarn).not.toHaveBeenCalled();
        });

        it('failure: warns (messageId + status) and resolves without throwing', async () => {
                const { editMessageReplyMarkup } = await import('@/lib/telegram-api');
                fetchMock.mockResolvedValue(failResponse(400, 'message to edit not found'));

                await expect(editMessageReplyMarkup('111:ABC', 123, 77)).resolves.toBeUndefined();

                expect(mockWarn).toHaveBeenCalledWith('editMessageReplyMarkup failed', {
                        chatId: 123,
                        messageId: 77,
                        status: 400,
                        error: 'message to edit not found',
                });
        });
});

// ── editMessageText ─────────────────────────────────────────────────────

describe('editMessageText', () => {
        it('success: payload carries text + parse_mode when provided', async () => {
                const { editMessageText } = await import('@/lib/telegram-api');

                await editMessageText('111:ABC', 123, 77, 'تمت الموافقة ✅', { parseMode: 'HTML' });

                const [url] = lastFetchArgs();
                expect(url).toBe('https://api.telegram.org/bot111:ABC/editMessageText');
                expect(lastFetchBody()).toEqual({
                        chat_id: 123,
                        message_id: 77,
                        text: 'تمت الموافقة ✅',
                        parse_mode: 'HTML',
                });
        });

        it('parse_mode omitted without opts', async () => {
                const { editMessageText } = await import('@/lib/telegram-api');

                await editMessageText('111:ABC', 123, 77, 'تم');

                expect(lastFetchBody()).not.toHaveProperty('parse_mode');
        });

        it('failure: warns and never throws', async () => {
                const { editMessageText } = await import('@/lib/telegram-api');
                fetchMock.mockResolvedValue(failResponse(400, 'message is not modified'));

                await expect(editMessageText('111:ABC', 123, 77, 'text')).resolves.toBeUndefined();
                expect(mockWarn).toHaveBeenCalledWith(
                        'editMessageText failed',
                        expect.objectContaining({ status: 400 })
                );
        });
});

// ── answerCallbackQuery ─────────────────────────────────────────────────

describe('answerCallbackQuery', () => {
        it('success: text and show_alert included when provided', async () => {
                const { answerCallbackQuery } = await import('@/lib/telegram-api');

                await answerCallbackQuery('111:ABC', 'cbq-1', 'تم الرفض', true);

                const [url] = lastFetchArgs();
                expect(url).toBe('https://api.telegram.org/bot111:ABC/answerCallbackQuery');
                expect(lastFetchBody()).toEqual({
                        callback_query_id: 'cbq-1',
                        text: 'تم الرفض',
                        show_alert: true,
                });
        });

        it('minimal call: only callback_query_id', async () => {
                const { answerCallbackQuery } = await import('@/lib/telegram-api');

                await answerCallbackQuery('111:ABC', 'cbq-2');

                expect(lastFetchBody()).toEqual({ callback_query_id: 'cbq-2' });
        });

        it('failure: warns with status, never throws', async () => {
                const { answerCallbackQuery } = await import('@/lib/telegram-api');
                fetchMock.mockResolvedValue(failResponse(429, 'Too Many Requests'));

                await expect(answerCallbackQuery('111:ABC', 'cbq-3')).resolves.toBeUndefined();
                expect(mockWarn).toHaveBeenCalledWith(
                        'answerCallbackQuery failed',
                        expect.objectContaining({ status: 429 })
                );
        });
});
