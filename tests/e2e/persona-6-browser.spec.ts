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
      const resp = await page.goto(pg.path, { waitUntil: "domcontentloaded", timeout: 40000 });
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
  // round87-D4 (socratic fix): the old version (a) skipped the toggle when
  // count() === 0 and (b) asserted `className` matches /dark|light|theme/ —
  // next-themes (attribute="class") always puts "dark" or "light" on <html>,
  // so that assertion was a tautology: it passed even when nothing was
  // toggled or persisted. Now: toggle is REQUIRED, the class must actually
  // flip, and after reload it must equal the post-toggle value.
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "domcontentloaded" });
  const toggle = page.locator('button[aria-label="الوضع النهاري"], button[aria-label="الوضع الليلي"]').first();
  // ThemeToggle is a mounted-guard client component — wait for the button
  // instead of a fixed 2000ms sleep.
  await expect(toggle).toBeVisible({ timeout: 15000 });
  const themeClass = () =>
    page.evaluate(() => {
      const c = document.documentElement.className;
      if (c.includes("dark")) return "dark";
      if (c.includes("light")) return "light";
      return "";
    });
  const before = await themeClass();
  await toggle.click();
  // Class flips on click — poll instead of a fixed 800ms sleep.
  await expect.poll(themeClass, { timeout: 5000 }).not.toBe(before);
  const after = await themeClass();
  // P8-C (firefox gap): playwright's patched Firefox deadlocks on
  // page.reload() while a service worker controls the page — the navigation
  // happens but domcontentloaded never surfaces and the execution context
  // wedges (probed directly: SW active+controlling, toggle flips, and a
  // fresh same-URL goto answers in ~200ms; only the reload API hangs).
  // goto(same URL) is a full fresh navigation through the SAME SW fetch
  // pipeline, so next-themes still re-reads localStorage at mount — the
  // persistence assertion below is unchanged in strength. Chromium is
  // agnostic (both APIs work there).
  await page.goto(page.url(), { waitUntil: "domcontentloaded" });
  // Persisted: the class after reload equals the class set by the toggle
  // (was: /dark|light|theme/ which matched unconditionally).
  await expect.poll(themeClass, { timeout: 15000 }).toBe(after);
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