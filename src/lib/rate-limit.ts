// DB-backed rate limiter stores state in PostgreSQL via Prisma (RateLimitEntry model).
// All public mutation endpoints use this — single source of truth across Vercel instances.
import { prisma } from "./db";
import { warn as logWarn } from "./logger";

interface RateLimiterConfig {
  windowMs: number;
  max: number;
  /** Keep the real budget even under RATE_LIMIT_RELAX (e.g. account lockout limiters asserted by e2e). */
  exemptFromRelax?: boolean;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  destroy(): void;
}

export function createDbRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { windowMs, max, exemptFromRelax } = config;
  // Dev-only relief: local e2e suites share one origin (127.0.0.1) across
  // many projects and exhaust the per-IP bucket within a minute. Production
  // (Vercel sets NODE_ENV=production) keeps the real limits.
  const isRelaxed =
    process.env.NODE_ENV !== "production" &&
    process.env.RATE_LIMIT_RELAX === "1" &&
    !exemptFromRelax;
  const effectiveMax = isRelaxed ? Math.max(20, max * 200) : max;
  let destroyed = false;

  // Periodic cleanup of expired entries every 120s
  const interval = setInterval(async () => {
    if (destroyed) { clearInterval(interval); return; }
    try {
      await prisma.rateLimitEntry.deleteMany({
        where: { windowEnd: { lte: new Date() } },
      });
    } catch { /* best effort cleanup */ }
  }, 120_000);
  if (typeof interval === "object" && "unref" in interval) interval.unref();

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      // Fixed window bucket: align windowEnd to the start of the current window
      // so all requests within the same window share ONE (key, windowEnd) row.
      // (round-86: deadline was now+windowMs per request → every request got a
      // different windowEnd → unique(key,windowEnd) created a new row each time
      // → count never accumulated → limiter never blocked.)
      const bucketStart = Math.floor(now / windowMs) * windowMs;
      const deadline = new Date(bucketStart + windowMs);

      // round85-B5: happy path is a SINGLE round trip — the upsert returns the
      // updated row, so the separate findUnique read is gone (3 queries → 1).
      // The old per-check deleteMany cleanup is likewise gone: the 120s global
      // interval above already reaps every expired row, and a probabilistic
      // 1-in-32 sweep keeps the long tail from piling up without costing a
      // query on every request.
      let count: number | null = null;
      try {
        const entry = await prisma.rateLimitEntry.upsert({
          where: {
            key_windowEnd: { key, windowEnd: deadline },
          },
          create: { key, windowEnd: deadline, count: 1 },
          update: { count: { increment: 1 } },
          select: { count: true },
        });
        count = entry.count;
      } catch (e) {
        // unique-constraint race under concurrency (two creators of the same
        // bucket row) — the row exists, read it back as the fallback.
        logWarn("create race", { error: String(e) });
        try {
          const entry = await prisma.rateLimitEntry.findUnique({
            where: { key_windowEnd: { key, windowEnd: deadline } },
            select: { count: true },
          });
          count = entry?.count ?? null;
        } catch (e2) {
          logWarn("count error — failing closed", { error: String(e2) });
        }
      }

      if (count === null) {
        // fail closed on DB error (both upsert and read failed)
        count = max + 1;
      }

      // Probabilistic hygiene sweep (1/32 checks) — replaces the old
      // unconditional deleteMany that cost a round trip on EVERY check.
      if (Math.random() < 1 / 32) {
        try {
          await prisma.rateLimitEntry.deleteMany({
            where: { key, windowEnd: { lte: new Date(now) } },
          });
        } catch { /* best effort */ }
      }

      return {
        success: count <= effectiveMax,
        remaining: Math.max(0, effectiveMax - count),
        reset: deadline.getTime(),
      };
    },
    destroy() {
      destroyed = true;
      clearInterval(interval);
    },
  };
}
