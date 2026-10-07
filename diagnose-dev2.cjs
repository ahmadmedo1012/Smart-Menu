// Diagnostic: identify axe color-contrast violations on the public menu (light, 375px)
// + React #418 hydration errors per key page.
const { chromium } = require('playwright');
const { readFileSync } = require('fs');
const { join } = require('path');
const AXE_SRC = readFileSync(join(__dirname, 'node_modules/axe-core/axe.min.js'), 'utf8');

const BASE = 'http://localhost:3001';
// from qa-seed: testmulti1568/testpass123 owns restaurants; the demo menu slug:
const MENU = process.env.MENU_SLUG || 'waha-cafe';

async function scanAxe() {
  const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
  return (r.violations[0] ? r.violations[0].nodes : []).map((n) => ({ target: n.target, html: n.html, failureSummary: n.failureSummary }));
}

(async () => {
  const browser = await chromium.launch();

  // ── 1. axe color-contrast on the public menu, LIGHT, 375px ──
  const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, colorScheme: 'light' });
  await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch {} });
  const page = await ctx.newPage();
  const url = `${BASE}/menu/${MENU}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const themeClass = await page.evaluate(() => document.documentElement.className);
  console.log('html class:', JSON.stringify(themeClass));
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { warning: cs.getPropertyValue('--warning').trim(), yellowInk: cs.getPropertyValue('--c-yellow-ink').trim(), yellowDeep: cs.getPropertyValue('--c-yellow-deep').trim() };
  });
  console.log('computed tokens:', JSON.stringify(tokens));
  await page.addScriptTag({ content: AXE_SRC });
  const axe = await page.evaluate(`(${scanAxe})()`);
  console.log('axe color-contrast on', url, '(light/375px)');
  for (const n of axe) {
    console.log('  FAIL target:', JSON.stringify(n.target), '| html:', String(n.html).slice(0, 120));
    console.log('       summary:', String(n.failureSummary).split('\n').slice(0, 3).join(' | ').slice(0, 220));
  }
  if (!axe.length) console.log('  clean');
  await ctx.close();

  // ── 2. React #418 hunt: per-page console errors ──
  const pages = ['/cart'];
  for (const p of pages) {
    const c2 = await browser.newContext({ viewport: { width: 375, height: 700 } });
    const pg = await c2.newPage();
    const errors = [];
    pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 2200)); });
    pg.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e && e.message || e).slice(0, 2200)));
    await pg.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(6000);
    const real = errors.filter((e) => !e.includes('AbortError') && !e.includes('favicon'));
    console.log(p.padEnd(28), real.length ? '✗ ' + JSON.stringify(real.slice(0, 2)) : '✓ clean');
    await c2.close();
  }
  await browser.close();
})();
