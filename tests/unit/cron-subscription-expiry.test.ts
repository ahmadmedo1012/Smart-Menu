/**
 * Round89-D1 (w1-d1) — GET /api/cron/subscription-expiry unit coverage
 * (was 0% lcov — the scheduled money downgrade, 46 lines).
 *
 * Mocked prisma + logger; the REAL timingSafeBearer (secure-compare) runs —
 * the constant-time bearer gate is exactly what these tests exercise.
 * CRON_SECRET is set/deleted per test (read at request time by the route).
 *
 * Behaviors read from the route source:
 *   - fail-closed: missing secret / missing header / wrong token → 401
 *     {error:'Unauthorized'} (no success envelope — documented cron shape)
 *   - correct Bearer secret: PAID users whose restaurant planEnd < now are
 *     flipped to EXPIRED via ONE updateMany; {expired: N} returned
 *   - nothing expired → {expired: 0} with NO updateMany call (no-op)
 *   - DB failure → 500 'Expiry job failed' + logged
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserUpdateMany = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        user: { findMany: mockUserFindMany, updateMany: mockUserUpdateMany },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
        error: mockLogError,
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const SECRET = 'cron-secret-round89';

async function callCron(authorization?: string) {
        const { GET } = await import('@/app/api/cron/subscription-expiry/route');
        const req = new NextRequest('http://localhost/api/cron/subscription-expiry', {
                method: 'GET',
                ...(authorization ? { headers: { authorization } } : {}),
        });
        return GET(req);
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = SECRET;
        mockUserFindMany.mockResolvedValue([]);
        mockUserUpdateMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
        if (originalSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = originalSecret;
});

describe('GET /api/cron/subscription-expiry — bearer gate (fail-closed)', () => {
        it('CRON_SECRET not configured → 401 regardless of the header', async () => {
                delete process.env.CRON_SECRET;

                const res = await callCron(`Bearer ${SECRET}`);

                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.error).toBe('Unauthorized');
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });

        it('missing authorization header → 401', async () => {
                const res = await callCron();

                expect(res.status).toBe(401);
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });

        it('wrong bearer token → 401 (also wrong-length tokens, no DB call)', async () => {
                const wrongToken = await callCron('Bearer wrong-token');
                const wrongLength = await callCron(`Bearer ${SECRET}x`);
                const wrongScheme = await callCron(`Basic ${SECRET}`);

                expect(wrongToken.status).toBe(401);
                expect(wrongLength.status).toBe(401);
                expect(wrongScheme.status).toBe(401);
                expect(mockUserFindMany).not.toHaveBeenCalled();
        });
});

describe('GET /api/cron/subscription-expiry — the money downgrade', () => {
        it('expired PAID users → flipped to EXPIRED in ONE updateMany, {expired: N}', async () => {
                mockUserFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

                const res = await callCron(`Bearer ${SECRET}`);

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json).toEqual({ expired: 2 });

                // the scan: PAID users with any restaurant planEnd in the past
                expect(mockUserFindMany).toHaveBeenCalledWith({
                        where: {
                                subscriptionStatus: 'PAID',
                                restaurants: { some: { restaurant: { planEnd: { lt: expect.any(Date) } } } },
                        },
                        select: { id: true },
                });
                expect(mockUserUpdateMany).toHaveBeenCalledWith({
                        where: { id: { in: [1, 2] } },
                        data: { subscriptionStatus: 'EXPIRED' },
                });
        });

        it('nothing expired → {expired: 0} with NO downgrade call (no-op)', async () => {
                mockUserFindMany.mockResolvedValue([]);

                const res = await callCron(`Bearer ${SECRET}`);

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json).toEqual({ expired: 0 });
                expect(mockUserUpdateMany).not.toHaveBeenCalled();
        });

        it('DB failure → 500 Expiry job failed + logged', async () => {
                mockUserFindMany.mockRejectedValue(new Error('connection refused'));

                const res = await callCron(`Bearer ${SECRET}`);

                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.error).toBe('Expiry job failed');
                expect(mockLogError).toHaveBeenCalledWith(
                        'cron: subscription expiry',
                        { error: expect.stringContaining('connection refused') }
                );
                expect(mockUserUpdateMany).not.toHaveBeenCalled();
        });
});
