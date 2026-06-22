import { test, expect } from "@playwright/test";

test.describe("Owner Dashboard", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/owner", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("owner/menu redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/owner/menu", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("owner/orders redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/owner/orders", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("owner/loyalty redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/owner/loyalty", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("owner/orders/[id] redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/owner/orders/1", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Owner API", () => {
  test("unauthenticated /api/auth/me returns 401", async ({ request }) => {
    const resp = await request.get("/api/auth/me");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated /api/stats returns 401", async ({ request }) => {
    const resp = await request.get("/api/stats?restaurantId=1");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated /api/categories returns 401", async ({ request }) => {
    const resp = await request.get("/api/categories?restaurantId=1");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated /api/items returns 401", async ({ request }) => {
    const resp = await request.get("/api/items?categoryId=1");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated /api/orders returns 401", async ({ request }) => {
    const resp = await request.get("/api/orders");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated /api/loyalty/stats returns 401", async ({ request }) => {
    const resp = await request.get("/api/loyalty/stats");
    expect(resp.status()).toBe(401);
  });
});

test.describe("Owner — Login flow redirects correctly", () => {
  test("login page redirect param is preserved for owner", async ({ page }) => {
    // Visit owner page, get redirected to login with redirect=/owner
    await page.goto("/owner", { waitUntil: "networkidle" });
    const url = page.url();
    expect(url).toContain("/login");
    expect(url).toContain("redirect=%2Fowner");
  });

  test("owner/menu redirect param preserved", async ({ page }) => {
    await page.goto("/owner/menu");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fowner%2Fmenu/);
  });

  test("owner/orders redirect param preserved", async ({ page }) => {
    await page.goto("/owner/orders");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fowner%2Forders/);
  });

  test("owner/loyalty redirect param preserved", async ({ page }) => {
    await page.goto("/owner/loyalty");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fowner%2Floyalty/);
  });
});
