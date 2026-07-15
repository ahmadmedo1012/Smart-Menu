// DB-backed rate limiter stores state in PostgreSQL via Prisma (RateLimitEntry model).
// All public mutation endpoints use this — single source of truth across Vercel instances.
import { prisma } from "./db";

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
      const deadline = new Date(now + windowMs);

      // Best-effort cleanup of expired entries for this key
      try {
        await prisma.rateLimitEntry.deleteMany({
          where: { key, windowEnd: { lte: new Date(now) } },
        });
      } catch (e) {
        console.warn("[rate-limit] cleanup error:", e);
      }

      // Record this attempt
      try {
        await prisma.rateLimitEntry.create({
          data: { key, windowEnd: deadline },
        });
      } catch (e) {
        // unique-constraint race is expected under concurrency
        console.debug("[rate-limit] create race:", e);
      }

      // Count attempts in current window
      let count = max + 1; // fail closed on DB error
      try {
        count = await prisma.rateLimitEntry.count({
          where: { key, windowEnd: { gt: new Date(now) } },
        });
      } catch (e) {
        console.warn("[rate-limit] count error — failing closed:", e);
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
