import { test, expect } from "@playwright/test";

const BASE = "https://smart-menu-sigma.vercel.app";

test.describe("Subscribe flow validation", () => {
  test("POST /api/subscriptions/validate — taken username returns error", async ({ request }) => {
    const r = await request.post(`${BASE}/api/subscriptions/validate`, {
      data: { username: "admin", slug: `test-slug-${Date.now()}` },
    });
    expect(r.ok()).toBe(true);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(false);
    expect(body.data.errors.username).toBeTruthy();
  });

  test("POST /api/subscriptions/validate — available data returns valid", async ({ request }) => {
    const r = await request.post(`${BASE}/api/subscriptions/validate`, {
      data: { username: `new-user-${Date.now()}`, slug: `new-slug-${Date.now()}` },
    });
    expect(r.ok()).toBe(true);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(true);
  });

  test("POST /api/subscriptions/validate — invalid slug characters rejected", async ({ request }) => {
    const r = await request.post(`${BASE}/api/subscriptions/validate`, {
      data: { username: "validuser", slug: "!!invalid slug!!" },
    });
    expect(r.status()).toBe(400);
  });

  test("POST /api/subscriptions/validate — taken slug returns error", async ({ request }) => {
    const r = await request.post(`${BASE}/api/subscriptions/validate`, {
      data: { username: `unique-user-${Date.now()}`, slug: "al-waha-cafe" },
    });
    expect(r.ok()).toBe(true);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(false);
    expect(body.data.errors.slug).toBeTruthy();
  });

  test("POST /api/auth/register — taken username returns 409", async ({ request }) => {
    const r = await request.post(`${BASE}/api/auth/register`, {
      data: { username: "admin", password: "test123456", name: "Test" },
    });
    expect(r.status()).toBe(409);
    const body = await r.json();
    expect(body.error).toBeTruthy();
  });

  test("GET /api/plans — returns active plans", async ({ request }) => {
    const r = await request.get(`${BASE}/api/plans`);
    expect(r.ok()).toBe(true);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test("GET /api/user/events/stream — returns 401 unauthenticated", async ({ request }) => {
    const r = await request.get(`${BASE}/api/user/events/stream`);
    expect(r.status()).toBe(401);
  });

  test("GET /subscribe — page responds 200", async ({ request }) => {
    const r = await request.get(`${BASE}/subscribe`);
    expect(r.status()).toBe(200);
  });

  test("GET /checkout — page responds 200", async ({ request }) => {
    const r = await request.get(`${BASE}/checkout`);
    expect(r.status()).toBe(200);
  });
});
