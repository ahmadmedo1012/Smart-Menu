import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ════════════════════════════════════════════════════════════════════
// 1. hash.ts — PBKDF2 password hashing (stand-in for bcrypt)
// ════════════════════════════════════════════════════════════════════

describe("hash.ts", () => {
  it("hashPassword returns string", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const pwd = "correct-horse-battery-staple";
    const hashed = hashPassword(pwd);
    expect(typeof hashed).toBe("string");
  });

  it("hashPassword format salt:hash", async () => {
    const { hashPassword } = await import("../../src/lib/hash.ts");
    const hashed = hashPassword("correct-horse-battery-staple");
    expect(hashed).toContain(":");
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

  it("verifyHash correct password → true", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const pwd = "correct-horse-battery-staple";
    const hashed = hashPassword(pwd);
    expect(verifyHash(pwd, hashed)).toBe(true);
  });

  it("wrong password → false", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const pwd = "correct-horse-battery-staple";
    const hashed = hashPassword(pwd);
    expect(verifyHash("wrong-password", hashed)).toBe(false);
  });

  it("empty password → false", async () => {
    const { hashPassword, verifyHash } = await import("../../src/lib/hash.ts");
    const hashed = hashPassword("correct-horse-battery-staple");
    expect(verifyHash("", hashed)).toBe(false);
  });

  it("empty stored → false", async () => {
    const { verifyHash } = await import("../../src/lib/hash.ts");
    expect(verifyHash("anything", "")).toBe(false);
  });

  it("no-colon stored → false", async () => {
    const { verifyHash } = await import("../../src/lib/hash.ts");
    expect(verifyHash("anything", "no-colon")).toBe(false);
  });

  it("multi-colon stored → false", async () => {
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
    const pwd = "correct-horse-battery-staple";
    const hashed1 = hashPassword(pwd);
    const hashed2 = hashPassword(pwd);
    expect(hashed1.split(":")[0]).not.toBe(hashed2.split(":")[0]);
  });
});

// ════════════════════════════════════════════════════════════════════
// 2. csrf-client.ts — fetch wrapper adds CSRF header to mutations
// ════════════════════════════════════════════════════════════════════

describe("csrf-client.ts", () => {
  const CSRF_COOKIE = "csrf-token";

  beforeEach(() => {
    (globalThis as any).document = {
      cookie: "",
    };
  });

  afterEach(() => {
    delete (globalThis as any).document;
  });

  it("GET — no CSRF header added", async () => {
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `${CSRF_COOKIE}=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test");
    expect(calls).toHaveLength(1);
    expect(calls[0].init?.headers).toBeFalsy();
    globalThis.fetch = origFetch;
  });

  it("POST — adds CSRF header", async () => {
    const CSRF_COOKIE = "csrf-token";
    const CSRF_HEADER = "x-csrf-token";
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `${CSRF_COOKIE}=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test", { method: "POST" });
    expect((calls[0].init as any).headers[CSRF_HEADER]).toBe(mockToken);
    globalThis.fetch = origFetch;
  });

  it("PUT adds CSRF header", async () => {
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `csrf-token=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test", { method: "PUT" });
    expect((calls[0].init as any).headers["x-csrf-token"]).toBe(mockToken);
    globalThis.fetch = origFetch;
  });

  it("DELETE adds CSRF header", async () => {
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `csrf-token=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test", { method: "DELETE" });
    expect((calls[0].init as any).headers["x-csrf-token"]).toBe(mockToken);
    globalThis.fetch = origFetch;
  });

  it("PATCH adds CSRF header", async () => {
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `csrf-token=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test", { method: "PATCH" });
    expect((calls[0].init as any).headers["x-csrf-token"]).toBe(mockToken);
    globalThis.fetch = origFetch;
  });

  it("preserves original headers while adding CSRF", async () => {
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `csrf-token=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test", { method: "POST", headers: { "Content-Type": "application/json" } });
    expect((calls[0].init as any).headers["Content-Type"]).toBe("application/json");
    expect((calls[0].init as any).headers["x-csrf-token"]).toBe(mockToken);
    globalThis.fetch = origFetch;
  });

  it("lowercase POST still adds header", async () => {
    const mockToken = "mock-csrf-" + Math.random().toString(16).slice(2, 10);
    (globalThis as any).document = { cookie: `csrf-token=${mockToken}` };
    const origFetch = globalThis.fetch;
    const calls: any[] = [];
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    const { csrfFetch } = await import("../../src/lib/csrf-client.ts");

    await csrfFetch("/api/test", { method: "post" });
    expect((calls[0].init as any).headers["x-csrf-token"]).toBe(mockToken);
    globalThis.fetch = origFetch;
  });
});

// ════════════════════════════════════════════════════════════════════
// 3. auth.ts — requireAuth / requireAdmin / requirePermission logic
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
        if (opts?.requireRestaurant && !user.restaurantId) {
          return { authorized: false as const };
        }
        return user;
      }
    }
    return { authorized: false as const };
  }

  function mockRequireAdmin(
    auth: AuthResult | { authorized: false },
  ): AuthResult | { authorized: false } {
    if (!auth.authorized) return { authorized: false as const };
    if (!["super_admin", "sub_admin", "admin"].includes(auth.role)) {
      return { authorized: false as const };
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

  describe("requireAuth", () => {
    it("invalid session → unauthorized", async () => {
      expect((await mockRequireAuth(badSession, null)).authorized).toBe(false);
    });
    it("user null → unauthorized", async () => {
      expect((await mockRequireAuth(validSession, null)).authorized).toBe(false);
    });
    it("valid session + user → authorized", async () => {
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
      const noRest = { ...member, restaurantId: null };
      expect((await mockRequireAuth(validSession, noRest, { requireRestaurant: true })).authorized).toBe(false);
    });
    it("requireRestaurant allows with restaurantId", async () => {
      const hasRest = { ...member, restaurantId: 7 };
      expect((await mockRequireAuth(validSession, hasRest, { requireRestaurant: true })).authorized).toBe(true);
    });
    it("expired session → unauthorized", async () => {
      expect((await mockRequireAuth({ valid: false, userId: 1 }, admin)).authorized).toBe(false);
    });
    it("valid but no userId → unauthorized", async () => {
      expect((await mockRequireAuth({ valid: true, userId: null }, admin)).authorized).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("admin role → authorized", () => {
      expect(mockRequireAdmin(admin).authorized).toBe(true);
    });
    it("super_admin role → authorized", () => {
      expect(mockRequireAdmin(superAdmin).authorized).toBe(true);
    });
    it("sub_admin role → authorized", () => {
      expect(mockRequireAdmin(subYes).authorized).toBe(true);
    });
    it("member role → unauthorized", () => {
      expect(mockRequireAdmin(member).authorized).toBe(false);
    });
    it("unauthenticated → unauthorized", () => {
      expect(mockRequireAdmin({ authorized: false }).authorized).toBe(false);
    });
  });

  describe("requirePermission", () => {
    it("unauthenticated → 401", () => {
      const r = mockRequirePermission({ authorized: false }, "manage_orders");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(401);
    });
    it("super_admin bypasses permission", () => {
      expect(mockRequirePermission(superAdmin, "anything").authorized).toBe(true);
    });
    it("admin bypasses permission", () => {
      expect(mockRequirePermission(admin, "anything").authorized).toBe(true);
    });
    it("sub_admin with matching permission → allowed", () => {
      expect(mockRequirePermission(subYes, "manage_orders").authorized).toBe(true);
    });
    it("sub_admin missing permission → 403", () => {
      const r = mockRequirePermission(subNo, "manage_orders");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("sub_admin wrong permission → 403", () => {
      const r = mockRequirePermission(subYes, "manage_users");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
    it("member → 403", () => {
      const r = mockRequirePermission(member, "anything");
      expect(r.authorized).toBe(false);
      if (!r.authorized) expect(r.status).toBe(403);
    });
  });
});
