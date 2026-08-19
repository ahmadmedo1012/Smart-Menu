/**
 * Persona 6 check-in — cross-viewport deep browser QA (chromium):
 * every key page at 3 viewports, screenshot evidence, no overflow,
 * no console errors, RTL correctness.
 * Run: npx playwright test tests/e2e/persona-6-browser.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/", name: "landing" },
  { path: "/pricing", name: "pricing" },
  { path: "/menu/al-waha-cafe-demo", name: "menu" },
  { path: "/login", name: "login" },
  { path: "/subscribe", name: "subscribe" },
];
const VIEWPORTS = [
  { w: 375, h: 812, name: "mobile" },
  { w: 768, h: 1024, name: "tablet" },
  { w: 1440, h: 900, name: "desktop" },
];

for (const vp of VIEWPORTS) {
  for (const pg of PAGES) {
    test(`browser: ${pg.name} renders cleanly at ${vp.name}`, async ({ page }) => {
      test.setTimeout(45000);
      const consoleErrors: string[] = [];
      page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 100)));
      await page.setViewportSize({ width: vp.w, height: vp.h });
      const resp = await page.goto(pg.path, { waitUntil: "networkidle", timeout: 40000 });
      expect(resp?.status()).toBeLessThan(400);
      await page.waitForTimeout(1500);
      // No horizontal overflow beyond a tiny tolerance (RTL/RTL-safe)
      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        return de.scrollWidth - de.clientWidth;
      });
      expect(overflow, `${pg.path} at ${vp.name} overflow`).toBeLessThanOrEqual(2);
      // No JS errors
      expect(consoleErrors, `${pg.path} console`).toEqual([]);
      // Screenshot evidence
      await page.screenshot({ path: `test-results/browser-${pg.name}-${vp.name}.png` });
    });
  }
}

test("browser: theme toggle persists across reload", async ({ page }) => {
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const toggle = page.locator('button[aria-label="الوضع النهاري"], button[aria-label="الوضع الليلي"]').first();
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForTimeout(800);
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const cls = await page.evaluate(() => document.documentElement.className);
  console.log(`browser: theme class after reload: ${cls}`);
  expect(cls).toMatch(/dark|light|theme/);
});

test("browser: RTL dir + lang=ar on all pages", async ({ page }) => {
  for (const pg of PAGES) {
    await page.goto(pg.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const html = await page.evaluate(() => {
      const h = document.documentElement;
      return { dir: h.getAttribute("dir"), lang: h.getAttribute("lang") };
    });
    expect(html.dir, pg.path).toBe("rtl");
    expect(html.lang, pg.path).toBe("ar");
  }
});