/**
 * Round 29 — regression: floating cart orb visible + single notes section.
 * Prevents the overlap/off-screen/duplicate-form bugs from returning.
 * Run: npx playwright test tests/e2e/round29-cart-regression.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";

const MENU = "/menu/al-waha-cafe-demo";

test("floating cart orb is on-screen and clickable at 375px", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(MENU, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  const add = page.locator('button[aria-label*="إضافة"]').first();
  await add.click();
  await page.waitForTimeout(1500);
  const orb = page.locator('button[aria-label^="السلة"]');
  expect(await orb.count()).toBeGreaterThan(0);
  const box = await orb.first().boundingBox();
  expect(box).not.toBeNull();
  // fully inside viewport
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(667);
  // clickable — opens the sheet
  await orb.first().click();
  await page.waitForTimeout(1000);
  await expect(page.locator('[role="dialog"]').first()).toBeVisible();
});

test("cart has ONE notes section (no duplicate forms)", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(MENU, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const add = page.locator('button[aria-label*="إضافة"]').first();
  await add.click();
  await page.waitForTimeout(1000);
  await page.goto("/cart", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  const body = await page.locator("body").innerText();
  // old duplicate header gone, exactly one notes section (header + label)
  expect(body).not.toContain("ملاحظات إضافية");
  const notesCount = (body.match(/ملاحظات الطلب/g) || []).length;
  expect(notesCount).toBe(1);
  // name/phone fields gone
  expect(body).not.toContain("الاسم (اختياري)");
  expect(body).not.toContain("رقم الهاتف");
});
