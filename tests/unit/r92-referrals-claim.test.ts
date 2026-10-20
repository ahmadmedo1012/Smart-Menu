/**
 * round92-3-b — POST /api/referrals/claim unit coverage (was 0% lcov,
 * lines 9-77 — the anonymous referral-click money path; only e2e touched
 * it before, and only with a seeded card).
 *
 * Standard pattern (orders-create.test.ts): vi.hoisted + vi.mock for
 * prisma / rate-limit / logger — no real DB. The REAL route logic runs:
 * the code regex gate, the per-IP limiter, the card lookup, the round-77
 * anonymous session fingerprint (first x-forwarded-for hop, hashed, never
 * raw-IP-persisted), the dedupe findFirst, the pending-row write with the
 * round87-A9 lost-race P2002 swallow, and the 500 envelope.
 *
 * The fingerprint formula is re-derived INDEPENDENTLY in this file
 * (createHash sha256, 16 hex chars) — not imported from the production
 * helper — so a drift in lib/referral-conversion's derivation breaks this
 * test instead of being self-confirmed (the anti-tautology rule from the
 * round-92 quality report).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockLoyaltyCardFindUnique = vi.hoisted(() => vi.fn());
const mockReferralFindFirst = vi.hoisted(() => vi.fn());
const mockReferralCreate = vi.hoisted(() => vi.fn());
const mockRateCheck = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        loyaltyCard: { findUnique: mockLoyaltyCardFindUnique },
        referral: { findFirst: mockReferralFindFirst, create: mockReferralCreate },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

// the route builds its limiter at module scope (10/min) — controllable check
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({ check: mockRateCheck, destroy: () => {} }),
}));

vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const CARD = {
        id: 555,
        restaurantId: 7,
        customerPhone: '0501234567',
        /* W7-B (G-4): بوابة «برنامج الإحالات» (الاحترافية+) تقرأ خطة مطعم
           البطاقة من select القراءة نفسها — الاحترافية كي تبقى خلايا
           الإنشاء الموجبة موجبة (الخلايا السالبة الجديدة في ملف العائلة). */
        restaurant: { plan: { name: 'Pro', nameAr: 'الاحترافية', sortOrder: 4 } },
};

const okRate = () => mockRateCheck.mockResolvedValue({ success: true, remaining: 9, reset: 0 });

function claimRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
        return new NextRequest('http://localhost/api/referrals/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: typeof body === 'string' ? body : JSON.stringify(body),
        });
}

async function callClaim(body: unknown, headers?: Record<string, string>) {
        const { POST } = await import('@/app/api/referrals/claim/route');
        return POST(claimRequest(body, headers));
}

/**
 * Independent re-derivation of the round-77 anonymous session key:
 * first x-forwarded-for hop → sha256 → first 16 hex chars → `ref-<h>-<code>`.
 * Written from the documented contract, NOT by importing the helper, so
 * the pinned formula and the production formula can't drift in lockstep.
 */
function expectedSessionKey(firstHop: string, code: string): string {
        const hex = createHash('sha256').update(firstHop).digest('hex').slice(0, 16);
        return `ref-${hex}-${code}`;
}

beforeEach(() => {
        vi.clearAllMocks();
        okRate();
        // deterministic trust model for the real getClientIp: non-Vercel,
        // default TRUST_PROXY_DEPTH=1
        delete process.env.VERCEL;
        delete process.env.TRUST_PROXY_DEPTH;
        mockLoyaltyCardFindUnique.mockResolvedValue({ ...CARD });
        mockReferralFindFirst.mockResolvedValue(null);
        mockReferralCreate.mockResolvedValue({ id: 9001 });
});

afterEach(() => {
        delete process.env.VERCEL;
        delete process.env.TRUST_PROXY_DEPTH;
});

// ── Gate 1: referral-code regex (BEFORE the limiter) ────────────────────

describe('POST /api/referrals/claim — code regex gate', () => {
        it('lowercase code → 400 «كود إحالة غير صالح» (uppercase-only charset)', async () => {
                const res = await callClaim({ code: 'abc123' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('كود إحالة غير صالح');
        });

        it('too-short code (5 chars) → 400', async () => {
                const res = await callClaim({ code: 'ABC12' });

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('كود إحالة غير صالح');
        });

        it('too-long code (17 chars) → 400', async () => {
                const res = await callClaim({ code: 'A'.repeat(17) });

                expect(res.status).toBe(400);
        });

        it('missing code → 400', async () => {
                const res = await callClaim({});

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('كود إحالة غير صالح');
        });

        it('non-JSON body → the .catch fallback {code:""} → 400 (never 500)', async () => {
                const res = await callClaim('not json');

                expect(res.status).toBe(400);
                const json = await res.json();
                expect(json.error).toBe('كود إحالة غير صالح');
        });

        it('invalid code never burns rate-limit budget — the regex gate runs BEFORE the limiter', async () => {
                await callClaim({ code: 'bad-code!' });

                expect(mockRateCheck).not.toHaveBeenCalled();
                expect(mockLoyaltyCardFindUnique).not.toHaveBeenCalled();
        });
});

// ── Gate 2: per-IP rate limit (claim:IP, 10/min) ────────────────────────

describe('POST /api/referrals/claim — rate limit gate', () => {
        it('limiter rejects → 429 «طلبات كثيرة جداً، حاول بعد قليل» before the card lookup', async () => {
                mockRateCheck.mockResolvedValue({ success: false, remaining: 0, reset: 0 });

                const res = await callClaim({ code: 'ABC123' }, { 'x-real-ip': '9.9.9.9' });

                expect(res.status).toBe(429);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('طلبات كثيرة جداً، حاول بعد قليل');
                expect(mockLoyaltyCardFindUnique).not.toHaveBeenCalled();
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('bucket key derives from x-real-ip → claim:<ip>', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-real-ip': '9.9.9.9' });

                expect(mockRateCheck).toHaveBeenCalledWith('claim:9.9.9.9');
        });

        it('no IP headers → bucket key "claim:unknown"', async () => {
                await callClaim({ code: 'ABC123' });

                expect(mockRateCheck).toHaveBeenCalledWith('claim:unknown');
        });
});

// ── Gate 3: card resolution ─────────────────────────────────────────────

describe('POST /api/referrals/claim — card resolution', () => {
        it('unknown card (bad but well-formed code) → 404 «كود الإحالة غير موجود»', async () => {
                mockLoyaltyCardFindUnique.mockResolvedValue(null);

                const res = await callClaim({ code: 'ZZZZZZ' });

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.error).toBe('كود الإحالة غير موجود');
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('the lookup only selects the columns the write needs (no PII over-fetch)', async () => {
                await callClaim({ code: 'ABC123' });

                expect(mockLoyaltyCardFindUnique).toHaveBeenCalledWith({
                        where: { referralCode: 'ABC123' },
                        // W7-B: صف الخطة انضم للقراءة ذاتها (لا استعلام إضافي — مسار
                        // مجهول يبقى خفيفًا)؛ نية «لا جلب PII زائد» باقية حرفيًا:
                        // name/nameAr/sortOrder ليست بيانات شخصية.
                        select: { id: true, restaurantId: true, customerPhone: true, restaurant: { select: { plan: { select: { name: true, nameAr: true, sortOrder: true } } } } },
                });
        });
});

// ── Gate 4: anonymous session fingerprint + dedupe (round-77) ───────────

describe('POST /api/referrals/claim — session fingerprint & dedupe', () => {
        it('dedupe lookup keys on referralCode + the hashed fingerprint of the FIRST xff hop', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });

                expect(mockReferralFindFirst).toHaveBeenCalledWith({
                        where: {
                                referralCode: 'ABC123',
                                referredName: expectedSessionKey('1.1.1.1', 'ABC123'),
                        },
                });
        });

        it('the stored referredName never contains the raw IP — sha256 hex prefix only', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });

                const storedName = mockReferralCreate.mock.calls[0][0].data.referredName;
                expect(storedName).not.toContain('1.1.1.1');
                expect(storedName).toMatch(/^ref-[0-9a-f]{16}-ABC123$/);
        });

        it('same fingerprint again → {registered:false, already:true}, NO second row', async () => {
                mockReferralFindFirst.mockResolvedValue({ id: 9001, referralCode: 'ABC123' });

                const res = await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ registered: false, already: true });
                expect(mockReferralCreate).not.toHaveBeenCalled();
        });

        it('a DIFFERENT first hop (same code) is a different session → new row written', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });

                const firstKey = mockReferralCreate.mock.calls[0][0].data.referredName;
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '3.3.3.3' });

                const secondKey = mockReferralCreate.mock.calls[1][0].data.referredName;
                expect(firstKey).not.toBe(secondKey);
                expect(mockReferralCreate).toHaveBeenCalledTimes(2);
        });

        it('a different CODE from the same session is a different key (dedupe is code-scoped)', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });
                await callClaim({ code: 'XYZ789' }, { 'x-forwarded-for': '1.1.1.1' });

                const keys = mockReferralCreate.mock.calls.map((c) => c[0].data.referredName);
                expect(keys[0]).not.toBe(keys[1]);
                // both share the same hashed session part, differ only in the code suffix
                expect(keys[0].slice(0, 20)).toBe(keys[1].slice(0, 20));
        });

        it('no x-forwarded-for → the fingerprint hashes the literal "unknown" fallback', async () => {
                await callClaim({ code: 'ABC123' });

                expect(mockReferralCreate.mock.calls[0][0].data.referredName).toBe(
                        expectedSessionKey('unknown', 'ABC123'),
                );
        });
});

// ── Gate 5: the pending-row write ───────────────────────────────────────

describe('POST /api/referrals/claim — success write', () => {
        it('creates the pending row with every column the conversion path expects', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });

                expect(mockReferralCreate).toHaveBeenCalledTimes(1);
                expect(mockReferralCreate.mock.calls[0][0].data).toEqual({
                        referralCode: 'ABC123',
                        referrerId: CARD.id,
                        referredPhone: '',
                        referredName: expectedSessionKey('1.1.1.1', 'ABC123'),
                        discountPercent: 10,
                        referrerRewardPct: 10,
                        restaurantId: CARD.restaurantId,
                        status: 'pending',
                });
        });

        it('responds {success:true, data:{registered:true}}', async () => {
                const res = await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual({ registered: true });
        });

        it('round87-A9 lost-race: P2002 unique-violation on create is swallowed → still {registered:true}', async () => {
                // two concurrent claims from the same fingerprint: the loser's
                // create hits the (referralCode, referredName) unique index — the
                // route must answer success, not 500, not a duplicate row.
                mockReferralCreate.mockRejectedValue({ code: 'P2002' } as never);

                const res = await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.data).toEqual({ registered: true });
                expect(mockLogError).not.toHaveBeenCalled();
        });
});

// ── Gate 6: failure envelope ────────────────────────────────────────────

describe('POST /api/referrals/claim — failure envelope', () => {
        it('non-P2002 create error → 500 «تعذّر تسجيل الإحالة» + the error is logged with its cause', async () => {
                mockReferralCreate.mockRejectedValue(new Error('connection lost'));

                const res = await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1' });

                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('تعذّر تسجيل الإحالة');
                expect(mockLogError).toHaveBeenCalledWith(
                        'referral claim error',
                        expect.objectContaining({ error: expect.stringContaining('connection lost') }),
                );
        });

        it('card lookup rejection → the same 500 envelope (never an unhandled rejection)', async () => {
                mockLoyaltyCardFindUnique.mockRejectedValue(new Error('db down'));

                const res = await callClaim({ code: 'ABC123' });

                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('تعذّر تسجيل الإحالة');
        });
});

// ── documented asymmetry: rate identity vs session fingerprint ──────────

describe('POST /api/referrals/claim — IP identity vs fingerprint (documented asymmetry)', () => {
        it('round91-D1 vs round-77: multi-hop XFF → the rate bucket keys the LAST hop while the fingerprint hashes the FIRST', async () => {
                await callClaim({ code: 'ABC123' }, { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' });

                // rate identity (spoof-rotation-resistant): trusted-proxy hop
                expect(mockRateCheck).toHaveBeenCalledWith('claim:2.2.2.2');
                // session fingerprint (claim↔attach matching contract): first hop
                expect(mockReferralCreate.mock.calls[0][0].data.referredName).toBe(
                        expectedSessionKey('1.1.1.1', 'ABC123'),
                );
        });
});
