/**
 * r119-B1 regression tests.
 *
 * 1. rate-limit failOpen (S3-P2-1): the telegram webhook limiter must fail
 *    OPEN on a DB outage (count=0 → allow) while the default stays fail-closed
 *    (count=max+1 → deny). A fail-closed webhook limiter 429s verified
 *    Telegram updates during a Neon blip → Telegram re-delivers non-2xx →
 *    the recovery burst re-trips the cap → updates dropped permanently
 *    (the r116 «تمت معالجة هذا الطلب مسبقاً» incident class, DB-degraded leg).
 *
 * 2. bg-task runAfterResponse (S3-P2-4): outside a request scope (unit tests,
 *    scripts) next/server's after() throws E468 — the fallback must run the
 *    task immediately and never let a rejection escape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    rateLimitEntry: {
      // DB fully down: both the upsert and the fallback read reject.
      upsert: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      findUnique: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));
vi.mock('@/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }));

import { createDbRateLimiter } from '@/lib/rate-limit';
import { runAfterResponse } from '@/lib/bg-task';

describe('r119 rate-limit failOpen', () => {
  it('default (failOpen absent): DB outage → DENY (fail-closed, unchanged)', async () => {
    const rl = createDbRateLimiter({ windowMs: 60_000, max: 30 });
    const res = await rl.check('key-closed');
    expect(res.success).toBe(false);
    rl.destroy();
  });

  it('failOpen: true — DB outage → ALLOW (webhook posture)', async () => {
    const rl = createDbRateLimiter({ windowMs: 30_000, max: 120, failOpen: true });
    const res = await rl.check('webhook:1.2.3.4');
    expect(res.success).toBe(true);
    rl.destroy();
  });
});

describe('r119 runAfterResponse fallback', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('runs the task immediately outside a request scope', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    runAfterResponse(task);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('never lets a rejecting task escape (caller response stays committed)', async () => {
    const task = vi.fn().mockRejectedValue(new Error('transport down'));
    expect(() => runAfterResponse(task)).not.toThrow();
    // give the swallowed microtask a tick so vitest doesn't flag an unhandled rejection
    await new Promise((r) => setTimeout(r, 10));
  });
});
