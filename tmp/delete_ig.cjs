const { chromium } = require('playwright');
const fs = require('fs');

const USERNAME = 'smart_link.0';
const PASSWORD = 'AHMADahmad.0916031078';
const COOKIE_FILE = '/tmp/ig_cookies.json';
const MAX_POSTS = 50;

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/home/ahmed/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Load saved cookies if they exist
  if (fs.existsSync(COOKIE_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
    await context.addCookies(cookies);
    console.log('Loaded saved cookies');
  }

  // Go to login page
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Check if already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes('login')) {
    console.log('Already logged in via cookies, URL:', currentUrl);
  } else {
    // Instagram login fields: name="email" and name="pass"
    // autocomplete attr is "username webauthn" — use starts-with or name selector
    const emailInput = await page.$('input[name="email"]');
    if (!emailInput) {
      console.log('Could not find email field');
      await page.waitForTimeout(3000);
    } else {
      await emailInput.fill(USERNAME);
      console.log('Filled email');
    }

    const passInput = await page.$('input[name="pass"]');
    if (passInput) {
      await passInput.fill(PASSWORD);
      console.log('Filled password');
      await page.waitForTimeout(500);
    }

    // Submit via Enter key (bypasses disabled button state issues)
    console.log('Pressing Enter to submit login...');
    await page.keyboard.press('Enter');

    // Wait for navigation or 2FA
    await page.waitForTimeout(5000);
    const afterUrl = page.url();
    console.log('After login URL:', afterUrl);

    // Check for 2FA — Instagram shows a "two_step_verification" path or similar challenge
    if (afterUrl.includes('two_step') || afterUrl.includes('challenge')) {
      console.log('2FA DETECTED — browser is open. Complete verification manually in the browser window, then press Enter here to continue...');
      await page.pause();
      console.log('Resuming after 2FA...');
    } else if (afterUrl.includes('login')) {
      console.log('Still on login page — checking for additional verification...');
      const bodyText = await page.textContent('body');
      if (bodyText.includes('two-factor') || bodyText.includes('verification') || bodyText.includes('Confirm')) {
        console.log('Additional verification needed — browser is open. Complete it manually.');
        await page.pause();
      } else {
        // Wait a bit more for login to complete
        console.log('Waiting for login to complete...');
        await page.waitForTimeout(15000);
      }
    }

    // Save cookies for future runs
    const cookies = await context.cookies();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log('Saved cookies');
  }

  // Navigate to profile
  await page.goto('https://www.instagram.com/' + USERNAME + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('Profile URL:', page.url());

  // Wait for the profile page to load posts — Instagram uses a grid structure
  // Wait up to 15 seconds for article or post links to appear
  try {
    await page.waitForSelector('article a[href*="/p/"]', { timeout: 15000 });
    console.log('Post links found');
  } catch {
    console.log('No article links found, trying alternative selectors...');
    // It might not be a standard article layout, try scrolling
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(3000);
  }

  let deletedCount = 0;
  let processedLinks = new Set();

  while (deletedCount < MAX_POSTS) {
    // Collect post links
    const postLinks = await page.$$eval('a[href*="/p/"]', els =>
      els.map(el => el.getAttribute('href')).filter(h => h && h.startsWith('/p/'))
    );
    console.log('Found ' + postLinks.length + ' total post links on page');

    let foundNew = false;

    for (const link of postLinks) {
      if (deletedCount >= MAX_POSTS) break;
      if (processedLinks.has(link)) continue;
      foundNew = true;
      processedLinks.add(link);

      try {
        // Click the post thumbnail
        const thumb = await page.$('a[href="' + link + '"]');
        if (!thumb) continue;
        await thumb.click();
        await page.waitForTimeout(2000);

        // Click the "More options" (three dots) — inside the modal
        // Instagram modal uses a dedicated header with three dots
        const moreBtn = await page.$('svg[aria-label="More options"], button:has(svg[aria-label*="More"])');
        if (moreBtn) {
          await moreBtn.click();
        } else {
          console.log('More options button not found, trying close');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          continue;
        }
        await page.waitForTimeout(1000);

        // Click "Delete" from menu
        const deleteBtn = await page.$('span:has-text("Delete"):not(:has(svg)), button:has-text("Delete"), div[role="menuitem"]:has-text("Delete")');
        if (deleteBtn) {
          await deleteBtn.click();
        } else {
          console.log('Delete option not found');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          continue;
        }
        await page.waitForTimeout(1000);

        // Confirm delete in dialog
        const confirmBtn = await page.$('div[role="dialog"] button:has-text("Delete")');
        if (confirmBtn) {
          await confirmBtn.click();
        } else {
          // Try any button in dialog that might be the confirm
          const anyBtn = await page.$('div[role="dialog"] button');
          if (anyBtn) {
            const text = await anyBtn.textContent();
            console.log('Found dialog button:', text);
            await anyBtn.click();
          }
        }

        await page.waitForTimeout(2000);
        deletedCount++;
        console.log('Deleted: ' + link + ' (' + deletedCount + ')');

      } catch (err) {
        console.log('Error on ' + link + ': ' + err.message);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    if (!foundNew) {
      // Scroll for more posts
      console.log('Scrolling for more posts...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(5000);

      const newLinks = await page.$$eval('a[href*="/p/"]', els =>
        els.map(el => el.getAttribute('href')).filter(h => h && h.startsWith('/p/'))
      );
      if (newLinks.length === processedLinks.size) {
        console.log('No more posts to delete');
        break;
      }
    }
  }

  console.log('=== DONE: Deleted ' + deletedCount + ' posts ===');
  // browser stays open so user can see result
})();
