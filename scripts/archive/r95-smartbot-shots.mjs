/**
 * Round 95 — Smart Bot design reference capture
 * Screenshots of bot.smart-link.ly (the design source to copy)
 * + menu.smart-link.ly (current state) for side-by-side comparison.
 */
import { chromium } from 'playwright';

const OUT = '/home/z/my-project/download/r95-smartbot-ref';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const targets = [
  { name: 'sb-home-top', url: 'https://bot.smart-link.ly', scroll: 0 },
  { name: 'sb-home-features', url: 'https://bot.smart-link.ly', scroll: 1400 },
  { name: 'sb-home-steps', url: 'https://bot.smart-link.ly', scroll: 2800 },
  { name: 'sb-home-stats', url: 'https://bot.smart-link.ly', scroll: 4200 },
  { name: 'sb-home-faq-cta', url: 'https://bot.smart-link.ly', scroll: 6200 },
  { name: 'sb-pricing', url: 'https://bot.smart-link.ly/pricing', scroll: 600 },
  { name: 'sb-login', url: 'https://bot.smart-link.ly/login', scroll: 0 },
  { name: 'sm-home-top', url: 'https://menu.smart-link.ly', scroll: 0 },
  { name: 'sm-home-features', url: 'https://menu.smart-link.ly', scroll: 1400 },
  { name: 'sm-pricing', url: 'https://menu.smart-link.ly/pricing', scroll: 600 },
  { name: 'sm-menu', url: 'https://menu.smart-link.ly/menu/al-waha-cafe', scroll: 800 },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'ar-LY',
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

for (const t of targets) {
  try {
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1600); // fonts + reveal settle
    if (t.scroll > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t.scroll);
      await page.waitForTimeout(1200); // reveal animations trigger
    }
    await page.screenshot({ path: `${OUT}/${t.name}.png` });
    console.log(`OK  ${t.name}`);
  } catch (e) {
    console.log(`ERR ${t.name}: ${e.message.split('\n')[0]}`);
  }
}

// Also dump Smart Bot's computed body styles for pixel-accuracy
await page.goto('https://bot.smart-link.ly', { waitUntil: 'networkidle', timeout: 45000 });
const styles = await page.evaluate(() => {
  const b = getComputedStyle(document.body);
  const h1 = document.querySelector('h1');
  const h1s = h1 ? getComputedStyle(h1) : null;
  return {
    bodyBg: b.backgroundColor, bodyColor: b.color, bodyFont: b.fontFamily,
    h1Font: h1s?.fontFamily, h1Size: h1s?.fontSize, h1Weight: h1s?.fontWeight,
    h1LineHeight: h1s?.lineHeight, h1LetterSpacing: h1s?.letterSpacing,
    dir: document.documentElement.dir, htmlClass: document.documentElement.className,
  };
});
console.log('SMARTBOT-STYLES ' + JSON.stringify(styles, null, 2));

await browser.close();
