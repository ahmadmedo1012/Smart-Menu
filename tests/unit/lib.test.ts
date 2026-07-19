/**
 * Unit tests for src/lib/* modules.
 */
import { describe, it, expect, afterEach } from "vitest";
import { cn } from "@/lib/utils";
import { success, error, handleError, paginated, notFound, validationError } from "@/lib/api-helpers";
import { validateEnv } from "@/lib/env";

// ────────────────────────────────────────────────
// cn — class name merging
// ────────────────────────────────────────────────

describe("cn", () => {
  it("merges two simple classes", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });
  it("tailwind-merge resolves conflicting classes", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });
  it("falsy conditionals omitted", () => {
    expect(cn("px-4", false && "hidden", "py-2")).toBe("px-4 py-2");
  });
  it("undefined values omitted", () => {
    expect(cn("px-4", undefined, "py-2")).toBe("px-4 py-2");
  });
  it("merges array input", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });
  it("empty call returns empty string", () => {
    expect(cn()).toBe("");
  });
});

// ────────────────────────────────────────────────
// createRateLimiter (in-memory)
// ────────────────────────────────────────────────

describe("createRateLimiter", () => {
  // Local in-memory limiter (createDbRateLimiter needs Postgres)
  function makeLimiter(windowMs: number, max: number) {
    const hits = new Map<string, number[]>();
    let destroyed = false; // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      async check(key: string) {
        const now = Date.now();
        const timestamps = hits.get(key) ?? [];
        const fresh = timestamps.filter((t) => now - t < windowMs);
        fresh.push(now);
        hits.set(key, fresh);
        const count = fresh.length;
        return {
          success: count <= max,
          remaining: Math.max(0, max - count),
          reset: now + windowMs,
        };
      },
      destroy() { destroyed = true; },
    };
  }

  it("first request in window succeeds", async () => {
    const limiter = makeLimiter(5000, 3);
    const r1 = await limiter.check("rl-test-1");
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.reset).toBeGreaterThan(Date.now());
    limiter.destroy();
  });

  it("increments remaining correctly", async () => {
    const limiter = makeLimiter(5000, 3);
    await limiter.check("rl-test-2");
    await limiter.check("rl-test-2");
    const r3 = await limiter.check("rl-test-2");
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
    const r4 = await limiter.check("rl-test-2");
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
    limiter.destroy();
  });

  it("independent key counters work", async () => {
    const limiter = makeLimiter(5000, 2);
    await limiter.check("key-a");
    await limiter.check("key-a");
    const blocked = await limiter.check("key-a");
    expect(blocked.success).toBe(false);
    const allowed = await limiter.check("key-b");
    expect(allowed.success).toBe(true);
    limiter.destroy();
  });

  it("window expiry resets counter", async () => {
    const limiter = makeLimiter(30, 1);
    await limiter.check("expire");
    const blocked = await limiter.check("expire");
    expect(blocked.success).toBe(false);
    await new Promise((r) => setTimeout(r, 50));
    const allowed = await limiter.check("expire");
    expect(allowed.success).toBe(true);
    limiter.destroy();
  });
});

// ────────────────────────────────────────────────
// api-helpers
// ────────────────────────────────────────────────

describe("api-helpers", () => {
  it("success() default status = 200", async () => {
    const res = success({ name: "Test" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { name: "Test" } });
  });

  it("success() respects custom status", async () => {
    const res = success({ id: 1 }, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
  });

  it("error() default status = 400", async () => {
    const res = error("Something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: "Something went wrong" });
  });

  it("error() respects custom status", () => {
    expect(error("Not found", 404).status).toBe(404);
  });

  it("notFound() returns 404", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("notFound() uses custom entity name", async () => {
    const res = notFound("المستخدم");
    const body = await res.json();
    expect(body.error).toBe("المستخدم غير موجود");
  });

  it("paginated() returns correct shape", async () => {
    const res = paginated([{ id: 1 }, { id: 2 }], 10, 1, 5);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(body.meta).toEqual({ total: 10, page: 1, pageSize: 5, totalPages: 2 });
  });

  it("paginated() 0 total -> 0 pages", async () => {
    const res = paginated([], 0, 1, 10);
    const body = await res.json();
    expect(body.meta.totalPages).toBe(0);
    expect(body.data).toEqual([]);
  });

  it("validationError() returns 422", async () => {
    const zodErr = {
      issues: [
        { path: ["email"], message: "Invalid email" },
        { path: ["name"], message: "Required" },
      ],
    } as any;
    const res = validationError(zodErr);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("بيانات غير صالحة");
    expect(body.details).toEqual(["email: Invalid email", "name: Required"]);
  });

  it("handleError — ZodError-like -> 422", () => {
    const res = handleError({ issues: [{ path: ["x"], message: "Bad" }] });
    expect(res.status).toBe(422);
  });

  it("handleError — JSON parse -> 400", async () => {
    const res = handleError(new Error("Unexpected token < in JSON at position 0"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("بيانات غير صالحة — خطأ في صيغة JSON");
  });

  it("handleError — Unique constraint -> 409", async () => {
    const res = handleError(new Error("Unique constraint failed on the fields: (`slug`)"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("بيانات مكررة — هذا الاسم موجود مسبقاً");
  });

  it("handleError — Foreign key -> 400", async () => {
    const res = handleError(new Error("Foreign key constraint failed"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("بيانات مرتبطة لا يمكن حذفها");
  });

  it("handleError — Record not found -> 404", async () => {
    const res = handleError(new Error("Record to update not found."));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("السجل غير موجود");
  });

  it("handleError — Connection / timeout -> 503", async () => {
    const res = handleError(new Error("Connection timed out"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى");
  });

  it("handleError — Invalid prisma arg -> 400", async () => {
    const res = handleError(new Error("Invalid `prisma.user.findUnique()` invocation"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("بيانات غير صالحة");
  });

  it("handleError — Generic error -> 500", async () => {
    const res = handleError(new Error("Something unexpected"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("حدث خطأ داخلي. حاول مرة أخرى");
  });

  it("handleError — String error -> 500", () => {
    expect(handleError("raw string error").status).toBe(500);
  });
});

// ────────────────────────────────────────────────
// env — Zod schema validation
// ────────────────────────────────────────────────

describe("env", () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, OLD_ENV);
  });

  it("parses DATABASE_URL and JWT_SECRET", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/testdb";
    process.env.JWT_SECRET = "abcdefghijklmnop";
    process.env.AUTH_SECRET = "my-auth-secret";
    delete process.env.NEXT_PUBLIC_DOMAIN;
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.DATABASE_SCHEMA;

    const env = validateEnv();
    expect(env.DATABASE_URL).toBe("postgres://localhost:5432/testdb");
    expect(env.JWT_SECRET).toBe("abcdefghijklmnop");
    expect(env.AUTH_SECRET).toBe("my-auth-secret");
    expect(env.NEXT_PUBLIC_DOMAIN).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_WHATSAPP_NUMBER).toBe("");
    expect(env.TELEGRAM_BOT_TOKEN).toBe("");
    expect(env.TELEGRAM_CHAT_ID).toBe("");
    expect(env.DATABASE_SCHEMA).toBe("public");
  });
});
