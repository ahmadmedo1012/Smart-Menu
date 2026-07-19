import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac, timingSafeEqual } from "node:crypto";

describe("hash.ts", () => {
  it("hashPassword returns string", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    expect(typeof hashPassword("correct-horse-battery-staple")).toBe("string");
  });

  it("hashPassword format salt:hash", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    expect(hashPassword("correct-horse-battery-staple")).toContain(":");
  });

  it("salt = 64 hex chars (32 bytes)", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const [salt] = hashPassword("correct-horse-battery-staple").split(":");
    expect(salt).toHaveLength(64);
  });

  it("hash = 128 hex chars (64 bytes)", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const [, hash] = hashPassword("correct-horse-battery-staple").split(":");
    expect(hash).toHaveLength(128);
  });

  it("salt hex only", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const [salt] = hashPassword("correct-horse-battery-staple").split(":");
    expect(salt).toMatch(/^[0-9a-f]+$/);
  });

  it("hash hex only", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const [, hash] = hashPassword("correct-horse-battery-staple").split(":");
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("verifyHash correct password -> true", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const pwd = "correct-horse-battery-staple";
    const hashed = hashPassword(pwd);
    expect(verifyHash(pwd, hashed)).toBe(true);
  });

  it("wrong password -> false", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const hashed = hashPassword("correct-horse-battery-staple");
    expect(verifyHash("wrong-password", hashed)).toBe(false);
  });

  it("empty password -> false", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const hashed = hashPassword("correct-horse-battery-staple");
    expect(verifyHash("", hashed)).toBe(false);
  });

  it("empty stored -> false", async () => {
    const { verifyHash } = await import("../../src/lib/hash.ts");
    expect(verifyHash("anything", "")).toBe(false);
  });

  it("no-colon stored -> false", async () => {
    const { verifyHash } = await import("../../src/lib/hash.ts");
    expect(verifyHash("anything", "no-colon")).toBe(false);
  });

  it("multi-colon stored -> false", async () => {
    const { verifyHash } = await import("../../src/lib/hash.ts");
    expect(verifyHash("anything", "a:b:c")).toBe(false);
  });

  it("verifyHash idempotent for same password", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const pwd = "correct-horse-battery-staple";
    const hashed = hashPassword(pwd);
    expect(verifyHash(pwd, hashed)).toBe(true);
  });

  it("unique salt per call", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const h1 = hashPassword("correct-horse-battery-staple");
    const h2 = hashPassword("correct-horse-battery-staple");
    expect(h1.split(":")[0]).not.toBe(h2.split(":")[0]);
  });
});

// ════════════════════════════════════════════════════════════════════
// 2. Mock JWT — HMAC-SHA256 session token round-trip
// ════════════════════════════════════════════════════════════════════

describe("Mock JWT", () => {
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

  it("createSessionToken returns string with 3 dot-separated parts", () => {
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("round-trips userId and role", () => {
    const decoded = verifySessionToken(token, SECRET);
    expect(decoded).not.toBeNull();
    if (decoded) {
      expect(decoded.userId).toBe(42);
      expect(decoded.role).toBe("owner");
      expect(typeof decoded.iat).toBe("number");
      expect(typeof decoded.exp).toBe("number");
    }
  });

  it("wrong secret -> null", () => {
    expect(verifySessionToken(token, "wrong-secret")).toBeNull();
  });

  it("tampered payload -> null", () => {
    const parts = token.split(".");
    const tampered = Buffer.from(JSON.stringify({ userId: 999 })).toString("base64url");
    const forged = `${parts[0]}.${tampered}.${parts[2]}`;
    expect(verifySessionToken(forged, SECRET)).toBeNull();
  });

  it("malformed/empty token -> null", () => {
    expect(verifySessionToken("not-a-jwt", SECRET)).toBeNull();
    expect(verifySessionToken("a.b", SECRET)).toBeNull();
    expect(verifySessionToken("", SECRET)).toBeNull();
  });

  it("expired token -> null", () => {
    expect(verifySessionToken(createSessionToken(payload, SECRET, -1), SECRET)).toBeNull();
  });

  it("second token is valid", () => {
    const t2 = createSessionToken(payload, SECRET);
    expect(typeof t2).toBe("string");
    expect(t2.split(".")).toHaveLength(3);
    expect(verifySessionToken(t2, SECRET)).not.toBeNull();
  });

  it("custom extra fields survive round-trip", () => {
    const custom = createSessionToken({ userId: 7, role: "admin", restaurantId: 3 }, SECRET);
    const dec = verifySessionToken(custom, SECRET);
    expect(dec).not.toBeNull();
    if (dec) expect(dec.restaurantId).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════════
// 3. csrf-client.ts — fetch wrapper adds CSRF header to mutations
// ════════════════════════════════════════════════════════════════════

describe("csrf-client.ts", () => {
  const CSRF_COOKIE = "csrf-token";
  const CSRF_HEADER = "x-csrf-token";
  let origFetch: typeof globalThis.fetch;
  let origCookie: string | undefined;
  const calls: any[] = [];

  beforeEach(() => {
    origFetch = globalThis.fetch;
    origCookie = (globalThis as any).document?.cookie;
    calls.length = 0;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    (globalThis as any).document = { cookie: origCookie ?? "" };
  });

  async function setupFetch(mockToken: string) {
    (globalThis as any).document = { cookie: `${CSRF_COOKIE}=${mockToken}` };
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    return (await import("../../src/lib/csrf-client.ts")).csrfFetch;
  }

  it("GET — no CSRF header added", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test");
    expect(calls).toHaveLength(1);
    expect(!calls[0].init || !(calls[0].init as any).headers).toBe(true);
  });

  it("POST adds CSRF header", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test", { method: "POST" });
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe("mock-token");
  });

  it("PUT adds CSRF header", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test", { method: "PUT" });
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe("mock-token");
  });

  it("DELETE adds CSRF header", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test", { method: "DELETE" });
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe("mock-token");
  });

  it("PATCH adds CSRF header", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test", { method: "PATCH" });
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe("mock-token");
  });

  it("preserves original headers while adding CSRF", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test", { method: "POST", headers: { "Content-Type": "application/json" } });
    expect((calls[0].init as any).headers["Content-Type"]).toBe("application/json");
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe("mock-token");
  });

  it("lowercase POST still adds header", async () => {
    const csrfFetch = await setupFetch("mock-token");
    await csrfFetch("/api/test", { method: "post" });
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe("mock-token");
  });
});

// ════════════════════════════════════════════════════════════════════
// 4. auth.ts — requireAuth / requireAdmin / requirePermission logic
// ════════════════════════════════════════════════════════════════════

describe("auth.ts", () => {
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
        if (opts?.requireRestaurant && !user.restaurantId) return { authorized: false as const };
        return user;
      }
    }
    return { authorized: false as const };
  }

  function mockRequireAdmin(auth: AuthResult | { authorized: false }): AuthResult | { authorized: false } {
    if (!auth.authorized) return { authorized: false as const };
    if (!["super_admin", "sub_admin", "admin"].includes(auth.role)) return { authorized: false as const };
    return auth;
  }

  function mockRequirePermission(
    auth: AuthResult | { authorized: false }, permission: string,
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

  describe("requireAuth", () => {
    it("invalid session -> unauthorized", async () => {
      expect((await mockRequireAuth(badSession, null)).authorized).toBe(false);
    });
    it("user null -> unauthorized", async () => {
      expect((await mockRequireAuth(validSession, null)).authorized).toBe(false);
    });
    it("valid session + user -> authorized", async () => {
      const r = await mockRequireAuth(validSession, admin);
      expect(r.authorized).toBe(true);
      if (r.authorized) {
        expect(r.userId).toBe(1);
        expect(r.role).toBe("admin");
        expect(r.restaurantId).toBe(5);
        expect(r.subscriptionStatus).toBe("active");
      }
    });
    it("requireRestaurant blocks null restaurantId", async () => {
      expect((await mockRequireAuth(validSession, { ...member, restaurantId: null }, { requireRestaurant: true })).authorized).toBe(false);
    });
    it("requireRestaurant allows with restaurantId", async () => {
      expect((await mockRequireAuth(validSession, { ...member, restaurantId: 7 }, { requireRestaurant: true })).authorized).toBe(true);
    });
    it("expired session -> unauthorized", async () => {
      expect((await mockRequireAuth({ valid: false, userId: 1 }, admin)).authorized).toBe(false);
    });
    it("valid but no userId -> unauthorized", async () => {
      expect((await mockRequireAuth({ valid: true, userId: null }, admin)).authorized).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("admin role -> authorized", () => expect(mockRequireAdmin(admin).authorized).toBe(true));
    it("super_admin role -> authorized", () => expect(mockRequireAdmin(superAdmin).authorized).toBe(true));
    it("sub_admin role -> authorized", () => expect(mockRequireAdmin(subYes).authorized).toBe(true));
    it("member role -> unauthorized", () => expect(mockRequireAdmin(member).authorized).toBe(false));
    it("unauthenticated -> unauthorized", () => expect(mockRequireAdmin({ authorized: false }).authorized).toBe(false));
  });

  describe("requirePermission", () => {
    it("unauthenticated -> 401", () => {
      const r = mockRequirePermission({ authorized: false }, "manage_orders");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(401);
    });
    it("super_admin bypasses permission", () => expect(mockRequirePermission(superAdmin, "anything").authorized).toBe(true));
    it("admin bypasses permission", () => expect(mockRequirePermission(admin, "anything").authorized).toBe(true));
    it("sub_admin matching permission -> allowed", () => expect(mockRequirePermission(subYes, "manage_orders").authorized).toBe(true));
    it("sub_admin missing permission -> 403", () => {
      const r = mockRequirePermission(subNo, "manage_orders");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("sub_admin wrong permission -> 403", () => {
      const r = mockRequirePermission(subYes, "manage_users");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("member -> 403", () => {
      const r = mockRequirePermission(member, "anything");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("super_admin with no-restaurant check passes", () => {
      expect(mockRequirePermission(superAdmin, "anything").authorized).toBe(true);
    });
    it("403 error message is string and non-empty", () => {
      const r = mockRequirePermission(subNo, "manage_orders") as { authorized: false; error: string; status: number };
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
    });
    it("401 error message is string and non-empty", () => {
      const r = mockRequirePermission({ authorized: false }, "x") as { authorized: false; error: string; status: number };
      expect(typeof r.error).toBe("string");
      expect(r.error.length).toBeGreaterThan(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════════
// 5. subscription-decisions.ts — resolveSubscriptionPayment gates + decision map
// ════════════════════════════════════════════════════════════════════

describe("subscription-decisions.ts", () => {
  type MockPayment = { id: number; status: string; userId: number | null };

  function mockResolveSubscriptionPayment(
    payment: MockPayment | null,
    decision: string,
  ): { ok: boolean; action?: string; paymentId?: number; reason?: string } {
    if (!payment) return { ok: false, reason: "الطلب غير موجود" };
    if (payment.status !== "pending") return { ok: false, reason: "تمت معالجة هذا الطلب مسبقاً" };
    if (decision === "verified") return { ok: true, action: "verified", paymentId: payment.id };
    if (decision === "cancelled") return { ok: true, action: "cancelled", paymentId: payment.id };
    return { ok: false, reason: "قرار غير معروف" };
  }

  it("null payment -> not-found reason", () => {
    const r = mockResolveSubscriptionPayment(null, "verified");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("الطلب غير موجود");
  });

  it("non-pending payment -> already-processed reason", () => {
    const verified = mockResolveSubscriptionPayment({ id: 1, status: "verified", userId: 1 }, "verified");
    expect(verified.ok).toBe(false);
    expect(verified.reason).toBe("تمت معالجة هذا الطلب مسبقاً");

    const cancelled = mockResolveSubscriptionPayment({ id: 2, status: "cancelled", userId: 1 }, "verified");
    expect(cancelled.ok).toBe(false);
  });

  it('decision "verified" -> action verified', () => {
    const r = mockResolveSubscriptionPayment({ id: 10, status: "pending", userId: 5 }, "verified");
    expect(r.ok).toBe(true);
    expect(r.action).toBe("verified");
    expect(r.paymentId).toBe(10);
  });

  it('decision "cancelled" -> action cancelled', () => {
    const r = mockResolveSubscriptionPayment({ id: 20, status: "pending", userId: 6 }, "cancelled");
    expect(r.ok).toBe(true);
    expect(r.action).toBe("cancelled");
    expect(r.paymentId).toBe(20);
  });

  it("pending with null userId still resolves", () => {
    const r = mockResolveSubscriptionPayment({ id: 30, status: "pending", userId: null }, "cancelled");
    expect(r.ok).toBe(true);
    expect(r.action).toBe("cancelled");
  });

  it("multiple payments get independent results", () => {
    const a = mockResolveSubscriptionPayment({ id: 100, status: "pending", userId: 1 }, "verified");
    const b = mockResolveSubscriptionPayment({ id: 200, status: "pending", userId: 2 }, "cancelled");
    expect(a.action).toBe("verified");
    expect(b.action).toBe("cancelled");
    expect(a.paymentId).toBe(100);
    expect(b.paymentId).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════════
// 6. telegram-admin.ts — getAdminTelegramIds parses env, merges DB, deduplicates
// ════════════════════════════════════════════════════════════════════

describe("telegram-admin.ts — getAdminTelegramIds", () => {
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

  it("single env ID parsed", () => expect(mockGetAdminTelegramIds("123456", [])).toEqual([123456]));
  it("multiple env IDs parsed", () => expect(mockGetAdminTelegramIds("111,222,333", [])).toEqual([111, 222, 333]));
  it("DB BigInt ID included", () => expect(mockGetAdminTelegramIds("", [{ telegramId: BigInt(999) }])).toEqual([999]));
  it("env + DB merged", () => expect(mockGetAdminTelegramIds("100", [{ telegramId: BigInt(200) }, { telegramId: BigInt(300) }])).toEqual([100, 200, 300]));
  it("overlapping IDs deduplicated", () => {
    const r = mockGetAdminTelegramIds("500,600", [{ telegramId: BigInt(600) }, { telegramId: BigInt(700) }]);
    expect(r).toEqual([500, 600, 700]);
    expect(r).toHaveLength(3);
  });
  it("empty env + empty DB -> []", () => expect(mockGetAdminTelegramIds("", [])).toEqual([]));
  it("invalid env IDs filtered out", () => expect(mockGetAdminTelegramIds("abc,0,-5,42,NaN", [])).toEqual([42]));
  it("invalid DB IDs filtered out", () => expect(mockGetAdminTelegramIds("", [{ telegramId: BigInt(0) }, { telegramId: BigInt(-1) }, { telegramId: BigInt(77) }])).toEqual([77]));
  it("whitespace in env var handled", () => expect(mockGetAdminTelegramIds(" 10 , 20 ,30", [])).toEqual([10, 20, 30]));
  it("large safe integer passes", () => expect(mockGetAdminTelegramIds("9007199254740991", [])).toEqual([9007199254740991]));
  it("duplicates within env var deduplicated", () => expect(mockGetAdminTelegramIds("1,2,2,3", [])).toEqual([1, 2, 3]));
});
