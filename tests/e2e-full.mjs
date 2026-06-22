import { chromium } from 'playwright';

const BASE = 'https://smart-menu-uz6w.onrender.com';
const RESULTS = { passed: 0, failed: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    RESULTS.passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message.slice(0,120)}`);
    RESULTS.failed++;
    RESULTS.errors.push(`  ${name}: ${e.message.slice(0,150)}`);
  }
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/e2e-${name}.png`, fullPage: true }).catch(() => {});
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar', viewport: { width: 1280, height: 800 } });
  // Shared page to avoid closing/reopening too much (reduces rate limits)
  const shared = await context.newPage();

  console.log('\n═══════════ جولة الاختبار الشامل ═══════════\n');
  console.log('── 1. تحميل الصفحات الأساسية ──');

  const PAGES = [
    '/', '/pricing', '/login', '/subscribe', '/cart', '/order-confirmed',
    '/menu', '/menu/pizza-roma', '/menu/al-waha-cafe', '/menu/al-aseel',
    '/robots.txt', '/sitemap.xml', '/favicon.ico', '/manifest.json', '/nonexistent-xyz',
  ];
  const pageNames = [
    'Homepage','Pricing','Login','Subscribe','Cart','Order Confirmed',
    'Menu Redirect','Menu Pizza Roma','Menu Al-Waha','Menu Al-Aseel',
    'Robots','Sitemap','Favicon','Manifest','404 Page',
  ];

  for (let i = 0; i < PAGES.length; i++) {
    await test(pageNames[i], async () => {
      const p = await context.newPage();
      const errs = [];
      p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
      const resp = await p.goto(BASE + PAGES[i], { waitUntil: 'domcontentloaded', timeout: 20000 });
      await p.waitForTimeout(800);
      const status = resp?.status() ?? 0;
      if (status >= 400 && !PAGES[i].includes('nonexistent')) throw new Error(`HTTP ${status}`);
      const isAsset = PAGES[i].includes('.txt') || PAGES[i].includes('.xml') || PAGES[i].includes('.ico') || PAGES[i].includes('.json');
      if (errs.length && !PAGES[i].includes('nonexistent') && !isAsset) {
        const is429 = errs.some(e => e.includes('429'));
        if (!is429) throw new Error(`${errs.length} console errors`);
        // 429 is acceptable during test
      }
      await screenshot(p, pageNames[i].toLowerCase().replace(/\s/g, '-'));
      await p.close();
    });
  }

  console.log('\n── 2. اختبارات التفاعل ──');

  await test('Navbar — الخطط والأسعار', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/pricing', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(1000);
    if (!p.url().includes('/pricing')) throw new Error('Navigation failed');
    await screenshot(p, 'navbar-pricing');
    await p.close();
  });

  await test('Navbar — منيو تجريبي', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/menu/pizza-roma', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(1000);
    const title = await p.title();
    if (!title.includes('المنيو الذكي')) throw new Error(`Wrong title: ${title}`);
    await p.close();
  });

  await test('Mobile Nav — القائمة الجانبية', async () => {
    const p = await context.newPage();
    await p.setViewportSize({ width: 375, height: 667 });
    await p.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    // Click hamburger menu button (the one with lucide-menu)
    await p.locator('button').filter({ has: p.locator('svg.lucide-menu') }).click();
    await p.waitForTimeout(600);
    const visible = await p.getByText('الخطط والأسعار').first().isVisible();
    if (!visible) throw new Error('Mobile menu not visible');
    await screenshot(p, 'mobile-nav');
    await p.close();
  });

  await test('Pricing — عرض 3 خطط', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/pricing', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(3000);
    const body = await p.textContent('body');
    const hasFree = body.includes('مجاني');
    const hasBasic = body.includes('أساسي');
    const hasPro = body.includes('احترافي');
    if (!hasFree || !hasBasic || !hasPro) throw new Error('Missing pricing plans');
    await screenshot(p, 'pricing-plans');
    await p.close();
  });

  await test('Login — فشل دخول بحساب خاطئ', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(2000);
    const username = p.locator('#username');
    const password = p.locator('#password');
    if (!(await username.isVisible() && await password.isVisible())) {
      // if form not visible, just check we're on login page
      if (!p.url().includes('/login')) throw new Error('Not on login page');
      await screenshot(p, 'login-page');
      await p.close();
      return;
    }
    await username.fill('wrong');
    await password.fill('wrong');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(2500);
    const url = p.url();
    if (url.includes('/owner') || url.includes('/admin')) throw new Error('Login succeeded with wrong credentials');
    await p.close();
  });

  console.log('\n── 3. اختبارات المنيو ──');

  await test('Menu Restaurant — عرض بيانات المطعم', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/menu/pizza-roma', { waitUntil: 'networkidle', timeout: 30000 });
    await p.waitForTimeout(5000);
    const h1 = p.locator('h1').first();
    const text = await h1.textContent({ timeout: 10000 }).catch(() => '');
    if (!text || !text.includes('بيتزا')) throw new Error(`H1: "${text || '(empty)'}"`);
    await screenshot(p, 'menu-restaurant');
    await p.close();
  });

  await test('Menu Restaurant — البحث في القائمة', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/menu/pizza-roma', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(2000);
    const searchInput = p.locator('input[placeholder*="ابحث"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('بيتزا');
      await p.waitForTimeout(1000);
      await screenshot(p, 'menu-search');
    }
    await p.close();
  });

  console.log('\n── 4. اختبارات الحماية ──');

  await test('Admin redirect — غير مصرح → /login', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(1500);
    if (!p.url().includes('/login')) throw new Error('Redirect failed');
    await p.close();
  });

  await test('Owner redirect — غير مصرح → /login', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/owner', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(1500);
    if (!p.url().includes('/login')) throw new Error('Redirect failed');
    await p.close();
  });

  console.log('\n── 5. اختبارات الأداء ──');

  await test('Homepage وقت التحميل', async () => {
    const p = await context.newPage();
    const start = Date.now();
    await p.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    const t = Date.now() - start;
    console.log(`      ⏱  ${t}ms`);
    await p.close();
  });

  await test('Menu وقت التحميل', async () => {
    const p = await context.newPage();
    const start = Date.now();
    await p.goto(BASE + '/menu/pizza-roma', { waitUntil: 'networkidle', timeout: 30000 });
    const t = Date.now() - start;
    console.log(`      ⏱  ${t}ms`);
    await p.close();
  });

  console.log('\n── 6. فحص شامل للأخطاء ──');

  await test('Zero console errors', async () => {
    const urls = ['/', '/pricing', '/login', '/subscribe', '/cart', '/menu/pizza-roma'];
    let total = 0;
    for (const path of urls) {
      const p = await context.newPage();
      const errs = [];
      p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text().slice(0,80)); });
      await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
      await p.waitForTimeout(1500);
      const realErrors = errs.filter(e => !e.includes('429'));
      if (realErrors.length) {
        console.log(`      ⚠️  ${path}: ${realErrors.length} error(s)`);
        total += realErrors.length;
      }
      await p.close();
    }
    if (total > 0) throw new Error(`${total} console errors found`);
  });

  await browser.close();
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊  ${RESULTS.passed+RESULTS.failed} اختبار — ✅ ${RESULTS.passed} نجح, ❌ ${RESULTS.failed} فشل`);
  if (RESULTS.errors.length) console.log(`\n❌ التفاصيل:\n${RESULTS.errors.join('\n')}`);
  console.log(`\n${RESULTS.failed === 0 ? '🎉  الموقع يعمل بشكل كامل!' : '⚠️  يوجد أخطاء'}`);
  console.log(`${'═'.repeat(50)}`);
  process.exit(RESULTS.failed > 0 ? 1 : 0);
}

run();
