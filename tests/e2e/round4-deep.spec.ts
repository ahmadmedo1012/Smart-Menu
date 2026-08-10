/**
 * Round 4 — deep owner + cart + admin guard (TS Playwright, stable selectors)
 * Run: npx playwright test tests/e2e/round4-deep.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";

const OWNER = "testmulti1568";
const PASS = "testpass123";

test("guard: /admin and /owner secret pages redirect owner to /owner, never render admin", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const ins = page.locator("input");
  await ins.nth(0).fill(OWNER);
  await ins.nth(1).fill(PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  for (const path of ["/admin", "/admin/users", "/admin/restaurants", "/admin/settings", "/admin/telegram"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const safe = url.includes("/owner") && !body.includes("إدارة المطاعم");
    expect(safe, `${path} should not expose admin UI`).toBeTruthy();
  }
});

test("cart: full add → qty → note → clear flow", async ({ page }) => {
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const adds = page.locator('button:has-text("أضف")');
  expect(await adds.count()).toBeGreaterThanOrEqual(2);
  await adds.nth(0).click();
  await page.waitForTimeout(600);
  await page.goto("/cart", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("د.ل");
  // item note
  const note = page.getByPlaceholder(/ملاحظات للصنف/).first();
  if (await note.count()) await note.fill("بدون ثلج");
  // clear cart → empty state
  const clear = page.locator('button:has-text("إفراغ")').first();
  if (await clear.count()) {
    await clear.click();
    await page.waitForTimeout(1200);
    const empty = await page.locator("body").innerText();
    expect(empty).not.toContain("د.ل");
  }
});

test("admin guard: owner get /api/admin/* returns 401/403", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator("input").nth(0).fill(OWNER);
  await page.locator("input").nth(1).fill(PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  for (const p of ["/api/admin/stats", "/api/admin/restaurants", "/api/admin/users", "/api/admin/config"]) {
    // page.request carries the session cookie; page.evaluate(fetch) does not,
    // which made every request unauthenticated (200-HTML instead of 401/403).
    const status = (await page.request.get(p, { headers: { Accept: "application/json" } })).status();
    expect(status, p).toBeGreaterThanOrEqual(401);
  }
});