// Round 91 D1/F2 — account-lockout backstop (username-only key).
//
// D1 proved live (§2.1) that on non-Vercel deployments a client ROTATES spoofed
// X-Real-Ip / X-Forwarded-For values and every rotation mints a fresh
// `${ip}:${username}` loginLimiter bucket AND a fresh `acct:${ip}:${username}`
// accountLimiter bucket — three spoofed headers produced three distinct
// RateLimitEntry rows, i.e. unlimited online password brute-force. The fix
// (round91-D1/F2) adds a SECOND limiter keyed on username ALONE
// (`acct:${username}`, 20 failures / 15 min) checked on the same
// failure-only path as the ip-scoped limiter.
//
// These tests PROVE the rotation no longer works: the limiter mock below is
// KEY-AWARE (one bucket per key, exactly like the real RateLimitEntry
// (key, windowEnd) rows) so fresh IP spellings genuinely produce fresh per-IP
// buckets — and the account must still lock at the username-only budget.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockSystemEventCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockCreateSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLogAudit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotifyEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// Keyed limiter state: Map<key, count> — mirrors the real DB rows and makes
// ip-rotation observable (per-IP buckets stay tiny, username bucket climbs).
const buckets = vi.hoisted(() => new Map<string, number>());

vi.mock('@/lib/db', () => ({
        prisma: {
                user: { findUnique: mockFindUnique, update: mockUpdate },
                systemEvent: { create: mockSystemEventCreate },
        },
}));
vi.mock('@/lib/hash', () => ({
        verifyHash: vi.fn((pw: string, stored: string) => pw === stored),
        needsRehash: vi.fn(() => false),
        hashPassword: vi.fn(() => '600000:mocksalt:mockhash'),
}));
vi.mock('@/lib/session', () => ({ createSession: mockCreateSession }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/telegram', () => ({ notifyEvent: mockNotifyEvent }));
vi.mock('@/lib/logger', () => ({ error: vi.fn() }));

// Every limiter created by the route shares this KEY-AWARE fake: each key
// counts independently up to its own max, like createDbRateLimiter against
// real Postgres. This is what lets the tests distinguish "fresh ip minted a
// fresh bucket" from "the username bucket hit its budget".
vi.mock('@/lib/rate-limit', () => ({
        createDbRateLimiter: vi.fn(({ max }: { max: number; windowMs: number }) => ({
                check: async (key: string) => {
                        const count = (buckets.get(key) ?? 0) + 1;
                        buckets.set(key, count);
                        return { success: count <= max, remaining: Math.max(0, max - count), reset: 0 };
                },
                destroy: () => {},
        })),
}));

const STORED = 'real-hash';

function makeRequest(username: string, password: string, ip: string): Request {
        return new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
                body: JSON.stringify({ username, password }),
        });
}

describe('login backstop (round91-D1/F2) — username-only lockout survives IP rotation', () => {
        beforeEach(() => {
                vi.clearAllMocks();
                buckets.clear();
                // Deterministic trust model for getClientIp: non-Vercel, default
                // TRUST_PROXY_DEPTH=1 → x-real-ip is honored (the spoof surface).
                delete process.env.VERCEL;
                delete process.env.TRUST_PROXY_DEPTH;
                mockFindUnique.mockResolvedValue({
                        id: 7,
                        username: 'victim',
                        password: STORED,
                        name: 'Victim',
                        role: 'owner',
                        restaurantId: 1,
                        subscriptionStatus: 'PAID',
                });
                mockUpdate.mockResolvedValue({});
        });
        afterEach(() => {
                delete process.env.VERCEL;
                delete process.env.TRUST_PROXY_DEPTH;
        });

        it('20 failed logins across 5 rotating spoofed IPs → all 401; the 21st (fresh IP) still locks via acct:<username> → 429', async () => {
                const { POST } = await import('@/app/api/auth/login/route');
                const spoofedIps = [
                        '198.18.0.101',
                        '198.18.0.102',
                        '198.18.0.103',
                        '198.18.0.104',
                        '198.18.0.105',
                ];

                // The D1 §2.1 attack shape: every attempt from a DIFFERENT spoofed
                // header value — each per-IP bucket only ever sees 4 counts, so the
                // per-IP limiters never trip.
                for (let i = 0; i < 20; i++) {
                        const res = await POST(makeRequest('victim', 'wrong-password', spoofedIps[i % 5]));
                        expect(res.status, `attempt ${i + 1} from ${spoofedIps[i % 5]} → 401`).toBe(401);
                }

                // The 21st attempt from a SIXTH fresh IP must still be locked: the
                // username-only backstop bucket hit its 20 budget regardless of IP.
                const twentyFirst = await POST(makeRequest('victim', 'wrong-password', '198.18.0.106'));
                expect(twentyFirst.status).toBe(429);
                const json = await twentyFirst.json();
                expect(json.error).toBe('تم قفل الحساب مؤقتاً لكثرة المحاولات الفاشلة. حاول لاحقاً.');

                // Proof of WHICH budgets burned: every per-IP bucket sat at 4/20,
                // only the username-only bucket reached the budget.
                expect(buckets.get('acct:victim')).toBe(21);
                for (const ip of spoofedIps) {
                        expect(buckets.get(`acct:${ip}:victim`)).toBe(4);
                        expect(buckets.get(`${ip}:victim`)).toBe(4); // loginLimiter 10/min: fresh per IP too
                }
        });

        it('backstop trip writes ONE auth.lockout SystemEvent naming the acct:username limiter', async () => {
                // Pre-fill the username-only bucket to its budget (the per-IP
                // buckets are fresh — only the backstop denies).
                buckets.set('acct:victim', 20);

                const { POST } = await import('@/app/api/auth/login/route');
                const res = await POST(makeRequest('victim', 'wrong-password', '9.9.9.9'));

                expect(res.status).toBe(429);
                expect(mockSystemEventCreate).toHaveBeenCalledTimes(1);
                const data = mockSystemEventCreate.mock.calls[0][0].data;
                expect(data.eventType).toBe('auth.lockout');
                expect(data.severity).toBe('warning');
                // round91-D1/F2: the feed names which limiter tripped — here the
                // ip-scoped one allowed (fresh bucket), the backstop denied.
                expect(data.metadata).toMatchObject({ username: 'victim', limiter: 'acct:username' });
        });

        it('a successful login never burns backstop budget (failure-only semantics preserved)', async () => {
                const { POST } = await import('@/app/api/auth/login/route');

                // 19 failures from 19 DIFFERENT rotating IPs
                for (let i = 0; i < 19; i++) {
                        await POST(makeRequest('victim', 'wrong-password', `198.18.1.${i + 1}`));
                }
                expect(buckets.get('acct:victim')).toBe(19);

                // A correct login now must succeed and leave the backstop at 19 —
                // success must not consume the 20th (lockout-triggering) slot.
                const res = await POST(makeRequest('victim', STORED, '1.2.3.4'));
                expect(res.status).toBe(200);
                expect(buckets.get('acct:victim')).toBe(19);
        });

        it('UNLIMITED rotation (30 distinct IPs, never reused) still locks at 21 — no per-IP bucket ever exceeds 1', async () => {
                // Stronger than the cycling test above: the attacker never reuses
                // an IP spelling, so every per-IP bucket (login + ip-scoped account)
                // is used exactly ONCE — the pre-fix limiter surface alone would let
                // this run forever. The username-only backstop is what stops it.
                const { POST } = await import('@/app/api/auth/login/route');

                for (let i = 0; i < 20; i++) {
                        const res = await POST(makeRequest('victim', 'wrong-password', `198.18.${i}.50`));
                        expect(res.status, `attempt ${i + 1} → 401`).toBe(401);
                }
                // attempts 21..30 — every one from another fresh IP, every one locked
                for (let i = 20; i < 30; i++) {
                        const res = await POST(makeRequest('victim', 'wrong-password', `198.18.${i}.50`));
                        expect(res.status, `attempt ${i + 1} → 429 (locked)`).toBe(429);
                }

                // Every per-IP bucket was touched exactly once; only the username
                // bucket accumulated — 30 checks, denied from #21.
                let perIpBuckets = 0;
                for (const [key, count] of buckets) {
                        if (key === 'acct:victim') continue;
                        expect(count, `per-IP bucket ${key} used exactly once`).toBe(1);
                        perIpBuckets += 1;
                }
                expect(perIpBuckets).toBe(60); // 30 login keys + 30 ip-scoped keys
                expect(buckets.get('acct:victim')).toBe(30);
        });
});
