import { chromium } from 'playwright';
const URL = 'https://smart-menu-sigma.vercel.app';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const results = [];
async function checkPage(path, name) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  try {
    await page.goto(URL + path, { waitUntil: 'networkidle', timeout: 30000 });
    results.push({ name, status: errors.length === 0 ? 'PASS' : 'FAIL', errors: errors.length, title: await page.title() });
  } catch (e) {
    results.push({ name, status: 'FAIL', errors: 1, title: e.message.slice(0, 80) });
  }
  await page.close();
}
await checkPage('', 'Homepage');
await checkPage('/pricing', 'Pricing');
await checkPage('/subscribe', 'Subscribe');
await checkPage('/login', 'Login');
await checkPage('/terms', 'Terms');
await checkPage('/privacy', 'Privacy');
await checkPage('/menu/al-waha-cafe', 'Menu Page');
await browser.close();
console.log('\n=== BROWSER TEST RESULTS ===');
for (const r of results) console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.name}: ${r.status} (${r.errors} errors)`);
console.log(`\n${results.filter(r => r.status === 'PASS').length}/${results.length} passing`);
