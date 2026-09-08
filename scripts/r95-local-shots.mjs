/**
 * Round 95 — local visual verification shots (Smart-Menu with new SmartBot identity)
 * r95-D: أضفت hero-mid وcta + تمرير بمحركات النص (أمتن من الإحداثيات الثابتة).
 * Run inside ONE bash session that owns the standalone server (r92 pattern).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/z/my-project/download/r95-local';
mkdirSync(OUT, { recursive: true });
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const targets = [
  { name: 'local-home-top', url: 'http://localhost:3000', scroll: 0 },
  { name: 'local-hero-mid', url: 'http://localhost:3000', scroll: 600 },
  { name: 'local-home-features', url: 'http://localhost:3000', heading: 'كل ما يحتاجه مطعمك في مكان واحد' },
  { name: 'local-home-steps', url: 'http://localhost:3000', heading: 'من التسجيل إلى أول طلب' },
  { name: 'local-home-stats', url: 'http://localhost:3000', text: 'مطعم مسجل' },
  { name: 'local-cta', url: 'http://localhost:3000', heading: 'جهّز مطعمك للانطلاق الرقمي' },
  // r95-D: scroll:700 كان يقصّ رؤوس بطاقات الخطط (المقارنة البصرية وصفتها
  // «مزاحة لأسفل يمين») — مرساة العنوان «اختر خطتك» تؤطر التبديل + البطاقات كاملة.
  { name: 'local-pricing', url: 'http://localhost:3000/pricing', heading: 'اختر خطتك' },
  { name: 'local-menu', url: 'http://localhost:3000/menu/al-waha-cafe', scroll: 700 },
  { name: 'local-login', url: 'http://localhost:3000/login', scroll: 0 },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();

for (const t of targets) {
  try {
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1800);
    if (t.scroll > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), t.scroll);
    } else if (t.heading || t.text) {
      // r95-D: frame the whole section — scroll target to viewport top in ONE
      // evaluate (boundingBox between two evaluates races React re-renders and
      // returns undefined -> screenshot stays at scroll 0 = hero, not the section).
      const sel = t.heading
        ? { role: 'heading', name: t.heading }
        : { text: t.text };
      const loc = t.heading
        ? page.getByRole('heading', { name: t.heading, exact: false }).first()
        : page.getByText(t.text, { exact: false }).first();
      await loc.waitFor({ state: 'attached', timeout: 15000 });
      const off = t.heading ? -8 : -200;
      const landed = await loc.evaluate((el, o) => {
        const abs = el.getBoundingClientRect().top + window.scrollY + o;
        window.scrollTo({ top: Math.max(0, abs), behavior: 'instant' });
        return Math.round(window.scrollY);
      }, off);
      console.log(`   scroll ${t.name} -> ${landed}px (sel=${JSON.stringify(sel.role ? sel.name : sel.text)})`);
    }
    await page.waitForTimeout(1400); // reveal animations settle after scroll
    await page.screenshot({ path: `${OUT}/${t.name}.png` });
    console.log(`OK  ${t.name}`);
  } catch (e) {
    console.log(`ERR ${t.name}: ${e.message.split('\n')[0]}`);
  }
}

// computed style fingerprints
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
const styles = await page.evaluate(() => {
  const b = getComputedStyle(document.body);
  const h1 = document.querySelector('h1');
  const hs = h1 ? getComputedStyle(h1) : null;
  return {
    bodyBg: b.backgroundColor, bodyColor: b.color,
    h1Font: hs?.fontFamily, h1Size: hs?.fontSize, h1Weight: hs?.fontWeight,
    htmlClass: document.documentElement.className,
  };
});
console.log('LOCAL-STYLES ' + JSON.stringify(styles, null, 2));
await browser.close();
