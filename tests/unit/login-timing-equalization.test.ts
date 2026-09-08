import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * round90-F6 — login timing equalization (username enumeration via latency).
 *
 * Before the fix, an unknown username returned 401 BEFORE verifyHash (~0ms)
 * while an existing username paid the full pbkdf2 cost (~290ms at 600k
 * iterations) — an attacker measures response latency to enumerate valid
 * usernames. The fix burns the SAME KDF cost against a module-level dummy
 * hash (computed once at route import) on the missing-user path, then
 * returns the identical 401 body.
 *
 * These tests pin the CONTRACT, not the milliseconds: the missing-user path
 * must call verifyHash exactly once (cost burned) and must return the exact
 * same status + body as the wrong-password path (no content oracle either).
 */

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockVerifyHash = vi.hoisted(() => vi.fn((pw: string, stored: string) => pw === stored));
// r94 (W1-b/fix 3): same mock gap as login-lockout — the lockout branch's
// prisma.systemEvent.create was unreachable here (limiters always allow in
// this file, so it stayed LATENT). Mocking it now makes the documented
// ghost-username decision (see the route: the missing-user path must NOT
// mint auth.lockout events) assertable below.
const mockSystemEventCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/lib/db', () => ({
        prisma: {
                user: { findUnique: mockFindUnique, update: mockUpdate },
                systemEvent: { create: mockSystemEventCreate }, // r94: auth.lockout audit write
        },
}));
vi.mock('@/lib/hash', () => ({
        verifyHash: mockVerifyHash,
        needsRehash: vi.fn(() => false),
        // module-level DUMMY_HASH is derived from this mock — no real pbkdf2 in tests
        hashPassword: vi.fn(() => '600000:mocksalt:mockhash'),
}));
vi.mock('@/lib/session', () => ({ createSession: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: vi.fn(() => ({ check: async () => ({ success: true }) })),
}));

const STORED = '600000:realsalt:realhash';

function makeRequest(username: string, password: string): Request {
        return new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': '1.2.3.4' },
                body: JSON.stringify({ username, password }),
        });
}

describe('login — missing-user timing equalization (round90-F6)', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('unknown username still burns a verifyHash call (KDF cost) before 401', async () => {
                mockFindUnique.mockResolvedValue(null);
                const { POST } = await import('@/app/api/auth/login/route');

                const res = await POST(makeRequest('ghost-user', 'whatever'));

                expect(res.status).toBe(401);
                expect(mockVerifyHash).toHaveBeenCalledTimes(1);
                // burned against the dummy hash, not a user hash
                expect(mockVerifyHash).toHaveBeenCalledWith('whatever', '600000:mocksalt:mockhash');
                // r94 (W1-b/fix 3): the account limiters are deliberately NOT called on
                // the missing-user path (route comment: ghost usernames must not mint
                // auth.lockout audit noise) — no SystemEvent for an unknown username.
                expect(mockSystemEventCreate).not.toHaveBeenCalled();
        });

        it('unknown username and wrong password return the IDENTICAL 401 body (no content oracle)', async () => {
                const { POST } = await import('@/app/api/auth/login/route');

                mockFindUnique.mockResolvedValue(null);
                const missing = await POST(makeRequest('ghost-user', 'whatever'));

                mockFindUnique.mockResolvedValue({
                        id: 1,
                        username: 'admin',
                        password: STORED,
                        name: 'Admin',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'PAID',
                });
                const wrongPw = await POST(makeRequest('admin', 'whatever'));

                expect(missing.status).toBe(wrongPw.status);
                expect(await missing.json()).toEqual(await wrongPw.json());
        });

        it('known user still verifies against the STORED hash (behavior unchanged)', async () => {
                mockFindUnique.mockResolvedValue({
                        id: 1,
                        username: 'admin',
                        password: STORED,
                        name: 'Admin',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'PAID',
                });
                const { POST } = await import('@/app/api/auth/login/route');

                await POST(makeRequest('admin', 'wrong-password'));

                expect(mockVerifyHash).toHaveBeenCalledTimes(1);
                expect(mockVerifyHash).toHaveBeenCalledWith('wrong-password', STORED);
        });
});
