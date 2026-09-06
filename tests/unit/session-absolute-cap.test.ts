/**
 * round89-B3 (dx-4 #3) — absolute session lifetime cap tests.
 *
 * The session used to be a pure 24h sliding window with no end date: any
 * activity within 12h renewed it forever, so a stolen cookie stayed valid as
 * long as the thief kept using it. validateSession now hard-rejects any token
 * 7 days after createdAt — even when the sliding expiry was just renewed —
 * and the renewal itself clamps to the same createdAt+7d deadline.
 *
 * All time is controlled with fake timers (vi.setSystemTime) — no sleeps.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
const NOW = new Date('2026-09-06T12:00:00.000Z');

// ── mocks (same shape as session.test.ts) ───────────────────────────────
const { cookieStore, db } = vi.hoisted(() => {
        const cookieStore = new Map<string, { value: string; opts: Record<string, unknown> }>();
        const db = {
                session: {
                        deleteMany: vi.fn(),
                        findMany: vi.fn(),
                        create: vi.fn(),
                        delete: vi.fn(),
                        findUnique: vi.fn(),
                        update: vi.fn(),
                },
        };
        return { cookieStore, db };
});

vi.mock('next/headers', () => ({
        cookies: async () => ({
                get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name)!.value } : undefined),
                set: (name: string, value: string, opts: Record<string, unknown>) => {
                        cookieStore.set(name, { value, opts });
                },
        }),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/logger', () => ({
        error: vi.fn(),
}));
vi.mock('@/lib/csrf', () => ({ mintCsrfToken: vi.fn(async () => 'csrf') }));

import { validateSession } from '@/lib/session';

const SESSION_COOKIE = 'smart-menu-session';

function seedSession(s: {
        id: number;
        createdAt: Date;
        expiresAt: Date;
        userId?: number;
}) {
        db.session.findUnique.mockResolvedValue({
                id: s.id,
                userId: s.userId ?? 9,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                user: { id: s.userId ?? 9, role: 'owner', restaurantId: 3, subscriptionStatus: 'ACTIVE', permissions: [] },
        });
}

beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        cookieStore.clear();
        cookieStore.set(SESSION_COOKIE, { value: 'tok', opts: {} });
        db.session.delete.mockResolvedValue({});
        db.session.update.mockResolvedValue({});
        db.session.findUnique.mockResolvedValue(null);
});

afterEach(() => {
        vi.useRealTimers();
});

describe('validateSession — 7-day absolute cap (round89-B3)', () => {
        it('8-day-old token with a FRESHLY renewed sliding expiry is rejected and deleted', async () => {
                // the attacker scenario from dx-4 #3: continuous use kept sliding the
                // window — age 8d, expiry renewed 4h ago (20h left)
                seedSession({
                        id: 77,
                        createdAt: new Date(NOW.getTime() - 8 * DAY),
                        expiresAt: new Date(NOW.getTime() + 20 * HOUR),
                });

                const res = await validateSession();

                expect(res.valid).toBe(false);
                expect(res.userId).toBeNull();
                expect(db.session.delete).toHaveBeenCalledWith({ where: { id: 77 } });
        });

        it('exactly 7 days old → rejected (cap is inclusive)', async () => {
                seedSession({
                        id: 78,
                        createdAt: new Date(NOW.getTime() - 7 * DAY),
                        expiresAt: new Date(NOW.getTime() + 20 * HOUR),
                });

                const res = await validateSession();
                expect(res.valid).toBe(false);
                expect(db.session.delete).toHaveBeenCalledWith({ where: { id: 78 } });
        });

        it('6d23h59m old (just under the cap) with fresh expiry → still valid', async () => {
                seedSession({
                        id: 79,
                        createdAt: new Date(NOW.getTime() - 7 * DAY + 60 * 1000),
                        expiresAt: new Date(NOW.getTime() + 20 * HOUR),
                });

                const res = await validateSession();
                expect(res.valid).toBe(true);
                expect(res.userId).toBe(9);
                expect(db.session.delete).not.toHaveBeenCalled();
        });

        it('renewal under half-TTL is clamped to createdAt+7d, never beyond the cap', async () => {
                // day 6.5 of the session with 5h left → renewal triggers, but a naive
                // 24h slide would land at age 7.5d; the cap must clamp it to age 7d
                const createdAt = new Date(NOW.getTime() - 6.5 * DAY);
                seedSession({
                        id: 80,
                        createdAt,
                        expiresAt: new Date(NOW.getTime() + 5 * HOUR),
                });

                const res = await validateSession();

                expect(res.valid).toBe(true);
                expect(db.session.update).toHaveBeenCalledTimes(1);
                const newExpiry = db.session.update.mock.calls[0][0].data.expiresAt as Date;
                const absoluteDeadline = createdAt.getTime() + 7 * DAY;
                expect(newExpiry.getTime()).toBe(absoluteDeadline);
                expect(newExpiry.getTime()).toBeGreaterThan(NOW.getTime());
                // naive sliding (now+24h) would have exceeded the deadline by 12h
                expect(newExpiry.getTime()).toBeLessThan(NOW.getTime() + 24 * HOUR);
        });

        it('renewal on day 2 keeps the full 24h slide (cap is far away)', async () => {
                const createdAt = new Date(NOW.getTime() - 2 * DAY);
                seedSession({
                        id: 81,
                        createdAt,
                        expiresAt: new Date(NOW.getTime() + 5 * HOUR),
                });

                await validateSession();

                const newExpiry = db.session.update.mock.calls[0][0].data.expiresAt as Date;
                expect(newExpiry.getTime()).toBe(NOW.getTime() + 24 * HOUR);
        });

        it('a mid-life session (day 3, 20h left) needs no renewal — hot path untouched', async () => {
                seedSession({
                        id: 82,
                        createdAt: new Date(NOW.getTime() - 3 * DAY),
                        expiresAt: new Date(NOW.getTime() + 20 * HOUR),
                });

                const res = await validateSession();

                expect(res.valid).toBe(true);
                expect(db.session.update).not.toHaveBeenCalled();
        });

        it('expired-by-expiresAt short-circuits BEFORE the absolute-cap branch (order preserved)', async () => {
                seedSession({
                        id: 83,
                        createdAt: new Date(NOW.getTime() - 9 * DAY),
                        expiresAt: new Date(NOW.getTime() - 1000),
                });

                const res = await validateSession();
                expect(res.valid).toBe(false);
                expect(db.session.delete).toHaveBeenCalledTimes(1);
        });
});
