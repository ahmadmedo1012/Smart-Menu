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
  check(key: string): RateLimitResult;
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { windowMs, max } = config;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodic cleanup every 60s to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, 60_000);
  if (typeof interval === "object" && "unref" in interval) interval.unref();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count++;
      return {
        success: entry.count <= max,
        remaining: Math.max(0, max - entry.count),
        reset: entry.resetAt,
      };
    },
  };
}
