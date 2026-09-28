/**
 * r121-M3 — POST /api/auth/login non-JSON body contract.
 *
 * The finding (M-testing M-3, P2, live-verified): `loginSchema.safeParse(await
 * request.json())` guards SCHEMA failures, not the JSON parse itself — a
 * garbage or empty body threw a SyntaxError into the route's custom catch
 * (which deliberately bypasses handleError with a generic no-leak 500) and
 * surfaced as **500** «حدث خطأ في الخادم».
 *
 * The fix: an inline parse guard before safeParse returning the house
 * JSON-parse copy («بيانات غير صالحة — خطأ في صيغة JSON», the same string
 * handleError maps for the other 38 routes) with **400**. X1 verified only 2
 * of 40 request.json() sites 500 on malformed JSON: this one (public) and
 * admin/events/trigger (auth-gated — left as-is this round per the fix spec).
 *
 * Mock pattern: login-lockout.test.ts (mocked prisma/hash/session/telegram).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
        prisma: {
                user: { findUnique: mockFindUnique, update: mockUpdate },
                systemEvent: { create: vi.fn().mockResolvedValue({}) },
        },
}));
vi.mock('@/lib/hash', () => ({
        verifyHash: vi.fn(),
        needsRehash: vi.fn(() => false),
        hashPassword: vi.fn(() => '600000:mocksalt:mockhash'),
}));
vi.mock('@/lib/session', () => ({ createSession: vi.fn().mockResolvedValue('tok') }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/logger', () => ({ error: mockLogError }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: () => ({
                check: vi.fn(async () => ({ success: true, remaining: 9, reset: 0 })),
                destroy: () => {},
        }),
}));

function rawBodyRequest(body: string | undefined): Request {
        return new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        'x-real-ip': '1.2.3.4',
                        ...(body === undefined ? {} : { 'Content-Length': String(body.length) }),
                },
                ...(body === undefined ? {} : { body }),
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        mockFindUnique.mockResolvedValue(null);
});

async function callLogin(body: string | undefined) {
        const { POST } = await import('@/app/api/auth/login/route');
        return POST(rawBodyRequest(body));
}

describe('r121-M3 POST /api/auth/login — malformed JSON body → 400 (not 500)', () => {
        it('garbage non-JSON body → 400 with the house JSON-parse copy', async () => {
                const res = await callLogin('this is {{{ not json');

                expect(res.status).toBe(400);
                expect(res.status).not.toBe(500);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('بيانات غير صالحة — خطأ في صيغة JSON');
        });

        it('empty body (no payload at all) → 400, not 500', async () => {
                const res = await callLogin(undefined);

                expect(res.status).toBe(400);
                expect(res.status).not.toBe(500);
                const json = await res.json();
                expect(json.error).toBe('بيانات غير صالحة — خطأ في صيغة JSON');
        });

        it('the 400 fires before ANY DB work — no user lookup, no limiter write path', async () => {
                await callLogin('{{{');

                expect(mockFindUnique).not.toHaveBeenCalled();
        });

        it('valid JSON `{}` still reaches the schema gate → 422 (the parse guard does not swallow schema failures)', async () => {
                const res = await callLogin(JSON.stringify({}));

                expect(res.status).toBe(422);
                const json = await res.json();
                expect(json.error).toBe('يرجى إدخال اسم المستخدم وكلمة المرور');
        });

        it('valid JSON credentials still reach the auth path → 401 (mock: no such user)', async () => {
                const res = await callLogin(JSON.stringify({ username: 'ghost', password: 'whatever123' }));

                expect(res.status).toBe(401);
                expect(mockFindUnique).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { username: 'ghost' } })
                );
        });
});
