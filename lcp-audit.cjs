// LCP + TTFB live measurement on Vercel — run from smart-menu root
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/ahmed/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const results = {};
  for (const [name, url] of Object.entries({
    home: 'https://menu.smart-link.ly/',
    menu: 'https://menu.smart-link.ly/menu/al-waha-cafe',
    pricing: 'https://menu.smart-link.ly/pricing',
  })) {
    const navStart = Date.now();
    let ttfb = null;
    let firstByteAt = 0;
    page.on('response', (r) => {
      if (r.url() === url && !firstByteAt) firstByteAt = Date.now() - navStart;
    });
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    } catch (e) {
      results[name] = { error: String(e).slice(0, 120) };
      continue;
    }
    // wait for LCP (largest contentful paint) via performance observer
    const lcp = await page.evaluate(() => new Promise((resolve) => {
      const t0 = performance.now();
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) resolve(Math.round(last.startTime));
        else resolve(null);
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(null); }, 8000);
    }));
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource')
        .map(r => ({ name: r.name.split('/').pop().slice(0, 40), size: Math.round(r.transferSize / 1024) }))
        .sort((a, b) => b.size - a.size).slice(0, 5);
      return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), resources };
    });
    results[name] = { ttfbMs: firstByteAt, lcpMs: lcp, ...metrics };
    await page.evaluate(() => performance.clearResourceTimings());
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
