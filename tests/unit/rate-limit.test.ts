/**
 * Unit tests for createDbRateLimiter.
 * Mocks Prisma to avoid requiring a running PostgreSQL instance.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────
// vi.hoisted ensures these exist before vi.mock factories run

const mockDeleteMany = vi.hoisted(() => vi.fn().mockResolvedValue({ count: 0 }));
const mockCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockCount = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const mockFindMany = vi.hoisted(() => vi.fn().mockResolvedValue([]));

const mockPrisma = vi.hoisted(() => ({
  rateLimitEntry: {
    deleteMany: mockDeleteMany,
    create: mockCreate,
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
    mockCount.mockResolvedValue(0);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
    const result = await limiter.check("fresh-key");
    expect(result.success).toBe(true);
    limiter.destroy();
  });

  it("result has success, remaining (number), reset (number)", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
    mockCount.mockResolvedValue(1);

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

    mockCount.mockResolvedValue(1);
    expect((await limiter.check("exceed-key")).success).toBe(true);

    mockCount.mockResolvedValue(2);
    expect((await limiter.check("exceed-key")).success).toBe(true);

    mockCount.mockResolvedValue(3);
    expect((await limiter.check("exceed-key")).success).toBe(true);

    mockCount.mockResolvedValue(4);
    const result = await limiter.check("exceed-key");
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

    mockCount.mockResolvedValue(1);
    expect((await limiter.check("rem-key")).remaining).toBe(4);

    mockCount.mockResolvedValue(2);
    expect((await limiter.check("rem-key")).remaining).toBe(3);

    mockCount.mockResolvedValue(3);
    expect((await limiter.check("rem-key")).remaining).toBe(2);

    limiter.destroy();
  });

  it("reset is a future timestamp", async () => {
    const now = Date.now();
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockCreate.mockResolvedValue({});
    mockCount.mockResolvedValue(0);

    const limiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });
    const result = await limiter.check("reset-key");
    expect(result.reset).toBeGreaterThan(now);
    limiter.destroy();
  });
});
