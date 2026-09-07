// Verify production /subscribe?plan=PREMIUM resolves the wizard (client-rendered)
const { chromium } = await import('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://menu.smart-link.ly/subscribe?plan=PREMIUM', { waitUntil: 'domcontentloaded' });
  // Wait for the wizard to hydrate and resolve the plan
  try {
    await page.waitForSelector('text=بريميوم', { timeout: 12000 });
  } catch {
    /* fall through to checks */
  }
  const body = await page.textContent('body');
  const hasPremium = body.includes('بريميوم');
  const hasDeadEnd = body.includes('تعذر تحميل الخطة المحددة');
  const hasWizard = body.includes('اختر الخطة');
  console.log(`plan=PREMIUM → بريميوم ظاهرة: ${hasPremium} | معالج حي: ${hasWizard} | dead-end: ${hasDeadEnd}`);
  const ok = hasPremium && !hasDeadEnd;
  console.log(ok ? 'RESULT: PASS ✅' : 'RESULT: FAIL ❌');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
