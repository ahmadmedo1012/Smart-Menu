/**
 * Team 3 — Owner dashboard full (menu CRUD, settings, orders, loyalty, QR)
 * Uses QA test account. Diagnostic only — no production data damage.
 * Run: npx playwright test tests/e2e/team3-owner.spec.ts --project=ui
 */
import { test, expect, type Page } from "@playwright/test";
import { login as qaLogin, loginBudget } from "./qa-helpers";

const OWNER = "testmulti1568";
const PASS = "testpass123";
async function login(page: Page) {
  test.setTimeout(loginBudget());
  await qaLogin(page, OWNER, PASS);
  // Retry once if rate-limited (429 → stays on login)
  if (!page.url().includes("/owner")) {
    // deliberate (round92-C6): login 429 rate-limit backoff before the retry
    // — semantic window, not a flake sleep.
    await page.waitForTimeout(3000);
    await qaLogin(page, OWNER, PASS);
  }
  expect(page.url()).toContain("/owner");
}

test("owner: dashboard loads with KPI numbers", async ({ page }) => {
  await login(page);
  await page.goto("/owner", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the KPI grid renders only in the
  // loaded branch (loading → skeleton, error → alert), so its first card
  // proves the dashboard data landed (the hasNumbers assertion needs it).
  await expect(page.getByText("إجمالي الطلبات").first()).toBeVisible({ timeout: 20000 });
  const body = await page.locator("body").innerText();
  expect(body).toContain("لوحة التحكم");
  const hasNumbers = /\d/.test(body);
  expect(hasNumbers).toBeTruthy();
});

test("owner: restaurants page shows menus + add button", async ({ page }) => {
  await login(page);
  await page.goto("/owner/restaurants", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the page h1 renders when the
  // restaurants fetch settles (tolerant: the sidebar alone already satisfies
  // the weak text assertions, as before).
  await page
    .getByRole("heading", { name: "المنيوهات" })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  const body = await page.locator("body").innerText();
  expect(body).toContain("المنيوهات");
  expect(body).toContain("مطعم");
});

test("owner: menu page loads categories editor", async ({ page }) => {
  await login(page);
  await page.goto("/owner/menu", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the editor h1 renders when the
  // categories fetch settles (loading shows the announcer skeleton branch).
  await page
    .getByRole("heading", { name: "إدارة المنيو" })
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  const body = await page.locator("body").innerText();
  // Either categories shown or empty-state message — but NOT an error
  expect(body).not.toContain("فشل تحميل");
});

test("owner: settings loads with form fields", async ({ page }) => {
  await login(page);
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the settings form (with the
  // inputs) renders only after the active-restaurant fetch settles; the
  // count assertion below needs the fields.
  await expect(page.getByRole("heading", { name: "إعدادات المطعم" }).first()).toBeVisible({ timeout: 15000 });
  const inputs = page.locator("input");
  expect(await inputs.count()).toBeGreaterThan(3);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("فشل تحميل");
});

test("owner: QR page renders QR code", async ({ page }) => {
  await login(page);
  await page.goto("/owner/qr", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the QR page has no fetch gate;
  // the same canvas/svg locator the assertion counts is the wait target
  // (tolerant — the assertion also accepts body-text fallbacks like رمز).
  await page
    .locator("canvas, img[src*='qr'], svg")
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  const qr = page.locator("canvas, img[src*='qr'], svg");
  const body = await page.locator("body").innerText();
  const hasQr = (await qr.count()) > 0 || body.includes("QR") || body.includes("رمز");
  expect(hasQr).toBeTruthy();
});

test("owner: loyalty page loads", async ({ page }) => {
  await login(page);
  await page.goto("/owner/loyalty", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the loyalty h1 renders when the
  // stats fetch settles (loading shows the announcer branch).
  await page
    .getByRole("heading", { name: "برنامج الولاء" })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("فشل");
});

test("owner: orders page has CSV export button", async ({ page }) => {
  await login(page);
  await page.goto("/owner/orders", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the CSV button renders with the
  // loaded orders view; exactly what the count assertion below needs.
  await expect(page.locator('button:has-text("CSV")').first()).toBeVisible({ timeout: 15000 });
  const csv = page.locator('button:has-text("CSV")');
  expect(await csv.count()).toBeGreaterThan(0);
});

test("owner: switcher switches between menus", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/owner", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the switcher renders only after
  // its /api/owner/restaurants fetch (tolerant: the count() guard below
  // treats absence as skip).
  await page.locator('button:has-text("مطعم")').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const sw = page.locator('button:has-text("مطعم")').first();
  if (await sw.count()) {
    await sw.click();
    // round92-C6: settle → conditional wait — the dropdown renders with the
    // open state; its footer link proves the item list is mounted
    // (guarded → tolerant).
    await page.getByText("إدارة المنيوهات").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
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
  // round92-C6: settle → conditional wait — the orders h1 renders when the
  // fetch settles (tolerant: this first load is sequence-only for the test).
  await page
    .getByRole("heading", { name: "الطلبات" })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  // Set active restaurant to 315 (has different data), reload, assert header shows it
  await page.evaluate(() => localStorage.setItem("smartmenu_active_restaurant", "315"));
  await page.reload({ waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — after reload the switcher
  // resolves 315 from localStorage; its button label is exactly the text the
  // assertion below looks for.
  await expect(page.getByText("مطعم الاختبار الثالث").first()).toBeVisible({ timeout: 15000 });
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
  // round92-C6: settle → conditional wait — settings h1 renders when the 313
  // fetch settles (sequence-only step → tolerant).
  await page
    .getByRole("heading", { name: "إعدادات المطعم" })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  // Switch to 315 → settings should fetch different data (no 500, no cross-tenant leak)
  await page.evaluate(() => localStorage.setItem("smartmenu_active_restaurant", "315"));
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — same h1 for the 315 fetch; the
  // negative assertion below stays the decider (tolerant).
  await page
    .getByRole("heading", { name: "إعدادات المطعم" })
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  const body315 = await page.locator("body").innerText();
  expect(body315).not.toContain("فشل تحميل");
});
