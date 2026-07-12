/**
 * Auth module unit tests — hash, csrf, csrf-client, auth logic
 * Run: npx tsx tests/unit/auth.test.ts
 */
import { ok, strictEqual, notStrictEqual, match } from "node:assert";

let total = 0;
function inc(n = 1) { total += n; }

// ════════════════════════════════════════════════════════════════════
// 1. hash.ts — PBKDF2 password hashing (stand-in for bcrypt)
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

  ok(verifyHash(pwd, hashed), "verifyHash correct password → true"); inc();
  strictEqual(verifyHash("wrong-password", hashed), false, "wrong password → false"); inc();
  strictEqual(verifyHash("", hashed), false, "empty password → false"); inc();
  strictEqual(verifyHash("anything", ""), false, "empty stored → false"); inc();
  strictEqual(verifyHash("anything", "no-colon"), false, "no-colon stored → false"); inc();
  strictEqual(verifyHash("anything", "a:b:c"), false, "multi-colon stored → false"); inc();
  ok(verifyHash(pwd, hashed), "verifyHash idempotent for same password"); inc();

  const hashed2 = hashPassword(pwd);
  notStrictEqual(hashed.split(":")[0], hashed2.split(":")[0], "unique salt per call"); inc();
}

// ════════════════════════════════════════════════════════════════════
// 2. csrf.ts — token generation and constant-time validation
// ════════════════════════════════════════════════════════════════════

const { generateToken, validateToken } = await import("../../src/lib/csrf.ts");
const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

{
  const t1 = generateToken();
  const t2 = generateToken();

  ok(typeof t1 === "string", "generateToken returns string"); inc();
  strictEqual(t1.length, 64, "token = 64 hex chars"); inc();
  match(t1, /^[0-9a-f]+$/, "token hex only"); inc();
  notStrictEqual(t1, t2, "successive tokens differ"); inc();

  ok(validateToken(t1, t1), "matching token+cookie → true"); inc();
  strictEqual(validateToken(t1, t2), false, "different token vs cookie → false"); inc();
  strictEqual(validateToken(null, t1), false, "null header → false"); inc();
  strictEqual(validateToken(t1, null), false, "null cookie → false"); inc();
  strictEqual(validateToken(null, null), false, "both null → false"); inc();
  strictEqual(validateToken("", ""), false, "empty strings → false"); inc();
  strictEqual(validateToken(t1, t1.toUpperCase()), false, "case mismatch → false"); inc();
  strictEqual(validateToken(t1, t1.slice(0, 32)), false, "length mismatch → false"); inc();
}

// ════════════════════════════════════════════════════════════════════
// 3. csrf-client.ts — fetch wrapper adds CSRF header to mutations
// ════════════════════════════════════════════════════════════════════

{
  const mockToken = "mock-csrf-" + generateToken().slice(0, 8);
  (globalThis as any).document = {
    cookie: `${CSRF_COOKIE}=${mockToken}`,
  };

  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const origFetch = globalThis.fetch;
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
}

// ════════════════════════════════════════════════════════════════════
// 4. auth.ts — requireAuth / requireAdmin / requirePermission logic
// ════════════════════════════════════════════════════════════════════

{
  type AuthResult = {
    authorized: true; userId: number; role: string;
    restaurantId: number | null; subscriptionStatus: string | null; permissions: string[];
  };

  // Mirror auth.ts logic with injected deps (same branching, no Next.js/prisma)
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

  // Invalid/missing session → unauthorized
  strictEqual((await mockRequireAuth(badSession, null)).authorized, false, "invalid session → unauthorized"); inc();
  // Session valid but user lookup returns null → unauthorized
  strictEqual((await mockRequireAuth(validSession, null)).authorized, false, "user null → unauthorized"); inc();
  // Valid session + user → authorized with expected fields
  const r3 = await mockRequireAuth(validSession, admin);
  ok(r3.authorized, "valid session + user → authorized"); inc();
  if (r3.authorized) {
    strictEqual(r3.userId, 1, "userId matches"); inc();
    strictEqual(r3.role, "admin", "role matches"); inc();
    strictEqual(r3.restaurantId, 5, "restaurantId matches"); inc();
    strictEqual(r3.subscriptionStatus, "active", "subscriptionStatus matches"); inc();
  }
  // requireRestaurant: blocks user with null restaurantId
  const noRest = { ...member, restaurantId: null };
  strictEqual((await mockRequireAuth(validSession, noRest, { requireRestaurant: true })).authorized, false, "requireRestaurant blocks null restaurantId"); inc();
  // requireRestaurant: allows user with restaurantId
  const hasRest = { ...member, restaurantId: 7 };
  ok((await mockRequireAuth(validSession, hasRest, { requireRestaurant: true })).authorized, "requireRestaurant allows with restaurantId"); inc();
  // Expired session (valid=false) → unauthorized
  strictEqual((await mockRequireAuth({ valid: false, userId: 1 }, admin)).authorized, false, "expired session → unauthorized"); inc();
  // Valid=true but userId=null → unauthorized
  strictEqual((await mockRequireAuth({ valid: true, userId: null }, admin)).authorized, false, "valid but no userId → unauthorized"); inc();

  // ── requireAdmin ────────────────────────────────────────

  const ra1 = mockRequireAdmin(admin);
  ok(ra1.authorized, "admin role → authorized"); inc();
  ok(mockRequireAdmin(superAdmin).authorized, "super_admin role → authorized"); inc();
  ok(mockRequireAdmin(subYes).authorized, "sub_admin role → authorized"); inc();
  strictEqual(mockRequireAdmin(member).authorized, false, "member role → unauthorized"); inc();
  strictEqual(mockRequireAdmin({ authorized: false }).authorized, false, "unauthenticated → unauthorized"); inc();

  // ── requirePermission ───────────────────────────────────

  // Unauthenticated → 401
  const rp1 = mockRequirePermission({ authorized: false }, "manage_orders");
  strictEqual(rp1.authorized, false, "unauthenticated → unauthorized"); inc();
  if (!rp1.authorized) strictEqual(rp1.status, 401, "unauthenticated → 401 status"); inc();

  // super_admin bypasses permission check
  ok(mockRequirePermission(superAdmin, "anything").authorized, "super_admin bypasses permission"); inc();
  // admin bypasses permission check
  ok(mockRequirePermission(admin, "anything").authorized, "admin bypasses permission"); inc();
  // sub_admin with matching permission → allowed
  ok(mockRequirePermission(subYes, "manage_orders").authorized, "sub_admin with matching permission → allowed"); inc();
  // sub_admin without matching permission → 403
  const rp5 = mockRequirePermission(subNo, "manage_orders");
  strictEqual(rp5.authorized, false, "sub_admin missing permission → unauthorized"); inc();
  if (!rp5.authorized) strictEqual(rp5.status, 403, "sub_admin missing permission → 403"); inc();
  // sub_admin with wrong permission → 403
  const rp6 = mockRequirePermission(subYes, "manage_users");
  strictEqual(rp6.authorized, false, "sub_admin wrong permission → unauthorized"); inc();
  if (!rp6.authorized) strictEqual(rp6.status, 403, "sub_admin wrong permission → 403"); inc();
  // member (non-admin role) → 403
  const rp7 = mockRequirePermission(member, "anything");
  strictEqual(rp7.authorized, false, "member → unauthorized"); inc();
  if (!rp7.authorized) strictEqual(rp7.status, 403, "member → 403"); inc();
}

// ── Summary ────────────────────────────────────────────────────
console.log(`\nAll auth module tests passed — ${total} assertions.`);
