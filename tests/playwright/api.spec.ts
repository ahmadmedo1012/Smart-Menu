import { test, expect } from "@playwright/test";

test.describe("Smart Menu — API Tests", () => {

  test("GET /api/restaurants returns data", async ({ request }) => {
    const res = await request.get("/api/restaurants");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.restaurants.length).toBeGreaterThan(0);
  });

  test("GET /api/plans returns plans", async ({ request }) => {
    const res = await request.get("/api/plans");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/me without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
  });

  test("GET /api/orders without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/orders");
    expect(res.status()).toBe(401);
  });

  test("POST /api/auth/login with wrong creds returns 403/401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { username: "wrong", password: "wrong" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
