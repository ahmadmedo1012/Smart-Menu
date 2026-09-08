// round92 diagnostic: why does team8:195's editor switch read false in the
// full-suite context while DB says isFeatured=true?
// Probes: /owner/menu page rows + the editor dialog initial switch + raw API.
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' });
  const page = await browser.newPage();

  // login as waha_owner (mirrors qa-helpers login)
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="username"], #username', 'waha_owner');
  await page.fill('input[name="password"], #password', 'waha123456');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/owner/, { timeout: 30000 }).catch(() => {});
  console.log('url after login:', page.url());

  // raw API check
  const items = await page.evaluate(async () => {
    const r = await fetch('/api/items?restaurantId=1&pageSize=200', { credentials: 'include' });
    return r.json();
  }).catch((e) => ({ error: String(e) }));
  const latte = (items?.data || []).find?.((i) => i.name === 'Caramel Latte');
  console.log('API latte:', latte ? { isFeatured: latte.isFeatured, rank: latte.featuredRank, id: latte.id } : items);

  // owner menu page rows
  await page.goto(`${BASE}/owner/menu`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const rowCount = await page.locator('div.divide-y > div').count();
  console.log('owner menu rows visible:', rowCount);

  // open the latte editor like team8 does
  const row = page.locator('div.divide-y > div', { has: page.locator('span:text-is("Caramel Latte")') }).first();
  await row.locator('button[title="تعديل"]').click();
  await page.waitForTimeout(1500);
  const sw = page.locator('#item-featured-switch');
  if ((await sw.count()) > 0) {
    const checked = await sw.evaluate((el) => el.checked);
    console.log('DIALOG SWITCH CHECKED =', checked);
  } else {
    console.log('dialog switch not found — dialog open?', await page.getByRole('dialog').count());
  }

  await page.screenshot({ path: '/tmp/r92-team8-probe.png' });
  await browser.close();
})().catch((e) => { console.error('PROBE FAIL:', e.message); process.exit(1); });
