const puppeteer = require('puppeteer');
const { mkdirSync } = require('fs');

const BASE = 'http://localhost:3456';
const DIR = '/tmp/screenshots';
mkdirSync(DIR, { recursive: true });

const ROUTES = ['/login', '/menu', '/cart', '/order-confirmed', '/pricing', '/subscribe', '/privacy', '/terms', '/demo', '/owner', '/'];
const VPS = [
  { w: 320, h: 800, label: 'mobile' },
  { w: 1280, h: 800, label: 'desktop' },
];

async function checkOverflow(page, route, vp) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for JS to settle
  await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));

  const fin = page.url();
  const { sw, iw, sh } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    sh: document.documentElement.scrollHeight,
  }));
  const bad = sw > iw + 1;
  const status = bad ? 'FAIL' : 'PASS';
  const sfx = route === '/' ? 'home' : route.replace(/^\//, '');
  const sp = `${DIR}/${sfx}-${vp.label}.png`;
  await page.screenshot({ path: sp });
  console.log(`${status}: ${route} @ ${vp.label} — ${bad ? `OVERFLOW sw=${sw} > iw=${iw}` : `clean sw=${sw} iw=${iw}`} | sh=${sh} | final=${fin}`);
  return { route, vp: vp.label, status, sw, iw, sh, sp, fin };
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VPS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h });
      try {
        results.push(await checkOverflow(page, route, vp));
      } catch (e) {
        console.error(`ERROR: ${route} @ ${vp.label}: ${e.message}`);
        results.push({ route, vp: vp.label, status: 'ERROR', error: e.message });
      }
      await page.close();
    }
  }

  await browser.close();

  console.log('\n========== OVERFLOW CHECK SUMMARY ==========');
  const fail = results.filter(r => r.status === 'FAIL');
  const err = results.filter(r => r.status === 'ERROR');
  const pass = results.filter(r => r.status === 'PASS');
  console.log(`Total: ${results.length} | Pass: ${pass.length} | Fail: ${fail.length} | Error: ${err.length}`);
  fail.forEach(r => console.log(`  FAIL ${r.route} @ ${r.vp}: sw=${r.sw} > iw=${r.iw}`));
  err.forEach(r => console.log(`  ERROR ${r.route} @ ${r.vp}: ${r.error}`));
})();
