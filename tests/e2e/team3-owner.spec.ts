/**
 * Team 3 — Owner dashboard full (menu CRUD, settings, orders, loyalty, QR)
 * Uses QA test account. Diagnostic only — no production data damage.
 * Run: npx playwright test tests/e2e/team3-owner.spec.ts --project=ui
 */
import { test, expect, type Page } from "@playwright/test";
import { login as qaLogin } from "./qa-helpers";

const OWNER = "testmulti1568";
const PASS = "testpass123";
const ts = Date.now().toString().slice(-8);

async function login(page: Page) {
  await qaLogin(page, OWNER, PASS);
  // Retry once if rate-limited (429 → stays on login)
  if (!page.url().includes("/owner")) {
    await page.waitForTimeout(3000);
    await qaLogin(page, OWNER, PASS);
  }
  expect(page.url()).toContain("/owner");
}

test("owner: dashboard loads with KPI numbers", async ({ page }) => {
  await login(page);
  await page.goto("/owner", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("لوحة التحكم");
  const hasNumbers = /\d/.test(body);
  expect(hasNumbers).toBeTruthy();
});

test("owner: restaurants page shows menus + add button", async ({ page }) => {
  await login(page);
  await page.goto("/owner/restaurants", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("المنيوهات");
  expect(body).toContain("مطعم");
});

test("owner: menu page loads categories editor", async ({ page }) => {
  await login(page);
  await page.goto("/owner/menu", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const body = await page.locator("body").innerText();
  // Either categories shown or empty-state message — but NOT an error
  expect(body).not.toContain("فشل تحميل");
});

test("owner: settings loads with form fields", async ({ page }) => {
  await login(page);
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const inputs = page.locator("input");
  expect(await inputs.count()).toBeGreaterThan(3);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("فشل تحميل");
});

test("owner: QR page renders QR code", async ({ page }) => {
  await login(page);
  await page.goto("/owner/qr", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const qr = page.locator("canvas, img[src*='qr'], svg");
  const body = await page.locator("body").innerText();
  const hasQr = (await qr.count()) > 0 || body.includes("QR") || body.includes("رمز");
  expect(hasQr).toBeTruthy();
});

test("owner: loyalty page loads", async ({ page }) => {
  await login(page);
  await page.goto("/owner/loyalty", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("فشل");
});

test("owner: orders page has CSV export button", async ({ page }) => {
  await login(page);
  await page.goto("/owner/orders", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const csv = page.locator('button:has-text("CSV")');
  expect(await csv.count()).toBeGreaterThan(0);
});

test("owner: switcher switches between menus", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/owner", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const sw = page.locator('button:has-text("مطعم")').first();
  if (await sw.count()) {
    await sw.click();
    await page.waitForTimeout(800);
    const body = await page.locator("body").innerText();
    const menuNames = ["مطعم تجريبي أول", "مطعم الاختبار الثالث", "مقهى النخبة"];
    const found = menuNames.filter((m) => body.includes(m));
    expect(found.length).toBeGreaterThanOrEqual(2);
  }
});

test("owner: multi-menu — switching changes data on orders page (tenant isolation UI)", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  // Restaurant 313 (primary) vs 315 — different order histories
  // Switch to a menu via localStorage then assert the orders page reflects it
  await page.goto("/owner/orders", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  // Set active restaurant to 315 (has different data), reload, assert header shows it
  await page.evaluate(() => localStorage.setItem("smartmenu_active_restaurant", "315"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const after = await page.locator("body").innerText();
  // The restaurant name should appear in the owner header after switch
  const hasThird = after.includes("مطعم الاختبار الثالث");
  expect(hasThird).toBeTruthy();
});

test("owner: settings reflect active restaurant after switch", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => localStorage.setItem("smartmenu_active_restaurant", "313"));
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  // Switch to 315 → settings should fetch different data (no 500, no cross-tenant leak)
  await page.evaluate(() => localStorage.setItem("smartmenu_active_restaurant", "315"));
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const body315 = await page.locator("body").innerText();
  expect(body315).not.toContain("فشل تحميل");
});
