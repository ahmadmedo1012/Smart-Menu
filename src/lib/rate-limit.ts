// DB-backed rate limiter stores state in PostgreSQL via Prisma (RateLimitEntry model).
// All public mutation endpoints use this — single source of truth across Vercel instances.
import { prisma } from "./db";
import { warn as logWarn } from "./logger";

interface RateLimiterConfig {
  windowMs: number;
  max: number;
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
  const { windowMs, max } = config;
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

      // Best-effort cleanup of expired entries for this key
      try {
        await prisma.rateLimitEntry.deleteMany({
          where: { key, windowEnd: { lte: new Date(now) } },
        });
      } catch (e) {
        logWarn("cleanup error", { error: String(e) });
      }

      // Record this attempt — single row per (key, windowEnd) via the unique
      // constraint; the count column accumulates attempts.
      try {
        await prisma.rateLimitEntry.upsert({
          where: {
            key_windowEnd: { key, windowEnd: deadline },
          },
          create: { key, windowEnd: deadline, count: 1 },
          update: { count: { increment: 1 } },
        });
      } catch (e) {
        // unique-constraint race is expected under concurrency
        logWarn("create race", { error: String(e) });
      }

      // Attempts in current window — read the accumulated count directly.
      // The (key, windowEnd) pair is unique, so count() returns either 0 or 1
      // row whose count column holds all attempts in this window.
      let count = max + 1; // fail closed on DB error
      try {
        count = await prisma.rateLimitEntry.count({
          where: { key, windowEnd: deadline },
        });
      } catch (e) {
        logWarn("count error — failing closed", { error: String(e) });
      }

      return {
        success: count <= max,
        remaining: Math.max(0, max - count),
        reset: deadline.getTime(),
      };
    },
    destroy() {
      destroyed = true;
      clearInterval(interval);
    },
  };
}
