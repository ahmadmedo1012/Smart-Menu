// round92 diagnostic v2: expand category like team8, open editor, read switch,
// AND dump the row/list item data the parent passes as `editing`.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' });
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="username"], #username', 'waha_owner');
  await page.fill('input[name="password"], #password', 'waha123456');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/owner/, { timeout: 30000 }).catch(() => {});

  await page.goto(`${BASE}/owner/menu`, { waitUntil: 'domcontentloaded' });
  const catHeader = page.locator('div.cursor-pointer', { hasText: 'Hot Drinks' }).first();
  await catHeader.waitFor({ timeout: 20000 });
  const row = page.locator('div.divide-y > div', { has: page.locator('span:text-is("Caramel Latte")') }).first();
  if (!(await row.isVisible().catch(() => false))) await catHeader.click();
  await row.waitFor({ timeout: 10000 });

  // what does the ROW pill say (server-fresh state)?
  const pill = row.locator('span[title^="مميز"]');
  console.log('row featured pill count:', await pill.count());

  await row.locator('button[title="تعديل"]').click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 15000 });
  await page.waitForTimeout(800); // let the form effect settle
  const sw = page.locator('#item-featured-switch');
  console.log('DIALOG SWITCH CHECKED =', await sw.evaluate((el) => el.checked).catch((e) => 'ERR ' + e.message));

  // read it AGAIN after more settle — does it flip late?
  await page.waitForTimeout(1500);
  console.log('DIALOG SWITCH RE-READ =', await sw.evaluate((el) => el.checked).catch(() => 'ERR'));

  await page.screenshot({ path: '/tmp/r92-team8-probe2.png' });
  await browser.close();
})().catch((e) => { console.error('PROBE FAIL:', e.message); process.exit(1); });
