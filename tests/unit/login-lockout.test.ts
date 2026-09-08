import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
// r94 (W1-b/fix 3 — fake coverage): the lockout branch writes the round88-B7
// auth.lockout SystemEvent, but this file's prisma mock had `user` ONLY — the
// write died in a TypeError inside the (previously empty) catch and the 429
// still returned, so the audit event was NEVER actually written in any run of
// this file. The mock + the dedicated test below make it real and breakable.
const mockSystemEventCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));

// Rate limiter state holders — both lockout limiters count FAILED attempts only
const accountState = vi.hoisted(() => ({ count: 0 }));
// round91-D1/F2: username-only backstop limiter (max 20, NOT exemptFromRelax —
// the ip-scoped accountLimiter above is distinguished by exemptFromRelax: true)
const backstopState = vi.hoisted(() => ({ count: 0 }));
const loginState = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/lib/db', () => ({
        prisma: {
                user: { findUnique: mockFindUnique, update: mockUpdate },
                systemEvent: { create: mockSystemEventCreate }, // r94: auth.lockout audit write
        },
}));
vi.mock('@/lib/hash', () => ({
        // round85-A3: login also touches needsRehash/hashPassword (transparent
        // rehash-on-login) — mock the full module surface
        verifyHash: vi.fn((pw: string, stored: string) => pw === stored),
        needsRehash: vi.fn(() => false),
        hashPassword: vi.fn(() => '600000:mocksalt:mockhash'),
}));
vi.mock('@/lib/session', () => ({ createSession: mockCreateSession }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));

// loginLimiter: always allows (10/min IP+username — out of scope for this test)
// accountLimiter (ip-scoped, 20/15min, exemptFromRelax): fails from the 21st check onward
// accountBackstopLimiter (username-only, 20/15min, round91-D1/F2): fails from the
// 21st check onward — the route mocks below mirror the real distinction the
// factory makes: max 20 + exemptFromRelax → ip-scoped; max 20 alone → backstop.
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: vi.fn(({ max, exemptFromRelax }: { max: number; exemptFromRelax?: boolean }) => {
                if (max === 20 && exemptFromRelax) {
                        // ip-scoped accountLimiter — counts FAILED attempts only (asserted in tests)
                        return {
                                check: async () => {
                                        accountState.count += 1;
                                        return { success: accountState.count <= max };
                                },
                        };
                }
                if (max === 20) {
                        // round91-D1/F2 username-only backstop — same failure-only semantics
                        // (dedicated ip-rotation proof: tests/unit/login-backstop.test.ts)
                        return {
                                check: async () => {
                                        backstopState.count += 1;
                                        return { success: backstopState.count <= max };
                                },
                        };
                }
                // loginLimiter (10/min) — always allow; tested separately
                return {
                        check: async () => {
                                loginState.count += 1;
                                return { success: true };
                        },
                };
        }),
}));

const VALID_PASSWORD = 'correct-password-hash';

function makeRequest(username: string, password: string): Request {
        return new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        'x-real-ip': '1.2.3.4',
                },
                body: JSON.stringify({ username, password }),
        });
}

describe('login lockout — account limiter counts only FAILED attempts', () => {
        beforeEach(() => {
                vi.clearAllMocks();
                accountState.count = 0;
                backstopState.count = 0;
                loginState.count = 0;
                mockFindUnique.mockResolvedValue({
                        id: 1,
                        username: 'admin',
                        password: VALID_PASSWORD,
                        name: 'Admin',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'PAID',
                });
                mockUpdate.mockResolvedValue({});
        });

        it('25 consecutive SUCCESSFUL logins all pass — no lockout ever', async () => {
                const { POST } = await import('@/app/api/auth/login/route');

                for (let i = 0; i < 25; i++) {
                        const res = await POST(makeRequest('admin', VALID_PASSWORD));
                        expect(res.status, `attempt ${i + 1} should succeed`).toBe(200);
                }
                // accountLimiter and the round91-D1/F2 backstop must never have been
                // called on successful logins
                expect(accountState.count).toBe(0);
                expect(backstopState.count).toBe(0);
        });

        it('21 consecutive FAILED logins — 21st returns 429 lockout', async () => {
                const { POST } = await import('@/app/api/auth/login/route');

                for (let i = 0; i < 20; i++) {
                        const res = await POST(makeRequest('admin', 'wrong-password'));
                        expect(res.status, `failed attempt ${i + 1} → 401`).toBe(401);
                }
                const twentyFirst = await POST(makeRequest('admin', 'wrong-password'));
                expect(twentyFirst.status).toBe(429);
                expect(accountState.count).toBe(21);
        });

        it('the trip moment writes ONE auth.lockout warning SystemEvent (round88-B7 — the audit write actually happens)', async () => {
                const { POST } = await import('@/app/api/auth/login/route');

                for (let i = 0; i < 20; i++) {
                        await POST(makeRequest('admin', 'wrong-password'));
                }
                const twentyFirst = await POST(makeRequest('admin', 'wrong-password'));

                expect(twentyFirst.status).toBe(429);
                // r94: before this, prisma.systemEvent was undefined in the mock —
                // prisma.systemEvent.create threw a TypeError that the empty catch
                // swallowed: green 429, ZERO audit events, invisible. The realistic
                // 21-failure journey (not the accountState.limit=0 shortcut of
                // audit-events.test.ts) must mint exactly ONE event at the trip.
                expect(mockSystemEventCreate).toHaveBeenCalledTimes(1);
                const data = mockSystemEventCreate.mock.calls[0][0].data;
                expect(data.eventType).toBe('auth.lockout');
                expect(data.severity).toBe('warning');
                expect(data.metadata).toMatchObject({
                        username: 'admin',
                        ip: '1.2.3.4',
                        // both the ip-scoped limiter and the backstop are over budget on
                        // the 21st → the event names the ip-scoped one
                        limiter: 'acct:ip:username',
                });
        });

        it('a successful login after failures does NOT consume the account budget', async () => {
                const { POST } = await import('@/app/api/auth/login/route');

                // 10 failed attempts
                for (let i = 0; i < 10; i++) {
                        await POST(makeRequest('admin', 'wrong-password'));
                }
                // successful login must not increment accountState (nor the
                // round91-D1/F2 username-only backstop — both burn failures only)
                const res = await POST(makeRequest('admin', VALID_PASSWORD));
                expect(res.status).toBe(200);
                expect(accountState.count).toBe(10);
                expect(backstopState.count).toBe(10);
        });
});
