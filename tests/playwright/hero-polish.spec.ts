import { test, expect } from "@playwright/test";

test.describe("Hero Polish Verification", () => {

  test("hero typographic layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    expect(await page.locator("h1").count()).toBeGreaterThan(0);
    await expect(page.locator("h1").first()).toContainText("تجربة رقمية");
    // Orange CTA in hero
    const ctaBtn = page.locator("button:has-text('ابدأ مجاناً')").first();
    await expect(ctaBtn).toBeVisible();
  });

  test("hero responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    await expect(page.locator("h1").first()).toContainText("تجربة رقمية");
  });

  test("hero has orange accent elements", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    // Check orange text elements
    const hero = page.locator("section").first();
		const orangeKicker = hero.locator(".text-orange");
    await expect(orangeKicker.first()).toBeVisible();
    // Phone mockup should exist in desktop hero
    const phone = page.locator("[class*='PhoneMockup'], video, [class*='phone']");
    const phoneCount = await phone.count();
    if (phoneCount > 0) {
      await expect(phone.first()).toBeVisible();
    }
  });

});
