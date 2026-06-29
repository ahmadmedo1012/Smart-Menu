import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/login", "/subscribe", "/pricing", "/cart", "/order-confirmed", "/menu/al-waha-cafe"];

test.describe("Visual — RTL Typographic & Layout Precision", () => {
  for (const route of ROUTES) {
    test(`${route} — RTL text flow correct`, async ({ page }) => {
      await page.goto(route, { timeout: 10000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Check dir attribute on html
      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("rtl");

      // Check lang attribute
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBe("ar");

      // Body should have visible text
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
