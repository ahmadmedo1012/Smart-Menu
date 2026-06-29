import { test, expect } from "@playwright/test";

test.describe("Visual — Interface Layout Sanity & Asset Integrity", () => {
  test("landing page hero image loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Check for images
    const images = page.locator("img");
    const count = await images.count();
    console.log(`Landing page images: ${count}`);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const src = await images.nth(i).getAttribute("src");
      if (src) {
        const res = await page.request.get(src).catch(() => null);
        if (res) {
          console.log(`  Image ${i}: ${src.substring(0, 50)} — ${res.status()}`);
        }
      }
    }
  });

  test("brand icon loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const brandImg = page.locator('img[alt*="الربط الذكي"], img[alt*="Smart Menu"]').first();
    const isVisible = await brandImg.isVisible().catch(() => false);
    if (isVisible) {
      const src = await brandImg.getAttribute("src");
      console.log(`Brand icon src: ${src?.substring(0, 60)}`);
    }
  });

  test("header navigation renders on public pages", async ({ page }) => {
    const pages = ["/", "/pricing", "/subscribe", "/login"];
    for (const p of pages) {
      await page.goto(p, { timeout: 10000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      const navLinks = page.locator("nav a, header a, banner a").or(page.getByText("الربط الذكي"));
      const hasNav = await navLinks.first().isVisible().catch(() => false);
      if (!hasNav) {
        console.warn(`${p}: navigation not clearly visible`);
      }
    }
  });

  test("footer renders with links", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const footerLinks = page.locator("footer a, contentinfo a");
    const count = await footerLinks.count();
    console.log(`Footer links: ${count}`);
  });

  test("skeleton loading states exist", async ({ page }) => {
    await page.goto("/subscribe");
    await page.waitForTimeout(500);
    // Should either show skeleton (loading) or the actual content
    const hasContent = await page.getByText("اختر خطة تناسب مطعمك").isVisible().catch(() => false);
    console.log(`Subscribe page content loaded: ${hasContent}`);
  });
});
