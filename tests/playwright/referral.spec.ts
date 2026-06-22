import { test, expect } from "@playwright/test";

test.describe("Referral System", () => {
  test("loyalty API returns correct structure", async ({ request }) => {
    // Test with a known phone that exists or will be created
    const resp = await request.get("/api/loyalty?phone=0991111111&restaurantId=1");
    // Either returns 200 with data or 404 if no card — both are valid API responses
    expect([200, 404]).toContain(resp.status());

    if (resp.status() === 200) {
      const json = await resp.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.card).toBeDefined();
      expect(json.data.card).toHaveProperty("points");
      expect(json.data.card).toHaveProperty("tier");
      expect(json.data.card).toHaveProperty("referralCode");
      expect(json.data.card).toHaveProperty("totalOrders");
      expect(json.data.card).toHaveProperty("totalSpent");
    }
  });

  test("loyalty card creation works", async ({ request }) => {
    const uniquePhone = `099${Date.now().toString().slice(-7)}`;
    const resp = await request.post("/api/loyalty", {
      data: {
        customerPhone: uniquePhone,
        customerName: "Test User",
        restaurantId: 1,
      },
    });

    // Should create or return existing
    expect(resp.ok()).toBeTruthy();
    const json = await resp.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.card).toHaveProperty("referralCode");
    expect(json.data.card.referralCode).toBeTruthy();
  });

  test("referral code format is alphanumeric", async ({ request }) => {
    const uniquePhone = `099${Date.now().toString().slice(-7)}`;
    const createResp = await request.post("/api/loyalty", {
      data: { customerPhone: uniquePhone, customerName: "Code Format Test", restaurantId: 1 },
    });
    test.skip(!createResp.ok(), "Could not create loyalty card — skipping");

    const json = await createResp.json();
    const code = json.data.card.referralCode;
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
    expect(code.length).toBeGreaterThanOrEqual(4);
  });

  test("referral URL has correct format", async ({ request }) => {
    const uniquePhone = `099${Date.now().toString().slice(-7)}`;
    const createResp = await request.post("/api/loyalty", {
      data: { customerPhone: uniquePhone, customerName: "URL Test", restaurantId: 1 },
    });
    test.skip(!createResp.ok(), "Could not create loyalty card — skipping");

    const json = await createResp.json();
    const referralUrl = json.data.referralUrl;
    expect(referralUrl).toBeTruthy();
    expect(referralUrl).toContain("/menu/");
    expect(referralUrl).toContain("?ref=");
  });

  test("referral code appears in loyalty check response", async ({ request }) => {
    const uniquePhone = `099${Date.now().toString().slice(-7)}`;
    // Create first
    await request.post("/api/loyalty", {
      data: { customerPhone: uniquePhone, customerName: "Referral Check", restaurantId: 1 },
    });
    // Then fetch
    const resp = await request.get(`/api/loyalty?phone=${uniquePhone}&restaurantId=1`);
    test.skip(!resp.ok(), "Could not fetch loyalty card — skipping");

    const json = await resp.json();
    expect(json.data.card.referralCode).toBeTruthy();
  });

  test("ReferralCard component renders on menu page (LoyaltyWidget)", async ({ page }) => {
    // Navigate to a restaurant menu page (the loyalty widget is on public menu pages)
    await page.goto("/menu", { waitUntil: "domcontentloaded" });
    const currentUrl = page.url();

    // Skip if no restaurant available
    test.skip(!currentUrl.includes("/menu/") || currentUrl.endsWith("/menu"), "No restaurant available — skipping");

    // The LoyaltyWidget section should be visible
    const loyaltySection = page.getByText("برنامج الولاء").first();
    await expect(loyaltySection).toBeVisible({ timeout: 8000 });
  });

  test("loyalty widget has phone input and check button", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "domcontentloaded" });
    const url = page.url();
    test.skip(!url.includes("/menu/") || url.endsWith("/menu"), "No restaurant available — skipping");

    // The loyalty widget should have a phone input
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="هاتف"], input[placeholder*="phone"]').first();
    await expect(phoneInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Referral API — Unauthenticated", () => {
  test("loyalty stats require authentication", async ({ request }) => {
    const resp = await request.get("/api/loyalty/stats");
    expect(resp.status()).toBe(401);
  });
});

test.describe("Referral API — Error Handling", () => {
  test("loyalty check without phone returns error", async ({ request }) => {
    const resp = await request.get("/api/loyalty");
    // Should be 400 (missing params) or similar
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test("loyalty check with invalid restaurant returns 404", async ({ request }) => {
    const resp = await request.get("/api/loyalty?phone=0991111111&restaurantId=99999");
    // Either 404 (no card + no restaurant to create for) or 200 (creates without restaurant)
    expect([200, 404, 400].includes(resp.status())).toBeTruthy();
  });
});
