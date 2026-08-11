const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleMsgs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));

  const t0 = Date.now();
  await page.goto('https://menu.smart-link.ly', { waitUntil: 'networkidle', timeout: 60000 });
  const loadTime = Date.now() - t0;

  // Wait for fonts/lottie
  await page.waitForTimeout(3000);

  const out = { url: page.url(), title: await page.title(), loadTimeMs: loadTime };

  // --- Full text dump by scrolling ---
  const fullText = await page.evaluate(async () => {
    const texts = [];
    const prev = [];
    let scrollY = 0;
    const step = 700;
    const max = 20000;
    while (scrollY < max) {
      window.scrollTo(0, scrollY);
      await new Promise(r => setTimeout(r, 300));
      const h = document.body.scrollHeight;
      // collect section-ish headings and text
      const s = document.querySelector('main') || document.body;
      const lines = [];
      s.querySelectorAll('h1,h2,h3,h4,p,li,button,a,span,strong').forEach(el => {
        const t = (el.innerText || '').trim();
        if (t && t.length > 1) lines.push(t);
      });
      const key = lines.join('|');
      if (!prev.includes(key)) prev.push(key);
      if (scrollY + step >= h) { scrollY = h; break; }
      scrollY += step;
    }
    return prev;
  });
  out.textChunks = fullText;

  // --- Interactive elements with sizes ---
  out.interactive = await page.evaluate(() => {
    const res = [];
    document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="tab"],[role="accordion"]').forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const t = (el.innerText || el.getAttribute('aria-label') || el.value || el.placeholder || '').trim().slice(0, 80);
      if (r.width === 0 && r.height === 0) return;
      res.push({
        tag: el.tagName, text: t, w: Math.round(r.width), h: Math.round(r.height),
        href: el.getAttribute('href') || '', visible: style.display !== 'none' && style.visibility !== 'hidden',
        atTop: Math.round(r.top)
      });
    });
    return res;
  });

  // --- FAQ behavior ---
  out.faq = await page.evaluate(async () => {
    const res = { found: false, items: [] };
    const h2s = [...document.querySelectorAll('h2')].map(e => e.innerText.trim());
    const faqIdx = h2s.findIndex(t => /أسئلة|FAQ|شائعة/.test(t));
    if (faqIdx === -1) { res.note = 'no FAQ heading found. h2s: ' + h2s.join(' | '); return res; }
    res.found = true;
    // find accordion container after the h2
    const h2 = [...document.querySelectorAll('h2')][faqIdx];
    let container = h2.parentElement;
    for (let i = 0; i < 4 && container; i++) {
      if (container.querySelectorAll('button').length > 2) break;
      container = container.parentElement;
    }
    const btns = container ? [...container.querySelectorAll('button')] : [];
    const qs = btns.map(b => (b.innerText || '').trim()).filter(Boolean);
    res.items = qs.map(q => ({ q, opened: false, answerLen: 0 }));
    // click first item
    if (btns.length) {
      const before = document.body.scrollHeight;
      await btns[0].click();
      await new Promise(r => setTimeout(r, 500));
      const after = document.body.scrollHeight;
      res.items[0].opened = after !== before;
      res.items[0].answerLen = await (async () => {
        // find newly visible text near button
        const parent = btns[0].parentElement;
        const t = (parent.innerText || '').trim();
        return t.length;
      })();
      // click again to collapse
      const h1 = document.body.scrollHeight;
      await btns[0].click();
      await new Promise(r => setTimeout(r, 500));
      res.items[0].collapsed = document.body.scrollHeight === h1;
      res.items[0].ariaExpanded = btns[0].getAttribute('aria-expanded');
    }
    return res;
  });

  // --- Sticky header + back-to-top check ---
  out.header = await page.evaluate(async () => {
    const res = {};
    const header = document.querySelector('header');
    if (!header) { res.none = true; return res; }
    res.initialPos = getComputedStyle(header).position;
    res.initialTop = header.getBoundingClientRect().top;
    window.scrollTo(0, 1200);
    await new Promise(r => setTimeout(r, 500));
    res.afterScrollTop = header.getBoundingClientRect().top;
    res.sticky = res.afterScrollTop === 0;
    // back to top
    const btt = [...document.querySelectorAll('a,button')].filter(e => /الأعلى|أعلى الصفحة|^top|up/i.test((e.innerText||'') + (e.getAttribute('aria-label')||'')));
    res.backToTop = btt.map(e => e.outerHTML.slice(0, 200));
    window.scrollTo(0, 0);
    return res;
  });

  // --- Images / Lottie / loading ---
  out.media = await page.evaluate(() => {
    return {
      imgs: [...document.querySelectorAll('img')].map(i => ({ src: (i.src||'').slice(0,80), alt: i.alt, w: i.naturalWidth })),
      lottie: !!document.querySelector('lottie-player, [data-lottie]'),
      lcp: (() => {
        const imgs = [...document.querySelectorAll('img')].map(i => i.src);
        return imgs.slice(0, 3);
      })()
    };
  });

  // --- Footer links ---
  out.footer = await page.evaluate(() => {
    const f = document.querySelector('footer');
    if (!f) return { none: true };
    const links = [...f.querySelectorAll('a')].map(a => ({ t: (a.innerText||'').trim(), href: a.href }));
    const socials = [...f.querySelectorAll('a')].filter(a => /whatsapp|instagram|facebook|twitter|x\.com|tiktok|snapchat|wa\.me|wa\.link/i.test(a.href)).map(a => a.href);
    return { text: (f.innerText||'').slice(0, 2000), links, socials };
  });

  // --- LCP estimate & hero ---
  out.hero = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const hero = h1 ? h1.closest('section') || h1.parentElement : null;
    return {
      h1: h1 ? h1.innerText : null,
      heroText: hero ? (hero.innerText||'').slice(0, 600) : null,
      h1FontSize: h1 ? getComputedStyle(h1).fontSize : null
    };
  });

  out.console = consoleMsgs.slice(0, 30);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
