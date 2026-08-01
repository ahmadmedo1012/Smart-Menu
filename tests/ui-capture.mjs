// UI capture agent — screenshots a page at a viewport + interactions.
// Usage: node tests/ui-capture.mjs <pageKey> <viewport> [dark]
// Page keys: landing login pricing subscribe cart terms privacy menu menu-slug order-confirmed 404 owner-dash owner-menu owner-orders owner-settings owner-loyalty owner-qr owner-reviews
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://menu.smart-link.ly";
const pageKey = process.argv[2];
const viewport = process.argv[3] || "desktop"; // mobile|tablet|desktop|wide
const dark = process.argv[4] === "dark";
const OWNER = { username: "waha", password: "waha123" };

const VPS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  wide: { width: 1920, height: 1080 },
};
mkdirSync("/tmp/ui-shots", { recursive: true });

const routes = {
  landing: "/", login: "/login", pricing: "/pricing", subscribe: "/subscribe",
  cart: "/cart", terms: "/terms", privacy: "/privacy", menu: "/menu",
  "menu-slug": "/menu/al-waha-cafe", "order-confirmed": "/order-confirmed",
  "404": "/nonexistent-page-xyz",
  "owner-dash": "/owner", "owner-menu": "/owner/menu", "owner-orders": "/owner/orders",
  "owner-settings": "/owner/settings", "owner-loyalty": "/owner/loyalty",
  "owner-qr": "/owner/qr", "owner-reviews": "/owner/reviews",
};
if (!routes[pageKey]) { console.log(JSON.stringify({ error: "unknown page" })); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VPS[viewport], locale: "ar" });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

const results = [];
async function cap(name, fullPage = false) {
  const f = `/tmp/ui-shots/${pageKey}-${viewport}${dark ? "-dark" : ""}-${name}.png`;
  await page.screenshot({ path: f, fullPage });
  results.push(f);
}

try {
  await page.goto(`${BASE}${routes[pageKey]}`, { waitUntil: "commit" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);

  // owner pages need login
  if (pageKey.startsWith("owner")) {
    await page.goto(`${BASE}/login`, { waitUntil: "commit" });
    await page.waitForLoadState("networkidle").catch(() => {});
    const inputs = page.locator("input");
    await inputs.nth(0).fill("waha");
    await inputs.nth(1).fill("waha123");
    await page.locator("button[type=submit]").first().click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}${routes[pageKey]}`, { waitUntil: "commit" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
  }

  // dark mode
  if (dark) {
    await page.evaluate(() => { document.documentElement.classList.add("dark"); });
    await page.waitForTimeout(300);
  }

  // metrics
  const metrics = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    images: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
    brokenImgs: [...document.images].filter((i) => i.naturalWidth === 0).length,
    textOverflow: [...document.querySelectorAll("*")].filter((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === "visible").length,
    bodyLen: document.body.innerText.length,
  }));

  await cap("top");
  if (metrics.bodyLen > 100) await cap("full", true);
  // interactions: hover CTA
  const cta = page.locator("a:has-text('ابدأ'), a:has-text('اشترك'), a:has-text('سجل'), button:has-text('طلب')").first();
  if (await cta.count()) {
    await cta.hover().catch(() => {});
    await page.waitForTimeout(400);
    await cap("hover");
  }
  console.log(JSON.stringify({ page: pageKey, viewport, dark, metrics, shots: results }));
} catch (e) {
  console.log(JSON.stringify({ page: pageKey, viewport, dark, error: e.message?.slice(0, 150) }));
}
await browser.close();
