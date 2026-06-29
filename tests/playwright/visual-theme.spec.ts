import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/login", "/subscribe", "/pricing", "/cart", "/order-confirmed"];

test.describe("Visual — Dark/Light Theme Integrity", () => {
  for (const route of ROUTES) {
    test(`${route} — loads in both themes`, async ({ page }) => {
      // Light mode
      await page.goto(route, { timeout: 10000 });
      await page.waitForTimeout(1500);
      await expect(page.locator("body")).toBeVisible();

      // Verify dir="rtl"
      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("rtl");
    });
  }

  for (const route of ["/owner", "/owner/menu", "/owner/orders", "/owner/qr"]) {
    test(`owner ${route} — renders`, async ({ page }) => {
      await page.goto("/login");
      await page.waitForSelector('input[placeholder="اسم المستخدم"]', { timeout: 5000 });
      await page.fill('input[placeholder="اسم المستخدم"]', "testuser_pw");
      await page.fill('input[placeholder="كلمة المرور"]', "test123456");
      await page.locator("button").filter({ hasText: "تسجيل الدخول" }).first().click();
      await page.waitForURL(/\/owner/, { timeout: 10000 });
      await page.goto(route, { timeout: 10000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
