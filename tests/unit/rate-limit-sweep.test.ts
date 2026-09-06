/**
 * round90-F4 (red-team r90-D2) — unit coverage for the probabilistic
 * TABLE-level sweep in src/lib/rate-limit.ts.
 *
 * The old per-key sweep (deleteMany({ key, windowEnd <= now })) could never
 * collect single-use keys (acct:ip:username, claim:ip, link-token:…) — their
 * rows expired unseen and piled up ~14K rows/day on serverless where the
 * 120s interval doesn't run reliably. The sweep is now table-level and
 * BOUNDED: findMany a capped id list of rows expired past retention, then
 * deleteMany by exact ids. Fail-closed limit behavior is untouched — a sweep
 * failure never affects the decision.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks (same shape as rate-limit.test.ts) ───────────────────────────

const mockDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 0 }));
const mockUpsert = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 1 }));
const mockFindUnique = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockFindMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));

const mockPrisma = vi.hoisted(() => ({
  rateLimitEntry: {
    deleteMany: mockDeleteMany,
    upsert: mockUpsert,
    findUnique: mockFindUnique,
    findMany: mockFindMany,
  },
}));

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }));

import { createDbRateLimiter } from '@/lib/rate-limit';

describe('rate-limit — probabilistic table-level sweep (round90-F4)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ count: 1 });
    mockFindMany.mockResolvedValue([]);
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    if (randomSpy) randomSpy.mockRestore();
    vi.useRealTimers();
  });

  it('sweep fires on a ~1/32 hit (Math.random → 0) and deletes the BOUNDED stale batch by exact ids', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001);
    const before = Date.now();
    mockFindMany.mockResolvedValue([{ id: 5 }, { id: 9 }, { id: 12 }]);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    const result = await limiter.check('acct:1.2.3.4:ahmed');

    // the limit decision itself is unaffected
    expect(result.success).toBe(true);

    // bounded scan: capped take + retention cutoff (windowEnd lt now - 60s)
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const scanArg = mockFindMany.mock.calls[0][0];
    expect(scanArg.select).toEqual({ id: true });
    expect(scanArg.take).toBe(512);
    const cutoff = scanArg.where.windowEnd.lt as Date;
    expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - 59_000);
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - 61_000);

    // delete by exact ids — table-level, NOT the old per-key form
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: [5, 9, 12] } } });
    limiter.destroy();
  });

  it('sweep is skipped otherwise (Math.random → high) — no scan, no delete', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9999);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    await limiter.check('claim:1.2.3.4');

    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockDeleteMany).not.toHaveBeenCalled();
    limiter.destroy();
  });

  it('sweep failure is best-effort — the check still succeeds (fail-closed decision untouched)', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001);
    mockFindMany.mockRejectedValue(new Error('db hiccup'));

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    const result = await limiter.check('link-token:abc');

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
    limiter.destroy();
  });

  it('empty stale scan performs no delete round-trip', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001);
    mockFindMany.mockResolvedValue([]);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    await limiter.check('k');

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockDeleteMany).not.toHaveBeenCalled();
    limiter.destroy();
  });

  it('REGRESSION: the sweep is table-level — no per-key deleteMany form is issued', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001);
    mockFindMany.mockResolvedValue([{ id: 1 }]);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    await limiter.check('order:9.9.9.9');

    const deleteArg = mockDeleteMany.mock.calls[0][0];
    // old (removed) form was { where: { key, windowEnd: { lte } } }
    expect(deleteArg.where).not.toHaveProperty('key');
    expect(deleteArg.where).toEqual({ id: { in: [1] } });
    limiter.destroy();
  });
});
