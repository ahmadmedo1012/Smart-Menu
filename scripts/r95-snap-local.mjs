/**
 * r95-D — لقطات التحقق المحلية (توأمة SmartBot)
 * Viewport 1440x900 + locale ar-LY — نفس أسلوب التقاط اللقطات المرجعية
 * (sb-*.png كلها 1440x900 viewport، وليست fullPage) للمقارنة العادلة في VLM.
 * offsets التمرير من التكليف: features=1500 · steps=3000 · stats=4600.
 * يعمل ضد الخادم standalone — شغّله داخل جلسة تحتفظ بالخادم حياً.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const OUT = '/home/z/my-project/download/r95-local';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();

const settle = (ms = 1400) => page.waitForTimeout(ms); // reveal animations settle

// ---- home: top + scroll stations ----
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
await settle(1800);
await page.screenshot({ path: OUT + '/local-home-top.png' });
console.log('[snap] home-top ✓');

for (const [name, offset] of [['features', 1500], ['steps', 3000], ['stats', 4600]]) {
  await page.evaluate((y) => window.scrollTo(0, y), offset);
  await settle(1800);
  await page.screenshot({ path: OUT + `/local-home-${name}.png` });
  console.log(`[snap] home-${name} @${offset} ✓`);
}

// ---- pricing ----
await page.goto(BASE + '/pricing', { waitUntil: 'networkidle', timeout: 60000 });
await settle(2000);
await page.screenshot({ path: OUT + '/local-pricing.png' });
console.log('[snap] pricing ✓');

// ---- menu (seeded demo restaurant) ----
await page.goto(BASE + '/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 60000 });
await settle(2000);
await page.screenshot({ path: OUT + '/local-menu.png' });
console.log('[snap] menu ✓');

// ---- login ----
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
await settle(1600);
await page.screenshot({ path: OUT + '/local-login.png' });
console.log('[snap] login ✓');

await browser.close();
console.log('[snap] ALL DONE →', OUT);
