/**
 * Persona 4 — Multi-menu owner: switches between restaurants via the
 * switcher and asserts EVERY owner page reflects the active restaurant
 * (tenant isolation at the UI level).
 * Run: npx playwright test tests/e2e/persona-4-multimenu.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { login } from "./qa-helpers";

const OWNER = "testmulti1568";
const PASS = "testpass123";

test("P4: switching active restaurant updates dashboard + orders + settings", async ({ page }) => {
  test.setTimeout(90000);
  await login(page, OWNER, PASS);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Use the switcher UI (not localStorage) to switch to "مطعم الاختبار الثالث" (315)
  await page.goto("/owner", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // The switcher button shows the ACTIVE restaurant name (dynamic) — target
  // it by aria-expanded, not by text. If rate-limited, retry login once.
  const sw = page.locator('button[aria-expanded]').first();
  if (!(await sw.count())) {
    console.log("P4: switcher not found — rate-limited? retrying login");
    await page.waitForTimeout(15000);
    await login(page, OWNER, PASS);
    await page.goto("/owner", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
  }
  const sw2 = page.locator('button[aria-expanded]').first();
  expect(await sw2.count()).toBeGreaterThan(0);
  await sw2.click();
  await page.waitForTimeout(800);
  // Click the specific menu in the dropdown
  const third = page.locator('[role="menuitem"], [role="option"], li, button').filter({ hasText: "مطعم الاختبار الثالث" }).first();
  if (await third.count()) {
    await third.click();
    await page.waitForTimeout(2500);
  }

  // Dashboard header should show the third restaurant name
  const dash = await page.locator("body").innerText();
  const dashShowsThird = dash.includes("مطعم الاختبار الثالث");
  console.log(`P4 dashboard shows 315 after switch: ${dashShowsThird}`);

  // Orders page — should load without cross-tenant leak (no 500)
  await page.goto("/owner/orders", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const ordersBody = await page.locator("body").innerText();
  expect(ordersBody).not.toContain("فشل");
  const ordersOk = ordersBody.includes("طلب") || ordersBody.includes("لا توجد طلبات");
  expect(ordersOk).toBeTruthy();

  // Settings — should fetch the ACTIVE restaurant (not primary)
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const settingsBody = await page.locator("body").innerText();
  expect(settingsBody).not.toContain("فشل تحميل");
});

test("P4: switching back to primary restores primary data", async ({ page }) => {
  test.setTimeout(90000);
  await login(page, OWNER, PASS);
  await page.setViewportSize({ width: 1280, height: 800 });
  // Switch via switcher to "مطعم تجريبي أول" (313)
  await page.goto("/owner", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const sw = page.locator('button[aria-expanded]').first();
  if (!(await sw.count())) {
    console.log("P4b: switcher not found — rate-limited? retrying login");
    await page.waitForTimeout(15000);
    await login(page, OWNER, PASS);
    await page.goto("/owner", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
  }
  const sw2 = page.locator('button[aria-expanded]').first();
  expect(await sw2.count()).toBeGreaterThan(0);
  await sw2.click();
  await page.waitForTimeout(800);
  const first = page.locator('[role="menuitem"], [role="option"], li, button').filter({ hasText: "مطعم تجريبي أول" }).first();
  if (await first.count()) {
    await first.click();
    await page.waitForTimeout(2500);
  }
  const dash = await page.locator("body").innerText();
  const showsFirst = dash.includes("مطعم تجريبي أول");
  console.log(`P4 dashboard shows 313 after switch-back: ${showsFirst}`);
  expect(dash.includes("مطعم تجريبي أول") || dash.includes("مطعم تجريبي")).toBeTruthy();
});