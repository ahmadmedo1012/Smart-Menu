/**
 * WARNING: In-memory rate limiter — **single-instance only**.
 * On Vercel serverless/edge, each cold-start gets its own Map, so this
 * provides zero actual rate enforcement across instances.
 *
 * Vercel's edge network (Firewall + WAF) handles global DDoS/throttling.
 * Only configure this if you have a shared store (Vercel KV / Redis).
 *
 * For production multi-instance deployments, use createDbRateLimiter()
 * which stores state in PostgreSQL via Prisma (RateLimitEntry model).
 * @see https://vercel.com/docs/security/vercel-waf
 */

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

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { windowMs, max } = config;
  const hits = new Map<string, { count: number; resetAt: number }>();
  let destroyed = false;

  // Periodic cleanup every 60s to prevent memory leaks
  const interval = setInterval(() => {
    if (destroyed) { clearInterval(interval); return; }
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, 60_000);
  if (typeof interval === "object" && "unref" in interval) interval.unref();

  return {
    check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count++;
      return Promise.resolve({
        success: entry.count <= max,
        remaining: Math.max(0, max - entry.count),
        reset: entry.resetAt,
      });
    },
    destroy() {
      destroyed = true;
      clearInterval(interval);
      hits.clear();
    },
  };
}

// ponytail: DB-backed rate limiter stores state in PostgreSQL via Prisma (RateLimitEntry model).
// Use for multi-instance deployments (Vercel serverless).
import { prisma } from "./db";

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
      await prisma.rateLimitEntry.deleteMany({
        where: { key, windowEnd: { lte: new Date(now) } },
      }).catch(() => {});

      // Record this attempt
      await prisma.rateLimitEntry.create({
        data: { key, windowEnd: deadline },
      }).catch(() => {}); // sink unique-constraint races

      // Count attempts in current window
      const count = await prisma.rateLimitEntry.count({
        where: { key, windowEnd: { gt: new Date(now) } },
      });

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
