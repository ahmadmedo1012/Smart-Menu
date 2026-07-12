/**
 * Unit tests for src/lib/* modules.
 * Run: npx tsx tests/unit/lib.test.ts
 */
import { ok, strictEqual, deepStrictEqual } from "node:assert";

// ── cn() ──
import { cn } from "@/lib/utils";
// ── In-memory rate limiter ──
import { createRateLimiter } from "@/lib/rate-limit";
// ── API helpers ──
import { success, error, handleError, paginated, notFound, validationError } from "@/lib/api-helpers";
// ── Env validation ──
import { validateEnv } from "@/lib/env";

// ────────────────────────────────────────────────
// cn — class name merging
// ────────────────────────────────────────────────
strictEqual(cn("px-4", "py-2"), "px-4 py-2", "merges two simple classes");
strictEqual(cn("px-4", "px-2"), "px-2", "tailwind-merge resolves conflicting classes");
strictEqual(cn("px-4", false && "hidden", "py-2"), "px-4 py-2", "falsy conditionals omitted");
strictEqual(cn("px-4", undefined, "py-2"), "px-4 py-2", "undefined values omitted");
strictEqual(cn(["px-4", "py-2"]), "px-4 py-2", "merges array input");
strictEqual(cn(), "", "empty call returns empty string");

// ────────────────────────────────────────────────
// createRateLimiter (in-memory)
// ────────────────────────────────────────────────
{
  const limiter = createRateLimiter({ windowMs: 5000, max: 3 });

  const r1 = await limiter.check("rl-test-1");
  ok(r1.success, "first request in window succeeds");
  strictEqual(r1.remaining, 2, "remaining decrements after first hit");
  ok(r1.reset > Date.now(), "reset timestamp is in the future");

  const r2 = await limiter.check("rl-test-1");
  ok(r2.success, "second request succeeds");
  strictEqual(r2.remaining, 1, "remaining = max - 2");

  const r3 = await limiter.check("rl-test-1");
  ok(r3.success, "third request succeeds (at limit)");
  strictEqual(r3.remaining, 0, "remaining = 0 at max");

  const r4 = await limiter.check("rl-test-1");
  ok(!r4.success, "fourth request blocked (over max)");
  strictEqual(r4.remaining, 0, "remaining stays 0 when blocked");

  limiter.destroy();
}

// Independent key counters
{
  const limiter = createRateLimiter({ windowMs: 5000, max: 2 });
  await limiter.check("key-a");
  await limiter.check("key-a");
  const blocked = await limiter.check("key-a");
  ok(!blocked.success, "key-a blocked at 3/2");
  const allowed = await limiter.check("key-b");
  ok(allowed.success, "key-b allowed (separate counter)");
  limiter.destroy();
}

// Window expiry resets counter
{
  const limiter = createRateLimiter({ windowMs: 30, max: 1 });
  await limiter.check("expire");
  const blocked = await limiter.check("expire");
  ok(!blocked.success, "blocked within window");
  await new Promise((r) => setTimeout(r, 50));
  const allowed = await limiter.check("expire");
  ok(allowed.success, "allowed after window expires");
  limiter.destroy();
}

// ────────────────────────────────────────────────
// api-helpers
// ────────────────────────────────────────────────
{
  const res = success({ name: "Test" });
  strictEqual(res.status, 200, "success() default status = 200");
  const body1 = await res.json();
  deepStrictEqual(body1, { success: true, data: { name: "Test" } }, "success() body shape");
}

{
  const res = success({ id: 1 }, 201);
  strictEqual(res.status, 201, "success() respects custom status");
  const body = await res.json();
  ok(body.success, "success() body .success is true");
  deepStrictEqual(body.data, { id: 1 }, "success() body .data preserved");
}

{
  const res = error("Something went wrong");
  strictEqual(res.status, 400, "error() default status = 400");
  const body = await res.json();
  deepStrictEqual(body, { success: false, error: "Something went wrong" }, "error() body shape");
}

{
  const res = error("Not found", 404);
  strictEqual(res.status, 404, "error() respects custom status");
}

{
  const res = notFound();
  strictEqual(res.status, 404, "notFound() returns 404");
  const body = await res.json();
  ok(!body.success, "notFound() success false");
}

{
  const res = notFound("المستخدم");
  const body = await res.json();
  strictEqual(body.error, "المستخدم غير موجود", "notFound() uses custom entity name");
}

// paginated
{
  const res = paginated([{ id: 1 }, { id: 2 }], 10, 1, 5);
  const body = await res.json();
  ok(body.success, "paginated() success true");
  deepStrictEqual(body.data, [{ id: 1 }, { id: 2 }], "paginated() data array");
  deepStrictEqual(body.meta, { total: 10, page: 1, pageSize: 5, totalPages: 2 }, "paginated() meta");
}

{
  const res = paginated([], 0, 1, 10);
  const body = await res.json();
  deepStrictEqual(body.meta.totalPages, 0, "paginated() 0 total → 0 pages");
  deepStrictEqual(body.data, [], "paginated() empty data array");
}

// validationError
{
  const zodErr = {
    issues: [
      { path: ["email"], message: "Invalid email" },
      { path: ["name"], message: "Required" },
    ],
  } as unknown as Parameters<typeof validationError>[0];
  const res = validationError(zodErr);
  strictEqual(res.status, 422, "validationError() status = 422");
  const body = await res.json();
  ok(!body.success, "validationError() success false");
  strictEqual(body.error, "بيانات غير صالحة", "validationError() Arabic error message");
  deepStrictEqual(body.details, ["email: Invalid email", "name: Required"], "validationError() details array");
}

// handleError — ZodError-like
{
  const res = handleError({ issues: [{ path: ["x"], message: "Bad" }] });
  strictEqual(res.status, 422, "handleError catches ZodError → 422");
}

// handleError — JSON parse error
{
  const err = new Error("Unexpected token < in JSON at position 0");
  const res = handleError(err);
  strictEqual(res.status, 400, "handleError JSON parse → 400");
  const body = await res.json();
  strictEqual(body.error, "بيانات غير صالحة — خطأ في صيغة JSON", "handleError JSON specific message");
}

// handleError — Unique constraint
{
  const res = handleError(new Error("Unique constraint failed on the fields: (`slug`)"));
  strictEqual(res.status, 409, "handleError unique constraint → 409");
  const body = await res.json();
  strictEqual(body.error, "بيانات مكررة — هذا الاسم موجود مسبقاً", "handleError duplicate message");
}

// handleError — Foreign key
{
  const res = handleError(new Error("Foreign key constraint failed"));
  strictEqual(res.status, 400, "handleError FK → 400");
  const body = await res.json();
  strictEqual(body.error, "بيانات مرتبطة لا يمكن حذفها", "handleError FK message");
}

// handleError — Record not found
{
  const res = handleError(new Error("Record to update not found."));
  strictEqual(res.status, 404, "handleError record not found → 404");
  const body = await res.json();
  strictEqual(body.error, "السجل غير موجود", "handleError not-found message");
}

// handleError — Connection / timeout
{
  const res = handleError(new Error("Connection timed out"));
  strictEqual(res.status, 503, "handleError connection error → 503");
  const body = await res.json();
  strictEqual(body.error, "خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى", "handleError connection message");
}

// handleError — Invalid ` (Prisma unsafe arg)
{
  const res = handleError(new Error("Invalid `prisma.user.findUnique()` invocation"));
  strictEqual(res.status, 400, "handleError invalid arg → 400");
  const body = await res.json();
  strictEqual(body.error, "بيانات غير صالحة", "handleError invalid message");
}

// handleError — Generic error
{
  const res = handleError(new Error("Something unexpected"));
  strictEqual(res.status, 500, "handleError generic → 500");
  const body = await res.json();
  strictEqual(body.error, "حدث خطأ داخلي. حاول مرة أخرى", "handleError generic message");
}

// handleError — String error
{
  const res = handleError("raw string error");
  strictEqual(res.status, 500, "handleError string → 500");
}

// ────────────────────────────────────────────────
// env — Zod schema validation
// ────────────────────────────────────────────────
{
  const prevDbUrl = process.env.DATABASE_URL;
  const prevJwt = process.env.JWT_SECRET;
  const prevAuth = process.env.AUTH_SECRET;
  const prevDomain = process.env.NEXT_PUBLIC_DOMAIN;
  const prevWhatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const prevBot = process.env.TELEGRAM_BOT_TOKEN;
  const prevChat = process.env.TELEGRAM_CHAT_ID;
  const prevSchema = process.env.DATABASE_SCHEMA;

  process.env.DATABASE_URL = "postgres://localhost:5432/testdb";
  process.env.JWT_SECRET = "abcdefghijklmnop";
  process.env.AUTH_SECRET = "my-auth-secret";
  delete process.env.NEXT_PUBLIC_DOMAIN;
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.DATABASE_SCHEMA;

  const env = validateEnv();
  strictEqual(env.DATABASE_URL, "postgres://localhost:5432/testdb", "DATABASE_URL parsed");
  strictEqual(env.JWT_SECRET, "abcdefghijklmnop", "JWT_SECRET parsed");
  strictEqual(env.AUTH_SECRET, "my-auth-secret", "AUTH_SECRET parsed");
  strictEqual(env.NEXT_PUBLIC_DOMAIN, "http://localhost:3000", "NEXT_PUBLIC_DOMAIN defaults to localhost");
  strictEqual(env.NEXT_PUBLIC_WHATSAPP_NUMBER, "", "WHATSAPP_NUMBER defaults to empty");
  strictEqual(env.TELEGRAM_BOT_TOKEN, "", "BOT_TOKEN defaults to empty");
  strictEqual(env.TELEGRAM_CHAT_ID, "", "CHAT_ID defaults to empty");
  strictEqual(env.DATABASE_SCHEMA, "public", "DATABASE_SCHEMA defaults to public");

  // Restore
  setOrDelete("DATABASE_URL", prevDbUrl);
  setOrDelete("JWT_SECRET", prevJwt);
  setOrDelete("AUTH_SECRET", prevAuth);
  setOrDelete("NEXT_PUBLIC_DOMAIN", prevDomain);
  setOrDelete("NEXT_PUBLIC_WHATSAPP_NUMBER", prevWhatsapp);
  setOrDelete("TELEGRAM_BOT_TOKEN", prevBot);
  setOrDelete("TELEGRAM_CHAT_ID", prevChat);
  setOrDelete("DATABASE_SCHEMA", prevSchema);
}

// Helper for env var restore
function setOrDelete(key: string, val: string | undefined): void {
  if (val === undefined) delete process.env[key];
  else process.env[key] = val;
}
