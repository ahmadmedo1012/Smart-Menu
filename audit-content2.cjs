const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('https://menu.smart-link.ly', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const out = {};

  // --- 1. FAQ real section ---
  out.faq = await page.evaluate(async () => {
    const h2 = [...document.querySelectorAll('h2')].find(e => /أسئلة شائعة/.test(e.innerText));
    if (!h2) return { notFound: true };
    let sec = h2;
    for (let i = 0; i < 6 && sec; i++) { if (sec.tagName === 'SECTION') break; sec = sec.parentElement; }
    const res = { h2: h2.innerText.trim(), sub: (h2.parentElement.innerText || '').replace(h2.innerText, '').trim().slice(0, 200), items: [] };
    const btns = [...sec.querySelectorAll('button')].filter(b => (b.innerText||'').trim().length > 3 && !/السابق|التالي/.test(b.innerText));
    for (const b of btns) {
      const q = (b.innerText || '').trim();
      const before = document.body.scrollHeight;
      b.click();
      await new Promise(r => setTimeout(r, 600));
      // answer = text added in the item container after click
      let item = b.closest('div');
      for (let i = 0; i < 5 && item; i++) { if ((item.innerText||'').length > q.length + 40) break; item = item.parentElement; }
      const full = (item ? item.innerText : '').trim();
      const answer = full.replace(q, '').trim();
      res.items.push({
        q,
        ariaExpanded: b.getAttribute('aria-expanded'),
        answer: answer.slice(0, 400),
        answerLen: answer.length,
        btnH: Math.round(b.getBoundingClientRect().height),
        btnW: Math.round(b.getBoundingClientRect().width)
      });
      b.click(); // collapse
      await new Promise(r => setTimeout(r, 400));
    }
    res.itemCount = btns.length;
    return res;
  });

  // --- 2. Tap targets < 44px (visible, on-screen) ---
  out.smallTargets = await page.evaluate(() => {
    const bad = [];
    const seen = new Set();
    document.querySelectorAll('a,button,[role="button"]').forEach(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0) return;
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const key = el.tagName + (el.innerText||'').slice(0,20) + el.getAttribute('href') + Math.round(r.width) + 'x' + Math.round(r.height);
      if (seen.has(key)) return; seen.add(key);
      if (r.width < 44 || r.height < 44) {
        bad.push({ tag: el.tagName, text: (el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,40), w: Math.round(r.width), h: Math.round(r.height), href: (el.getAttribute('href')||'').slice(0,50) });
      }
    });
    return bad;
  });

  // --- 3. Footer services links: real <a> or dead? ---
  out.footerServices = await page.evaluate(() => {
    const f = document.querySelector('footer');
    const services = [...f.querySelectorAll('a')].filter(a => /منيو إلكتروني|طلب عبر واتساب|برنامج ولاء|إحصائيات|QR/.test(a.innerText));
    return services.map(a => ({ t: a.innerText.trim(), href: a.getAttribute('href') }));
  });

  // --- 4. stray "م" char search ---
  out.stray = await page.evaluate(() => {
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while (n = walker.nextNode()) {
      const t = n.textContent;
      if (t && t.trim() === 'م') {
        const p = n.parentElement;
        found.push({ parent: p ? p.tagName : null, cls: p ? p.className.toString().slice(0, 80) : null, ctx: (p && p.parentElement ? p.parentElement.innerText : '').slice(0, 60) });
      }
    }
    return found;
  });

  // --- 5. stats section numbers ---
  out.stats = await page.evaluate(() => {
    const h2s = [...document.querySelectorAll('h2')];
    // stats are after "المنيو الذكي في العمل"
    const all = [...document.querySelectorAll('section')].map(s => (s.innerText||'').slice(0, 120));
    const statsSec = [...document.querySelectorAll('section')].find(s => /136\+/.test(s.innerText) && /355\+/.test(s.innerText));
    return statsSec ? statsSec.innerText.slice(0, 300) : null;
  });

  // --- 6. back-to-top behavior ---
  out.btt = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('button')].find(b => /العودة للأعلى/.test(b.innerText));
    const res = { exists: !!btn };
    if (!btn) return res;
    res.initialVisible = btn.getBoundingClientRect().top > 0 && getComputedStyle(btn).visibility !== 'hidden';
    window.scrollTo(0, 300);
    await new Promise(r => setTimeout(r, 400));
    res.after300 = btn.getBoundingClientRect().top;
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
    res.afterTop = btn.getBoundingClientRect().top;
    // click test
    window.scrollTo(0, 3000);
    await new Promise(r => setTimeout(r, 400));
    const yBefore = window.scrollY;
    btn.click();
    await new Promise(r => setTimeout(r, 900));
    res.scrolledToTop = window.scrollY < 50;
    res.yBefore = yBefore;
    return res;
  });

  // --- 7. section order ---
  out.sectionOrder = await page.evaluate(() => {
    return [...document.querySelectorAll('main section, main div')]
      .filter(s => {
        const h = s.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > p');
        return h && s.querySelectorAll('h2').length <= 1 && (s.innerText || '').length < 600;
      })
      .map(s => {
        const h = s.querySelector('h1,h2,h3');
        return { tag: s.tagName, h: h ? h.innerText.trim().slice(0, 50) : null, first: (s.innerText || '').trim().slice(0, 60) };
      }).filter(x => x.h).slice(0, 30);
  });

  // --- 8. screenshots ---
  await page.screenshot({ path: '/tmp/audit-hero.png' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  // FAQ section screenshot
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(e => /أسئلة شائعة/.test(e.innerText));
    if (h2) h2.scrollIntoView();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/audit-faq.png' });

  // hero visual via vision tool instead; but capture hero region
  out.hero = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return { h1: h1.innerText, fontSize: getComputedStyle(h1).fontSize, lineHeight: getComputedStyle(h1).lineHeight };
  });

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
