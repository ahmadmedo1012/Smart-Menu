/**
 * Round89-A3/A4 — envelope consistency for the two admin/demo utilities
 * that used to deviate from the api-helpers shape (dx-1 ب-1/ب-2):
 *   - POST /api/demo/fix-images: failure returned HTTP 200 + `message` key
 *     (and the production block had no success key) → now {success:false,error}
 *     with the real status code.
 *   - POST /api/seed: `apiError(e.message, 500)` leaked raw Prisma errors to
 *     the client → now a generic Arabic message, raw error server-side only,
 *     and success uses the standard {success,data} envelope.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockPlanFindFirst = vi.hoisted(() => vi.fn());
const mockPlanCreate = vi.hoisted(() => vi.fn());
const mockPlanUpdate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRestaurantFindUnique = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        subscriptionPlan: { findFirst: mockPlanFindFirst, create: mockPlanCreate, update: mockPlanUpdate },
        user: { findUnique: mockUserFindUnique },
        restaurant: { findUnique: mockRestaurantFindUnique },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth', () => ({
        requireAdmin: vi.fn(async () => ({ authorized: true, role: 'admin', userId: 1 })),
        requireAuth: vi.fn(async () => ({ authorized: true, role: 'admin', userId: 1 })),
}));
vi.mock('@/lib/hash', () => ({ hashPassword: () => 'hashed' }));
beforeEach(() => {
        vi.clearAllMocks();
        mockPlanFindFirst.mockResolvedValue({ id: 1, name: 'Free' }); // existing → update path
        mockUserFindUnique.mockResolvedValue({ id: 1, username: 'admin' }); // admin exists
});

// ────────────────────────────────────────────────────────────────────────

describe('POST /api/seed — envelope + no internal leak (round89-A4)', () => {
        it('success → standard {success:true,data} envelope (was bare {message})', async () => {
                const { POST } = await import('@/app/api/seed/route');
                const res = await POST();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toBe('تم تحديث الخطط بنجاح — خططتان (مجاني + مدفوعة)');
                // both plans upserted, admin untouched (exists)
                expect(mockPlanUpdate).toHaveBeenCalledTimes(2);
                expect(mockPlanCreate).not.toHaveBeenCalled();
                expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { username: 'admin' } });
        });

        it('unauthenticated caller → 401 envelope, zero writes', async () => {
                const { requireAdmin } = await import('@/lib/auth');
                vi.mocked(requireAdmin).mockResolvedValueOnce({
                        authorized: false,
                        status: 401,
                        error: 'غير مصرح',
                } as never);

                const { POST } = await import('@/app/api/seed/route');
                const res = await POST();

                expect(res.status).toBe(401);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('غير مصرح');
                expect(mockPlanUpdate).not.toHaveBeenCalled();
        });

        it('round91-F-B (D2-#3): logged-in wrong-role caller → 403 (401 is no-session-only now)', async () => {
                const { requireAdmin } = await import('@/lib/auth');
                vi.mocked(requireAdmin).mockResolvedValueOnce({
                        authorized: false,
                        status: 403,
                        error: 'لا تملك الصلاحية',
                } as never);

                const { POST } = await import('@/app/api/seed/route');
                const res = await POST();

                expect(res.status).toBe(403);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('لا تملك الصلاحية');
                expect(mockPlanUpdate).not.toHaveBeenCalled();
        });

        it('prisma failure → generic Arabic 500, raw error NEVER reaches the client', async () => {
                const rawInternal = 'Prisma internal: Invalid `prisma.subscriptionPlan.findFirst()` invocation at engine.ts — connection refused to postgres://user:secret@host/db';
                mockPlanFindFirst.mockRejectedValueOnce(new Error(rawInternal));
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

                const { POST } = await import('@/app/api/seed/route');
                const res = await POST();

                expect(res.status).toBe(500);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('تعذر تنفيذ البذور — حدث خطأ داخلي');
                // the leaked message class (old behavior: apiError(e.message, 500))
                const body = JSON.stringify(json);
                expect(body).not.toContain('Prisma internal');
                expect(body).not.toContain('secret');
                // raw error stays server-side: logged via the project logger
                expect(consoleSpy).toHaveBeenCalled();
                const logged = consoleSpy.mock.calls.map((c) => JSON.stringify(c)).join(' ');
                expect(logged).toContain('Prisma internal');
                consoleSpy.mockRestore();
        });
});

// ────────────────────────────────────────────────────────────────────────

describe('POST /api/demo/fix-images — failure envelope (round89-A3)', () => {
        it('demo restaurant missing → 404 {success:false,error} (was HTTP 200 + `message` key)', async () => {
                mockRestaurantFindUnique.mockResolvedValue(null);

                const { POST } = await import('@/app/api/demo/fix-images/route');
                const res = await POST();

                expect(res.status).toBe(404);
                const json = await res.json();
                expect(json.success).toBe(false);
                expect(json.error).toBe('المطعم التجريبي غير موجود');
                expect(json).not.toHaveProperty('message');
        });

        it('production block → 404 standard envelope (was bare {error:"Not found"})', async () => {
                // NODE_ENV is readonly in Next's env typings — mutate through a widened view
                const envView = process.env as Record<string, string | undefined>;
                const previous = envView.NODE_ENV;
                envView.NODE_ENV = 'production';
                try {
                        const { POST } = await import('@/app/api/demo/fix-images/route');
                        const res = await POST();

                        expect(res.status).toBe(404);
                        const json = await res.json();
                        expect(json.success).toBe(false);
                        expect(json.error).toBe('غير موجود');
                } finally {
                        envView.NODE_ENV = previous;
                }
        });

        afterEach(() => {
                // route module caches nothing env-dependent, but keep isolation explicit
                vi.resetModules();
        });
});
