/**
 * Round89-D1 (w1-d1) — src/lib/telegram-broadcast.ts unit coverage (was 0%
 * lcov, 117 lines — the bulk notification fan-out used by order/subscription
 * events). Mocked prisma + config + logger; global fetch stubbed with
 * Response-like objects. The inter-chunk pacing is measured with fake
 * timers (no real sleeps).
 *
 * Behaviors read from the source:
 *   - gating: no/inactive telegramConfig, no bot token, no targets →
 *     {sent: 0, failed: []} without a single fetch
 *   - target gathering: active broadcast targets ALWAYS + linked users
 *     (telegramChatId not null) only for NON-admin broadcasts
 *   - sendToChat: numeric-string chat_id coercion, parse_mode passthrough,
 *     !ok → throw `Telegram API <status>: <text>`
 *   - round-77 batching: chunks of 10 sent sequentially with a 60ms delay
 *     ONLY when there is more than one chunk (Promise.allSettled per chunk)
 *   - failure collection: {chatId, reason} per failed target, reason falls
 *     back to 'Unknown' for non-Error rejections
 *   - stale-target pruning: deleteMany ONLY for hard chat-not-found class
 *     errors (chat not found / not accessible / bot was kicked) — best-effort
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockConfigFindFirst = vi.hoisted(() => vi.fn());
const mockTargetsFindMany = vi.hoisted(() => vi.fn());
const mockTargetsDeleteMany = vi.hoisted(() => vi.fn());
const mockUsersFindMany = vi.hoisted(() => vi.fn());
const mockBotToken = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());
const mockLogWarn = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        telegramConfig: { findFirst: mockConfigFindFirst },
        telegramBroadcastTarget: { findMany: mockTargetsFindMany, deleteMany: mockTargetsDeleteMany },
        user: { findMany: mockUsersFindMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/config', () => ({ getDecryptedBotToken: mockBotToken }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: mockLogWarn,
        info: vi.fn(),
        debug: vi.fn(),
}));

function okResponse(): { ok: boolean; json: () => Promise<unknown>; text: () => Promise<string> } {
        return { ok: true, json: async () => ({}), text: async () => '' };
}

function failResponse(status: number, text: string): { ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> } {
        return { ok: false, status, json: async () => ({}), text: async () => text };
}

function sentBodies(): Record<string, unknown>[] {
        return (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([, init]) =>
                JSON.parse(String(init.body))
        );
}

beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockResolvedValue(okResponse());
        mockConfigFindFirst.mockResolvedValue({ id: 1, isActive: true });
        mockBotToken.mockResolvedValue('111:ABC');
        mockTargetsFindMany.mockResolvedValue([]); // no broadcast targets by default
        mockUsersFindMany.mockResolvedValue([]); // no linked users by default
        mockTargetsDeleteMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
});

// ── Gating — no fetch under disabled conditions ─────────────────────────

describe('broadcastToAll — gating (zero sends)', () => {
        it('no telegramConfig row → {sent: 0, failed: []} without fetching', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockConfigFindFirst.mockResolvedValue(null);

                const result = await broadcastToAll('مرحبا');

                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
        });

        it('config inactive → {sent: 0, failed: []} without fetching', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockConfigFindFirst.mockResolvedValue({ id: 1, isActive: false });

                const result = await broadcastToAll('مرحبا');

                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
        });

        it('no bot token → {sent: 0, failed: []} without fetching', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockBotToken.mockResolvedValue(null);

                const result = await broadcastToAll('مرحبا');

                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
        });

        it('no targets at all (no broadcast targets, no linked users) → {sent: 0, failed: []}', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');

                const result = await broadcastToAll('مرحبا');

                expect(result).toEqual({ sent: 0, failed: [] });
                expect(fetchMock).not.toHaveBeenCalled();
        });
});

// ── Target gathering & payload shape ────────────────────────────────────

describe('broadcastToAll — target gathering & sendToChat payload', () => {
        it('non-admin broadcast reaches broadcast targets AND linked users', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }, { chatId: '200' }]);
                mockUsersFindMany.mockResolvedValue([{ telegramChatId: '300' }]);

                const result = await broadcastToAll('طلب جديد', { parseMode: 'Markdown' });

                expect(result).toEqual({ sent: 3, failed: [] });
                const bodies = sentBodies();
                expect(bodies.map((b) => b.chat_id)).toEqual([100, 200, 300]);
                for (const b of bodies) {
                        expect(b.text).toBe('طلب جديد');
                        expect(b.parse_mode).toBe('Markdown');
                }
                // every send goes through the bot API with a JSON POST
                for (const [url, init] of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
                        expect(url).toBe('https://api.telegram.org/bot111:ABC/sendMessage');
                        expect(init.method).toBe('POST');
                }
        });

        it('adminOnly broadcast: linked users EXCLUDED (no user query at all)', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
                mockUsersFindMany.mockResolvedValue([{ telegramChatId: '300' }]);

                const result = await broadcastToAll('تحذير أدمن', { adminOnly: true });

                expect(result).toEqual({ sent: 1, failed: [] });
                expect(mockUsersFindMany).not.toHaveBeenCalled();
                expect(sentBodies().map((b) => b.chat_id)).toEqual([100]);
        });

        it('numeric-string chat ids coerce to numbers; non-numeric stay strings', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '12345' }, { chatId: '@my_channel' }]);

                await broadcastToAll('hi');

                expect(sentBodies().map((b) => b.chat_id)).toEqual([12345, '@my_channel']);
        });
});

// ── Round-77 batching: chunks of 10 with inter-chunk pacing ─────────────

describe('broadcastToAll — chunk batching & pacing', () => {
        it('25 targets → 3 chunks (10/10/5), all delivered, a 60ms delay after each chunk (fake timers)', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                vi.useFakeTimers();
                const delaySpy = vi.spyOn(globalThis, 'setTimeout');
                mockTargetsFindMany.mockResolvedValue(
                        Array.from({ length: 25 }, (_, i) => ({ chatId: String(1000 + i) }))
                );

                const pending = broadcastToAll('إعلان');
                await vi.runAllTimersAsync();
                const result = await pending;

                expect(result).toEqual({ sent: 25, failed: [] });
                expect(fetchMock).toHaveBeenCalledTimes(25);
                // 3 chunks → the 60ms delay runs after EVERY chunk while
                // chunks.length > 1 — including a trailing one after the last
                // (documented behavior, see worklog observation)
                const interChunkDelays = delaySpy.mock.calls.filter((c) => c[1] === 60);
                expect(interChunkDelays).toHaveLength(3);

                delaySpy.mockRestore();
        });

        it('≤10 targets → a single chunk, no inter-chunk delay at all', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                vi.useFakeTimers();
                const delaySpy = vi.spyOn(globalThis, 'setTimeout');
                mockTargetsFindMany.mockResolvedValue(
                        Array.from({ length: 10 }, (_, i) => ({ chatId: String(1000 + i) }))
                );

                const pending = broadcastToAll('إعلان');
                await vi.runAllTimersAsync();
                const result = await pending;

                expect(result).toEqual({ sent: 10, failed: [] });
                expect(delaySpy.mock.calls.filter((c) => c[1] === 60)).toHaveLength(0);

                delaySpy.mockRestore();
        });
});

// ── Failure collection & stale-target pruning ───────────────────────────

describe('broadcastToAll — failure collection & pruning', () => {
        it('one failed target → collected with the Telegram API reason, others still counted as sent', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }, { chatId: '200' }]);
                fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
                        const body = JSON.parse(String(init.body)) as { chat_id: number };
                        if (body.chat_id === 200) return failResponse(429, 'Too Many Requests');
                        return okResponse();
                });

                const result = await broadcastToAll('مرحبا');

                expect(result).toEqual({
                        sent: 1,
                        failed: [{ chatId: '200', reason: 'Telegram 429 flood: Too Many Requests' }],
                });
                expect(mockLogError).toHaveBeenCalledWith(
                        '[Telegram Broadcast] Failed:',
                        expect.objectContaining({ chatId: '200' })
                );
                // a rate-limit failure is NOT a stale target — no pruning
                expect(mockTargetsDeleteMany).not.toHaveBeenCalled();
        });

        it('stale target (chat not found) → pruned via deleteMany', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
                fetchMock.mockResolvedValue(failResponse(400, 'Bad Request: chat not found'));

                const result = await broadcastToAll('مرحبا');

                expect(result.sent).toBe(0);
                expect(mockTargetsDeleteMany).toHaveBeenCalledWith({ where: { chatId: '100' } });
                expect(mockLogWarn).toHaveBeenCalledWith(
                        '[Telegram Broadcast] Pruned stale target:',
                        expect.objectContaining({ chatId: '100' })
                );
        });

        it('bot-was-kicked failures also prune; unrelated 500s do NOT', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');

                // kicked → prune
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
                fetchMock.mockResolvedValue(failResponse(400, 'Bad Request: bot was kicked'));
                await broadcastToAll('مرحبا');
                expect(mockTargetsDeleteMany).toHaveBeenCalledTimes(1);

                // generic server error → NOT pruned
                mockTargetsDeleteMany.mockClear();
                fetchMock.mockResolvedValue(failResponse(500, 'Internal Server Error'));
                await broadcastToAll('مرحبا');
                expect(mockTargetsDeleteMany).not.toHaveBeenCalled();
        });

        it('prune itself failing is best-effort — the failure is still collected, nothing throws', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
                fetchMock.mockResolvedValue(failResponse(400, 'chat not found'));
                mockTargetsDeleteMany.mockRejectedValue(new Error('db gone'));

                const result = await broadcastToAll('مرحبا');

                expect(result).toEqual({
                        sent: 0,
                        failed: [{ chatId: '100', reason: 'Telegram API 400: chat not found' }],
                });
        });

        it('r118-A1-F1: transport failure → STRUCTURED synthetic 599 (never a raw rejection)', async () => {
                const { broadcastToAll } = await import('@/lib/telegram-broadcast');
                mockTargetsFindMany.mockResolvedValue([{ chatId: '100' }]);
                // fetch itself rejects with a plain string (network layer) — the
                // hardened apiCall converts every transport failure into a
                // synthetic non-ok Response instead of letting the raw rejection
                // escape, so the collected reason is always structured.
                fetchMock.mockRejectedValue('boom');

                const result = await broadcastToAll('مرحبا');

                expect(result.sent).toBe(0);
                expect(result.failed).toHaveLength(1);
                expect(result.failed[0].chatId).toBe('100');
                expect(result.failed[0].reason).toContain('Telegram API 599');
                expect(result.failed[0].reason).toContain('transport_failure');
        });
});
