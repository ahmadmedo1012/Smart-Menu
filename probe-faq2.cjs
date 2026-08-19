/* probe-faq2.cjs — deeper dump of FAQ items (any tag > 24px) */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto('https://menu.smart-link.ly/?v=' + Math.random().toString(36).slice(2, 12), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const sec = Array.from(document.querySelectorAll('section'))
      .find((s) => Array.from(s.querySelectorAll('h2')).some((h) => h.textContent.includes('أسئلة')));
    if (!sec) return { found: false };
    sec.scrollIntoView({ block: 'center', behavior: 'instant' });
    const els = Array.from(sec.querySelectorAll('*')).filter((d) => {
      const r = d.getBoundingClientRect();
      return r.width > 200 && r.height > 24;
    });
    return {
      found: true,
      els: els.slice(0, 60).map((d) => {
        const cs = getComputedStyle(d);
        const r = d.getBoundingClientRect();
        return {
          tag: d.tagName,
          cls: (d.className || '').toString().slice(0, 130),
          w: Math.round(r.width), h: Math.round(r.height),
          bg: cs.backgroundColor.slice(0, 50),
          shadow: cs.boxShadow.slice(0, 140),
        };
      }),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });