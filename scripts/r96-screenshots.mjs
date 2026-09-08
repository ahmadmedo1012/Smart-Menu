// r96-W6: لقطات بصرية للتحقق المرئي (منيو الديمو الجديد + الهبوط + التسعير)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'download/r96-local';
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { name: 'landing-desktop', url: '/', viewport: { width: 1440, height: 900 } },
  { name: 'landing-mobile', url: '/', viewport: { width: 375, height: 812 } },
  { name: 'menu-demo-desktop', url: '/menu/al-waha-cafe-demo', viewport: { width: 1440, height: 900 } },
  { name: 'menu-demo-mobile', url: '/menu/al-waha-cafe-demo', viewport: { width: 375, height: 812 } },
  { name: 'pricing-desktop', url: '/pricing', viewport: { width: 1440, height: 900 } },
  { name: 'login-desktop', url: '/login', viewport: { width: 1440, height: 900 } },
];

const browser = await chromium.launch();
for (const shot of SHOTS) {
  const ctx = await browser.newContext({ viewport: shot.viewport, locale: 'ar' });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + shot.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.url === '/menu/al-waha-cafe-demo' && shot.viewport.width > 800 });
    const size = fs.statSync(`${OUT}/${shot.name}.png`).size;
    console.log(`✓ ${shot.name}.png (${(size / 1024).toFixed(0)}KB)`);
  } catch (e) {
    console.error(`✗ ${shot.name}: ${e.message.slice(0, 80)}`);
  }
  await ctx.close();
}

// لقطة تفاعلية: فتح حوار الخيارات لصنف «لاتيه كراميل»
try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'ar' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/menu/al-waha-cafe-demo`, { waitUntil: 'networkidle', timeout: 45000 });
  const latte = page.locator('text=لاتيه كراميل').first();
  if (await latte.count()) {
    await latte.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/menu-demo-options-dialog.png` });
    console.log('✓ menu-demo-options-dialog.png (حوار الخيارات)');
  } else {
    console.log('! لاتيه كراميل غير ظاهر — تخطي لقطة الحوار');
  }
  await ctx.close();
} catch (e) {
  console.error(`✗ options-dialog: ${e.message.slice(0, 80)}`);
}

await browser.close();
console.log('done');
