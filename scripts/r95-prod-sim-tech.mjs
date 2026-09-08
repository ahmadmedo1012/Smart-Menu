/**
 * Round 95-E — Journey 3 tech check: theme toggle on production.
 * Dark → light (html.light) → back to dark. Shot t1-light-mode.
 * Run: node scripts/r95-prod-sim-tech.mjs
 */
import { chromium } from 'playwright';

const OUT = '/home/z/my-project/download/r95-prod-sim';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'https://menu.smart-link.ly';

const results = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? '✓' : '✗'} [${id}] ${detail}`);
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);

const classBefore = await page.evaluate(() => document.documentElement.className);
const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('t1.darkBefore', classBefore.includes('dark') && !classBefore.includes('light'),
  `before toggle: html class="${classBefore}", body bg=${bgBefore}`);

// The toggle button: aria-label "الوضع النهاري" while dark (click → light)
const toggle = page.getByRole('button', { name: 'الوضع النهاري' }).first();
const toggleVisible = await toggle.isVisible().catch(() => false);
if (toggleVisible) {
  await toggle.click();
  await page.waitForTimeout(1500);
  const classLight = await page.evaluate(() => document.documentElement.className);
  const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.screenshot({ path: `${OUT}/t1-light-mode.png` });
  check('t1.light', classLight.includes('light'), `after toggle: html class="${classLight}", body bg=${bgLight}`);

  // back to dark
  const toggleBack = page.getByRole('button', { name: 'الوضع الليلي' }).first();
  await toggleBack.click();
  await page.waitForTimeout(1500);
  const classDark = await page.evaluate(() => document.documentElement.className);
  const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.screenshot({ path: `${OUT}/t1-dark-restored.png` });
  check('t1.darkRestored', classDark.includes('dark') && !classDark.includes('light'),
    `after toggle back: html class="${classDark}", body bg=${bgDark}`);
} else {
  check('t1.light', false, 'theme toggle button ("الوضع النهاري") not found on landing header');
  await page.screenshot({ path: `${OUT}/t1-light-mode.png` });
}

await ctx.close();
await browser.close();
console.log(`\nRESULT: ${results.filter((r) => r.ok).length}/${results.length} checks passed`);
