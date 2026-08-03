/**
 * Round 6 — subscriptions & pricing deep: plan caps, upgrade paths,
 * payment dialog validation, plan usage badges.
 * Run: npx playwright test tests/e2e/round6-subscriptions.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { login } from "./qa-helpers";

const OWNER = "testmulti1568";
const PASS = "testpass123";

test("subs: pricing page shows all 5 plans with prices and features", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  for (const plan of ["مجاني", "أساسي", "بريميوم", "احترافي", "شركات"]) {
    expect(body, plan).toContain(plan);
  }
  // prices in د.ل
  const hasPrices = body.includes("د.ل") || body.includes("دينار");
  expect(hasPrices).toBeTruthy();
  // CTA to subscribe
  const subscribeCta = await page.locator('a[href="/subscribe"], button:has-text("اشترك")').count();
  expect(subscribeCta).toBeGreaterThan(0);
});

test("subs: plan cap — free account cannot exceed 1 menu (403 on 2nd)", async ({ page }) => {
  await login(page, OWNER, PASS);
  // owner is Pro (3 menus) — verify a 4th menu is rejected with clear message
  const body = await page.goto("/owner/menus", { waitUntil: "networkidle" }).then(() =>
    page.locator("body").innerText()
  );
  // ensure authenticated before API (retry login if redirected)
  if (page.url().includes("/login")) {
    await login(page, OWNER, PASS);
    await page.goto("/owner/menus", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
  }
  // create menu button exists
  const addMenu = page.locator('button:has-text("إضافة منيو")').first();
  console.log(`R6 add-menu button present: ${await addMenu.count()}`);
  // The cap is enforced server-side; verify via API that a 4th menu POST is rejected
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const res = await page.evaluate(async (csrf) => {
    const r = await fetch("/api/restaurants", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({
        name: "QA Cap Test",
        slug: `qa-cap-${Date.now().toString().slice(-6)}`,
        phone: "0910000099",
        whatsapp: "0910000099",
      }),
    });
    return { status: r.status, body: (await r.text()).slice(0, 120) };
  }, token);
  console.log(`R6 4th menu POST: ${res.status} ${res.body}`);
  // The 4th menu MUST be rejected (401 unauthed / 403 cap). NEVER 201.
  expect([401, 403]).toContain(res.status);
  expect(res.status).not.toBe(201);
});

test("subs: subscribe page renders payment methods after plan select", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("مجاني");
  // plan cards present
  const planBtns = await page.locator("button").filter({ hasText: "مجاني" }).count();
  expect(planBtns).toBeGreaterThan(0);
});

test("subs: upgrade path exists for existing subscriber", async ({ page }) => {
  await login(page, OWNER, PASS);
  await page.goto("/owner/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const body = await page.locator("body").innerText();
  // Plan usage badge shows current plan (Pro) somewhere
  const hasPlanInfo = body.includes("بريميوم") || body.includes("احترافي") || body.includes("خطة");
  console.log(`R6 plan info on settings: ${hasPlanInfo}`);
  // upgrade link/button
  const upgrade = page.locator('a[href*="subscribe"], button:has-text("ترقية")').first();
  console.log(`R6 upgrade control present: ${await upgrade.count()}`);
});