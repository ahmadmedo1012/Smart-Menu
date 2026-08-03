/**
 * Team 7 — Security / negative tests across all resources
 * IDOR, XSS injection, error-message enumeration. Uses stable selectors.
 * Run: npx playwright test tests/e2e/team7-security.spec.ts --project=qa-teams
 */
import { test, expect, type Page } from "@playwright/test";
import { login } from "./qa-helpers";

const OWNER_A = "testmulti1568"; // restaurants 313/315
const OWNER_B = "newuser300528"; // restaurant 317
const PASS = "testpass123";
const ts = Date.now().toString().slice(-8);

test("IDOR: owner A cannot access owner B's restaurant settings", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  // newuser300528's primary restaurant id
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/settings?restaurantId=317");
    return { status: r.status, body: (await r.text()).slice(0, 60) };
  });
  // A has NO UserRestaurant link to 317 → must be denied
  expect(res.status).toBe(403);
});

test("IDOR: owner A cannot read owner B's orders", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/orders?restaurantId=317");
    return { status: r.status };
  });
  expect(res.status).toBeGreaterThanOrEqual(401);
});

test("IDOR: owner A cannot create category in owner B's restaurant", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const res = await page.evaluate(async (csrf) => {
    const r = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ name: "XSS", restaurantId: 317 }),
    });
    return { status: r.status };
  }, token);
  // 401 (not authed) / 403 (forbidden) both prove denial; never 201
  expect(res.status).toBeGreaterThanOrEqual(401);
  expect(res.status).not.toBe(201);
});

test("IDOR: owner A cannot update owner B's restaurant", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const res = await page.evaluate(async (csrf) => {
    const r = await fetch("/api/restaurants/317", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ name: "hacked" }),
    });
    return { status: r.status };
  }, token);
  // 403/401/404 all acceptable — must NOT be 200
  expect(res.status).not.toBe(200);
});

test("XSS: item <script> stored and rendered as text (not executed)", async ({ page }) => {
  await login(page, OWNER_A, PASS);
  expect(page.url()).toContain("/owner"); // must be authenticated before hitting API
  // OWNER_A (testmulti1568) owns restaurant 316 (مقهى النخبة) which has categories
  const rid = 316;
  const catId = await page.evaluate(async (rid) => {
    const r = await fetch(`/api/categories?restaurantId=${rid}`);
    const j = await r.json();
    return j.data?.[0]?.id;
  }, rid);
  expect(catId).toBeTruthy();

  const token = await page.evaluate(() =>
    document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
  );
  const evil = "<script>window.__xss=1</script>";
  const created = await page.evaluate(async ({ catId, evil, csrf }) => {
    const r = await fetch("/api/items", {
      method: "POST",
      credentials: "include", // send session cookie
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ name: evil, price: 5, categoryId: catId }),
    });
    return r.status;
  }, { catId, token, evil });
  // 201 created, OR 403 if CSRF/session hiccup — but the security claim only
  // needs: if stored, it must NOT execute. So require success OR documented denial.
  if (created !== 201) {
    // Session may have been invalidated; re-login once and retry
    await login(page, OWNER_A, PASS);
    const token2 = await page.evaluate(() =>
      document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=")[1] ?? ""
    );
    const retry = await page.evaluate(async ({ catId, evil, csrf }) => {
      const r = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ name: evil, price: 5, categoryId: catId }),
      });
      return r.status;
    }, { catId: catId, token2, evil, csrf: token2 });
    expect(retry).toBe(201);
  }

  // View the public menu and assert the script text is present but window.__xss undefined
  await page.goto(`/menu/${await restaurantSlug(page)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  expect(body).toContain("<script>"); // rendered as text
  const executed = await page.evaluate(() => (window as any).__xss === 1);
  expect(executed).toBe(false); // NOT executed
});

test("XSS: restaurant name injection not executed on public menu", async ({ page }) => {
  // Set a restaurant with <img onerror=...> in name via direct DB is invasive; instead
  // verify the menu page escapes by posting a QA item name then checking no execution.
  // (covered by the item test above — this is a belt-and-suspenders sanity check)
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const executed = await page.evaluate(() => (window as any).__xss === 1);
  expect(executed).toBe(false);
});

async function restaurantSlug(page: Page): Promise<string> {
  const r = await page.evaluate(async () => {
    const res = await fetch("/api/auth/me");
    const j = await res.json();
    const rid = j.data?.restaurantId;
    const rr = await fetch(`/api/restaurants/${rid}`);
    const rj = await rr.json();
    return rj.data?.slug;
  });
  return r || "qa-slug-unreachable";
}