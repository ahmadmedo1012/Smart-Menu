/**
 * Round 95 — PRODUCTION verification shots (menu.smart-link.ly on 931d6cd5)
 * Full user-view comparison against the SmartBot reference.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/z/my-project/download/r95-prod';
mkdirSync(OUT, { recursive: true });
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'https://menu.smart-link.ly';

const targets = [
  { name: 'prod-home-top', url: `${BASE}/`, scroll: 0 },
  { name: 'prod-home-features', url: `${BASE}/`, scroll: 1500 },
  { name: 'prod-home-steps', url: `${BASE}/`, scroll: 3000 },
  { name: 'prod-home-stats', url: `${BASE}/`, scroll: 4600 },
  { name: 'prod-pricing', url: `${BASE}/pricing`, scroll: 700 },
  { name: 'prod-menu', url: `${BASE}/menu/al-waha-cafe`, scroll: 700 },
  { name: 'prod-login', url: `${BASE}/login`, scroll: 0 },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();

for (const t of targets) {
  try {
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2200); // ISR settle + reveal animations
    if (t.scroll > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t.scroll);
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${OUT}/${t.name}.png` });
    console.log(`OK  ${t.name}`);
  } catch (e) {
    console.log(`ERR ${t.name}: ${e.message.split('\n')[0]}`);
  }
}

// Style fingerprint on production
const styles = await page.evaluate(() => {
  const b = getComputedStyle(document.body);
  const h1 = document.querySelector('h1');
  const hs = h1 ? getComputedStyle(h1) : null;
  return {
    bodyBg: b.backgroundColor, bodyColor: b.color,
    h1Size: hs?.fontSize, h1Weight: hs?.fontWeight,
    htmlClass: document.documentElement.className,
  };
});
console.log('PROD-STYLES ' + JSON.stringify(styles, null, 2));
await browser.close();
