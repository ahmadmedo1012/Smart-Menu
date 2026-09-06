/**
 * g90-F5b (T6) — تغطية وحدة لفرع السباق والفشل المغلق في
 * src/lib/rate-limit.ts:75-97 (round85-B5: مسار سعيد برحلة واحدة upsert،
 * وسباق القيد الفريد key_windowEnd → findUnique احتياطي، وفشل الاثنين →
 * success:false بلا استثناء يهرب).
 *
 * عزل المسح الاحتمالي (round90-F4): Math.random يُثبَّت على 1 في كل
 * الاختبارات — المسح الجدولي (findMany+deleteMany عند 1/32) مغطى حصريًا
 * في rate-limit-sweep.test.ts، وهنا نعزله حتى لا يلوّث قرارات الحد.
 *
 * كما نغطي منظّف الـ120s: المؤقت يُنشأ unref() (لا يمنع انتهاء العملية)
 * ويُطلق deleteMany للصفوف منتهية الصلاحية، وdestroy() يوقفه.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 0 }));
const mockUpsert = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 1 }));
const mockFindUnique = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockFindMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockLogWarn = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => ({
        rateLimitEntry: {
                deleteMany: mockDeleteMany,
                upsert: mockUpsert,
                findUnique: mockFindUnique,
                findMany: mockFindMany,
        },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma, getUserById: vi.fn(), withRetry: vi.fn() }));
vi.mock('@/lib/logger', () => ({
        warn: mockLogWarn,
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
}));

import { createDbRateLimiter } from '@/lib/rate-limit';

// ── الإعداد ─────────────────────────────────────────────────────────────

const T0 = Date.parse('2026-09-06T12:00:10.000Z'); // 10s داخل نافذة الدقيقة
const WINDOW = 60_000;
const bucketStart = Math.floor(T0 / WINDOW) * WINDOW;
const deadline = bucketStart + WINDOW; // محاذاة النافذة الثابتة (round-86)

/** خطأ بريسما P2002 كما يظهر فعليًا في سباق الإنشاء المتزامن. */
const p2002 = () =>
        Object.assign(new Error('Unique constraint failed on the fields: (`key`,`windowEnd`)'), {
                code: 'P2002',
                clientVersion: '5.0.0',
        });

let randomSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(T0);
        vi.clearAllMocks();
        // تحييد المسح الاحتمالي (round90-F4) — Math.random → 1 لا يطلقه أبدًا
        randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);
        mockUpsert.mockResolvedValue({ count: 1 });
        mockFindUnique.mockResolvedValue(null);
        mockFindMany.mockResolvedValue([]);
        mockDeleteMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
        if (randomSpy) randomSpy.mockRestore();
        vi.useRealTimers();
});

// ── فرع السباق: upsert يفشل → findUnique الاحتياطي ─────────────────────

describe('check — فرع السباق (P2002 على upsert → findUnique)', () => {
        it('upsert يرمي P2002 → القراءة الاحتياطية تُستخدم: success بقيمها الصحيحة', async () => {
                mockUpsert.mockRejectedValue(p2002());
                mockFindUnique.mockResolvedValue({ count: 7 });

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                const result = await limiter.check('race-key');

                expect(result.success).toBe(true);
                expect(result.remaining).toBe(3);
                expect(result.reset).toBe(deadline); // نفس محاذاة النافذة
                limiter.destroy();
        });

        it('القراءة الاحتياطية تستعلم المركّب key_windowEnd نفسه (المفتاح + موعد النافذة)', async () => {
                mockUpsert.mockRejectedValue(p2002());
                mockFindUnique.mockResolvedValue({ count: 2 });

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                await limiter.check('race-key');

                expect(mockFindUnique).toHaveBeenCalledWith({
                        where: { key_windowEnd: { key: 'race-key', windowEnd: new Date(deadline) } },
                        select: { count: true },
                });
                limiter.destroy();
        });

        it('عدّ السباق فوق الحد → success:false عبر المسار الاحتياطي أيضًا', async () => {
                mockUpsert.mockRejectedValue(p2002());
                mockFindUnique.mockResolvedValue({ count: 11 });

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                const result = await limiter.check('race-key');

                expect(result.success).toBe(false);
                expect(result.remaining).toBe(0);
                limiter.destroy();
        });

        it('التحذير «create race» يُسجَّل عند فشل upsert', async () => {
                mockUpsert.mockRejectedValue(p2002());
                mockFindUnique.mockResolvedValue({ count: 1 });

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                await limiter.check('race-key');

                expect(mockLogWarn).toHaveBeenCalledWith('create race', expect.anything());
                limiter.destroy();
        });
});

// ── الفشل المغلق: upsert وfindUnique كلاهما يفشل ───────────────────────

describe('check — الفشل المغلق (fail-closed)', () => {
        it('فشل الاثنين معًا → success:false وremaining:0 ولا يهرب أي استثناء', async () => {
                mockUpsert.mockRejectedValue(p2002());
                mockFindUnique.mockRejectedValue(new Error('db gone'));

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                const result = await limiter.check('doomed-key');

                expect(result.success).toBe(false);
                expect(result.remaining).toBe(0);
                expect(mockLogWarn).toHaveBeenCalledWith('count error — failing closed', expect.anything());
                limiter.destroy();
        });

        it('القراءة الاحتياطية ترجع null (الصف اختفى بين المحاولتين) → فشل مغلق كذلك', async () => {
                mockUpsert.mockRejectedValue(p2002());
                mockFindUnique.mockResolvedValue(null);

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                const result = await limiter.check('vanished-key');

                expect(result.success).toBe(false);
                expect(result.remaining).toBe(0);
                limiter.destroy();
        });

        it('الفشل المغلق لا يقتل النافذة: reset يبقى موعد النافذة الحالي (لا 0/بلا معنى)', async () => {
                mockUpsert.mockRejectedValue(new Error('connection timeout'));
                mockFindUnique.mockRejectedValue(new Error('connection timeout'));

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 5 });
                const result = await limiter.check('doomed-key');
                expect(result.reset).toBe(deadline);
                limiter.destroy();
        });
});

// ── منظّف الـ120s: unref + الإطلاق + destroy ───────────────────────────

describe('منظّف الـ120 ثانية — unref() لا يمنع انتهاء العملية', () => {
        it('المؤقت يُنشأ ثم يُستدعى unref() فورًا (handle حقيقي من المؤقتات المزيفة)', () => {
                const realSetInterval = globalThis.setInterval;
                const unrefSpies: Array<ReturnType<typeof vi.spyOn>> = [];
                const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(
                        ((fn: () => void, ms?: number) => {
                                const handle = realSetInterval(fn, ms) as unknown as {
                                        unref?: () => void;
                                };
                                if (handle && typeof handle === 'object' && typeof handle.unref === 'function') {
                                        unrefSpies.push(vi.spyOn(handle, 'unref'));
                                }
                                return handle;
                        }) as typeof setInterval,
                );

                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                setIntervalSpy.mockRestore();

                // المؤقت الوحيد المنشأ نال unref() — بذلك لا يحبس المؤقتُ العمليةَ
                expect(unrefSpies).toHaveLength(1);
                expect(unrefSpies[0]).toHaveBeenCalledOnce();
                limiter.destroy();
        });

        it('بعد 120s يطلق المسح: deleteMany للصفوف التي windowEnd <= الآن', async () => {
                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });

                mockDeleteMany.mockClear();
                await vi.advanceTimersByTimeAsync(120_000);

                expect(mockDeleteMany).toHaveBeenCalledTimes(1);
                const arg = mockDeleteMany.mock.calls[0][0];
                expect(arg.where.windowEnd.lte).toBeInstanceOf(Date);
                expect(arg.where.windowEnd.lte.getTime()).toBeGreaterThanOrEqual(T0);
                limiter.destroy();
        });

        it('destroy() يوقف المنظّف — لا مسح بعد التدمير', async () => {
                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });
                limiter.destroy();

                mockDeleteMany.mockClear();
                await vi.advanceTimersByTimeAsync(300_000);
                expect(mockDeleteMany).not.toHaveBeenCalled();
        });

        it('فشل المسح الدوري best-effort: لا يؤثر على قرار الحد ولا يرمي', async () => {
                mockDeleteMany.mockRejectedValue(new Error('sweep db down'));
                const limiter = createDbRateLimiter({ windowMs: WINDOW, max: 10 });

                await vi.advanceTimersByTimeAsync(120_000);

                const result = await limiter.check('after-sweep-fail');
                expect(result.success).toBe(true);
                limiter.destroy();
        });
});
