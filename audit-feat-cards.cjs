/* audit-feat-cards.cjs v3 — FINAL: Features cards = divs w/ rounded-[20px]; FAQ items = DETAILS w/ shadow-sm */
const { chromium } = require('playwright');

function visibleShadowLayers(full) {
  if (!full || full === 'none') return [];
  const layers = full.split(/,\s*(?=rgba|oklab|lab|rgb|hsl|#|inset|0px|var)/).map((s) => s.trim()).filter(Boolean);
  return layers.filter((l) => !l.startsWith('rgba(0, 0, 0, 0)') && !l.startsWith('rgb(0 0 0 / 0)') && l !== '0 0 #0000' && l !== '0 0 rgb(0 0 0 / 0)');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const url = 'https://menu.smart-link.ly/?v=' + Math.random().toString(36).slice(2, 12);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => console.log('goto warn:', e.message.split('\n')[0]));
  await page.waitForTimeout(4000);

  const findSection = async (h2Text) => await page.evaluate((t) => {
    const sec = Array.from(document.querySelectorAll('section'))
      .find((s) => Array.from(s.querySelectorAll('h2')).some((h) => h.textContent.includes(t)));
    if (!sec) return { found: false };
    sec.scrollIntoView({ block: 'center', behavior: 'instant' });
    const h2 = Array.from(sec.querySelectorAll('h2')).find((h) => h.textContent.includes(t));
    return { found: true, h2: h2.textContent.trim().slice(0, 60) };
  }, h2Text);

  const currentSectionCards = async (selector) => await page.evaluate((sel) => {
    const sec = Array.from(document.querySelectorAll('section')).find((s) => {
      const r = s.getBoundingClientRect();
      return r.top < 500 && r.bottom > 400 && r.width > 100;
    }) || Array.from(document.querySelectorAll('section')).pop();
    const cands = Array.from(sec.querySelectorAll(sel)).filter((d) => {
      const cls = d.className && d.className.toString();
      if (!cls) return false;
      const r = d.getBoundingClientRect();
      if (r.width < 200 || r.height < 45) return false;
      const bg = getComputedStyle(d).backgroundColor;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });
    return cands.map((c) => {
      const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect();
      return { tag: c.tagName, cls: (c.className || '').toString().slice(0, 160), shadow: cs.boxShadow, bg: cs.backgroundColor.slice(0, 50), w: Math.round(r.width), h: Math.round(r.height) };
    });
  }, selector);

  // Features
  const featSec = await findSection('ميزات');
  await page.waitForTimeout(1500);
  const featCards = featSec.found ? await currentSectionCards('div.rounded-\\[20px\\]') : [];

  // FAQ
  const faqSec = await findSection('أسئلة');
  await page.waitForTimeout(1500);
  const faqCards = faqSec.found ? await currentSectionCards('details') : [];

  // alt sections
  const altSections = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section')).map((s) => {
      const h2 = s.querySelector('h2');
      return { bg: getComputedStyle(s).backgroundColor.slice(0, 90), h2: h2 ? h2.textContent.trim().slice(0, 60) : null };
    }).filter((x) => x.bg.includes('0.93') || x.bg.includes('0.929'))
  );

  // Verdicts
  const featOk = featCards.length > 0 && featCards.every((c) => visibleShadowLayers(c.shadow).length > 0);
  const isSm = (l) => l.includes('rgba(0, 0, 0, 0.1)') && /\dpx \dpx \dpx/.test(l);
  const faqOk = faqCards.length > 0 && faqCards.every((c) => {
    const vis = visibleShadowLayers(c.shadow);
    return vis.length > 0 && vis.every(isSm);
  });
  const altOk = altSections.length >= 1 && altSections.every((x) => x.bg.includes('0.93') || x.bg.includes('0.929'));

  console.log('RESULT: ' + (featOk && faqOk && altOk ? 'PASS' : 'FAIL'));
  console.log(JSON.stringify({
    url,
    checks: {
      features_card_visible_shadow: { pass: featOk, cards: featCards.length },
      faq_card_shadow_sm: { pass: faqOk, cards: faqCards.length },
      alt_section_bg_oklab_093_060: { pass: altOk, sections: altSections.length },
    },
    features_section: { found: featSec.found, h2: featSec.h2, cards: featCards },
    faq_section: { found: faqSec.found, h2: faqSec.h2, cards: faqCards },
    alt_sections: altSections,
  }, null, 2));
  await browser.close();
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });