/**
 * Core modules unit tests — hash, jwt mock, csrf, csrf-client, auth, subscription-decisions, telegram-admin
 * Run: npx tsx tests/unit/core.test.ts
 */
import { ok, strictEqual, notStrictEqual, match, deepStrictEqual } from "node:assert";
import { createHmac, timingSafeEqual } from "node:crypto";

let total = 0;
function inc(n = 1) { total += n; }

// ════════════════════════════════════════════════════════════════════
// 1. hash.ts — PBKDF2 password hashing
// ════════════════════════════════════════════════════════════════════

const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");

{
  const pwd = "correct-horse-battery-staple";
  const hashed = hashPassword(pwd);

  ok(typeof hashed === "string", "hashPassword returns string"); inc();
  ok(hashed.includes(":"), "hashPassword format salt:hash"); inc();

  const [salt, hash] = hashed.split(":");
  strictEqual(salt.length, 64, "salt = 64 hex chars (32 bytes)"); inc();
  strictEqual(hash.length, 128, "hash = 128 hex chars (64 bytes)"); inc();
  match(salt, /^[0-9a-f]+$/, "salt hex only"); inc();
  match(hash, /^[0-9a-f]+$/, "hash hex only"); inc();

  ok(verifyHash(pwd, hashed), "verifyHash correct password -> true"); inc();
  strictEqual(verifyHash("wrong-password", hashed), false, "wrong password -> false"); inc();
  strictEqual(verifyHash("", hashed), false, "empty password -> false"); inc();
  strictEqual(verifyHash("anything", ""), false, "empty stored -> false"); inc();
  strictEqual(verifyHash("anything", "no-colon"), false, "no-colon stored -> false"); inc();
  strictEqual(verifyHash("anything", "a:b:c"), false, "multi-colon stored -> false"); inc();
  ok(verifyHash(pwd, hashed), "verifyHash idempotent for same password"); inc();

  const hashed2 = hashPassword(pwd);
  notStrictEqual(hashed.split(":")[0], hashed2.split(":")[0], "unique salt per call"); inc();
}

// ════════════════════════════════════════════════════════════════════
// 2. Mock JWT — HMAC-SHA256 session token round-trip
// ════════════════════════════════════════════════════════════════════

{
  const SECRET = "test-secret-key-12345";

  function createSessionToken(payload: Record<string, unknown>, secret: string, expiresInSec = 86400): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })).toString("base64url");
    const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  }

  function verifySessionToken(token: string, secret: string): Record<string, unknown> | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const expectedSig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
      const sigBuf = Buffer.from(signature, "base64url");
      const expBuf = Buffer.from(expectedSig, "base64url");
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
      const payload = JSON.parse(Buffer.from(body, "base64url").toString());
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch { return null; }
  }

  const payload = { userId: 42, role: "owner" };

  const token = createSessionToken(payload, SECRET);
  ok(typeof token === "string", "createSessionToken returns string"); inc();
  strictEqual(token.split(".").length, 3, "token has 3 dot-separated parts"); inc();

  const decoded = verifySessionToken(token, SECRET);
  ok(decoded !== null, "verifySessionToken round-trips"); inc();
  if (decoded) {
    strictEqual(decoded.userId, 42, "userId payload survives round-trip"); inc();
    strictEqual(decoded.role, "owner", "role payload survives round-trip"); inc();
    ok(typeof decoded.iat === "number", "iat present in payload"); inc();
    ok(typeof decoded.exp === "number", "exp present in payload"); inc();
  }

  // Wrong secret -> null
  strictEqual(verifySessionToken(token, "wrong-secret"), null, "wrong secret -> null"); inc();

  // Tampered payload -> null
  const parts = token.split(".");
  const tamperedBody = Buffer.from(JSON.stringify({ userId: 999 })).toString("base64url");
  const forged = `${parts[0]}.${tamperedBody}.${parts[2]}`;
  strictEqual(verifySessionToken(forged, SECRET), null, "tampered payload -> null"); inc();

  // Malformed token -> null
  strictEqual(verifySessionToken("not-a-jwt", SECRET), null, "malformed token -> null"); inc();
  strictEqual(verifySessionToken("a.b", SECRET), null, "2-part token -> null"); inc();
  strictEqual(verifySessionToken("", SECRET), null, "empty token -> null"); inc();

  // Expired token -> null
  const expired = createSessionToken(payload, SECRET, -1);
  strictEqual(verifySessionToken(expired, SECRET), null, "expired token -> null"); inc();

  // Second token with same payload is valid (structure check, not identity)
  const t2 = createSessionToken(payload, SECRET);
  ok(typeof t2 === "string", "second token is string"); inc();
  ok(t2.split(".").length === 3, "second token has 3 parts"); inc();
  ok(verifySessionToken(t2, SECRET) !== null, "second token verifies"); inc();

  // Custom extra fields survive round-trip
  const custom = createSessionToken({ userId: 7, role: "admin", restaurantId: 3 }, SECRET);
  const decCustom = verifySessionToken(custom, SECRET);
  ok(decCustom !== null, "custom payload round-trips"); inc();
  if (decCustom) {
    strictEqual(decCustom.restaurantId, 3, "extra field survives round-trip"); inc();
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. csrf-client.ts — fetch wrapper adds CSRF header to mutations
// ════════════════════════════════════════════════════════════════════

{
  const CSRF_COOKIE = "csrf-token";
  const CSRF_HEADER = "x-csrf-token";
  const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
  const origCookie = (globalThis as any).document?.cookie;
  const origFetch = globalThis.fetch;

  (globalThis as any).document = {
    cookie: `${CSRF_COOKIE}=${mockToken}`,
  };

  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return Promise.resolve(new Response(null, { status: 200 }));
  };

  const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

  // GET — no CSRF header added
  await csrfFetch("/api/test");
  strictEqual(calls.length, 1, "GET triggers fetch"); inc();
  ok(!calls[0].init || !(calls[0].init as any).headers, "GET no CSRF header"); inc();

  // POST — adds CSRF header
  calls.length = 0;
  await csrfFetch("/api/test", { method: "POST" });
  const hPOST = (calls[0].init as any).headers as Record<string, string>;
  strictEqual(hPOST[CSRF_HEADER], mockToken, "POST adds x-csrf-token"); inc();

  // PUT
  calls.length = 0;
  await csrfFetch("/api/test", { method: "PUT" });
  strictEqual((calls[0].init as any).headers[CSRF_HEADER], mockToken, "PUT adds x-csrf-token"); inc();

  // DELETE
  calls.length = 0;
  await csrfFetch("/api/test", { method: "DELETE" });
  strictEqual((calls[0].init as any).headers[CSRF_HEADER], mockToken, "DELETE adds x-csrf-token"); inc();

  // PATCH
  calls.length = 0;
  await csrfFetch("/api/test", { method: "PATCH" });
  strictEqual((calls[0].init as any).headers[CSRF_HEADER], mockToken, "PATCH adds x-csrf-token"); inc();

  // Preserves original headers while adding CSRF
  calls.length = 0;
  await csrfFetch("/api/test", { method: "POST", headers: { "Content-Type": "application/json" } });
  const hComb = (calls[0].init as any).headers as Record<string, string>;
  strictEqual(hComb["Content-Type"], "application/json", "preserves original header"); inc();
  strictEqual(hComb[CSRF_HEADER], mockToken, "adds CSRF alongside original header"); inc();

  // Lowercase method still matches (csrfFetch uppercases it)
  calls.length = 0;
  await csrfFetch("/api/test", { method: "post" });
  strictEqual((calls[0].init as any).headers[CSRF_HEADER], mockToken, "lowercase POST still adds header"); inc();

  globalThis.fetch = origFetch;
  (globalThis as any).document = { cookie: origCookie ?? "" };
}

// ════════════════════════════════════════════════════════════════════
// 5. auth.ts — requireAuth / requireAdmin / requirePermission logic
// ════════════════════════════════════════════════════════════════════

{
  type AuthResult = {
    authorized: true; userId: number; role: string;
    restaurantId: number | null; subscriptionStatus: string | null; permissions: string[];
  };

  async function mockRequireAuth(
    session: { valid: boolean; userId: number | null },
    user: AuthResult | null,
    opts?: { requireRestaurant?: boolean },
  ): Promise<AuthResult | { authorized: false }> {
    if (session.valid && session.userId) {
      if (user) {
        if (opts?.requireRestaurant && !user.restaurantId) {
          return { authorized: false } as const;
        }
        return user;
      }
    }
    return { authorized: false } as const;
  }

  function mockRequireAdmin(
    auth: AuthResult | { authorized: false },
  ): AuthResult | { authorized: false } {
    if (!auth.authorized) return { authorized: false } as const;
    if (!["super_admin", "sub_admin", "admin"].includes(auth.role)) {
      return { authorized: false } as const;
    }
    return auth;
  }

  function mockRequirePermission(
    auth: AuthResult | { authorized: false },
    permission: string,
  ): AuthResult | { authorized: false; error: string; status: number } {
    if (!auth.authorized) return { authorized: false, error: "غير مصرح", status: 401 };
    if (auth.role === "super_admin" || auth.role === "admin") return auth;
    if (auth.role === "sub_admin" && auth.permissions?.includes(permission)) return auth;
    return { authorized: false, error: "لا تملك الصلاحية", status: 403 };
  }

  const validSession = { valid: true as const, userId: 1 };
  const badSession = { valid: false as const, userId: null };

  const admin: AuthResult = {
    authorized: true, userId: 1, role: "admin",
    restaurantId: 5, subscriptionStatus: "active", permissions: [],
  };
  const superAdmin: AuthResult = {
    authorized: true, userId: 2, role: "super_admin",
    restaurantId: null, subscriptionStatus: "active", permissions: [],
  };
  const subYes: AuthResult = {
    authorized: true, userId: 3, role: "sub_admin",
    restaurantId: 10, subscriptionStatus: "active", permissions: ["manage_orders"],
  };
  const subNo: AuthResult = {
    authorized: true, userId: 4, role: "sub_admin",
    restaurantId: 10, subscriptionStatus: "active", permissions: [],
  };
  const member: AuthResult = {
    authorized: true, userId: 5, role: "member",
    restaurantId: null, subscriptionStatus: "active", permissions: [],
  };

  // ── requireAuth ─────────────────────────────────────────

  strictEqual((await mockRequireAuth(badSession, null)).authorized, false, "invalid session -> unauthorized"); inc();
  strictEqual((await mockRequireAuth(validSession, null)).authorized, false, "user null -> unauthorized"); inc();
  const r3 = await mockRequireAuth(validSession, admin);
  ok(r3.authorized, "valid session + user -> authorized"); inc();
  if (r3.authorized) {
    strictEqual(r3.userId, 1, "userId matches"); inc();
    strictEqual(r3.role, "admin", "role matches"); inc();
    strictEqual(r3.restaurantId, 5, "restaurantId matches"); inc();
    strictEqual(r3.subscriptionStatus, "active", "subscriptionStatus matches"); inc();
  }
  const noRest = { ...member, restaurantId: null };
  strictEqual((await mockRequireAuth(validSession, noRest, { requireRestaurant: true })).authorized, false, "requireRestaurant blocks null restaurantId"); inc();
  const hasRest = { ...member, restaurantId: 7 };
  ok((await mockRequireAuth(validSession, hasRest, { requireRestaurant: true })).authorized, "requireRestaurant allows with restaurantId"); inc();
  strictEqual((await mockRequireAuth({ valid: false, userId: 1 }, admin)).authorized, false, "expired session -> unauthorized"); inc();
  strictEqual((await mockRequireAuth({ valid: true, userId: null }, admin)).authorized, false, "valid but no userId -> unauthorized"); inc();

  // ── requireAdmin ────────────────────────────────────────

  ok(mockRequireAdmin(admin).authorized, "admin role -> authorized"); inc();
  ok(mockRequireAdmin(superAdmin).authorized, "super_admin role -> authorized"); inc();
  ok(mockRequireAdmin(subYes).authorized, "sub_admin role -> authorized"); inc();
  strictEqual(mockRequireAdmin(member).authorized, false, "member role -> unauthorized"); inc();
  strictEqual(mockRequireAdmin({ authorized: false }).authorized, false, "unauthenticated -> unauthorized"); inc();

  // ── requirePermission ───────────────────────────────────

  const rp0 = mockRequirePermission({ authorized: false }, "manage_orders");
  strictEqual(rp0.authorized, false, "unauthenticated -> unauthorized"); inc();
  if (!rp0.authorized) strictEqual(rp0.status, 401, "unauthenticated -> 401 status"); inc();

  ok(mockRequirePermission(superAdmin, "anything").authorized, "super_admin bypasses permission"); inc();
  ok(mockRequirePermission(admin, "anything").authorized, "admin bypasses permission"); inc();
  ok(mockRequirePermission(subYes, "manage_orders").authorized, "sub_admin matching permission -> allowed"); inc();

  const rp5 = mockRequirePermission(subNo, "manage_orders");
  strictEqual(rp5.authorized, false, "sub_admin missing permission -> unauthorized"); inc();
  if (!rp5.authorized) strictEqual(rp5.status, 403, "sub_admin missing permission -> 403"); inc();

  const rp6 = mockRequirePermission(subYes, "manage_users");
  strictEqual(rp6.authorized, false, "sub_admin wrong permission -> unauthorized"); inc();
  if (!rp6.authorized) strictEqual(rp6.status, 403, "sub_admin wrong permission -> 403"); inc();

  const rp7 = mockRequirePermission(member, "anything");
  strictEqual(rp7.authorized, false, "member -> unauthorized"); inc();
  if (!rp7.authorized) strictEqual(rp7.status, 403, "member -> 403"); inc();

  ok(mockRequirePermission(superAdmin, "anything").authorized, "super_admin with no-restaurant check passes"); inc();

  const rpErr = mockRequirePermission(subNo, "manage_orders") as { authorized: false; error: string; status: number };
  strictEqual(typeof rpErr.error, "string", "403 error message is string"); inc();
  ok(rpErr.error.length > 0, "403 error message non-empty"); inc();

  const rpAuthErr = mockRequirePermission({ authorized: false }, "x") as { authorized: false; error: string; status: number };
  strictEqual(typeof rpAuthErr.error, "string", "401 error message is string"); inc();
  ok(rpAuthErr.error.length > 0, "401 error message non-empty"); inc();
}

// ════════════════════════════════════════════════════════════════════
// 6. subscription-decisions.ts — resolveSubscriptionPayment gates + decision map
// ════════════════════════════════════════════════════════════════════

{
  type MockPayment = {
    id: number;
    status: string;
    userId: number | null;
  };

  function mockResolveSubscriptionPayment(
    payment: MockPayment | null,
    decision: string,
  ): { ok: boolean; action?: string; paymentId?: number; reason?: string } {
    if (!payment) return { ok: false, reason: "الطلب غير موجود" };
    if (payment.status !== "pending") return { ok: false, reason: "تمت معالجة هذا الطلب مسبقاً" };
    if (decision === "verified") {
      return { ok: true, action: "verified", paymentId: payment.id };
    }
    if (decision === "cancelled") {
      return { ok: true, action: "cancelled", paymentId: payment.id };
    }
    return { ok: false, reason: "قرار غير معروف" };
  }

  // Not found gate
  const rNotFound = mockResolveSubscriptionPayment(null, "verified");
  strictEqual(rNotFound.ok, false, "null payment -> ok false"); inc();
  strictEqual(rNotFound.reason, "الطلب غير موجود", "null payment -> not-found reason"); inc();

  // Already processed — verified
  const processed: MockPayment = { id: 1, status: "verified", userId: 1 };
  const rProcessed = mockResolveSubscriptionPayment(processed, "verified");
  strictEqual(rProcessed.ok, false, "non-pending payment -> ok false"); inc();
  strictEqual(rProcessed.reason, "تمت معالجة هذا الطلب مسبقاً", "non-pending -> already-processed reason"); inc();

  // Already processed — cancelled
  const prevCancelled: MockPayment = { id: 2, status: "cancelled", userId: 1 };
  const rPrevCan = mockResolveSubscriptionPayment(prevCancelled, "verified");
  strictEqual(rPrevCan.ok, false, "cancelled payment -> ok false"); inc();

  // Decision "verified" -> action verified
  const pending1: MockPayment = { id: 10, status: "pending", userId: 5 };
  const rVer = mockResolveSubscriptionPayment(pending1, "verified");
  ok(rVer.ok, "verified decision -> ok true"); inc();
  strictEqual(rVer.action, "verified", "verified decision maps to 'verified' action"); inc();
  strictEqual(rVer.paymentId, 10, "verified returns correct paymentId"); inc();

  // Decision "cancelled" -> action cancelled
  const pending2: MockPayment = { id: 20, status: "pending", userId: 6 };
  const rCan = mockResolveSubscriptionPayment(pending2, "cancelled");
  ok(rCan.ok, "cancelled decision -> ok true"); inc();
  strictEqual(rCan.action, "cancelled", "cancelled decision maps to 'cancelled' action"); inc();
  strictEqual(rCan.paymentId, 20, "cancelled returns correct paymentId"); inc();

  // Pending with null userId still resolves
  const pendingNoUser: MockPayment = { id: 30, status: "pending", userId: null };
  const rNoUser = mockResolveSubscriptionPayment(pendingNoUser, "cancelled");
  ok(rNoUser.ok, "pending with null userId still resolves"); inc();
  strictEqual(rNoUser.action, "cancelled", "null userId -> cancelled"); inc();

  // Multiple payments get independent results
  const pA: MockPayment = { id: 100, status: "pending", userId: 1 };
  const pB: MockPayment = { id: 200, status: "pending", userId: 2 };
  const rA = mockResolveSubscriptionPayment(pA, "verified");
  const rB = mockResolveSubscriptionPayment(pB, "cancelled");
  strictEqual(rA.action, "verified", "independent payment A -> verified"); inc();
  strictEqual(rB.action, "cancelled", "independent payment B -> cancelled"); inc();
  strictEqual(rA.paymentId, 100, "independent paymentId A"); inc();
  strictEqual(rB.paymentId, 200, "independent paymentId B"); inc();
}

// ════════════════════════════════════════════════════════════════════
// 7. telegram-admin.ts — getAdminTelegramIds parses env, merges DB, deduplicates
// ════════════════════════════════════════════════════════════════════

{
  function mockGetAdminTelegramIds(envVar: string, dbApprovers: Array<{ telegramId: bigint | number }>): number[] {
    const envIds = (envVar ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    const dbIds = dbApprovers
      .map((a) => Number(a.telegramId))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    return [...new Set([...envIds, ...dbIds])];
  }

  deepStrictEqual(mockGetAdminTelegramIds("123456", []), [123456], "single env ID parsed"); inc();
  deepStrictEqual(mockGetAdminTelegramIds("111,222,333", []), [111, 222, 333], "multiple env IDs parsed"); inc();
  deepStrictEqual(mockGetAdminTelegramIds("", [{ telegramId: BigInt(999) }]), [999], "DB BigInt ID included"); inc();
  deepStrictEqual(mockGetAdminTelegramIds("100", [{ telegramId: BigInt(200) }, { telegramId: BigInt(300) }]), [100, 200, 300], "env + DB merged"); inc();

  // Deduplication
  const r5 = mockGetAdminTelegramIds("500,600", [{ telegramId: BigInt(600) }, { telegramId: BigInt(700) }]);
  deepStrictEqual(r5, [500, 600, 700], "overlapping IDs deduplicated"); inc();
  strictEqual(r5.length, 3, "dedup reduces length"); inc();

  // Empty
  deepStrictEqual(mockGetAdminTelegramIds("", []), [], "empty env + empty DB -> []"); inc();

  // Invalid env values filtered
  deepStrictEqual(mockGetAdminTelegramIds("abc,0,-5,42,NaN", []), [42], "invalid env IDs filtered out"); inc();

  // Invalid DB BigInt filtered (0, negative)
  deepStrictEqual(mockGetAdminTelegramIds("", [{ telegramId: BigInt(0) }, { telegramId: BigInt(-1) }, { telegramId: BigInt(77) }]), [77], "invalid DB IDs filtered out"); inc();

  // Whitespace
  deepStrictEqual(mockGetAdminTelegramIds(" 10 , 20 ,30", []), [10, 20, 30], "whitespace in env var handled"); inc();

  // Large safe integer
  deepStrictEqual(mockGetAdminTelegramIds("9007199254740991", []), [9007199254740991], "large safe integer passes"); inc();

  // Duplicates within env var deduplicated
  deepStrictEqual(mockGetAdminTelegramIds("1,2,2,3", []), [1, 2, 3], "duplicates within env var deduplicated"); inc();
}

// ── Summary ────────────────────────────────────────────────────
console.log(`\nAll core module tests passed — ${total} assertions.`);
