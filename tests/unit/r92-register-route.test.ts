/**
 * round92-3-b — POST /api/auth/register unit coverage (was 0% lcov,
 * lines 12-111 — the only uncovered money/entry path per the round-92
 * quality report; also the reason the security e2e suite's register-429
 * cases were conditionally skipped).
 *
 * Standard pattern (orders-create.test.ts): vi.hoisted + vi.mock for
 * prisma / rate-limit / hash / session / audit / telegram — while the
 * REAL zod schema (@/lib/validation), the REAL api-helpers envelope and
 * the REAL client-ip extraction stay live, because those gates are
 * exactly what is under test.
 *
 * Pinned behaviors (read from the route, not assumed):
 *   - register:IP rate limiter (5/min) runs BEFORE body parsing
 *   - 400 zod first-issue message (Arabic, verbatim from the schema)
 *   - non-JSON body → handleError JSON branch → 400
 *   - 409 username / email taken (username checked first)
 *   - round92-wave3-5: XSS strip (<[^>]*> regex) applied to username+name
 *     BEFORE zod (body → strip → zod) — the length policy now judges the
 *     SANITIZED value that will actually be stored (was: after zod, so a
 *     tag-laden raw name passed the floor then shrank below it on disk)
 *     — still before the uniqueness lookup and the create
 *   - 201 success: {success,data:{id,username,name,role,subscriptionStatus}}
 *     + createSession + logAudit(ip) + notifyEvent('user_registered')
 *   - create failures: local unique-constraint 409, else handleError
 *     (connection → 503, generic → 500, no internals leaked)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindFirst = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockNotifyEvent = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        user: { findUnique: mockUserFindUnique, findFirst: mockUserFindFirst, create: mockUserCreate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// the route builds its limiter at module scope — feed it a controllable check
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

// PBKDF2 600k iterations ≈ 300ms/call — mocked; the hash VALUE passed to
// prisma.user.create is asserted instead (create-owner.test.ts pattern).
vi.mock('@/lib/hash', () => ({
        hashPassword: mockHashPassword.mockImplementation((pw: string) => `hashed(${pw})`),
}));

// createSession touches cookies()/DB — auto-login side effect is asserted,
// not executed.
vi.mock('@/lib/session', () => ({ createSession: mockCreateSession }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));
vi.mock('@/lib/logger', () => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const VALID = {
        username: 'newuser1',
        password: 'password123',
        name: 'علي حسن',
};

// mirrors the select the route passes to prisma.user.create
const CREATED = {
        id: 42,
        username: 'newuser1',
        name: 'علي حسن',
        role: 'USER',
        subscriptionStatus: 'UNPAID',
        createdAt: new Date('2026-09-07T00:00:00Z'),
};

function registerRequest(
        body: unknown,
        headers: Record<string, string> = {},
        raw = false,
): Request {
        return new Request('http://localhost/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: raw ? (body as string) : JSON.stringify(body),
        });
}

async function callRegister(body: unknown, headers?: Record<string, string>, raw?: boolean) {
        const { POST } = await import('@/app/api/auth/register/route');
        return POST(registerRequest(body, headers, raw));
}

beforeEach(() => {
        vi.clearAllMocks();
        // deterministic trust model for the real getClientIp: non-Vercel,
        // default TRUST_PROXY_DEPTH=1 → x-real-ip / last-XFF-hop honored
        delete process.env.VERCEL;
        delete process.env.TRUST_PROXY_DEPTH;
        mockRateCheck.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
        mockUserFindUnique.mockResolvedValue(null);
        mockUserFindFirst.mockResolvedValue(null);
        mockUserCreate.mockResolvedValue({ ...CREATED });
        mockCreateSession.mockResolvedValue(undefined);
        mockLogAudit.mockResolvedValue(undefined);
        mockNotifyEvent.mockResolvedValue({ sent: 0, failed: [] });
});

afterEach(() => {
        delete process.env.VERCEL;
        delete process.env.TRUST_PROXY_DEPTH;
});

// ── Gate 1: per-IP rate limit (register:IP, 5/min) ─────────────────────

describe('POST /api/auth/register — rate limit gate (before body parsing)', () => {
        it('limiter rejects → 429 with the Arabic message, zero DB reads', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callRegister(VALID, { 'x-real-ip': '9.9.9.9' });

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('محاولات كثيرة جداً. حاول لاحقاً.');
                // rejected before any lookup or write
                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('bucket key derives from x-real-ip → register:<ip>', async () => {
                await callRegister(VALID, { 'x-real-ip': '9.9.9.9' });

                expect(mockRateCheck).toHaveBeenCalledWith('register:9.9.9.9');
        });

        it('no IP headers → bucket key "register:unknown"', async () => {
                await callRegister(VALID);

                expect(mockRateCheck).toHaveBeenCalledWith('register:unknown');
        });

        it('round91-D1: multi-entry x-forwarded-for keys on the LAST hop (trusted-proxy semantics)', async () => {
                await callRegister(VALID, { 'x-forwarded-for': ' 8.8.8.8 , 10.0.0.1' });

                expect(mockRateCheck).toHaveBeenCalledWith('register:10.0.0.1');
        });

        it('the 429 fires before the body is even parsed (malformed JSON + limited IP → 429, not 400)', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callRegister('{broken json', { 'x-real-ip': '9.9.9.9' }, true);

                expect(res.status).toBe(429);
        });
});

// ── Gate 2: zod validation (first-issue Arabic messages, 400) ───────────

describe('POST /api/auth/register — schema validation (400 envelope)', () => {
        it('short password → 400 «كلمة المرور يجب أن تكون 8 أحرف على الأقل»', async () => {
                const res = await callRegister({ ...VALID, password: '1234567' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        });

        it('short username → 400 «اسم المستخدم يجب أن يكون 3 أحرف على الأقل»', async () => {
                const res = await callRegister({ ...VALID, username: 'ab' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        });

        it('31-char username → 400 «اسم المستخدم يجب ألا يتجاوز 30 حرفًا»', async () => {
                const res = await callRegister({ ...VALID, username: 'a'.repeat(31) });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم يجب ألا يتجاوز 30 حرفًا');
        });

        it('empty name → 400 «الاسم مطلوب»', async () => {
                const res = await callRegister({ ...VALID, name: '' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('الاسم مطلوب');
        });

        it('invalid email → 400 «البريد الإلكتروني غير صحيح»', async () => {
                const res = await callRegister({ ...VALID, email: 'not-an-email' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('البريد الإلكتروني غير صحيح');
        });

        it('empty string email is explicitly allowed by the schema (optional or "")', async () => {
                const res = await callRegister({ ...VALID, email: '' });

                expect(res.status).toBe(201);
        });

        it('non-JSON body → 400 «بيانات غير صالحة — خطأ في صيغة JSON» via handleError', async () => {
                const res = await callRegister('this is not json at all', {}, true);

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة — خطأ في صيغة JSON');
        });

        it('validation failure → zero DB reads, no hashing (fail fast before uniqueness)', async () => {
                await callRegister({ ...VALID, password: 'short' });

                expect(mockUserFindUnique).not.toHaveBeenCalled();
                expect(mockUserFindFirst).not.toHaveBeenCalled();
                expect(mockHashPassword).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });
});

// ── Gate 3: uniqueness (username first, then email) ─────────────────────

describe('POST /api/auth/register — uniqueness (409)', () => {
        it('username taken → 409 «اسم المستخدم موجود مسبقاً», no create, no hashing', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 1, username: 'newuser1' });

                const res = await callRegister(VALID);

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم موجود مسبقاً');
                expect(mockUserFindFirst).not.toHaveBeenCalled();
                expect(mockHashPassword).not.toHaveBeenCalled();
                expect(mockUserCreate).not.toHaveBeenCalled();
        });

        it('email taken → 409 «البريد الإلكتروني مستخدم مسبقاً» (round-77 duplicate-email guard)', async () => {
                mockUserFindFirst.mockResolvedValue({ id: 7, email: 'owner@example.com' });

                const res = await callRegister({ ...VALID, email: 'owner@example.com' });

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('البريد الإلكتروني مستخدم مسبقاً');
                expect(mockUserCreate).not.toHaveBeenCalled();
                expect(mockUserFindFirst).toHaveBeenCalledWith({ where: { email: 'owner@example.com' } });
        });

        it('zod 4 rejects a single-char TLD («a@b.c») at the schema gate → 400, lookup never runs', async () => {
                // read from the real schema (not assumed): zod 4's email format check
                // requires a 2+ char TLD — the route's regex is zod's, not a custom one
                const res = await callRegister({ ...VALID, email: 'a@b.c' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('البريد الإلكتروني غير صحيح');
                expect(mockUserFindFirst).not.toHaveBeenCalled();
        });

        it('the uniqueness lookup receives the email value verbatim (no trimming by the route)', async () => {
                // the route's `email?.trim()` guard only decides WHETHER to look up;
                // the where-clause uses `.trim()` — pinned here with a normal address
                await callRegister({ ...VALID, email: 'owner@example.com' });

                expect(mockUserFindFirst).toHaveBeenCalledWith({ where: { email: 'owner@example.com' } });
        });

        it('username check runs first: taken username + email → findFirst never called', async () => {
                mockUserFindUnique.mockResolvedValue({ id: 1 });

                await callRegister({ ...VALID, email: 'a@b.c' });

                expect(mockUserFindFirst).not.toHaveBeenCalled();
        });

        it('no email provided → email lookup skipped entirely', async () => {
                await callRegister(VALID);

                expect(mockUserFindFirst).not.toHaveBeenCalled();
        });
});

// ── Gate 4: stored-XSS strip (before lookup, before create) ─────────────

describe('POST /api/auth/register — HTML strip (stored-XSS defense)', () => {
        it('username «<script>x</script>admin» is stored as «xadmin» — the TAGS are stripped (the stored-XSS vector), inner text stays', async () => {
                // read from the real strip: `replace(/<[^>]*>/g, '')` removes the
                // markup only — `<script>` and `</script>` vanish, so no HTML tag is
                // ever persisted; the literal text between them is kept as inert text.
                await callRegister({ ...VALID, username: '<script>x</script>admin' });

                expect(mockUserCreate).toHaveBeenCalledTimes(1);
                const stored = mockUserCreate.mock.calls[0][0].data.username;
                expect(stored).toBe('xadmin');
                expect(stored).not.toMatch(/<[^>]*>/); // no markup survives the strip
        });

        it('name «<b>علي</b> حسان» is stored as «علي حسان»', async () => {
                await callRegister({ ...VALID, name: '<b>علي</b> حسان' });

                expect(mockUserCreate.mock.calls[0][0].data.name).toBe('علي حسان');
        });

        it('strip happens BEFORE the uniqueness lookup — findUnique sees the sanitized value', async () => {
                await callRegister({ ...VALID, username: '<i>new</i>user1' });

                expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { username: 'newuser1' } });
        });

        it('round92-wave3-5: strip runs BEFORE zod — «a<b>b</b>» (9 raw chars) sanitizes to the 2-char «ab» which FAILS min-3 → 400, nothing written', async () => {
                // The order is now body → strip → zod: the length policy judges the
                // sanitized value that will actually be stored. Previously the strip
                // ran after validation, so a tag-laden raw username passed the floor
                // and the shrunken «ab» was persisted anyway (3-b finding #3). The
                // old test pinned the buggy behavior — flipped deliberately.
                const res = await callRegister({ ...VALID, username: 'a<b>b</b>' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
                expect(mockUserCreate).not.toHaveBeenCalled();
                expect(mockUserFindUnique).not.toHaveBeenCalled(); // rejected at the schema gate, before the lookup
        });

        it('round92-wave3-5: a name that sanitizes to EMPTY fails min-1 → 400 «الاسم مطلوب» (raw non-empty no longer suffices)', async () => {
                // «<b></b>» is non-empty raw (would pass the old post-zod world) —
                // after the strip it is «», and zod must reject it.
                const res = await callRegister({ ...VALID, name: '<b></b>' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('الاسم مطلوب');
                expect(mockUserCreate).not.toHaveBeenCalled();
        });
});

// ── Happy path (201) ────────────────────────────────────────────────────

describe('POST /api/auth/register — success (201)', () => {
        it('returns {success:true, data:{id,username,name,role,subscriptionStatus}} — no password/email/createdAt in the payload', async () => {
                const res = await callRegister(VALID, { 'x-real-ip': '9.9.9.9' });

                expect(res.status).toBe(201);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({
                        id: 42,
                        username: 'newuser1',
                        name: 'علي حسن',
                        role: 'USER',
                        subscriptionStatus: 'UNPAID',
                });
                expect(json.data).not.toHaveProperty('password');
                expect(json.data).not.toHaveProperty('email');
        });

        it('create row: role USER, subscriptionStatus UNPAID, the HASHED password, email defaults to empty string', async () => {
                await callRegister(VALID);

                const arg = mockUserCreate.mock.calls[0][0];
                expect(arg.data).toMatchObject({
                        username: 'newuser1',
                        name: 'علي حسن',
                        role: 'USER',
                        subscriptionStatus: 'UNPAID',
                        email: '',
                });
                // the PBKDF2 hash — never the plaintext
                expect(arg.data.password).toBe('hashed(password123)');
                expect(arg.data.password).not.toBe('password123');
                // the select never asks for password/email either
                expect(arg.select).toEqual({
                        id: true,
                        username: true,
                        name: true,
                        role: true,
                        subscriptionStatus: true,
                        createdAt: true,
                });
        });

        it('provided email is stored on the created user', async () => {
                await callRegister({ ...VALID, email: 'owner@example.com' });

                expect(mockUserCreate.mock.calls[0][0].data.email).toBe('owner@example.com');
        });

        it('auto-login: createSession called with the new user id', async () => {
                await callRegister(VALID);

                expect(mockCreateSession).toHaveBeenCalledTimes(1);
                expect(mockCreateSession).toHaveBeenCalledWith(42);
        });

        it('audit trail: logAudit(create, actor=target=new user, with the canonical IP)', async () => {
                await callRegister(VALID, { 'x-real-ip': '9.9.9.9' });

                expect(mockLogAudit).toHaveBeenCalledWith({
                        action: 'create',
                        actorId: 42,
                        targetType: 'user',
                        targetId: 42,
                        ip: '9.9.9.9',
                });
        });

        it('Telegram: notifyEvent("user_registered", {username,name}, {adminOnly:true})', async () => {
                await callRegister(VALID);

                expect(mockNotifyEvent).toHaveBeenCalledTimes(1);
                expect(mockNotifyEvent).toHaveBeenCalledWith(
                        'user_registered',
                        { username: 'newuser1', name: 'علي حسن' },
                        { adminOnly: true },
                );
        });
});

// ── create failures → error mapping (details scrubbed) ─────────────────

describe('POST /api/auth/register — create failure mapping', () => {
        it('generic create error → 500 «حدث خطأ داخلي. حاول مرة أخرى» (no internals leaked, no session)', async () => {
                mockUserCreate.mockRejectedValue(new Error('ECONNREFUSED secret internals 127.0.0.1:5432'));

                const res = await callRegister(VALID);

                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('حدث خطأ داخلي. حاول مرة أخرى');
                expect(json.error).not.toContain('ECONNREFUSED');
                expect(json.error).not.toContain('127.0.0.1');
                expect(mockCreateSession).not.toHaveBeenCalled();
        });

        it('connection-style error → 503 «خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى»', async () => {
                mockUserCreate.mockRejectedValue(new Error('Connection terminated unexpectedly'));

                const res = await callRegister(VALID);

                expect(res.status).toBe(503);
                const json = await res.json();
                expect(json.error).toBe('خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى');
        });

        it('unique-constraint failure on create → the route-local 409 «اسم المستخدم موجود مسبقاً» (not handleError generic)', async () => {
                // TOCTOU race: a concurrent registration wins between findUnique
                // and create — the catch maps P2002-style messages to the same 409.
                mockUserCreate.mockRejectedValue(
                        new Error('Unique constraint failed on the fields: (`username`)'),
                );

                const res = await callRegister(VALID);

                expect(res.status).toBe(409);
                const json = await res.json();
                expect(json.error).toBe('اسم المستخدم موجود مسبقاً');
        });
});
