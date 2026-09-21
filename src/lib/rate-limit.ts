// DB-backed rate limiter stores state in PostgreSQL via Prisma (RateLimitEntry model).
// All public mutation endpoints use this — single source of truth across Vercel instances.
import { prisma } from "./db";
import { warn as logWarn } from "./logger";

interface RateLimiterConfig {
  windowMs: number;
  max: number;
  /** Keep the real budget even under RATE_LIMIT_RELAX (e.g. account lockout limiters asserted by e2e). */
  exemptFromRelax?: boolean;
  /** r119-S3-P2-1: fail-OPEN mode for secret-gated callers (telegram webhook).
   * Default stays fail-closed (public abuse surfaces). With failOpen, a DB
   * outage counts as 0 instead of max+1 — otherwise every Neon blip 429s
   * verified webhook updates, Telegram re-delivers non-2xx, and the recovery
   * burst itself re-trips the cap → updates permanently dropped. */
  failOpen?: boolean;
}

// round90-F4 (red-team r90-D2): probabilistic TABLE-level sweep tuning.
// The 120s interval below doesn't run reliably on serverless (frozen
// lambdas) and single-use keys (acct:ip:username, claim:ip, link-token: …)
// never appear again, so their expired rows piled up ~14K/day silently.
const SWEEP_CHANCE = 1 / 32;
/** Rows deleted per sweep — bounds the work regardless of table size. */
const SWEEP_BATCH = 512;
/** Expired rows linger at most this long before becoming sweepable. */
const SWEEP_RETENTION_MS = 60_000;

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
  const { windowMs, max, exemptFromRelax, failOpen = false } = config;
  // Dev-only relief: local e2e suites share one origin (127.0.0.1) across
  // many projects and exhaust the per-IP bucket within a minute. Production
  // (Vercel sets NODE_ENV=production) keeps the real limits.
  // round92 flake fix: the CI e2e server is the STANDALONE build — server.js
  // hard-forces NODE_ENV=production, so RATE_LIMIT_RELAX could never widen
  // anything there and every register/login e2e spec shared one 5/min IP
  // bucket (→ 429 flakes: CI run 34095732086; nightly verdict
  // FLAKY-DETECTED). RATE_LIMIT_TEST_RELAX is the explicit, unambiguous
  // escape hatch that works under production NODE_ENV; it is set ONLY on
  // the CI e2e server step (never on Vercel) and still honors
  // exemptFromRelax (account lockouts keep the real budget everywhere).
  const isRelaxed =
    !exemptFromRelax &&
    (process.env.RATE_LIMIT_TEST_RELAX === "1" ||
      (process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT_RELAX === "1"));
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
      // interval above plus the probabilistic table-level sweep below keep
      // expired rows from piling up without costing a query on every request.
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
        // DB error (both upsert and read failed): fail closed by default —
        // r119 adds failOpen for the telegram webhook limiter (see config).
        count = failOpen ? 0 : max + 1;
      }

      // round90-F4 (red-team r90-D2): probabilistic TABLE-level sweep (~1/32
      // checks) — the per-key sweep could never collect single-use keys
      // (their rows expire unseen), and the 120s interval is unreliable on
      // serverless. Deletes a BOUNDED batch of rows expired past the retention
      // window (windowEnd is indexed): findMany a capped id list, then
      // deleteMany by exact ids. Best-effort — a sweep failure NEVER affects
      // the limit decision (fail-closed behavior above is untouched).
      if (Math.random() < SWEEP_CHANCE) {
        try {
          const cutoff = new Date(now - SWEEP_RETENTION_MS);
          const stale = await prisma.rateLimitEntry.findMany({
            where: { windowEnd: { lt: cutoff } },
            select: { id: true },
            take: SWEEP_BATCH,
          });
          if (stale.length > 0) {
            await prisma.rateLimitEntry.deleteMany({
              where: { id: { in: stale.map((r) => r.id) } },
            });
          }
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
