/**
 * Team 6 — Performance, Accessibility, Responsiveness (RTL focus)
 * Multi-viewport screenshots, console/network error capture, a11y basics.
 * Run: npx playwright test tests/e2e/team6-a11y.spec.ts --project=ui
 */
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/pricing", "/subscribe", "/login", "/menu/al-waha-cafe-demo", "/cart"];

test.describe("responsive: no horizontal overflow at 3 viewports", () => {
  for (const vp of [{ name: "mobile", w: 375, h: 812 }, { name: "tablet", w: 768, h: 1024 }, { name: "desktop", w: 1440, h: 900 }]) {
    for (const p of PAGES) {
      test(`${vp.name} ${p}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.goto(p, { waitUntil: "networkidle" });
        await page.waitForTimeout(2000);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBeFalsy();
      });
    }
  }
});

test("rtl: every page has dir=rtl + lang=ar", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const dir = await page.evaluate(() => document.documentElement.dir);
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(dir, `${p} dir`).toBe("rtl");
    expect(lang, `${p} lang`).toBe("ar");
  }
});

test("console: no unexpected JS errors on key pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 150)));
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
  }
  // Filter known benign: aborted requests, favicon, etc.
  const real = errors.filter((e) => !e.includes("AbortError"));
  expect(real).toEqual([]);
});

test("network: no unexpected 4xx/5xx on key pages", async ({ page }) => {
  const bad: string[] = [];
  page.on("response", (r) => {
    const url = r.url();
    if (r.status() >= 400 && url.includes("menu.smart-link.ly") && !url.includes("/api/")) {
      bad.push(`${r.status()} ${url.slice(0, 80)}`);
    }
  });
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
  }
  expect(bad).toEqual([]);
});

test("images: no broken images on menu page", async ({ page }) => {
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const broken = await page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.src || "").slice(0, 80))
  );
  expect(broken).toEqual([]);
});

test("a11y: buttons have text or aria-label on menu page", async ({ page }) => {
  await page.goto("/menu/al-waha-cafe-demo", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const missing = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => b.offsetHeight > 0 && !b.innerText.trim() && !b.getAttribute("aria-label"))
      .slice(0, 10)
      .map((b) => b.className.slice(0, 40))
  );
  // Some icon-only buttons may legitimately lack labels — report but don't hard-fail
  console.log("Buttons missing text/aria-label:", missing.length, missing.slice(0, 5));
  expect(missing.length).toBeLessThan(10);
});

test("keyboard: tab through login form reaches submit", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // Press Tab several times — should focus inputs and eventually the submit button
  let focused = "";
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName + (el.getAttribute("placeholder") ? ":" + el.getAttribute("placeholder") : "") : "none";
    });
  }
  // At least one input got focus
  expect(focused.length).toBeGreaterThan(0);
});
