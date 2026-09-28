import { test, expect } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

const RUNTIME_HOST = "localhost";

// Normalize 127.0.0.1 → localhost: Next dev normalizes the middleware request
// URL to localhost, so API CSRF Origin + the nonce-CSP nonce-stamping both
// anchor to localhost. Using localhost keeps the app's middleware/proxy
// behavior identical to production (no host divergence).
const raw = process.env.BASE_URL || `http://${RUNTIME_HOST}:3000`;
const u = new URL(raw.replace(/\/+$/, ""));
if (u.hostname === "127.0.0.1") u.hostname = RUNTIME_HOST;
const BASE = u.origin;
let CSRF: { token: string; cookie: string } = { token: "", cookie: "" };

test.beforeEach(async ({ request }) => {
  CSRF = await mintCsrfPair(request);
});

test.describe("API Smoke Tests — Public Endpoints", () => {
  test("GET /api/plans returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/plans`);
    expect(res.status()).toBe(200);
  });

  test("GET /api/plans returns success:true with plans array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/plans`);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test("GET /api/plans response has application/json content-type", async ({ request }) => {
    const res = await request.get(`${BASE}/api/plans`);
    const headers = await res.headers();
    const ct = headers["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });
});

test.describe("API Smoke Tests — Auth Login", () => {
  test("POST /api/auth/login with empty body returns 422", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, CSRF) },
      data: {},
    });
    // r121-M1: r119-B4 (c4bd21f9) unified schema-validation failures to 422 —
    // the pin was never updated (CI is billing-blocked, so the drift went unseen).
    expect(res.status()).toBe(422);
  });

  test("POST /api/auth/login with empty body returns error message", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, CSRF) },
      data: {},
    });
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
    expect(json.error.length).toBeGreaterThan(0);
  });

  test("POST /api/auth/login with wrong credentials returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, CSRF) },
      data: { username: "nonexistent_user_xyz", password: "wrongpass" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/auth/login with wrong credentials returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, CSRF) },
      data: { username: "nonexistent_user_xyz", password: "wrongpass" },
    });
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
  });
});

test.describe("API Smoke Tests — Auth Guard", () => {
  test("GET /api/auth/me without session returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/auth/me without session returns error", async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
  });

  test("POST /api/subscriptions without auth returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, CSRF) },
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/subscriptions without auth returns error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscriptions`, {
      headers: { "Content-Type": "application/json", ...csrfHeadersFor(BASE, CSRF) },
      data: {},
    });
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
  });
});

test.describe("API Smoke Tests — Telegram & 404", () => {
  test("GET /api/telegram/webhook returns 405 method not allowed", async ({ request }) => {
    const res = await request.get(`${BASE}/api/telegram/webhook`);
    expect(res.status()).toBe(405);
  });

  test("GET /api/telegram/diagnose without auth returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/telegram/diagnose`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/telegram/diagnose without auth returns error", async ({ request }) => {
    const res = await request.get(`${BASE}/api/telegram/diagnose`);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
  });

  test("GET /non-existent-route returns 404", async ({ request }) => {
    const res = await request.get(`${BASE}/this-path-does-not-exist-12345`);
    expect(res.status()).toBe(404);
  });
});
