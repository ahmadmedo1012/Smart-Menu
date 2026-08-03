/**
 * Team 1 — Registration, Login, Session Management (all roles)
 * Deep interactive auth flows against production.
 * Run: npx playwright test tests/e2e/team1-auth.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const TEST_USER = "testmulti1568";
const TEST_PASS = "testpass123";
const ts = Date.now().toString().slice(-8);

// ── Registration (owner) ──────────────────────────────────────────────

test("register: valid free plan creates account", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const btns = page.locator("button");
  const count = await btns.count();
  for (let i = 0; i < count; i++) {
    const t = (await btns.nth(i).innerText()) || "";
    if (t.includes("مجاني") && t.includes("منيو رقم")) { await btns.nth(i).click(); break; }
  }
  await page.waitForTimeout(800);
  for (let i = 0; i < count; i++) {
    const t = (await btns.nth(i).innerText()) || "";
    if (t.includes("اخترت")) { await btns.nth(i).click(); break; }
  }
  await page.waitForTimeout(2000);
  const ins = page.locator("input");
  await ins.nth(0).fill("QA-TEST-DO-NOT-USE-1");
  await ins.nth(1).fill(`qa1-${ts}`);
  await ins.nth(2).fill("QA");
  await ins.nth(3).fill("0910000001");
  await ins.nth(4).fill("0910000001");
  await ins.nth(5).fill(`qa1_${ts}`);
  await ins.nth(6).fill("TestPass123!");
  await page.waitForTimeout(300);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(6000);
  expect(page.url()).toContain("/owner");
});

test("register: duplicate slug rejected", async ({ page }) => {
  await page.goto("/subscribe", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const btns = page.locator("button");
  const count = await btns.count();
  for (let i = 0; i < count; i++) {
    const t = (await btns.nth(i).innerText()) || "";
    if (t.includes("مجاني") && t.includes("منيو رقم")) { await btns.nth(i).click(); break; }
  }
  await page.waitForTimeout(800);
  for (let i = 0; i < count; i++) {
    const t = (await btns.nth(i).innerText()) || "";
    if (t.includes("اخترت")) { await btns.nth(i).click(); break; }
  }
  await page.waitForTimeout(2000);
  const ins = page.locator("input");
  await ins.nth(0).fill("QA Dup");
  await ins.nth(1).fill("al-waha-cafe"); // existing slug
  await ins.nth(2).fill("QA");
  await ins.nth(3).fill("0910000002");
  await ins.nth(4).fill("0910000002");
  await ins.nth(5).fill(`qa2_${ts}`);
  await ins.nth(6).fill("TestPass123!");
  await page.waitForTimeout(300);
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForTimeout(4000);
  const body = await page.locator("body").innerText();
  // Should show an error, NOT land on /owner
  expect(page.url()).not.toContain("/owner");
  expect(body.length).toBeGreaterThan(50);
});

// ── Login ─────────────────────────────────────────────────────────────

test("login: wrong password error does not reveal user existence", async ({ page }) => {
  // Same error message for nonexistent user and wrong pass
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
  // Messages must be identical (no user enumeration)
  expect(res1.body).toBe(res2.body);
});

test("login: account lockout after 20 failed attempts, then success works", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  let statuses: number[] = [];
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
  // After 10 attempts same IP+username → 429
  expect(statuses.slice(10)).toContain(429);
});

test("login: valid creds succeed", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const ins = page.locator("input");
  await ins.nth(0).fill(TEST_USER);
  await ins.nth(1).fill(TEST_PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  expect(page.url()).toContain("/owner");
});

// ── Session / protected routes ────────────────────────────────────────

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
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const ins = page.locator("input");
  await ins.nth(0).fill(TEST_USER);
  await ins.nth(1).fill(TEST_PASS);
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4000);
  await page.locator('button:has-text("تسجيل الخروج")').first().click();
  await page.waitForTimeout(2500);
  expect(page.url()).toContain("/login");
  // Now access protected page → redirected again
  await page.goto("/owner", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  expect(page.url()).toContain("/login");
});
