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

async function checkOverflow(browser, route, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h });
  try {
    // Navigate and wait for either domcontentloaded or a subsequent navigation to finish
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for any client-side navigation to settle (auth redirects, etc.)
    // poll until page is stable: same URL for 1.5s and document.readyState === 'complete'
    let stable = false;
    for (let i = 0; i < 30; i++) {  // up to 30s
      await new Promise(r => setTimeout(r, 1000));
      const state = await page.evaluate(() => document.readyState).catch(() => 'detached');
      if (state === 'detached') {
        // page navigated — wait for new page to load
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        continue;
      }
      if (state === 'complete') {
        stable = true;
        break;
      }
    }

    if (!stable) {
      // fallback: just wait a bit more
      await new Promise(r => setTimeout(r, 2000));
    }

    const fin = page.url();
    const metrics = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      sh: document.documentElement.scrollHeight,
    })).catch(() => ({ sw: 0, iw: 0, sh: 0 }));

    const bad = metrics.sw > metrics.iw + 1;
    const status = bad ? 'FAIL' : metrics.sw === 0 ? 'ERROR' : 'PASS';
    const sfx = route === '/' ? 'home' : route.replace(/^\//, '');
    const sp = `${DIR}/${sfx}-${vp.label}.png`;
    await page.screenshot({ path: sp }).catch(() => {});
    console.log(`${status}: ${route} @ ${vp.label} — ${bad ? `OVERFLOW sw=${metrics.sw} > iw=${metrics.iw}` : `clean sw=${metrics.sw} iw=${metrics.iw}`} | sh=${metrics.sh} | final=${fin}`);
    return { route, vp: vp.label, status, sw: metrics.sw, iw: metrics.iw, sh: metrics.sh, sp, fin };
  } catch (e) {
    console.error(`ERROR: ${route} @ ${vp.label}: ${e.message}`);
    return { route, vp: vp.label, status: 'ERROR', error: e.message };
  } finally {
    await page.close().catch(() => {});
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VPS) {
      results.push(await checkOverflow(browser, route, vp));
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
  console.log('Screenshots in:', DIR);
  console.log('ls output:', require('child_process').execSync(`ls ${DIR}`).toString().trim());
})();
