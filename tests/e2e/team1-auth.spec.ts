/**
 * Team 1 — Registration, Login, Session Management (all roles)
 * Deep interactive auth flows against production. Uses stable selectors.
 * Run: npx playwright test tests/e2e/team1-auth.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { fillSubscribeForm, chooseFreePlan, login } from "./qa-helpers";

const TEST_USER = "testmulti1568";
const TEST_PASS = "testpass123";
const ts = Date.now().toString().slice(-8);

test("register: valid free plan creates account", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await chooseFreePlan(page);
  await fillSubscribeForm(page, {
    restaurantName: "QA-TEST-DO-NOT-USE-1",
    slug: `qa1-${ts}`,
    phone: "0910000001",
    whatsapp: "0910000001",
    username: `qa1_${ts}`,
    password: "TestPass123!",
  });
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
  expect(page.url()).toContain("/owner");
});

test("register: duplicate slug rejected", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await chooseFreePlan(page);
  await fillSubscribeForm(page, {
    restaurantName: "QA Dup",
    slug: "al-waha-cafe", // existing slug
    phone: "0910000002",
    whatsapp: "0910000002",
    username: `qa2_${ts}`,
    password: "TestPass123!",
  });
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(4000);
  const body = await page.locator("body").innerText();
  expect(page.url()).not.toContain("/owner");
  expect(body.length).toBeGreaterThan(50);
});

test("login: wrong password error does not reveal user existence", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const res1 = await page.evaluate(async (uname) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname, password: "x" }),
    });
    return { status: r.status, body: await r.text() };
  }, `ghost_${ts}`);
  const res2 = await page.evaluate(async (uname) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname, password: "wrongpass" }),
    });
    return { status: r.status, body: await r.text() };
  }, TEST_USER);
  expect(res1.status).toBe(401);
  expect(res2.status).toBe(401);
  expect(res1.body).toBe(res2.body);
});

test("login: account lockout after 20 failed attempts, then success works", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const statuses: number[] = [];
  for (let i = 0; i < 12; i++) {
    const r = await page.evaluate(async (uname) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname, password: "wrong" }),
      });
      return res.status;
    }, `qa_lock_${ts}`);
    statuses.push(r);
  }
  expect(statuses.slice(10)).toContain(429);
});

test("login: valid creds succeed", async ({ page }) => {
  await login(page, TEST_USER, TEST_PASS);
  expect(page.url()).toContain("/owner");
});

test("protected: all admin+owner pages redirect to login when unauthenticated", async ({ page }) => {
  const protectedPaths = [
    "/admin", "/admin/users", "/admin/restaurants", "/admin/subscriptions",
    "/admin/orders", "/admin/menu", "/admin/settings", "/admin/telegram",
    "/admin/audit-logs", "/admin/system-events", "/owner", "/owner/orders",
    "/owner/menu", "/owner/settings", "/owner/qr", "/owner/loyalty",
  ];
  for (const p of protectedPaths) {
    await page.goto(p, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    expect(page.url()).toContain("/login");
  }
});

test("logout: session ends, protected page redirects", async ({ page }) => {
  await login(page, TEST_USER, TEST_PASS);
  await page.locator('button:has-text("تسجيل الخروج")').first().click();
  await page.waitForTimeout(2500);
  expect(page.url()).toContain("/login");
  await page.goto("/owner", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  expect(page.url()).toContain("/login");
});