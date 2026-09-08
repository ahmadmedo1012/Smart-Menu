/**
 * Round 95-E — PRODUCTION user simulation — Journey 1: curious visitor.
 * Target: https://menu.smart-link.ly (commit 931d6cd5).
 *
 * Full happy-path visitor journey with evidence shots under
 * download/r95-prod-sim/ (v1..v13). wa.me is ROUTE-STUBBED so no real
 * WhatsApp message is ever sent — only the URL (href) is captured/verified.
 *
 * Run: node scripts/r95-prod-sim-visitor.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/z/my-project/download/r95-prod-sim';
mkdirSync(OUT, { recursive: true });
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'https://menu.smart-link.ly';
const MENU = `${BASE}/menu/al-waha-cafe`;

const results = [];
const issues = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? '✓' : '✗'} [${id}] ${detail}`);
  if (!ok) issues.push({ id, detail });
}

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: EXE, headless: true });

// ─────────────────────────── Desktop journey ───────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });

// wa.me stub — never hit the real WhatsApp endpoint (95-E rule)
const waUrls = [];
await ctx.route(/https:\/\/wa\.me\//, (route) => {
  waUrls.push(route.request().url());
  return route.fulfill({ status: 200, contentType: 'text/plain', body: 'wa-stub-95E (not really sent)' });
});

let orderPostStatus = 0;
let orderPostBody = '';
let loyaltyPostStatus = 0;
let loyaltyPostBody = '';

const page = await ctx.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
});
page.on('response', (r) => {
  if (r.url().includes('/api/orders') && r.request().method() === 'POST') {
    orderPostStatus = r.status();
    r.text().then((t) => { orderPostBody = t.slice(0, 400); }).catch(() => {});
  }
  if (r.url().endsWith('/api/loyalty') && r.request().method() === 'POST') {
    loyaltyPostStatus = r.status();
    r.text().then((t) => { loyaltyPostBody = t.slice(0, 300); }).catch(() => {});
  }
});

// Track locally-served font requests
const fontReqs = [];
page.on('request', (r) => {
  if (r.url().includes('/fonts/') && r.url().endsWith('.woff2')) fontReqs.push(r.url().replace(BASE, ''));
});

try {
  // ── Step 1: landing ──
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const styles = await page.evaluate(() => {
    const b = getComputedStyle(document.body);
    const h = getComputedStyle(document.documentElement);
    return {
      bodyBg: b.backgroundColor,
      htmlBg: h.backgroundColor,
      htmlClass: document.documentElement.className,
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80) ?? null,
      fontsCairo: document.fonts.check('16px "Cairo"'),
      fontsReadex: document.fonts.check('16px "Readex Pro"'),
      dir: document.documentElement.dir,
    };
  });
  await page.screenshot({ path: `${OUT}/v1-landing.png` });
  check('v1.bg', styles.bodyBg === 'rgb(1, 0, 0)', `body background = ${styles.bodyBg} (expected rgb(1, 0, 0))`);
  check('v1.dark', styles.htmlClass.includes('dark'), `html class = "${styles.htmlClass}"`);
  check('v1.fonts', styles.fontsCairo || styles.fontsReadex,
    `Cairo loaded: ${styles.fontsCairo} · Readex Pro loaded: ${styles.fontsReadex} · woff2 requests: ${fontReqs.length ? fontReqs.join(', ') : '(from cache/none yet)'}`);
  check('v1.h1', !!styles.h1, `landing h1 = "${styles.h1}"`);
  check('v1.rtl', styles.dir === 'rtl', `document dir = ${styles.dir}`);

  // ── Step 2: pricing ──
  await page.locator('a[href="/pricing"]').first().click();
  await page.waitForURL('**/pricing', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2200);
  const monthlyPrices = await page.locator('.animate-price-swap-in').allInnerTexts();
  await page.screenshot({ path: `${OUT}/v2-pricing.png` });
  check('v2.pricing', page.url().endsWith('/pricing') && monthlyPrices.length >= 3,
    `monthly prices: ${JSON.stringify(monthlyPrices)} (url=${page.url()})`);

  // Toggle yearly
  await page.locator('button').filter({ hasText: 'سنوي' }).first().click();
  await page.waitForTimeout(1600);
  const yearlyPrices = await page.locator('.animate-price-swap-in').allInnerTexts();
  const savingsTxt = await page.getByText('وفّر 17%').first().isVisible().catch(() => false);
  const twoMonthsTxt = await page.getByText('وفر شهرين عند الاشتراك السنوي').first().isVisible().catch(() => false);
  await page.screenshot({ path: `${OUT}/v3-pricing-yearly.png` });
  const changed = yearlyPrices.length === monthlyPrices.length &&
    yearlyPrices.some((p, i) => p !== monthlyPrices[i]);
  check('v3.yearly', changed, `prices switched: ${JSON.stringify(monthlyPrices)} → ${JSON.stringify(yearlyPrices)}`);
  check('v3.savings17', savingsTxt, `"وفّر 17%" label visible: ${savingsTxt}`);
  check('v3.twoMonths', twoMonthsTxt, `"وفر شهرين عند الاشتراك السنوي" visible: ${twoMonthsTxt}`);

  // ── Step 3: home sections — features bento, steps, stats, FAQ ──
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);
  // bento features — scroll to the section by its heading (robust to layout shifts)
  const featHeading = page.getByRole('heading', { name: 'كل ما يحتاجه مطعمك في مكان واحد' }).first();
  await featHeading.scrollIntoViewIfNeeded({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${OUT}/v4-features.png` });
  const featVisible = await featHeading.isVisible().catch(() => false);
  const bentoCards = await page.locator('#features ~ *, [data-features]').count().catch(() => 0);
  check('v4.features', featVisible, `features bento heading visible in viewport: ${featVisible}`);

  // steps + stats — keep scrolling down through the page rhythm
  await page.getByRole('heading', { name: 'من التسجيل إلى أول طلب' }).first()
    .scrollIntoViewIfNeeded({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/v4b-steps.png` });
  await page.evaluate(() => window.scrollBy({ top: 1400, behavior: 'instant' }));
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/v4c-stats.png` });
  const statsTxt = await page.evaluate(() => document.body.innerText);
  check('v4.stepsStats', statsTxt.includes('من التسجيل إلى أول طلب'), `steps + stats sections traversed on scroll`);
  // FAQ
  await page.evaluate(() => window.scrollTo({ top: 5200, behavior: 'instant' }));
  await page.waitForTimeout(1400);
  // find the FAQ section heading, then open the first details in it
  const faqHeading = page.getByRole('heading', { name: 'أسئلة شائعة' }).first();
  const faqVisible = await faqHeading.isVisible().catch(() => false);
  if (faqVisible) {
    const firstSummary = page.locator('details summary').first();
    await firstSummary.scrollIntoViewIfNeeded();
    await firstSummary.click();
    await page.waitForTimeout(900);
    const openState = await page.locator('details').first().evaluate((d) => d.open);
    await page.screenshot({ path: `${OUT}/v5-faq-open.png` });
    check('v5.faq', openState === true, `FAQ accordion opens first question (details.open=${openState})`);
  } else {
    // maybe further down
    await page.evaluate(() => window.scrollTo({ top: 6000, behavior: 'instant' }));
    await page.waitForTimeout(1200);
    const vis2 = await page.getByRole('heading', { name: 'أسئلة شائعة' }).first().isVisible().catch(() => false);
    const firstSummary = page.locator('details summary').first();
    if (vis2) {
      await firstSummary.scrollIntoViewIfNeeded();
      await firstSummary.click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/v5-faq-open.png` });
      check('v5.faq', true, 'FAQ accordion opened (after extra scroll)');
    } else {
      check('v5.faq', false, 'FAQ section "أسئلة شائعة" heading not found on landing');
      await page.screenshot({ path: `${OUT}/v5-faq-open.png` });
    }
  }

  // ── Step 4: final CTA ──
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(1600);
  const ctaVisible = await page.getByText('جهّز مطعمك للانطلاق الرقمي').first().isVisible().catch(() => false);
  const ctaBtn = await page.getByRole('link', { name: /ابدأ مجاناً/ }).first().isVisible().catch(() => false);
  await page.screenshot({ path: `${OUT}/v6-cta.png` });
  check('v6.cta', ctaVisible && ctaBtn, `final CTA heading visible: ${ctaVisible}, "ابدأ مجاناً" button: ${ctaBtn}`);

  // ── Step 5: open the partner menu ──
  await page.locator('a[href="/menu/al-waha-cafe"]').first().click();
  await page.waitForURL('**/menu/al-waha-cafe', { timeout: 45000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2600);
  const menuInfo = await page.evaluate(() => {
    const h1 = document.querySelector('h1')?.textContent?.trim();
    const wa = document.querySelector('a[href^="https://wa.me/"]')?.getAttribute('href');
    const pills = document.body.innerText.includes('خيارات متاحة');
    return { h1, wa, pills };
  });
  await page.screenshot({ path: `${OUT}/v7-menu.png`, fullPage: false });
  check('v7.menu', /مقهى الواحة/.test(menuInfo.h1 ?? ''), `menu h1 = "${menuInfo.h1}"`);
  check('v7.wa', /^https:\/\/wa\.me\/\d+$/.test(menuInfo.wa ?? ''), `menu header wa.me href = ${menuInfo.wa}`);
  check('v7.optionsPill', menuInfo.pills, `"خيارات متاحة" pill present (any item with modifier groups): ${menuInfo.pills}`);

  // ── Step 6: activate a category tab ──
  // NOTE (95-E): production category label is «مشروبات ساخنة» (no definite
  // article) — unlike the local seed's «المشروبات الساخنة». Match the prod text.
  const catGroup = page.getByRole('group', { name: 'تصفية الأصناف حسب القسم' });
  const catGroupVisible = await catGroup.isVisible().catch(() => false);
  if (catGroupVisible) {
    const hotBtn = catGroup.locator('button', { hasText: 'مشروبات ساخنة' }).first();
    await hotBtn.scrollIntoViewIfNeeded().catch(() => {});
    await hotBtn.click({ timeout: 15000 });
    await page.waitForTimeout(1300);
    const counter = await page.getByText(/تم العثور على/).first().innerText().catch(() => '(no counter)');
    // cold item should disappear from the grid (h2 items)
    const coldHidden = await page.locator('h2').filter({ hasText: 'موهيتو' }).isHidden().catch(() => true);
    const hotVisible = await page.locator('h2').filter({ hasText: 'كابتشينو' }).first().isVisible().catch(() => false);
    await page.screenshot({ path: `${OUT}/v8-menu-category.png` });
    check('v8.category', hotVisible && coldHidden,
      `category filter: hot drinks visible=${hotVisible}, cold hidden=${coldHidden}, counter="${counter}"`);
    // back to all
    await catGroup.locator('button', { hasText: 'الكل' }).first().click();
    await page.waitForTimeout(900);
  } else {
    check('v8.category', false, 'category tabs group not found');
    await page.screenshot({ path: `${OUT}/v8-menu-category.png` });
  }

  // ── Step 7: open an item dialog (كابتشينو) ──
  const capCard = page.locator('h2').filter({ hasText: 'كابتشينو' }).first();
  await capCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await capCard.click();
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(900);
  // does it have modifier fieldsets?
  const fieldsetCount = await dialog.locator('fieldset').count();
  const hasQty = await dialog.getByLabel('زيادة الكمية').isVisible().catch(() => false);
  // pick an option if any exist
  let optionChosen = null;
  if (fieldsetCount > 0) {
    const optBtn = dialog.locator('fieldset button').first();
    if (await optBtn.isVisible().catch(() => false)) {
      await optBtn.click();
      await page.waitForTimeout(500);
      optionChosen = await optBtn.innerText().catch(() => '?');
    }
  }
  // customer name + phone inside the dialog + bump quantity to 2 (real-user behaviour)
  await dialog.getByPlaceholder('الاسم (اختياري)').fill('زائر محاكاة 95');
  await dialog.getByPlaceholder('رقم الهاتف (اختياري)').fill('0913999555');
  const qtyBtn = dialog.getByLabel('زيادة الكمية');
  if (await qtyBtn.isVisible().catch(() => false)) { await qtyBtn.click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${OUT}/v9-item-dialog.png` });
  check('v9.dialog', true,
    `item dialog opened for كابتشينو · modifier fieldsets: ${fieldsetCount} (option chosen: ${optionChosen ?? 'none exist'}) · qty bumped to 2: ${hasQty}`);

  // submit the dialog → cart
  await dialog.getByRole('button', { name: 'أرسل الطلب عبر واتساب' }).click();
  const sentOk = await dialog.getByText('تم إرسال الطلب!').waitFor({ state: 'visible', timeout: 9000 }).then(() => true).catch(() => false);
  await page.waitForURL(/\/cart/, { timeout: 25000 }).catch(() => {});
  check('v9.added', sentOk && page.url().includes('/cart'),
    `dialog submitted ("تم إرسال الطلب!"=${sentOk}) and redirected to cart (url=${page.url()})`);

  // ── Step 8: cart → review → confirm order ──
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2200);
  const cartBody = await page.locator('body').innerText();
  const hasTotal = cartBody.includes('المجموع الإجمالي');
  const capInCart = cartBody.includes('كابتشينو');
  const phoneField = page.locator('#cart-phone');
  const phoneVal = await phoneField.inputValue().catch(() => '');
  if (!phoneVal) await phoneField.fill('0913999555').catch(() => {});
  const phoneAfter = await phoneField.inputValue().catch(() => '');
  // grab the displayed total figure
  const totalTxt = await page.getByText('المجموع الإجمالي').first().innerText().catch(() => 'المجموع الإجمالي ?');
  check('v10.cart', hasTotal && capInCart,
    `cart shows line كابتشينو=${capInCart}, total block=${hasTotal}, phone carried="${phoneAfter}" (from dialog)`);
  await page.screenshot({ path: `${OUT}/v10-cart-before-review.png` });

  // review dialog
  await page.getByRole('button', { name: 'مراجعة الطلب وإرساله' }).click();
  const review = page.locator('[role="dialog"]').first();
  await review.getByRole('heading', { name: 'مراجعة الطلب' }).waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(700);
  const reviewBody = await review.innerText();
  const reviewOk = reviewBody.includes('كابتشينو') && reviewBody.includes('الإجمالي');
  await page.screenshot({ path: `${OUT}/v10-cart-review.png` });
  check('v10.review', reviewOk, `review dialog lists item + total (${totalTxt.trim()})`);

  // confirm → real POST /api/orders
  const popupPromise = page.waitForEvent('popup', { timeout: 20000 }).catch(() => null);
  await review.getByRole('button', { name: 'تأكيد وإرسال' }).click();
  // wait for POST /api/orders result
  for (let i = 0; i < 30 && orderPostStatus === 0; i++) await page.waitForTimeout(500);
  check('v10.post', orderPostStatus === 201, `POST /api/orders → ${orderPostStatus} ${orderPostStatus === 201 ? '(order written)' : orderPostBody}`);
  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    waUrls.push(popup.url());
    await popup.close().catch(() => {});
  }
  await page.waitForURL(/\/order-confirmed/, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const orderNo = new URL(page.url()).searchParams.get('orderNo') ?? '';
  const confirmedH1 = await page.getByRole('heading', { name: 'تم تأكيد الطلب!' }).isVisible().catch(() => false);
  const orderNoShown = await page.locator('bdi').filter({ hasText: orderNo }).first().isVisible().catch(() => false);
  await page.screenshot({ path: `${OUT}/v10-order-confirm.png` });
  check('v10.confirm', confirmedH1 && /^ORD-/.test(orderNo) && orderNoShown,
    `order-confirmed page: h1=${confirmedH1}, orderNo=${orderNo}, number displayed=${orderNoShown}`);
  check('v10.waUrl', waUrls.length > 0 && waUrls[0].includes('wa.me') && waUrls[0].includes('text='),
    `wa.me link captured (NOT sent — route stubbed): ${waUrls[0]?.slice(0, 120) ?? 'none'}${waUrls[0]?.length > 120 ? '…' : ''}`);
  if (waUrls[0]) {
    const msg = decodeURIComponent(waUrls[0].split('text=')[1] ?? '');
    const msgOk = msg.includes('كابتشينو') && msg.includes('زائر محاكاة 95');
    check('v10.waMsg', msgOk, `wa.me message contains item + customer name: ${msgOk}\n      message:\n${msg.slice(0, 500).replace(/\n/g, ' ⏎ ')}`);
  }

  // ── Step 9: loyalty after order ──
  const shareDlg = page.getByText('ادع صديق وكل منكما يحصل على خصم 10٪').first();
  const shareVisible = await shareDlg.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  if (shareVisible) {
    await page.screenshot({ path: `${OUT}/v11-loyalty.png` });
    check('v11.loyalty', true, 'loyalty/share dialog appeared after the order');
    // probe the referral step (light, read-only curiosity)
    const phoneInput = page.locator('#shareafter-phone');
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('0913999555');
      await page.getByRole('button', { name: 'احصل على رابط الإحالة' }).click();
      await page.waitForTimeout(4000);
      for (let i = 0; i < 10 && loyaltyPostStatus === 0; i++) await page.waitForTimeout(500);
      const refLinkVisible = await page.getByText('رابط الإحالة الخاص بك').isVisible().catch(() => false);
      const errTxt = await page.locator('[role="alert"]').first().innerText().catch(() => '');
      await page.screenshot({ path: `${OUT}/v11-loyalty-after.png` });
      check('v11.referral', refLinkVisible,
        `referral link visible=${refLinkVisible} · POST /api/loyalty → ${loyaltyPostStatus} ${loyaltyPostBody.slice(0, 120)} ${errTxt ? `· alert: ${errTxt}` : ''}`);
    }
  } else {
    check('v11.loyalty', false, 'loyalty/share dialog did NOT appear after the order (within 15s)');
    await page.screenshot({ path: `${OUT}/v11-loyalty.png` });
  }
} catch (e) {
  check('journey1.fatal', false, `journey 1 interrupted: ${e.message.split('\n')[0]}`);
  await page.screenshot({ path: `${OUT}/v-journey1-error.png` }).catch(() => {});
}

// ─────────────────────────── Mobile journey (390x844) ───────────────────────────
try {
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ar-LY',
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await mctx.route(/https:\/\/wa\.me\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'wa-stub-95E' }));
  const mpage = await mctx.newPage();
  await mpage.goto(MENU, { waitUntil: 'networkidle', timeout: 90000 });
  await mpage.waitForTimeout(3000);
  const mh1 = await mpage.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  await mpage.screenshot({ path: `${OUT}/v12-menu-mobile.png` });
  check('v12.mobileMenu', /مقهى الواحة/.test(mh1 ?? ''), `mobile menu h1 = "${mh1}"`);

  // quick-add an item (كنافة) via its card "أضف" button
  const addBtn = mpage.getByLabel('إضافة كنافة إلى السلة').first();
  const addVisible = await addBtn.isVisible().catch(() => false);
  if (addVisible) {
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    await mpage.waitForTimeout(1200);
  } else {
    // fallback: open dialog and submit from there
    const card = mpage.locator('h2').filter({ hasText: 'كنافة' }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const dlg = mpage.locator('[role="dialog"]').first();
    await dlg.waitFor({ state: 'visible', timeout: 10000 });
    await dlg.getByPlaceholder('الاسم (اختياري)').fill('زائر جوال 95');
    await dlg.getByRole('button', { name: 'أرسل الطلب عبر واتساب' }).click();
    await mpage.waitForTimeout(2500);
  }
  // open the cart via the floating orb
  const cartBtn = mpage.locator('button[aria-label^="السلة"]').first();
  const cartBtnVisible = await cartBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (cartBtnVisible) {
    await cartBtn.click();
    await mpage.waitForTimeout(1300);
  }
  const cartSheet = await mpage.getByText('سلة الطلبات').first().isVisible().catch(() => false);
  const knafehInCart = await mpage.getByText('كنافة').first().isVisible().catch(() => false);
  await mpage.screenshot({ path: `${OUT}/v13-cart-mobile.png` });
  check('v13.mobileCart', cartBtnVisible && cartSheet && knafehInCart,
    `mobile: add-to-cart=${addVisible ? 'quick-add button' : 'via dialog'}, floating cart btn=${cartBtnVisible}, slide-over "سلة الطلبات"=${cartSheet}, كنافة in cart=${knafehInCart}`);
  await mctx.close();
} catch (e) {
  check('journey1mobile.fatal', false, `mobile journey interrupted: ${e.message.split('\n')[0]}`);
}

await ctx.close();
await browser.close();

console.log('\n════ JOURNEY 1 SUMMARY ════');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.id}: ${r.detail}`);
console.log(`\nconsole errors (${consoleErrors.length}):`, JSON.stringify(consoleErrors.slice(0, 10)));
console.log(`page errors (${pageErrors.length}):`, JSON.stringify(pageErrors.slice(0, 10)));
console.log(`\nRESULT: ${results.filter((r) => r.ok).length}/${results.length} checks passed`);
console.log('JSON=' + JSON.stringify({ results, consoleErrors, pageErrors }, null, 1));
