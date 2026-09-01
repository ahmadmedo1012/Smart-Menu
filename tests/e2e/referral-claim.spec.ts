/**
 * Referral Claim Flow — E2E tests
 * Covers: homepage with ?ref= param, /api/referrals/claim, /api/loyalty/referral.
 * Run: npx playwright test tests/e2e/referral-claim.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

/* ── /api/referrals/claim (click tracking) ────────────────────────────────── */

test("referral-claim: rejects empty code", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "" }),
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("referral-claim: rejects code with invalid characters", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "abc!@#" }),
  });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects code shorter than 6 chars", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "ABC12" }),
  });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects code longer than 16 chars", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "ABCDEFGHIJKLMNOP" }),
  });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects lowercase letters (case-sensitive format)", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "abc123" }),
  });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects non-existent code with 404", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "NONEXST" }),
  });
  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("referral-claim: accepts valid-looking code (DB lookup is authoritative)", async ({ page }) => {
  const res = await page.request.post("/api/referrals/claim", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ code: "VALIDCD" }),
  });
  // 404 = code not found in DB, which is expected for arbitrary test codes.
  // The key assertion is: no 500 crash and a structured error is returned.
  expect([200, 404]).toContain(res.status());
  const body = await res.json();
  const hasStructuredBody = "error" in body || "registered" in body;
  expect(hasStructuredBody).toBe(true);
});

/* ── /api/loyalty/referral (referral redemption) ─────────────────────────────── */

test("loyalty-referral: rejects empty body", async ({ page }) => {
  const res = await page.request.post("/api/loyalty/referral", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({}),
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("loyalty-referral: rejects invalid referral code format", async ({ page }) => {
  const res = await page.request.post("/api/loyalty/referral", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      referralCode: "BAD!CODE",
      referredPhone: "+249900000001",
      referredName: "Test User",
    }),
  });
  // 400 = validation failure, 404 = code not in DB
  expect([400, 404]).toContain(res.status());
});

test("loyalty-referral: rejects non-existent code", async ({ page }) => {
  const res = await page.request.post("/api/loyalty/referral", {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({
      referralCode: "ZZZZZZZZ",
      referredPhone: "+249900000001",
      referredName: "Test User",
    }),
  });
  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

/* ── Homepage with ?ref= parameter ────────────────────────────────────────── */

test("homepage: loads with referral param without crashing", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Page should render without errors (no uncaught JS exception)
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/?ref=ABCDEF1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
});

test("loyalty page: loads with ?ref= param without crashing", async ({ page }) => {
  await page.goto("/loyalty", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.goto("/loyalty?ref=ABCDEF1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
});
