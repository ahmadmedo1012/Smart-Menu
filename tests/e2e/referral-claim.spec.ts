/**
 * Referral Claim Flow — E2E tests
 * Covers: homepage with ?ref= param, /api/referrals/claim, /api/loyalty/referral.
 * Run: npx playwright test tests/e2e/referral-claim.spec.ts --project=ui
 */
import { test, expect, type Page } from "@playwright/test";
import { mintCsrfPair, csrfHeadersFor } from "./csrf-helper";

// round85-D1: POSTs must carry the double-submit CSRF pair — the proxy rejects
// bare mutations with 403 before validation ever runs. The spec was written
// before middleware CSRF and never executed (orphan project), so it never met
// the guard until now. Per-test minting (module-level state races under
// fullyParallel workers).
async function csrfPost(page: Page, url: string, payload: unknown) {
  const pair = await mintCsrfPair(page.request);
  const headers = csrfHeadersFor(
    process.env.BASE_URL || "http://localhost:3000",
    pair
  );
  return page.request.post(url, {
    headers: { "Content-Type": "application/json", ...headers },
    data: JSON.stringify(payload),
  });
}

/* ── /api/referrals/claim (click tracking) ────────────────────────────────── */

test("referral-claim: rejects empty code", async ({ page }) => {
  const res = await csrfPost(page, "/api/referrals/claim", { code: "" });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("referral-claim: rejects code with invalid characters", async ({ page }) => {
  const res = await csrfPost(page, "/api/referrals/claim", { code: "abc!@#" });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects code shorter than 6 chars", async ({ page }) => {
  const res = await csrfPost(page, "/api/referrals/claim", { code: "ABC12" });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects code longer than 16 chars", async ({ page }) => {
  // 17 chars — the format allows exactly 6..16, so 16 alone would 404 (not 400)
  const res = await csrfPost(page, "/api/referrals/claim", { code: "ABCDEFGHIJKLMNOPQ" });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects lowercase letters (case-sensitive format)", async ({ page }) => {
  const res = await csrfPost(page, "/api/referrals/claim", { code: "abc123" });
  expect(res.status()).toBe(400);
});

test("referral-claim: rejects non-existent code with 404", async ({ page }) => {
  const res = await csrfPost(page, "/api/referrals/claim", { code: "NONEXST" });
  expect(res.status()).toBe(404);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("referral-claim: accepts valid-looking code (DB lookup is authoritative)", async ({ page }) => {
  const res = await csrfPost(page, "/api/referrals/claim", { code: "VALIDCD" });
  // 404 = code not found in DB, which is expected for arbitrary test codes.
  // The key assertion is: no 500 crash and a structured error is returned.
  expect([200, 404]).toContain(res.status());
  const body = await res.json();
  const hasStructuredBody = "error" in body || "registered" in body;
  expect(hasStructuredBody).toBe(true);
});

/* ── /api/loyalty/referral (referral redemption) ─────────────────────────────── */

test("loyalty-referral: rejects empty body", async ({ page }) => {
  const res = await csrfPost(page, "/api/loyalty/referral", {});
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("loyalty-referral: rejects unauthenticated caller (requireAuth gate)", async ({ page }) => {
  const res = await csrfPost(page, "/api/loyalty/referral", {
      referralCode: "BAD!CODE",
      referredPhone: "+249900000001",
      referredName: "Test User",
    });
  // round85-D1 correction: POST /api/loyalty/referral is session-gated — an
  // anonymous caller gets 401 before any validation runs (the original spec
  // assumed a public route and expected 400/404).
  expect(res.status()).toBe(401);
});

test("loyalty-referral: unauthenticated lookup of unknown code is still 401", async ({ page }) => {
  const res = await csrfPost(page, "/api/loyalty/referral", {
      referralCode: "ZZZZZZZZ",
      referredPhone: "+249900000001",
      referredName: "Test User",
    });
  // auth gate fires first — the code existence check needs a session
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

/* ── Homepage with ?ref= parameter ────────────────────────────────────────── */

test("homepage: loads with referral param without crashing", async ({ page }) => {
  // round85-D1: assert on UNCAUGHT EXCEPTIONS (pageerror), matching team6/
  // persona specs — console resource errors are normal here: the unknown ?ref
  // code makes ReferralHandler's claim POST 404, and /_vercel/insights only
  // exists on Vercel (404 + MIME refusal locally).
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));
  await page.goto("/?ref=ABCDEF1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  expect(errors).toHaveLength(0);
  // Page still renders its hero content with the param present
  await expect(page.locator("body")).toBeVisible();
});

test("loyalty page: loads with ?ref= param without crashing", async ({ page }) => {
  // round85-D1: /loyalty is not a public route (it 404s — loyalty lives as a
  // widget on the menu page); the relevant assertion is that the 404 boundary
  // renders cleanly with NO uncaught exceptions.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));
  const res = await page.goto("/loyalty?ref=ABCDEF1", { waitUntil: "domcontentloaded" });
  expect([404, 200]).toContain(res?.status() ?? 0);
  await page.waitForTimeout(1000);
  expect(errors).toHaveLength(0);
});
