import { test, expect } from "@playwright/test";

test.describe("Hero Polish Verification", () => {

  test("hero phone mockup visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    // Phone mockup container (first .animate-float)
    const phoneContainer = page.locator(".animate-float").first();
    await expect(phoneContainer).toBeVisible();
    const ctaBtn = page.locator("button:has-text('ابدأ الآن مجاناً')");
    await expect(ctaBtn).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("حوّل مطعمك");
  });

  test("hero responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
    const phoneContainer = page.locator(".animate-float").first();
    await expect(phoneContainer).toBeVisible();
    const menuBtn = page.locator("button[aria-label='فتح القائمة']");
    await expect(menuBtn).toBeVisible();
    await expect(page.locator("h1")).toContainText("رقمي");
  });

  test("video element loads inside phone", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const video = page.locator("video");
    const count = await video.count();
    if (count > 0) {
      await expect(video.first()).toBeVisible();
    } else {
      const fallback = page.locator("text=مطعم مذاق الشام");
      await expect(fallback).toBeVisible();
    }
  });

  test("badges visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const badge = page.locator("text=مسح واطلب");
    await expect(badge).toBeVisible();
  });

});
