import { chromium } from 'playwright';

const BASE = 'https://smart-menu-sigma.vercel.app';

const pages = [
  { path: '/', name: 'Homepage', wait: 'load' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/login', name: 'Login' },
  { path: '/subscribe', name: 'Subscribe' },
  { path: '/cart', name: 'Cart' },
  { path: '/order-confirmed', name: 'Order Confirmed' },
  { path: '/robots.txt', name: 'Robots' },
  { path: '/menu', name: 'Menu' },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar' });
  let passed = 0, failed = 0;

  for (const { path, name, wait } of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    const networkErrors = [];
    const responses = [];

    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('response', resp => {
      const status = resp.status();
      if (resp.url().startsWith(BASE)) {
        responses.push({ url: resp.url(), status, ok: resp.ok() });
        if (status >= 400) networkErrors.push({ url: resp.url(), status });
      }
    });

    try {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: wait || 'networkidle', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      const status = resp?.status() ?? 0;
      await page.screenshot({ path: `/tmp/prod-${name.toLowerCase().replace(/\s/g,'-')}.png`, fullPage: true });

      const hasConsoleErrs = consoleErrors.length > 0;
      const hasNetworkErrs = networkErrors.length > 0;

      if (status < 400 && !hasConsoleErrs && !hasNetworkErrs) {
        console.log(`✅ ${name} — HTTP ${status}, all clean`);
        passed++;
      } else {
        const details = [];
        if (status >= 400) details.push(`HTTP ${status}`);
        if (hasConsoleErrs) details.push(`${consoleErrors.length} console errors`);
        if (hasNetworkErrs) details.push(`${networkErrors.length} network errors`);
        console.error(`❌ ${name} — ${details.join(', ')}`);
        if (consoleErrors.length) console.error(`   Console: ${consoleErrors.slice(0,2).map(e => e.slice(0,200)).join(' | ')}`);
        if (networkErrors.length) console.error(`   Network: ${JSON.stringify(networkErrors.slice(0,3))}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ ${name} — ${err.message.split('\n')[0]}`);
      failed++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n📊 Results: ${passed}/${pages.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
