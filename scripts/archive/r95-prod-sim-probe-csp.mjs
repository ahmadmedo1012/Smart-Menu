/**
 * Round 95-E — probe: attribute the CSP console error seen during Journey 2.
 * Visits each owner-area page with the sim95 test account and logs every
 * console error (with its triggering page). READ-ONLY — creates no data.
 * Run: node scripts/r95-prod-sim-probe-csp.mjs
 */
import { chromium } from 'playwright';

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'https://menu.smart-link.ly';
const OWNER = process.argv[2] || 'sim95-75361148';
const PASS = process.argv[3] || 'Sim95#Pass95';

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();

const errLog = [];
page.on('console', (m) => {
  if (m.type() === 'error') errLog.push({ page: page.url(), text: m.text().slice(0, 300) });
});
page.on('pageerror', (e) => errLog.push({ page: page.url(), text: 'PAGEERROR: ' + String(e).slice(0, 200) }));

// login
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
await page.getByPlaceholder('اسم المستخدم').fill(OWNER);
await page.getByPlaceholder('كلمة المرور').fill(PASS);
await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
await page.waitForURL(/\/owner/, { timeout: 30000 }).catch(() => {});
console.log('logged in →', page.url());

const pages = [
  '/owner', '/owner/orders', '/owner/menu', '/owner/restaurants',
  '/owner/qr', '/owner/loyalty', '/owner/reviews', '/owner/settings',
];
for (const p of pages) {
  const before = errLog.length;
  await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  console.log(`\n── ${p} ── errors this page: ${errLog.length - before}`);
  for (const e of errLog.slice(before)) console.log('   ', e.text.replace(/\n/g, ' ⏎ '));
}

console.log('\n══ TOTAL ERRORS:', errLog.length);
await browser.close();
