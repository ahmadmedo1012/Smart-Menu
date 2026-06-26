import { test, expect } from "@playwright/test";

test.describe("Hero Polish Verification", () => {

  test("hero typographic layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    expect(await page.locator("h1").count()).toBeGreaterThan(0);
    await expect(page.locator("h1").first()).toContainText("يسبق الجميع");
    // Orange CTA in hero
    const ctaBtn = page.locator("button:has-text('قائمتك مجانا')").first();
    await expect(ctaBtn).toBeVisible();
  });

  test("hero responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    await expect(page.locator("h1").first()).toContainText("يسبق الجميع");
  });

  test("hero has orange accent elements", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const hero = page.locator("section").first();
    const orangeKicker = hero.locator(".text-orange");
    await expect(orangeKicker.first()).toBeVisible();
  });

});
