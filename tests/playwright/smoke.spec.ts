import { test, expect } from "@playwright/test";

test.describe("Smart Menu — Smoke Tests", () => {

  test("homepage loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/الربط الذكي/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("login page loads and has form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2, form")).toBeVisible();
  });

  test("pricing page shows plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toContainText(/مجاني|خطة/);
  });

  test("cart page loads (empty state)", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("body")).toBeVisible();
  });

  test("menu redirects to first restaurant", async ({ page }) => {
    await page.goto("/menu");
    await expect(page).toHaveURL(/\/menu\//);
  });

  test("restaurant menu page loads with items", async ({ page }) => {
    await page.goto("/menu/al-waha-cafe");
    await expect(page.locator("h1, h2, h3")).toBeVisible();
  });

  test("404 page shows not-found", async ({ page }) => {
    const response = await page.goto("/not-found");
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/404|غير موجود/);
  });

  test("admin route redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("owner route redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/owner");
    await expect(page).toHaveURL(/\/login/);
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    const toggle = page.locator("button[aria-label*='dark' i], button[aria-label*='light' i]");
    if (await toggle.count() > 0) {
      await toggle.first().click();
      await page.waitForTimeout(400);
      const newClass = await html.getAttribute("class");
      expect(newClass).not.toBe(initialClass);
    }
  });

  test("pricing page has multiple plans with prices", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toContainText(/د\.ل/);
  });

  test("subscribe page has form fields", async ({ page }) => {
    await page.goto("/subscribe");
    await expect(page.locator("input")).toBeVisible();
  });
});
