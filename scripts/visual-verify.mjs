// Run via npx playwright
import { chromium } from "playwright";

const browser = await chromium.launch();
const BASE = "http://localhost:3000";

async function capture(label, path, opts = {}) {
  const page = await browser.newPage();
  await page.setViewportSize(opts.vp || { width: 1280, height: 800 });
  try {
    await page.goto(BASE + opts.path || "/", { waitUntil: "networkidle", timeout: 15000 });
  } catch { await page.goto(BASE + opts.path || "/", { timeout: 15000 }); }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/home/ahmed/UTILITIES/smart-menu/" + path, fullPage: opts.fullPage || false });
  console.log(`${label} → ${path}`);
  await page.close();
  return page;
}

await capture("Desktop hero", ".screenshot-hero-desktop.png", { vp: { width: 1280, height: 800 }, path: "/" });
await capture("Mobile hero", ".screenshot-hero-mobile.png", { vp: { width: 375, height: 667 }, path: "/" });
await capture("Full page", ".screenshot-fullpage.png", { vp: { width: 1280, height: 800 }, path: "/", fullPage: true });
await capture("Pricing", ".screenshot-pricing.png", { vp: { width: 1280, height: 800 }, path: "/pricing", fullPage: true });
await capture("Login", ".screenshot-login.png", { vp: { width: 1280, height: 800 }, path: "/login" });
await capture("Menu", ".screenshot-menu.png", { vp: { width: 1280, height: 800 }, path: "/menu/al-waha-cafe", fullPage: true });

// Element verification on a fresh page
const verify = await browser.newPage();
await verify.setViewportSize({ width: 1280, height: 800 });
await verify.goto(BASE, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
await verify.waitForTimeout(2000);

const h1 = await verify.locator("h1").boundingBox();
const phoneEl = await verify.locator("video").boundingBox();
const phoneFallback = await verify.locator('img[alt=""]').first().boundingBox();
const ctas = await verify.locator("button, a").filter({ hasText: /ابدأ/ }).count();
const header = await verify.locator("header").first().boundingBox();
const headerGlass = await verify.locator(".glass-strong").boundingBox();

console.log("\n=== ELEMENT VERIFICATION ===");
console.log(`H1: ${h1 ? `visible at (${Math.round(h1.x)},${Math.round(h1.y)}) ${h1.width}x${h1.height}` : "MISSING"}`);
console.log(`Phone video: ${phoneEl ? `visible at (${Math.round(phoneEl.x)},${Math.round(phoneEl.y)}) ${phoneEl.width}x${phoneEl.height}` : "not rendered"}`);
console.log(`Phone fallback img: ${phoneFallback ? `visible at (${Math.round(phoneFallback.x)},${Math.round(phoneFallback.y)})` : "not rendered"}`);
console.log(`CTA buttons count: ${ctas}`);
console.log(`Header glass: ${headerGlass ? `visible at (${Math.round(headerGlass.x)},${Math.round(headerGlass.y)})` : "MISSING"}`);

if (phoneEl) {
  const cx = phoneEl.x + phoneEl.width/2;
  console.log(`Phone center X: ${Math.round(cx)} (viewport: 640) — ${Math.abs(cx - 640) < 150 ? "BALANCED" : "OFF-CENTER"}`);
}
if (h1) console.log(`Hero text visible: ${h1.y < 500 ? "ABOVE FOLD" : "BELOW FOLD"}`);

// Mobile viewport verification
await verify.setViewportSize({ width: 375, height: 667 });
await verify.goto(BASE, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
await verify.waitForTimeout(2000);
const mobileMenuBtn = await verify.locator('button[aria-label="فتح القائمة"]').boundingBox();
console.log(`Mobile menu button: ${mobileMenuBtn ? "visible" : "MISSING — responsive issue"}`);

// Login modal viewport check
await verify.goto(BASE + "/login", { timeout: 15000 });
await verify.waitForTimeout(2000);
const card = await verify.locator('[data-slot="card"]').boundingBox();
if (card) {
  const vp = { width: 1280, height: 800 };
  console.log(`Login card: (${Math.round(card.x)},${Math.round(card.y)}) ${card.width}x${card.height}`);
  console.log(`Card centered: ${Math.abs(card.x + card.width/2 - vp.width/2) < 50 ? "YES" : "NEEDS REVIEW"}`);
  console.log(`Card viewport-safe: ${card.x >= 0 && card.y >= 0 && card.x + card.width <= vp.width && card.y + card.height <= vp.height ? "YES" : "OVERFLOW"}`);
}

await browser.close();
console.log("\n✅ Visual verification complete — 6 screenshots captured");
