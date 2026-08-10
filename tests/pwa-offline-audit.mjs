import { chromium } from '@playwright/test';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();

  const results = [];
  const safeEval = async (p, fn, label) => {
    try { return await p.evaluate(fn); }
    catch (e) { return `EVAL_ERR:${e.message.slice(0, 80)}`; }
  };

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  results.push(['SW_STATE_ONLINE', JSON.stringify(await safeEval(page, async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { registered: false };
    let cachedUrls = [];
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      cachedUrls = cachedUrls.concat((await c.keys()).map((r) => new URL(r.url).pathname));
    }
    return {
      registered: true, scope: reg.scope, active: !!reg.active,
      controller: !!navigator.serviceWorker.controller,
      cacheNames: await caches.keys(), cachedUrls: [...new Set(cachedUrls)],
    };
  }, 'sw'))]);

  results.push(['INSTALL_PROMPT', JSON.stringify(await safeEval(page, () => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('تثبيت'));
    return { buttonVisible: !!btn, buttonText: btn ? btn.textContent : null };
  }, 'prompt'))]);

  const page2 = await context.newPage();
  await context.setOffline(true);
  try {
    await page2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);
    const t = await page2.title();
    const h1 = await safeEval(page2, () => document.querySelector('h1')?.textContent?.slice(0, 60) ?? null, 'h1');
    const bodyLen = await safeEval(page2, () => document.body.innerHTML.length, 'blen');
    results.push(['OFFLINE_ROOT', `title=${t} h1=${h1} bodyLen=${bodyLen}`]);
  } catch (e) {
    results.push(['OFFLINE_ROOT', `NAV_FAIL ${e.message.slice(0, 150)}`]);
  }

  try {
    await page2.goto('http://localhost:3000/menu/test-slug-xyz', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(1500);
    const t = await page2.title();
    const h1 = await safeEval(page2, () => document.querySelector('h1')?.textContent?.slice(0, 60) ?? null, 'h1d');
    const url = page2.url();
    results.push(['OFFLINE_DYNAMIC', `url=${url} title=${t} h1=${h1}`]);
  } catch (e) {
    results.push(['OFFLINE_DYNAMIC', `NAV_FAIL ${e.message.slice(0, 150)}`]);
  }

  results.push(['OFFLINE_ASSETS', JSON.stringify(await safeEval(page2, async () => {
    const out = {};
    for (const p of ['/icon-512.png', '/offline.html', '/manifest.json']) {
      try { const r = await fetch(p); out[p] = r.status; }
      catch { out[p] = 'FETCH_ERR'; }
    }
    try {
      const r = await fetch('/_next/static/chunks/app/layout.js');
      out['/layout.js'] = r.status;
    } catch { out['/layout.js'] = 'FETCH_ERR'; }
    return out;
  }, 'assets'))]);

  await context.setOffline(false);
  try {
    await page2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2500);
  } catch {}
  results.push(['SW_AFTER_RECONNECT', JSON.stringify(await safeEval(page2, async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? { scope: reg.scope, active: !!reg.active, controller: !!navigator.serviceWorker.controller } : null;
  }, 'sw2'))]);

  for (const [k, v] of results) console.log(`RESULT ${k}: ${v}`);
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
