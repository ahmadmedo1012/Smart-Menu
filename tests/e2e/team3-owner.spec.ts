/**
 * Team 3 — Owner dashboard full (menu CRUD, settings, orders, loyalty, QR)
 * Uses QA test account. Diagnostic only — no production data damage.
 * Run: npx playwright test tests/e2e/team3-owner.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const OWNER = "testmulti1568";
const PASS = "testpass123";
const ts = Date.now().toString().slice(-8);

async function login(page) {
  await page.goto("/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const ins = page.locator("input");
  await ins.nth(0).fill(OWNER);
  await ins.nth(1).fill(PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  // Retry once if rate-limited (429 → stays on login)
  if (!page.url().includes("/owner")) {
    await page.waitForTimeout(3000);
    const ins2 = page.locator("input");
    await ins2.nth(0).fill(OWNER);
    await ins2.nth(1).fill(PASS);
    await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
    await page.waitForTimeout(5000);
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
