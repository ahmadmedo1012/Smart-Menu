/**
 * Session module tests (round86-D4) — the core auth module was at 6% coverage.
 *
 * Mocks: prisma (db) + next/headers cookies. Behavior under test:
 *  - createSession: SHA-256 token hashing (never stores the raw token),
 *    cookie flags (httpOnly/secure/sameSite), expired-session trimming
 *    + MAX_SESSIONS_PER_USER cap eviction (round94-3a: create+trim now
 *    share ONE $transaction and the cap counts the just-created row)
 *  - destroySession: deletes the row by hash, retries once on transient
 *    DB error (never silently leaves the row resurrectable), clears the
 *    cookie even for malformed tokens
 *  - validateSession: single joined query, expiry check + row cleanup,
 *    half-TTL renewal threshold (renew when <12h remain, skip when >12h),
 *    crash fail-closed, no-cookie fast path
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mocks (vi.hoisted — factories run before imports) ─────────────────────
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
                // round94-3a: createSession ينفّذ الإنشاء+القصّ داخل معاملة
                // واحدة — الـmock يسلم نفس الجواسيس لعميل المعاملة (نفس نمط
                // loyalty-referral.test.ts مع mockTransaction).
                $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
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
        // r98: session.validateSession صار يقرأ ترويسة Authorization: Bearer
        // (دعم تطبيق الموبايل c4951bb6) عند غياب الكوكي — الـ mock كان يعرّف
        // cookies فقط فانفجر المسار السريع «لا كوكي» بـ "No 'headers' export
        // is defined". ترويسات فارغة افتراضيًا: كل اختبارات الجلسة الحالية
        // بلا Bearer، والمسار يبقى كما اختُبر أصلاً (no cookie → invalid fast).
        headers: async () => new Headers(),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/logger', () => ({
        error: vi.fn(),
}));
vi.mock('@/lib/csrf', () => ({ mintCsrfToken: vi.fn(async () => 'csrf') }));

import { createSession, destroySession, validateSession } from '@/lib/session';
import { createHash } from 'node:crypto';

const SESSION_COOKIE = 'smart-menu-session';
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

beforeEach(() => {
        vi.clearAllMocks();
        cookieStore.clear();
        db.session.findMany.mockResolvedValue([]);
        db.session.create.mockResolvedValue({});
        db.session.deleteMany.mockResolvedValue({ count: 0 });
        db.session.delete.mockResolvedValue({});
        db.session.update.mockResolvedValue({});
        db.session.findUnique.mockResolvedValue(null);
});

describe('createSession', () => {
        it('stores ONLY the SHA-256 hash — the raw token appears just in the cookie', async () => {
                await createSession(7);
                const createArg = db.session.create.mock.calls[0][0].data;
                expect(createArg.token).toMatch(/^[0-9a-f]{64}$/);
                expect(createArg.token).not.toBe(cookieStore.get(SESSION_COOKIE)!.value);
                expect(createArg.token).toBe(hash(cookieStore.get(SESSION_COOKIE)!.value));
                expect(createArg.userId).toBe(7);
        });

        it('sets httpOnly, lax, path=/ cookie with 24h maxAge', async () => {
                await createSession(1);
                const opts = cookieStore.get(SESSION_COOKIE)!.opts;
                expect(opts.httpOnly).toBe(true);
                expect(opts.sameSite).toBe('lax');
                expect(opts.path).toBe('/');
                expect(opts.maxAge).toBe(86400);
        });

        it('secure flag follows NODE_ENV=production', async () => {
                const orig = process.env.NODE_ENV;
                (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
                try {
                        await createSession(1);
                        expect(cookieStore.get(SESSION_COOKIE)!.opts.secure).toBe(true);
                } finally {
                        (process.env as Record<string, string | undefined>).NODE_ENV = orig;
                }
        });

        it('trims expired sessions and evicts beyond the 5-session cap', async () => {
                // 6 active sessions (newest first) — the overflow beyond the cap
                // must be deleted (round94-3a: trim runs INSIDE the create tx,
                // AFTER the new row exists — the keep-set is the newest 4 OTHERS
                // + the protected just-created row = exactly 5)
                db.session.findMany.mockResolvedValue([
                        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 },
                ]);
                await createSession(9);
                expect(db.$transaction).toHaveBeenCalledTimes(1);
                expect(db.session.deleteMany).toHaveBeenCalledWith({
                        where: { userId: 9, expiresAt: { lte: expect.any(Date) } },
                });
                expect(db.session.deleteMany).toHaveBeenCalledWith({
                        where: { userId: 9, id: { notIn: [1, 2, 3, 4] }, token: { not: expect.any(String) } },
                });
        });
});

describe('destroySession', () => {
        it('deletes the row by token hash and clears the cookie', async () => {
                cookieStore.set(SESSION_COOKIE, { value: '11111111-1111-4111-8111-111111111111', opts: {} });
                await destroySession();
                expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { token: hash('11111111-1111-4111-8111-111111111111') } });
                expect(cookieStore.get(SESSION_COOKIE)!.opts.maxAge).toBe(0);
        });

        it('retries the delete once on a transient DB error', async () => {
                cookieStore.set(SESSION_COOKIE, { value: '11111111-1111-4111-8111-111111111111', opts: {} });
                db.session.deleteMany
                        .mockRejectedValueOnce(new Error('ECONNRESET'))
                        .mockResolvedValueOnce({ count: 1 });
                // r97-X4: كان الاختبار ينام 350ms حقيقية قبل الاستدعاء (والوحدة
                // تنتظر 300ms داخل إعادة المحاولة على مؤقتات حقيقية أيضًا) مع
                // تأكيد ضعيف `>=2`. الآن: مؤقتات وهمية scoped لهذا الاختبار فقط —
                // نقدّم نافذة إعادة المحاولة الداخلية (300ms) بالضبط، فيصبح
                // عدد الاستدعاءات حتميًا (2) والتأكيد صارمًا.
                vi.useFakeTimers();
                try {
                        const p = destroySession();
                        // advanceTimersByTimeAsync: the retry delay sits inside an
                        // async catch — the async variant flushes the microtasks
                        // (rejection → catch → setTimeout) around the timer window.
                        await vi.advanceTimersByTimeAsync(300);
                        await p;
                } finally {
                        vi.useRealTimers();
                }
                expect(db.session.deleteMany).toHaveBeenCalledTimes(2);
                const expectedArg = { where: { token: hash('11111111-1111-4111-8111-111111111111') } };
                expect(db.session.deleteMany).toHaveBeenNthCalledWith(1, expectedArg);
                expect(db.session.deleteMany).toHaveBeenNthCalledWith(2, expectedArg);
                // the cookie is still cleared after a successful retry
                expect(cookieStore.get(SESSION_COOKIE)!.opts.maxAge).toBe(0);
        });

        it('clears the cookie WITHOUT db access for a malformed token', async () => {
                cookieStore.set(SESSION_COOKIE, { value: '../../etc/passwd', opts: {} });
                await destroySession();
                expect(db.session.deleteMany).not.toHaveBeenCalled();
                expect(cookieStore.get(SESSION_COOKIE)!.opts.maxAge).toBe(0);
        });

        it('no cookie → clears nothing, deletes nothing', async () => {
                await destroySession();
                expect(db.session.deleteMany).not.toHaveBeenCalled();
        });
});

describe('validateSession', () => {
        it('no cookie → invalid fast path (no db round trip)', async () => {
                const res = await validateSession();
                expect(res).toEqual({ valid: false, userId: null });
                expect(db.session.findUnique).not.toHaveBeenCalled();
        });

        it('valid session returns the joined user (single query)', async () => {
                cookieStore.set(SESSION_COOKIE, { value: 'tok', opts: {} });
                // round89-B3: createdAt added to session mocks — validateSession now
                // enforces the 7-day absolute cap and reads session.createdAt.
                db.session.findUnique.mockResolvedValue({
                        id: 50,
                        userId: 9,
                        createdAt: new Date(Date.now() - 3600 * 1000),
                        expiresAt: new Date(Date.now() + 20 * 3600 * 1000), // 20h left — above half-TTL
                        user: { id: 9, role: 'owner', restaurantId: 3, subscriptionStatus: 'ACTIVE', permissions: [] },
                });
                const res = await validateSession();
                expect(res.valid).toBe(true);
                expect(res.userId).toBe(9);
                expect(res.user?.role).toBe('owner');
                // no renewal needed at 20h remaining
                expect(db.session.update).not.toHaveBeenCalled();
        });

        it('expired session is deleted and reported invalid', async () => {
                cookieStore.set(SESSION_COOKIE, { value: 'tok', opts: {} });
                db.session.findUnique.mockResolvedValue({
                        id: 51,
                        userId: 9,
                        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
                        expiresAt: new Date(Date.now() - 1000),
                        user: null,
                });
                const res = await validateSession();
                expect(res.valid).toBe(false);
                expect(db.session.delete).toHaveBeenCalledWith({ where: { id: 51 } });
        });

        it('renews only when under half the TTL remains', async () => {
                cookieStore.set(SESSION_COOKIE, { value: 'tok', opts: {} });
                db.session.findUnique.mockResolvedValue({
                        id: 52,
                        userId: 9,
                        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // day 2 — inside the 7d cap
                        expiresAt: new Date(Date.now() + 5 * 3600 * 1000), // 5h — under the 12h threshold
                        user: { id: 9, role: 'admin', restaurantId: null, subscriptionStatus: 'ACTIVE', permissions: [] },
                });
                await validateSession();
                expect(db.session.update).toHaveBeenCalledWith({
                        where: { id: 52 },
                        data: { expiresAt: expect.any(Date) },
                });
        });

        it('unknown token hash → invalid, no delete call', async () => {
                cookieStore.set(SESSION_COOKIE, { value: 'ghost', opts: {} });
                db.session.findUnique.mockResolvedValue(null);
                const res = await validateSession();
                expect(res.valid).toBe(false);
                expect(db.session.delete).not.toHaveBeenCalled();
        });

        it('DB crash → fail-closed invalid', async () => {
                cookieStore.set(SESSION_COOKIE, { value: 'tok', opts: {} });
                db.session.findUnique.mockRejectedValue(new Error('pool exhausted'));
                const res = await validateSession();
                expect(res.valid).toBe(false);
                expect(res.userId).toBeNull();
        });
});
