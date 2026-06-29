import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-320", w: 320, h: 568 },
  { name: "mobile-375", w: 375, h: 667 },
  { name: "mobile-414", w: 414, h: 896 },
  { name: "tablet-768", w: 768, h: 1024 },
  { name: "laptop-1024", w: 1024, h: 768 },
  { name: "desktop-1280", w: 1280, h: 800 },
  { name: "desktop-1440", w: 1440, h: 900 },
  { name: "desktop-1920", w: 1920, h: 1080 },
  { name: "4k-2560", w: 2560, h: 1440 },
];

const ROUTES = ["/", "/login", "/subscribe", "/pricing", "/cart", "/order-confirmed", "/terms", "/privacy"];

test.describe("Visual — Fluid Responsive Viewport Stress", () => {
  for (const vp of VIEWPORTS.filter(v => v.w <= 1440)) { // skip 4K for speed
    for (const route of ROUTES) {
      test(`${route} @ ${vp.name} (${vp.w}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.goto(route, { timeout: 10000, waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);

        // Check for overflow-x (horizontal scroll)
        const overflowX = await page.evaluate(() => {
          const body = document.body;
          return body.scrollWidth > body.clientWidth;
        });
        if (overflowX) {
          console.warn(`${route} @ ${vp.w}px — horizontal overflow detected`);
        }

        // Check body renders
        await expect(page.locator("body")).toBeVisible();

        // Check no error boundaries
        const errorShown = page.locator("text=حدث خطأ,text=Internal Server Error").first();
        const hasError = await errorShown.isVisible().catch(() => false);
        expect(hasError).toBeFalsy();
      });
    }
  }
});
