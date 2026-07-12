import { test, expect } from "@playwright/test";

test.describe("ui-sweep", () => {
  // ── 1. Landing page ─────────────────────────────────────────────

  test("GET / returns 200 with page content", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "commit" });
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  // ── 2. Login page ───────────────────────────────────────────────

  test("GET /login returns 200 with form inputs", async ({ page }) => {
    const res = await page.goto("/login", { waitUntil: "commit" });
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    const inputs = page.locator("input");
    await expect(inputs.first()).toBeVisible();
    expect(await inputs.count()).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Pricing page ─────────────────────────────────────────────

  test("GET /pricing returns 200 with pricing section", async ({ page }) => {
    const res = await page.goto("/pricing", { waitUntil: "commit" });
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).toBeVisible();
    const text = await body.innerText();
    expect(text).toMatch(
      /pricing|price|plan|monthly|yearly|سعر|خطة|شهري|سنوي/i,
    );
  });

  // ── 4. Admin auth gate (redirect) ───────────────────────────────

  test("GET /admin redirects to /login (auth gate)", async ({ request }) => {
    const res = await request.fetch("/admin", { method: "GET", maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const headers = await res.headers();
    expect(headers["location"]?.toLowerCase()).toContain("/login");
  });

  // ── 5. Admin/telegram auth gate ─────────────────────────────────

  test("GET /admin/telegram redirects to /login", async ({ request }) => {
    const res = await request.fetch("/admin/telegram", {
      method: "GET",
      maxRedirects: 0,
    });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    const headers = await res.headers();
    expect(headers["location"]?.toLowerCase()).toContain("/login");
  });

  // ── 6. Subscribe page ──────────────────────────────────────────

  test("GET /subscribe returns 200 with page content", async ({ page }) => {
    const res = await page.goto("/subscribe", { waitUntil: "commit" });
    expect(res?.status()).toBeGreaterThanOrEqual(200);
    expect(res?.status()).toBeLessThan(400);
  });

  // ── 7. Security headers ─────────────────────────────────────────

  test("CSP header present", async ({ request }) => {
    const res = await request.get("/");
    const headers = await res.headers();
    const csp = headers["content-security-policy"];
    expect(csp).toBeDefined();
    expect(csp?.length).toBeGreaterThan(0);
  });

  test("Strict-Transport-Security header present", async ({ request }) => {
    const res = await request.get("/");
    const headers = await res.headers();
    const hsts = headers["strict-transport-security"];
    expect(hsts).toBeDefined();
    expect(hsts?.length).toBeGreaterThan(0);
  });

  test("X-Frame-Options header is DENY", async ({ request }) => {
    const res = await request.get("/");
    const headers = await res.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  // ── 8. RTL / Arabic layout ──────────────────────────────────────

  test('HTML tag has dir="rtl"', async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForLoadState("networkidle");
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  });

  test('HTML tag has lang="ar"', async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForLoadState("networkidle");
    expect(await page.locator("html").getAttribute("lang")).toBe("ar");
  });

  // ── 9. Additional security headers ──────────────────────────────

  test("X-Content-Type-Options header is nosniff", async ({ request }) => {
    const res = await request.get("/");
    const headers = await res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
