/**
 * Unit tests for createDbRateLimiter.
 * Mocks Prisma to avoid requiring a running PostgreSQL instance.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────
// vi.hoisted ensures these exist before vi.mock factories run

const mockDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 0 }));
const mockCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
// round85-B5: the limiter now reads the count from the upsert RESULT (single
// round trip) — the mock must return the incremented row like Prisma does.
const mockUpsert = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 1 }));
const mockFindUnique = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockCount = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const mockFindMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));

const mockPrisma = vi.hoisted(() => ({
  rateLimitEntry: {
    deleteMany: mockDeleteMany,
    create: mockCreate,
    upsert: mockUpsert,
    findUnique: mockFindUnique,
    count: mockCount,
    findMany: mockFindMany,
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// ── Imports (after vi.mock is hoisted) ─────────────────────────────────

import { createDbRateLimiter } from "@/lib/rate-limit";

// ── Tests ──────────────────────────────────────────────────────────────

describe("createDbRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an object with check and destroy", () => {
    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    expect(limiter).toHaveProperty("check");
    expect(typeof limiter.check).toBe("function");
    expect(limiter).toHaveProperty("destroy");
    expect(typeof limiter.destroy).toBe("function");
    limiter.destroy();
  });

  it("check with fresh key returns success: true", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ count: 1 }); // first attempt in the bucket

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    const result = await limiter.check("fresh-key");
    expect(result.success).toBe(true);
    limiter.destroy();
  });

  it("result has success, remaining (number), reset (number)", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({ count: 1 });

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    const result = await limiter.check("shape-key");
    expect(result).toHaveProperty("success");
    expect(typeof result.remaining).toBe("number");
    expect(typeof result.reset).toBe("number");
    expect(result.remaining).toBe(9); // max(10) - count(1)
    limiter.destroy();
  });

  it("calling check multiple times eventually exceeds limit", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 3 });

    mockUpsert.mockResolvedValue({ count: 1 });
    expect((await limiter.check("exceed-key")).success).toBe(true);

    mockUpsert.mockResolvedValue({ count: 2 });
    expect((await limiter.check("exceed-key")).success).toBe(true);

    mockUpsert.mockResolvedValue({ count: 3 });
    expect((await limiter.check("exceed-key")).success).toBe(true);

    mockUpsert.mockResolvedValue({ count: 4 });
    const result = await limiter.check("exceed-key");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);

    limiter.destroy();
  });

  it("REGRESSION: reads the accumulated count column, not the row count (row count is always 0/1 due to (key, windowEnd) unique)", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
    // The upserted row holds 22 attempts in its count column. The old code
    // counted ROWS (1) → success always true → 429 never fired.
    mockUpsert.mockResolvedValue({ count: 22 });

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 20 });
    const result = await limiter.check("regression-key");

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    limiter.destroy();
  });

  it("destroy clears the interval", () => {
    const spy = vi.spyOn(globalThis, "clearInterval");
    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    limiter.destroy();
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("remaining decreases as count increases", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

    mockUpsert.mockResolvedValue({ count: 1 });
    expect((await limiter.check("rem-key")).remaining).toBe(4);

    mockUpsert.mockResolvedValue({ count: 2 });
    expect((await limiter.check("rem-key")).remaining).toBe(3);

    mockUpsert.mockResolvedValue({ count: 3 });
    expect((await limiter.check("rem-key")).remaining).toBe(2);

    limiter.destroy();
  });

  it("reset is a future timestamp", async () => {
    const now = Date.now();
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({ count: 1 });
    mockFindUnique.mockResolvedValue(null);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    const result = await limiter.check("reset-key");
    expect(result.reset).toBeGreaterThan(now);
    limiter.destroy();
  });
});

// ── round92: RATE_LIMIT_TEST_RELAX (CI standalone server runs NODE_ENV=production) ──
// Root cause of CI run 34095732086 + nightly FLAKY verdict: server.js forces
// NODE_ENV=production, so the old RATE_LIMIT_RELAX could never widen the
// server-side buckets — every register e2e spec shared one 5/min/IP bucket.
describe("createDbRateLimiter — RATE_LIMIT_TEST_RELAX (round92 flake fix)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("TEST_RELAX=1 under NODE_ENV=production widens the budget (CI e2e server regime)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_TEST_RELAX", "1");

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    // 100 attempts in the bucket — way over the real max (5) but far under
    // the widened budget (max*200 = 1000).
    mockUpsert.mockResolvedValue({ count: 100 });
    const result = await limiter.check("testrelax-key");
    expect(result.success).toBe(true);
    limiter.destroy();
  });

  it("production with NO relax vars keeps the real budget (Vercel regime — unchanged)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_RELAX", ""); // old var set-but-empty must NOT relax

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    mockUpsert.mockResolvedValue({ count: 6 });
    const result = await limiter.check("prod-key");
    expect(result.success).toBe(false);
    limiter.destroy();
  });

  it("the OLD var (RATE_LIMIT_RELAX=1) still does nothing under production NODE_ENV", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_RELAX", "1");

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    mockUpsert.mockResolvedValue({ count: 6 });
    const result = await limiter.check("oldvar-key");
    expect(result.success).toBe(false);
    limiter.destroy();
  });

  it("exemptFromRelax lockouts keep the real budget even WITH TEST_RELAX", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_TEST_RELAX", "1");

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5, exemptFromRelax: true });
    mockUpsert.mockResolvedValue({ count: 6 });
    const result = await limiter.check("lockout-key");
    expect(result.success).toBe(false);
    limiter.destroy();
  });

  it("dev regime (NODE_ENV=development + RATE_LIMIT_RELAX=1) is unchanged (relaxed)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RATE_LIMIT_RELAX", "1");

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    mockUpsert.mockResolvedValue({ count: 100 });
    const result = await limiter.check("dev-key");
    expect(result.success).toBe(true);
    limiter.destroy();
  });
});
