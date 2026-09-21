/**
 * round92-3-b — POST /api/telegram/webhook gate coverage (was 0% lcov on
 * the ROUTE itself, lines 22-294 — the largest single gap in the round-92
 * quality report; only the pure helpers in lib/telegram-callback had a
 * suite, the gate/handler never did).
 *
 * Standard pattern (orders-create/upload-route): vi.hoisted + vi.mock for
 * db / rate-limit / telegram-api / subscription-decisions / config /
 * logger. What stays REAL and therefore under test:
 *   - the signature gate (crypto timingSafeEqualStrings via lib/secure-compare)
 *   - the callback-data parsing/decision map (lib/telegram-callback)
 *   - the admin allowlist resolution (lib/telegram-admin: env ∪ DB approvers)
 *   - the HMAC link-token verification (lib/keys getHmacKey — same HKDF
 *     derivation the test re-runs to build VALID tokens)
 *   - the route's own gate ordering: secret → signature → rate → content-type
 *
 * Truth documented from the code (not assumed):
 *   - a bad/missing signature is a REAL 403 'Forbidden' (fail-closed, plain
 *     text — same opaque answer when the secret is not configured at all,
 *     so the endpoint leaks no configuration state) — NOT a fake 200.
 *   - unsupported updates, non-JSON setWebhook probes and processing
 *     errors in the message path DO return 200 'OK' (Telegram must not
 *     retry those).
 *   - round92-wave3-1: the callback_query path is dispatched with
 *     `return await handleCallbackQuery()` INSIDE the try — a rejection
 *     there is now caught by the same catch-all 200 net as the message
 *     path (was a documented gap: bare `return` leaked the rejection).
 *   - round92-wave3-6: the rejection decision text carries ❌ (not the
 *     hardcoded ✅) — matches the ❌ toast.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { getHmacKey } from '@/lib/keys';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockRateCheck = vi.hoisted(() => vi.fn());
const mockGetBotToken = vi.hoisted(() => vi.fn());
const mockResolveSubscriptionPayment = vi.hoisted(() => vi.fn());
const mockEditReplyMarkup = vi.hoisted(() => vi.fn());
const mockEditText = vi.hoisted(() => vi.fn());
const mockAnswerCq = vi.hoisted(() => vi.fn());
const mockSendPlainMessage = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());
const mockLogWarn = vi.hoisted(() => vi.fn());
const mockLogInfo = vi.hoisted(() => vi.fn());
const mockApproverFindMany = vi.hoisted(() => vi.fn());
const mockRateLimitEntryCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockPaymentFindUnique = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        telegramApprover: { findMany: mockApproverFindMany },
        rateLimitEntry: { create: mockRateLimitEntryCreate },
        user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
        subscriptionPayment: { findUnique: mockPaymentFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// the route builds its limiter at module scope (120/30s) — controllable check
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

vi.mock('@/lib/config', () => ({ getDecryptedBotToken: mockGetBotToken }));
vi.mock('@/lib/subscription-decisions', () => ({
        resolveSubscriptionPayment: mockResolveSubscriptionPayment,
        // r118-A2-P2: حارس الموافقة الذاتية في الويبهوك — الافتراضي: ليس الدافع.
        isPaymentSelfApproval: vi.fn(async () => false),
}));
vi.mock('@/lib/telegram-api', () => ({
        editMessageReplyMarkup: mockEditReplyMarkup,
        editMessageText: mockEditText,
        answerCallbackQuery: mockAnswerCq,
        // r117-F2: /start يرسل الآن عبر sendPlainMessage المحصّنة بدل fetch الخام
        sendPlainMessage: mockSendPlainMessage,
        sendMessageWithKeyboard: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: mockLogWarn,
        info: mockLogInfo,
        debug: vi.fn(),
}));

// lib/telegram-admin, lib/telegram-callback, lib/secure-compare, lib/keys
// and lib/client-ip stay REAL — their behavior is part of what is pinned.

const webhookRoute = await import('@/app/api/telegram/webhook/route');

// ── Fixtures & helpers ──────────────────────────────────────────────────

const SECRET = 'r92-webhook-secret';
const TEST_AUTH_SECRET = 'r92-auth-secret-0123456789abcdef012345';
const BOT_TOKEN = 'r92-bot-token:AAAA';
const ADMIN_ID = 424242;

function makeRequest(
        body: unknown,
        headers: Record<string, string> = {},
        withSignature = true,
): NextRequest {
        return new NextRequest('http://localhost/api/telegram/webhook', {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        ...(withSignature ? { 'x-telegram-bot-api-secret-token': SECRET } : {}),
                        ...headers,
                },
                body: typeof body === 'string' ? body : JSON.stringify(body),
        });
}

/** Open the gate for this request (env is read per-request, never at import). */
async function post(update: unknown, headers: Record<string, string> = {}) {
        vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SECRET);
        return webhookRoute.POST(makeRequest(update, headers, true));
}

function callbackUpdate(over: {
        fromId?: number;
        data?: string;
        chatId?: number;
        messageId?: number;
} = {}) {
        return {
                callback_query: {
                        id: 'cq-1',
                        from: { id: over.fromId ?? ADMIN_ID },
                        message: { chat: { id: over.chatId ?? 100 }, message_id: over.messageId ?? 10 },
                        data: over.data ?? 'sub_app:55',
                },
        };
}

/** Build a /start verify_ token with the SAME HKDF key derivation the route uses. */
function hmacKeyBuffer(): Buffer {
        return Buffer.from(getHmacKey());
}

function buildLinkToken(
        userId: number,
        exp: number,
        opts: { sig?: 'valid' | 'wrong' } = {},
): string {
        const payload = JSON.stringify({ userId, exp });
        const sig =
                opts.sig === 'wrong'
                        ? '0'.repeat(64)
                        : createHmac('sha256', hmacKeyBuffer()).update(payload).digest('hex');
        return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

const expectedLinkTokenHash = (token: string) =>
        createHmac('sha256', hmacKeyBuffer()).update(token).digest('hex');

beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        // deterministic trust model for the real getClientIp: non-Vercel, depth 1
        delete process.env.VERCEL;
        delete process.env.TRUST_PROXY_DEPTH;
        // the gate is CLOSED by default — each test opens it explicitly via post()
        // or stubs the secret itself
        delete process.env.TELEGRAM_WEBHOOK_SECRET;
        delete process.env.TELEGRAM_ADMIN_IDS;
        vi.stubEnv('AUTH_SECRET', TEST_AUTH_SECRET);

        mockRateCheck.mockResolvedValue({ success: true, remaining: 119, reset: 0 });
        mockGetBotToken.mockResolvedValue(BOT_TOKEN);
        mockResolveSubscriptionPayment.mockResolvedValue({ ok: true });
        mockApproverFindMany.mockResolvedValue([]);
        mockUserFindUnique.mockResolvedValue({ id: 77, username: 'linkuser' });
        mockUserUpdate.mockResolvedValue({});
        mockRateLimitEntryCreate.mockResolvedValue({});
        mockPaymentFindUnique.mockResolvedValue(null);
        mockEditReplyMarkup.mockResolvedValue(undefined);
        mockEditText.mockResolvedValue(undefined);
        mockAnswerCq.mockResolvedValue(undefined);
        mockSendPlainMessage.mockResolvedValue(undefined);
        mockFetch.mockResolvedValue({ ok: true } as unknown as Response);
        vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        delete process.env.VERCEL;
        delete process.env.TRUST_PROXY_DEPTH;
});

// ── Gate 0: shared-secret signature (fail-closed) ───────────────────────

describe('POST /api/telegram/webhook — Gate 0: signature (fail-closed)', () => {
        it('TELEGRAM_WEBHOOK_SECRET not configured → 403 «Forbidden» (plain text) — same opaque answer as a bad token, no configuration oracle', async () => {
                // env stays deleted (beforeEach) — an attacker must not learn whether
                // the endpoint is configured through a distinct status
                const res = await webhookRoute.POST(makeRequest({}, {}, true));

                expect(res.status).toBe(403);
                expect(await res.text()).toBe('Forbidden');
                expect(mockLogWarn).toHaveBeenCalledWith(
                        '[webhook] TELEGRAM_WEBHOOK_SECRET not set — rejecting fail-closed',
                );
        });

        it('secret configured + missing signature header → 403 «Forbidden»', async () => {
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SECRET);

                const res = await webhookRoute.POST(makeRequest({ update_id: 1 }, {}, false));

                expect(res.status).toBe(403);
                expect(await res.text()).toBe('Forbidden');
        });

        it('secret configured + WRONG token → 403 (timing-safe comparison, no 5xx)', async () => {
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SECRET);

                const res = await webhookRoute.POST(
                        makeRequest({ update_id: 1 }, { 'x-telegram-bot-api-secret-token': 'wrong-secret' }),
                );

                expect(res.status).toBe(403);
        });

        it('length-mismatched token short-circuits to the same 403 (never throws)', async () => {
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SECRET);

                const res = await webhookRoute.POST(
                        makeRequest({}, { 'x-telegram-bot-api-secret-token': 'short' }),
                );

                expect(res.status).toBe(403);
        });

        it('whitespace-only secret env trims to empty → treated as not configured → 403 fail-closed', async () => {
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', '   ');

                const res = await webhookRoute.POST(makeRequest({}, {}, true));

                expect(res.status).toBe(403);
                expect(mockLogWarn).toHaveBeenCalledWith(
                        '[webhook] TELEGRAM_WEBHOOK_SECRET not set — rejecting fail-closed',
                );
        });

        it('a secret stored with surrounding whitespace matches its TRIMMED value (route trims env, not the header)', async () => {
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', `  ${SECRET}  `);

                // header carries the trimmed value → passes Gate 0, reaches the
                // content-type ack (text/plain) → 200
                const res = await webhookRoute.POST(
                        makeRequest('probe', { 'Content-Type': 'text/plain' }, true),
                );

                expect(res.status).toBe(200);
        });

        it('bad-secret probes never burn the rate-limit budget — the limiter runs only AFTER verification', async () => {
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SECRET);

                await webhookRoute.POST(
                        makeRequest({}, { 'x-telegram-bot-api-secret-token': 'wrong-secret' }),
                );

                expect(mockRateCheck).not.toHaveBeenCalled();
        });
});

// ── Gate 1: rate limit (verified traffic only) ──────────────────────────

describe('POST /api/telegram/webhook — Gate 1: rate limit (verified traffic only)', () => {
        it('valid signature + limiter rejects → 429 «Too Many Requests» (plain text), nothing processed', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await post({ update_id: 1 }, { 'x-real-ip': '9.9.9.9' });

                expect(res.status).toBe(429);
                expect(await res.text()).toBe('Too Many Requests');
                expect(mockApproverFindMany).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('bucket key derives from x-real-ip → webhook:<ip>', async () => {
                await post({ update_id: 1 }, { 'x-real-ip': '9.9.9.9' });

                expect(mockRateCheck).toHaveBeenCalledWith('webhook:9.9.9.9');
        });

        it('no IP headers → bucket key "webhook:unknown"', async () => {
                await post({ update_id: 1 });

                expect(mockRateCheck).toHaveBeenCalledWith('webhook:unknown');
        });
});

// ── Gate 2: content-type ack + unsupported updates ──────────────────────

describe('POST /api/telegram/webhook — content-type ack & unsupported updates', () => {
        it('non-JSON content type (Telegram setWebhook URL-check probe) → 200 «OK», body never parsed, but rate budget IS burned (verified traffic)', async () => {
                const res = await post('probe', { 'Content-Type': 'text/plain' });

                expect(res.status).toBe(200);
                expect(await res.text()).toBe('OK');
                expect(mockRateCheck).toHaveBeenCalledTimes(1);
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockFetch).not.toHaveBeenCalled();
        });

        it('JSON update with no message and no callback → 200 «OK», zero side effects', async () => {
                const res = await post({ update_id: 4242 });

                expect(res.status).toBe(200);
                expect(mockFetch).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockAnswerCq).not.toHaveBeenCalled();
        });

        it('plain message is only logged (logInfo) — no fetch, no writes', async () => {
                const res = await post({
                        message: { text: 'hello there', chat: { id: 77, username: 'joe', type: 'private' } },
                });

                expect(res.status).toBe(200);
                expect(mockLogInfo).toHaveBeenCalledWith('[webhook] msg', {
                        chatId: 77,
                        chatType: 'private',
                        username: 'joe',
                });
                expect(mockFetch).not.toHaveBeenCalled();
        });
});

// ── /start: tell the user their Telegram ID ─────────────────────────────

describe('POST /api/telegram/webhook — /start (ID echo)', () => {
        it('plain /start with chatId + bot token → one sendPlainMessage carrying the chat id (Markdown, r117-F2 hardened path)', async () => {
                const res = await post({ message: { text: '/start', chat: { id: 77 } } });

                expect(res.status).toBe(200);
                // r117-F2: الإرسال عبر telegram-api المحصّنة (مهلة + لا رمي) —
                // كان fetch خامًا بلا مهلة؛ الاختبار يتحقق من المسار الجديد.
                expect(mockSendPlainMessage).toHaveBeenCalledTimes(1);
                expect(mockFetch).not.toHaveBeenCalled();
                const [token, chatId, text, opts] = mockSendPlainMessage.mock.calls[0] as [
                        string, number, string, { parseMode?: string } | undefined,
                ];
                expect(token).toBe(BOT_TOKEN);
                expect(chatId).toBe(77);
                expect(opts?.parseMode).toBe('Markdown');
                expect(text).toContain('77'); // the echoed Telegram ID
                expect(text).toContain('معرف التليجرام الخاص بك');
        });

        it('/start with NO bot token → 200, no fetch (fail-safe, not a crash)', async () => {
                mockGetBotToken.mockResolvedValue(null);

                const res = await post({ message: { text: '/start', chat: { id: 77 } } });

                expect(res.status).toBe(200);
                expect(mockFetch).not.toHaveBeenCalled();
        });

        it('/start without a chatId → 200, no fetch', async () => {
                const res = await post({ message: { text: '/start' } });

                expect(res.status).toBe(200);
                expect(mockFetch).not.toHaveBeenCalled();
        });
});

// ── /start verify_<token>: account linking (HMAC + anti-replay) ─────────

describe('POST /api/telegram/webhook — /start verify_ account linking', () => {
        it('valid signed fresh token → user linked (chatId, username, linkedAt), anti-replay row written, confirmation sent', async () => {
                const exp = Math.floor(Date.now() / 1000) + 3600;
                const token = buildLinkToken(77, exp);

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77, username: 'joe' } },
                });

                expect(res.status).toBe(200);

                // anti-replay: a link-token row keyed by the HMAC of the raw token
                expect(mockRateLimitEntryCreate).toHaveBeenCalledWith({
                        data: {
                                key: `link-token:${expectedLinkTokenHash(token)}`,
                                windowEnd: new Date(exp * 1000),
                        },
                });

                expect(mockUserUpdate).toHaveBeenCalledWith({
                        where: { id: 77 },
                        data: {
                                telegramChatId: '77',
                                telegramUsername: 'joe',
                                telegramLinkedAt: expect.any(Date),
                        },
                });

                // confirmation message to the user
                // r118-A1-F1: the verify_ confirmation now flows through the
                // hardened sendPlainMessage (10s bound, never throws) instead of
                // the raw fetch this test used to observe.
                expect(mockSendPlainMessage).toHaveBeenCalledTimes(1);
                const [tokenArg, chatIdArg, textArg] = mockSendPlainMessage.mock.calls[0] as [string, string, string];
                expect(tokenArg).toBe(BOT_TOKEN);
                expect(chatIdArg).toBe(77);
                expect(textArg).toBe('تم ربط حسابك بنجاح ✅');
        });

        it('replayed token (unique constraint on the anti-replay row) → 200, NO user lookup, NO update', async () => {
                const token = buildLinkToken(77, Math.floor(Date.now() / 1000) + 3600);
                mockRateLimitEntryCreate.mockRejectedValue(new Error('Unique constraint failed'));

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77, username: 'joe' } },
                });

                expect(res.status).toBe(200);
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('token with a WRONG HMAC signature → silently ignored: 200, zero writes, zero fetches', async () => {
                const token = buildLinkToken(77, Math.floor(Date.now() / 1000) + 3600, { sig: 'wrong' });

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockFetch).not.toHaveBeenCalled();
        });

        it('expired token (exp in the past) → 200, zero writes', async () => {
                const token = buildLinkToken(77, Math.floor(Date.now() / 1000) - 1000);

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('decoded payload without a «.» separator → 200, zero writes', async () => {
                const token = Buffer.from('no-dot-here').toString('base64url');

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('signed token for a userId that no longer exists → 200, no update, no confirmation', async () => {
                mockUserFindUnique.mockResolvedValue(null);
                const token = buildLinkToken(99999, Math.floor(Date.now() / 1000) + 3600);

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockFetch).not.toHaveBeenCalled();
        });

        it('no chatId on a verify_ message → 200 before any token work', async () => {
                const token = buildLinkToken(77, Math.floor(Date.now() / 1000) + 3600);

                const res = await post({ message: { text: `/start verify_${token}` } });

                expect(res.status).toBe(200);
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
        });

        it('HMAC-valid but NON-JSON payload → 200, zero writes (the JSON.parse catch)', async () => {
                // attacker case: a correctly-signed token whose payload is garbage —
                // the signature check passes, the payload parse fails, silently ignored
                const payload = 'not-json-at-all';
                const sig = createHmac('sha256', hmacKeyBuffer()).update(payload).digest('hex');
                const token = Buffer.from(`${payload}.${sig}`).toString('base64url');

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).not.toHaveBeenCalled();
                expect(mockFetch).not.toHaveBeenCalled();
        });

        it('signed payload WITHOUT a userId → 200, zero writes (the !data.userId branch)', async () => {
                const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 });
                const sig = createHmac('sha256', hmacKeyBuffer()).update(payload).digest('hex');
                const token = Buffer.from(`${payload}.${sig}`).toString('base64url');

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockRateLimitEntryCreate).not.toHaveBeenCalled();
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('no master secret usable (AUTH_SECRET/JWT_SECRET both empty) → getHmacKey throws → 200, zero writes', async () => {
                // getMasterSecret resolves to '' → falsy → throws — the catch turns
                // it into the same silent 200 as every other invalid link token
                vi.stubEnv('AUTH_SECRET', '');
                vi.stubEnv('JWT_SECRET', '');
                const token = Buffer.from('x.y').toString('base64url');

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).not.toHaveBeenCalled();
        });

        it('link succeeds even with NO bot token — the user row is updated, only the confirmation fetch is skipped', async () => {
                mockGetBotToken.mockResolvedValue(null);
                const token = buildLinkToken(77, Math.floor(Date.now() / 1000) + 3600);

                const res = await post({
                        message: { text: `/start verify_${token}`, chat: { id: 77 } },
                });

                expect(res.status).toBe(200);
                expect(mockUserUpdate).toHaveBeenCalledTimes(1); // the link itself is not Telegram-dependent
                expect(mockFetch).not.toHaveBeenCalled(); // only the confirmation message is skipped
        });
});

describe('POST /api/telegram/webhook — callback_query: token & allowlist gates', () => {
        it('no bot token configured → 200 with the error logged, NOTHING answered to the user (fail-safe)', async () => {
                mockGetBotToken.mockResolvedValue(null);

                const res = await post(callbackUpdate());

                expect(res.status).toBe(200);
                expect(mockLogError).toHaveBeenCalledWith('[webhook] no bot token configured');
                expect(mockAnswerCq).not.toHaveBeenCalled();
                expect(mockResolveSubscriptionPayment).not.toHaveBeenCalled();
        });

        it('from.id NOT in the allowlist → alert «عذراً، لا تمتلك الصلاحية لتنفيذ هذا الإجراء.», decision NEVER processed', async () => {
                vi.stubEnv('TELEGRAM_ADMIN_IDS', String(ADMIN_ID));

                const res = await post(callbackUpdate({ fromId: 999 }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledTimes(1);
                expect(mockAnswerCq).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        'cq-1',
                        'عذراً، لا تمتلك الصلاحية لتنفيذ هذا الإجراء.',
                        true,
                );
                expect(mockResolveSubscriptionPayment).not.toHaveBeenCalled();
                expect(mockEditText).not.toHaveBeenCalled();
                expect(mockLogWarn).toHaveBeenCalledWith(
                        '[webhook] unauthorized callback attempt',
                        expect.objectContaining({ fromId: 999 }),
                );
        });

        it('DB telegramApprovers act as admins too (real getAdminTelegramIds: env ∪ DB, BigInt→Number)', async () => {
                // env NOT set — the only admin source is the DB approver row
                mockApproverFindMany.mockResolvedValue([{ telegramId: BigInt(ADMIN_ID) }]);

                const res = await post(callbackUpdate({ fromId: ADMIN_ID }));

                expect(res.status).toBe(200);
                expect(mockResolveSubscriptionPayment).toHaveBeenCalledTimes(1);
        });

        it('env + DB duplicates are deduped — the rejection log reports adminCount 1', async () => {
                vi.stubEnv('TELEGRAM_ADMIN_IDS', `${ADMIN_ID}, ${ADMIN_ID}`);
                mockApproverFindMany.mockResolvedValue([{ telegramId: BigInt(ADMIN_ID) }]);

                await post(callbackUpdate({ fromId: 999 }));

                expect(mockLogWarn).toHaveBeenCalledWith('[webhook] unauthorized callback attempt', {
                        fromId: 999,
                        callbackData: 'sub_app:55',
                        adminCount: 1,
                });
        });

        it('EMPTY allowlist (no env, no approvers) rejects everyone — deny-by-default', async () => {
                const res = await post(callbackUpdate({ fromId: ADMIN_ID }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        'cq-1',
                        'عذراً، لا تمتلك الصلاحية لتنفيذ هذا الإجراء.',
                        true,
                );
                expect(mockResolveSubscriptionPayment).not.toHaveBeenCalled();
        });
});

// ── callback_query: data parsing & decision resolution ──────────────────

describe('POST /api/telegram/webhook — callback_query: parsing & decisions', () => {
        beforeEach(() => {
                vi.stubEnv('TELEGRAM_ADMIN_IDS', String(ADMIN_ID));
        });

        it('malformed callback data (no colon) → alert «بيانات غير صالحة», no payment resolution', async () => {
                const res = await post(callbackUpdate({ data: 'no-colon-here' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', 'بيانات غير صالحة', true);
                expect(mockResolveSubscriptionPayment).not.toHaveBeenCalled();
        });

        it('non-positive paymentId (sub_app:0) fails the parser → same «بيانات غير صالحة» alert', async () => {
                const res = await post(callbackUpdate({ data: 'sub_app:0' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', 'بيانات غير صالحة', true);
                expect(mockResolveSubscriptionPayment).not.toHaveBeenCalled();
        });

        it('well-formed but UNKNOWN action → alert «إجراء غير معروف»', async () => {
                const res = await post(callbackUpdate({ data: 'sub_zap:55' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', 'إجراء غير معروف', true);
                expect(mockResolveSubscriptionPayment).not.toHaveBeenCalled();
        });
});

// ── callback_query: the decision flow (approved/rejected payment) ───────

describe('POST /api/telegram/webhook — callback_query: decision flow', () => {
        beforeEach(() => {
                vi.stubEnv('TELEGRAM_ADMIN_IDS', String(ADMIN_ID));
        });

        it('sub_app (approve) with a pending payment → resolve(55, "verified"), keyboard stripped, text updated, toast, cleanup query', async () => {
                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(mockResolveSubscriptionPayment).toHaveBeenCalledWith(55, 'verified');

                // strip keyboard from the tapped message
                expect(mockEditReplyMarkup).toHaveBeenCalledWith(BOT_TOKEN, 100, 10);
                // message text with the verified status line
                expect(mockEditText).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        100,
                        10,
                        '✅ تم التفعيل\n\n⚡ [الحالة: تم التفعيل والموافقة بواسطة المشرف]',
                );
                // success toast (no alert)
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '✅ تم التفعيل والموافقة', false);
                // metadata cleanup lookup ran
                expect(mockPaymentFindUnique).toHaveBeenCalledWith({
                        where: { id: 55 },
                        select: { metadata: true },
                });
        });

        it('sub_rej with an already-CANCELLED payment (alreadyStatus rides along) → friendly idempotent toast, text reflects the STORED status, keyboard stripped', async () => {
                // r116: الضغطة الثانية على رفضٍ محسوم لم تعد «خطأً» — توست ودّي بلا
                // alert، والنص يعكس الحالة المخزّنة فعلًا (رفض) لا الحالة المطلوبة.
                mockResolveSubscriptionPayment.mockResolvedValue({
                        ok: false,
                        reason: 'تمت معالجة هذا الطلب مسبقاً',
                        status: 409,
                        alreadyStatus: 'cancelled',
                });

                const res = await post(callbackUpdate({ data: 'sub_rej:55' }));

                expect(res.status).toBe(200);
                expect(mockResolveSubscriptionPayment).toHaveBeenCalledWith(55, 'cancelled');
                expect(mockEditReplyMarkup).toHaveBeenCalledWith(BOT_TOKEN, 100, 10);
                expect(mockEditText).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        100,
                        10,
                        '❌ تم رفض هذا الطلب مسبقاً\n\n⚠️ [الحالة: تم رفض الطلب وإبلاغ العميل]',
                );
                // idempotent replay — toast WITHOUT the alert flag
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '✅ تم رفض هذا الطلب مسبقاً', false);
        });

        it('sub_rej (reject) SUCCESS → the cancelled status line with the ❌ prefix (round92-wave3-6: the emoji now matches the decision)', async () => {
                // read from the code after the fix:
                // `${decision === 'verified' ? '✅ تم التفعيل' : '❌ تم الرفض'}` — the
                // rejection no longer carries the success ✅ (it used to, reported by
                // 3-b and pinned then; the fix flipped this assertion deliberately).
                mockResolveSubscriptionPayment.mockResolvedValue({ ok: true });

                const res = await post(callbackUpdate({ data: 'sub_rej:55' }));

                expect(res.status).toBe(200);
                expect(mockEditText).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        100,
                        10,
                        '❌ تم الرفض\n\n⚠️ [الحالة: تم رفض الطلب وإبلاغ العميل]',
                );
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '❌ تم رفض الطلب', false);
        });

        it('keyboard cleanup: other stored instances get stripped, the ALREADY-cleaned tapped one is skipped', async () => {
                mockPaymentFindUnique.mockResolvedValue({
                        metadata: {
                                telegramMessages: [
                                        { chatId: 100, messageId: 10 }, // the tapped message — already stripped above
                                        { chatId: 999, messageId: 555 }, // another admin's keyboard instance
                                ],
                        },
                });

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                const calls = mockEditReplyMarkup.mock.calls.map((c) => `${c[1]}:${c[2]}`);
                expect(calls).toContain('100:10'); // tapped message
                expect(calls).toContain('999:555'); // the other instance
                expect(calls.filter((c) => c === '100:10')).toHaveLength(1); // NOT stripped twice
                expect(mockEditReplyMarkup).toHaveBeenCalledTimes(2);
        });

        it('cleanup lookup failure is non-critical → logged, still 200, decision already applied', async () => {
                mockPaymentFindUnique.mockRejectedValue(new Error('metadata read failed'));

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(mockLogError).toHaveBeenCalledWith(
                        '[webhook] keyboard cleanup error:',
                        expect.objectContaining({ error: expect.stringContaining('metadata read failed') }),
                );
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '✅ تم التفعيل والموافقة', false);
        });

        it('callback_query with NO message (too old to edit) → decision still processed, edits skipped, toast still sent', async () => {
                // Telegram can attach an outdated/missing message to a callback —
                // the tap must still be resolved, only the edit calls are skipped
                const update = {
                        callback_query: { id: 'cq-1', from: { id: ADMIN_ID }, data: 'sub_app:55' },
                };

                const res = await post(update);

                expect(res.status).toBe(200);
                expect(mockResolveSubscriptionPayment).toHaveBeenCalledWith(55, 'verified');
                expect(mockEditReplyMarkup).not.toHaveBeenCalled();
                expect(mockEditText).not.toHaveBeenCalled();
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '✅ تم التفعيل والموافقة', false);
        });

        it('round92-wave3-1: handler failure in the callback path is caught by the try (await) → logged + 200 «OK», never a leaked rejection/500', async () => {
                // The dispatch is `return await handleCallbackQuery()` inside the
                // try — a mid-decision DB failure now lands in the route's catch-all
                // (logError + 200 'OK' so Telegram does not retry forever). Was a
                // documented gap (3-b): the bare `return` leaked the rejection and
                // this test used to await a THROWN error.
                mockResolveSubscriptionPayment.mockRejectedValue(new Error('db down mid-decision'));

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(await res.text()).toBe('OK');
                expect(mockLogError).toHaveBeenCalledWith(
                        'webhook error:',
                        expect.objectContaining({ error: expect.stringContaining('db down mid-decision') }),
                );
        });

        it('round92-wave3-1: the SUCCESS path passes through the await unchanged — the handler\'s own 200 «OK» is what Telegram sees', async () => {
                // await does not alter the happy path: the handler's Response (200,
                // 'OK' body) is returned as-is after the decision was applied.
                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(await res.text()).toBe('OK');
                expect(mockResolveSubscriptionPayment).toHaveBeenCalledWith(55, 'verified');
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '✅ تم التفعيل والموافقة', false);
        });
});

// ── r116: idempotent replays, conflicts, retryable failures, toast order ──

describe('POST /api/telegram/webhook — r116 already-processed semantics', () => {
        beforeEach(() => {
                vi.stubEnv('TELEGRAM_ADMIN_IDS', String(ADMIN_ID));
        });

        it('re-played APPROVE on an already-VERIFIED payment → friendly toast «تمت الموافقة مسبقاً» (no alert), text reflects approval', async () => {
                mockResolveSubscriptionPayment.mockResolvedValue({
                        ok: false,
                        reason: 'تمت معالجة هذا الطلب مسبقاً',
                        status: 409,
                        alreadyStatus: 'verified',
                });

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', '✅ تمت الموافقة على هذا الطلب مسبقاً', false);
                expect(mockEditText).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        100,
                        10,
                        '✅ تم التفعيل والموافقة مسبقاً\n\n⚡ [الحالة: تم التفعيل والموافقة بواسطة المشرف]',
                );
                expect(mockEditReplyMarkup).toHaveBeenCalledWith(BOT_TOKEN, 100, 10);
        });

        it('REJECT on an already-VERIFIED payment → CONFLICT alert, decision never re-applied, text says approval is final', async () => {
                mockResolveSubscriptionPayment.mockResolvedValue({
                        ok: false,
                        reason: 'تمت معالجة هذا الطلب مسبقاً',
                        status: 409,
                        alreadyStatus: 'verified',
                });

                const res = await post(callbackUpdate({ data: 'sub_rej:55' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        'cq-1',
                        '⚠️ هذا الطلب تمت الموافقة عليه مسبقاً — لا يمكن رفضه',
                        true,
                );
                expect(mockEditText).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        100,
                        10,
                        '⚠️ هذا الطلب تمت الموافقة عليه مسبقاً — لا يمكن رفضه',
                );
                expect(mockEditReplyMarkup).toHaveBeenCalledWith(BOT_TOKEN, 100, 10);
        });

        it('APPROVE on an already-CANCELLED payment → CONFLICT alert, rejection is final', async () => {
                mockResolveSubscriptionPayment.mockResolvedValue({
                        ok: false,
                        reason: 'تمت معالجة هذا الطلب مسبقاً',
                        status: 409,
                        alreadyStatus: 'cancelled',
                });

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        'cq-1',
                        '⚠️ هذا الطلب تم رفضه مسبقاً — لا يمكن الموافقة عليه',
                        true,
                );
                expect(mockEditText).toHaveBeenCalledWith(
                        BOT_TOKEN,
                        100,
                        10,
                        '⚠️ هذا الطلب تم رفضه مسبقاً — لا يمكن الموافقة عليه',
                );
        });

        it('RETRYABLE failure (plan cap, no alreadyStatus) → reason toast + alert, keyboard/message untouched (admin can still reject)', async () => {
                // r116: سقف الخطة فشل قابل للإعادة — تجريد الأزرار كان يحرم المشرف
                // من الرفض من نفس الرسالة؛ الآن تبقى الرسالة حية والتوست يشرح السبب.
                mockResolveSubscriptionPayment.mockResolvedValue({
                        ok: false,
                        reason: 'تجاوز سقف المطاعم للخطة',
                        status: 409,
                });

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', 'تجاوز سقف المطاعم للخطة', true);
                expect(mockEditText).not.toHaveBeenCalled();
                expect(mockEditReplyMarkup).not.toHaveBeenCalled();
        });

        it('not-found payment → alert toast, dead buttons stripped, text says not found', async () => {
                mockResolveSubscriptionPayment.mockResolvedValue({
                        ok: false,
                        reason: 'الطلب غير موجود',
                });

                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                expect(mockAnswerCq).toHaveBeenCalledWith(BOT_TOKEN, 'cq-1', 'الطلب غير موجود', true);
                expect(mockEditText).toHaveBeenCalledWith(BOT_TOKEN, 100, 10, '⚠️ الطلب غير موجود');
                expect(mockEditReplyMarkup).toHaveBeenCalledWith(BOT_TOKEN, 100, 10);
        });

        it('r116 ordering: the toast is answered BEFORE any message edit (inside Telegram\'s callback-answer window)', async () => {
                // كان answerCallbackQuery آخر استدعاء — بطء/فشل التعديلات يتخطاه
                // فيضغط المشرف ثانية ويصطدم بـ«تمت معالجة مسبقاً». الآن هو الأول.
                const res = await post(callbackUpdate({ data: 'sub_app:55' }));

                expect(res.status).toBe(200);
                const answerOrder = mockAnswerCq.mock.invocationCallOrder[0];
                const editTextOrder = mockEditText.mock.invocationCallOrder[0];
                const stripOrder = mockEditReplyMarkup.mock.invocationCallOrder[0];
                expect(answerOrder).toBeLessThan(editTextOrder);
                expect(answerOrder).toBeLessThan(stripOrder);
        });
});

// ── catch-all: message-path errors are acked, never leaked ──────────────

describe('POST /api/telegram/webhook — catch-all (message path)', () => {
        it('request.json() throwing after the content-type check → caught, logged, 200 «OK» (Telegram must not retry)', async () => {
                // a JSON content-type whose body is not parseable as JSON
                const req = makeRequest('{broken', {}, true);
                vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SECRET);

                const res = await webhookRoute.POST(req);

                expect(res.status).toBe(200);
                expect(await res.text()).toBe('OK');
                expect(mockLogError).toHaveBeenCalledWith(
                        'webhook error:',
                        expect.objectContaining({ error: expect.any(String) }),
                );
        });
});
