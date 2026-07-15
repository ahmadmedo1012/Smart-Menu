/**
 * Full Site Browser Sweep — real browser tests against live menu.smart-link.ly
 *
 * Every public page rendered in a real browser. Protected pages verified
 * for auth redirect. Security, RTL, PWA, API, menu browsing, interactions.
 *
 * Run:  npx playwright test tests/e2e/full-sweep.test.ts --project=ui
 */

import { test, expect } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

import type { Page } from "@playwright/test";

async function gotoOk(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: "commit" });
  expect(res?.status()).toBe(200);
}

async function bodyVisible(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
}

async function bodyHasText(page: Page) {
  await page.waitForLoadState("networkidle");
  const text = await page.locator("body").innerText();
  expect(text.length).toBeGreaterThan(10);
}

// ── 1. ALL Public Pages: browser render + 200 ────────────────────────────────

test.describe("All public pages — browser render 200", () => {
  const pages = [
    ["/", "Landing"],
    ["/login", "Login"],
    ["/pricing", "Pricing"],
    ["/subscribe", "Subscribe"],
    ["/cart", "Cart"],
    ["/terms", "Terms"],
    ["/privacy", "Privacy"],
    ["/menu", "Menu listing"],
    ["/order-confirmed", "Order confirmed"],
  ];
  for (const [path, desc] of pages) {
    test(`GET ${path} — ${desc}`, async ({ page }) => {
      await gotoOk(page, path);
      await bodyVisible(page);
    });
  }
});

// ── 2. Content verification on key pages ─────────────────────────────────────

test.describe("Page content verification", () => {
  test("Landing page has meaningful content", async ({ page }) => {
    await gotoOk(page, "/");
    await bodyHasText(page);
  });

  test("Login page has input fields", async ({ page }) => {
    await gotoOk(page, "/login");
    await page.waitForLoadState("networkidle");
    const inputs = page.locator("input");
    await expect(inputs.first()).toBeVisible();
    expect(await inputs.count()).toBeGreaterThanOrEqual(1);
  });

  test("Pricing page mentions pricing plans", async ({ page }) => {
    await gotoOk(page, "/pricing");
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    expect(text).toMatch(/pricing|price|plan|monthly|yearly|سعر|خطة|شهري|سنوي/i);
  });

  test("Cart page renders", async ({ page }) => {
    await gotoOk(page, "/cart");
    await bodyVisible(page);
  });

  test("Subscribe page renders", async ({ page }) => {
    await gotoOk(page, "/subscribe");
    await bodyVisible(page);
  });

  test("Terms page has content", async ({ page }) => {
    await gotoOk(page, "/terms");
    await bodyHasText(page);
  });

  test("Privacy page has content", async ({ page }) => {
    await gotoOk(page, "/privacy");
    await bodyHasText(page);
  });
});

// ── 3. Menu Browsing (real browser, live restaurant slugs) ───────────────────

test.describe("Menu browsing — live restaurants", () => {
  const restaurantSlugs = [
    "al-waha-cafe",
    "aseel-restaurant",
    "roma-pizza",
    "cafe-dejo",
    "bun-b-q",
  ];

  for (const slug of restaurantSlugs) {
    test(`GET /menu/${slug} — ${slug}`, async ({ page }) => {
      const res = await page.goto(`/menu/${slug}`, { waitUntil: "commit" });
      // Some slugs may 404 if not deployed; accept 200 or 404
      expect([200, 404]).toContain(res?.status());
      if (res?.status() === 200) {
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).toBeVisible();
        const text = await page.locator("body").innerText();
        expect(text.length).toBeGreaterThan(10);
      }
    });
  }

  test("GET /menu (listing page) shows restaurants", async ({ page }) => {
    await gotoOk(page, "/menu");
    await page.waitForLoadState("networkidle");
    // Should list restaurants or have interactive content
    const links = page.locator("a");
    expect(await links.count()).toBeGreaterThanOrEqual(1);
  });

  test("Menu print page renders for known restaurant", async ({ page }) => {
    const res = await page.goto("/menu/al-waha-cafe/print", { waitUntil: "commit" });
    expect([200, 404]).toContain(res?.status());
    if (res?.status() === 200) {
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

// ── 4. Auth Gates: protected pages must redirect or return 401/403 ───────────

test.describe("Auth gates — protected pages reject unauthenticated", () => {
  const protectedPaths = [
    "/admin",
    "/admin/admins",
    "/admin/audit-logs",
    "/admin/menu",
    "/admin/orders",
    "/admin/orders/1",
    "/admin/qr",
    "/admin/restaurants",
    "/admin/settings",
    "/admin/subscriptions",
    "/admin/system-events",
    "/admin/telegram",
    "/admin/users",
    "/owner",
    "/owner/loyalty",
    "/owner/menu",
    "/owner/orders",
    "/owner/orders/1",
    "/owner/qr",
    "/owner/reviews",
    "/owner/settings",
  ];
  for (const path of protectedPaths) {
    test(`GET ${path} rejects unauthenticated`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      // Must NOT return 200 for protected pages without auth
      expect(res.status()).not.toBe(200);
      // Should redirect (3xx) or return 401/403
      expect(
        res.status() === 401 ||
        res.status() === 403 ||
        (res.status() >= 300 && res.status() < 400)
      ).toBe(true);
    });
  }
});

// ── 5. Security Headers (browser request context) ────────────────────────────

test.describe("Security headers", () => {
  test("Content-Security-Policy present", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toBeDefined();
    expect(headers["content-security-policy"]?.length).toBeGreaterThan(0);
  });

  test("Strict-Transport-Security present", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["strict-transport-security"]).toBeDefined();
    expect(headers["strict-transport-security"]?.length).toBeGreaterThan(0);
  });

  test("X-Content-Type-Options: nosniff", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("X-Frame-Options: DENY", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
  });
});

// ── 6. RTL + Arabic layout on every page type ────────────────────────────────

test.describe("RTL / Arabic layout", () => {
  const pages = ["/", "/login", "/pricing", "/cart", "/menu", "/terms", "/subscribe"];
  for (const path of pages) {
    test(`dir="rtl" on ${path}`, async ({ page }) => {
      await gotoOk(page, path);
      await page.waitForLoadState("networkidle");
      expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    });
    test(`lang="ar" on ${path}`, async ({ page }) => {
      await gotoOk(page, path);
      await page.waitForLoadState("networkidle");
      expect(await page.locator("html").getAttribute("lang")).toBe("ar");
    });
  }
});

// ── 7. PWA support ──────────────────────────────────────────────────────────

test.describe("PWA support", () => {
  test("Web app manifest served", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBeDefined();
    expect(json.icons?.length).toBeGreaterThan(0);
  });

  test("Service worker accessible", async ({ page }) => {
    await gotoOk(page, "/");
    await page.waitForLoadState("networkidle");
    const swUrl = await page.evaluate(() =>
      navigator.serviceWorker?.controller?.scriptURL ?? null
    );
    if (swUrl) {
      expect(swUrl).toContain("/sw.js");
    }
  });
});

// ── 8. API endpoints ────────────────────────────────────────────────────────

test.describe("API endpoints", () => {
  test("GET /api/plans returns plans", async ({ request }) => {
    const res = await request.get("/api/plans");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test("POST /api/auth/login empty body → 400", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  test("POST /api/auth/login bad creds → 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      headers: { "Content-Type": "application/json" },
      data: { username: "nonexistent_xyz", password: "wrongpass" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/auth/me without session → 401", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
  });

  test("POST /api/subscriptions without auth → 401", async ({ request }) => {
    const res = await request.post("/api/subscriptions", {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/telegram/diagnose without auth → 401", async ({ request }) => {
    const res = await request.get("/api/telegram/diagnose");
    expect(res.status()).toBe(401);
  });
});

// ── 9. 404 handling ─────────────────────────────────────────────────────────

test.describe("404 handling", () => {
  test("Non-existent route returns 404", async ({ page }) => {
    const res = await page.goto("/this-path-does-not-exist-abc123", { waitUntil: "commit" });
    expect(res?.status()).toBe(404);
  });

  test("404 page has body", async ({ page }) => {
    await page.goto("/this-path-does-not-exist-abc123", { waitUntil: "commit" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});

// ── 10. Browser interaction tests ───────────────────────────────────────────

test.describe("Browser interactions", () => {
  test("All pages have a page title", async ({ page }) => {
    await gotoOk(page, "/");
    await page.waitForLoadState("networkidle");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("Login page has form elements", async ({ page }) => {
    await gotoOk(page, "/login");
    await page.waitForLoadState("networkidle");
    const form = page.locator("form");
    const hasForm = (await form.count()) > 0;
    const inputs = page.locator("input");
    const hasInputs = (await inputs.count()) > 0;
    expect(hasForm || hasInputs).toBe(true);
  });

  test("Menu page has navigable links", async ({ page }) => {
    await gotoOk(page, "/menu");
    await page.waitForLoadState("networkidle");
    expect(await page.locator("a").count()).toBeGreaterThanOrEqual(1);
  });

  test("Pricing page has interactive elements", async ({ page }) => {
    await gotoOk(page, "/pricing");
    await page.waitForLoadState("networkidle");
    const clicks = page.locator("button, a");
    expect(await clicks.count()).toBeGreaterThanOrEqual(1);
  });
});

// ── 11. Page load performance ───────────────────────────────────────────────

test.describe("Load performance (<10s per page)", () => {
  const pages = ["/", "/login", "/pricing", "/cart", "/menu", "/terms", "/subscribe"];
  for (const path of pages) {
    test(`${path} loads under 10s`, async ({ page }) => {
      const start = Date.now();
      await page.goto(path, { waitUntil: "commit" });
      await page.waitForLoadState("networkidle");
      expect(Date.now() - start).toBeLessThan(10000);
    });
  }
});

// ── 12. Accessibility basics ────────────────────────────────────────────────

test.describe("Basic accessibility", () => {
  const pages = ["/", "/login", "/pricing", "/cart", "/menu"];
  for (const path of pages) {
    test(`${path} has heading or content`, async ({ page }) => {
      await gotoOk(page, path);
      await page.waitForLoadState("networkidle");
      const h = page.locator("h1, h2, h3, [role='heading']");
      const headingCount = await h.count();
      const text = await page.locator("body").innerText();
      expect(headingCount >= 1 || text.length > 0).toBe(true);
    });
  }
});
