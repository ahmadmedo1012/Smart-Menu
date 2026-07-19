const BASE_URL = 'https://menu.smart-link.ly';

const PAGES = [
  { path: '/', label: 'Landing Page' },
  { path: '/login', label: 'Login Page' },
  { path: '/subscribe', label: 'Subscribe Page' },
  { path: '/terms', label: 'Terms Page' },
  { path: '/pricing', label: 'Pricing Page' },
  { path: '/cart', label: 'Cart Page' },
  { path: '/menu', label: 'Menu Page' },
  { path: '/menu/al-waha-cafe', label: 'Menu Item Page (al-waha-cafe)' },
  { path: '/order-confirmed', label: 'Order Confirmed Page' },
  { path: '/privacy', label: 'Privacy Page' },
  { path: '/not-found', label: '404 Not Found Page' },
];

const RESULTS = [];

function pass(label, details) {
  RESULTS.push({ label, status: 'PASS', details });
}

function fail(label, details) {
  RESULTS.push({ label, status: 'FAIL', details });
}

async function run() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });

  for (const { path, label } of PAGES) {
    const page = await context.newPage();
    const url = BASE_URL + path;
    const issues = [];
    const elementsFound = [];

    try {
      console.log(`\n=== ${label} (${url}) ===`);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const statusCode = resp ? resp.status() : -1;
      elementsFound.push(`HTTP ${statusCode}`);

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Take screenshot
      const screenshotPath = `/tmp/scan-${label.replace(/[^a-z0-9]/gi, '_')}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  Screenshot saved: ${screenshotPath}`);

      // Check if page loaded meaningful content
      const bodyText = await page.evaluate(() => document.body.innerText.trim());
      const pageTitle = await page.title();

      if (statusCode === 404) {
        if (path === '/not-found') {
          pass(label, `Correctly returned 404. Title: "${pageTitle}"`);
          continue;
        } else {
          issues.push(`Unexpected 404`);
          fail(label, `UNEXPECTED 404. Title: "${pageTitle}"`);
          continue;
        }
      }

      if (statusCode >= 400) {
        issues.push(`HTTP ${statusCode} error`);
      }

      // Check page isn't blank
      if (bodyText.length < 20) {
        issues.push('Page content too short, may be blank');
      }
      elementsFound.push(`Body text length: ${bodyText.length} chars`);

      // Check for error indicators
      const errorIndicators = ['error', 'undefined', 'cannot load', 'something went wrong'];
      const lowerText = bodyText.toLowerCase();
      for (const err of errorIndicators) {
        if (lowerText.includes(err) && bodyText.length < 100) {
          issues.push(`Error indicator found: "${err}"`);
        }
      }

      // Check for common interactive elements
      const links = await page.$$('a');
      const buttons = await page.$$('button');
      const inputs = await page.$$('input');
      elementsFound.push(`Links: ${links.length}, Buttons: ${buttons.length}, Inputs: ${inputs.length}`);

      // Page-specific checks
      if (path === '/') {
        // Check for header, footer, hero
        const header = await page.$('header');
        const footer = await page.$('footer');
        if (header) elementsFound.push('Header found');
        else issues.push('No header element found');
        if (footer) elementsFound.push('Footer found');
        else issues.push('No footer element found');

        // Look for CTAs - commonly "ابدأ", "اشترك", "سجل", "button"
        const ctaTexts = await page.evaluate(() => {
          const allEls = document.body.innerText;
          const ctas = [];
          if (allEls.includes('ابدأ')) ctas.push('ابدأ');
          if (allEls.includes('اشترك')) ctas.push('اشترك');
          if (allEls.includes('سجل')) ctas.push('سجل');
          if (allEls.includes('تسجيل')) ctas.push('تسجيل');
          if (allEls.includes('منتجاتنا') || allEls.includes('خدماتنا')) ctas.push('Featured sections');
          return ctas;
        });
        if (ctaTexts.length > 0) elementsFound.push(`CTA keywords found: ${ctaTexts.join(', ')}`);

        // Try clicking a CTA if available
        const ctaBtn = await page.$('a[href*="signup"], a[href*="register"], a[href*="login"], a[href*="subscribe"], button:has-text("ابدأ"), button:has-text("اشترك")');
        if (ctaBtn) {
          try {
            const href = await ctaBtn.getAttribute('href');
            elementsFound.push(`CTA button/link href: ${href}`);
          } catch(e) {}
        }
      }

      if (path === '/login') {
        // Check for login form elements
        const usernameField = await page.$('input[type="text"], input[type="email"], input[name="username"], input[name="email"]');
        const passwordField = await page.$('input[type="password"]');
        const submitBtn = await page.$('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل")');
        if (usernameField) elementsFound.push('Username/Email field found');
        else issues.push('Username/email field not found');
        if (passwordField) elementsFound.push('Password field found');
        else issues.push('Password field not found');
        if (submitBtn) elementsFound.push('Submit button found');
        else issues.push('Submit button not found');

        // Check for back link
        const backLink = await page.$('a:has-text("العودة"), a:has-text("الرئيسية"), a[href="/"]');
        if (backLink) elementsFound.push('Back to home link found');
        else issues.push('No back-to-home link found');
      }

      if (path === '/subscribe' || path === '/pricing') {
        // Check for plan cards / pricing sections
        const h2s = await page.$$('h1, h2, h3');
        const headings = await Promise.all(h2s.map(h => h.textContent()));
        elementsFound.push(`Headings: ${headings.join(' | ')}`);

        const planCards = await page.$$('[class*="plan"], [class*="card"], [class*="pricing"], [class*="box"], section');
        elementsFound.push(`Potential plan/feature sections: ${planCards.length}`);
      }

      if (path === '/menu/al-waha-cafe') {
        // Look for menu items, categories, add-to-cart buttons
        const items = await page.$$('[class*="item"], [class*="menu"], [class*="product"], li');
        elementsFound.push(`Menu items/cards found: ${items.length}`);
        const addCartBtns = await page.$$('button:has-text("إضافة"), button:has-text("شراء"), button:has-text("طلب"), button:has-text("+")\n');
        elementsFound.push(`Add-to-cart buttons: ${addCartBtns.length}`);
      }

      if (path === '/terms' || path === '/privacy') {
        // Verify content is visible
        const paragraphCount = await page.$$('p').then(els => els.length);
        elementsFound.push(`Paragraphs: ${paragraphCount}`);
      }

      if (path === '/cart') {
        // Check for empty state text
        const emptyText = await page.evaluate(() => {
          const t = document.body.innerText;
          return t.includes('فارغ') || t.includes('empty') || t.includes('لا توجد') || t.includes('لم تقم');
        });
        if (emptyText) elementsFound.push('Empty state detected');
      }

      if (issues.length === 0) {
        pass(label, `Status ${statusCode} | "${pageTitle}" | ${elementsFound.join('; ')}`);
      } else {
        fail(label, `Issues: ${issues.join('; ')} | ${elementsFound.join('; ')}`);
      }
    } catch (err) {
      fail(label, `Error: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  // Summary
  console.log('\n\n============= SCAN RESULTS =============');
  const passed = RESULTS.filter(r => r.status === 'PASS').length;
  const failed = RESULTS.filter(r => r.status === 'FAIL').length;
  for (const r of RESULTS) {
    console.log(`[${r.status}] ${r.label}: ${r.details}`);
  }
  console.log(`\nTotal: ${RESULTS.length} | PASS: ${passed} | FAIL: ${failed}`);

  await browser.close();
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
