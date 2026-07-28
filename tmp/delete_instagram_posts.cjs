const { chromium } = require('playwright');

(async () => {
  const USERNAME = 'smart_link.0';
  const PASSWORD = 'AHMADahmad.0916031078';
  const MAX_POSTS = 50;

  const browser = await chromium.launch({
    headless: false,
    executablePath: '/home/ahmed/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Login
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Debug: see what's on the page
  console.log('Current URL:', page.url());
  const html = await page.content();
  console.log('Page has login form:', html.includes('username') || html.includes('Username'));
  await page.screenshot({ path: '/tmp/ig_login.png' });

  // Instagram uses dynamic IDs, but name="email" and name="pass"
  const emailField = await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  console.log('Found login form, filling credentials...');
  await emailField.fill(USERNAME);
  await page.fill('input[name="pass"]', PASSWORD);
  await page.click('div[role="button"]:has-text("Log in")');

  // 2. Wait for login — check for 2FA
  try {
    await page.waitForSelector('a[href="/' + USERNAME + '/"]', { timeout: 30000 });
  } catch {
    const body = await page.textContent('body');
    if (body.includes('two-factor') || body.includes('2FA') || body.includes('Confirm') || body.includes('verify')) {
      console.log('2FA DETECTED — stopping. Please complete 2FA manually in the browser.');
      await page.pause(); // hands control to user
    } else {
      // still wait a bit more
      await page.waitForSelector('a[href="/' + USERNAME + '/"]', { timeout: 60000 });
    }
  }

  // 3. Navigate to profile
  await page.goto('https://www.instagram.com/' + USERNAME + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  let deletedCount = 0;
  let processedLinks = new Set();

  while (deletedCount < MAX_POSTS) {
    // 4. Get post thumbnail links
    const postLinks = await page.$$eval('article a[href*="/p/"]', (els) =>
      els.map((el) => el.getAttribute('href')).filter(Boolean)
    );

    let foundNew = false;

    for (const link of postLinks) {
      if (deletedCount >= MAX_POSTS) break;
      if (processedLinks.has(link)) continue;
      foundNew = true;
      processedLinks.add(link);

      try {
        // Click the post thumbnail to open the modal
        const thumbnail = await page.$('a[href="' + link + '"]');
        if (!thumbnail) continue;
        await thumbnail.click();
        await page.waitForTimeout(2000);

        // Click "More options" (three dots) button
        const moreOptions = await page.$('svg[aria-label="More options"]');
        if (!moreOptions) {
          console.log('Could not find More options for ' + link + ' — trying alternative selector');
          // Try the button that contains the three dots
          const moreBtn = await page.$('button:has(svg[aria-label*="More"])');
          if (!moreBtn) {
            // close modal and skip
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            continue;
          }
          await moreBtn.click();
        } else {
          await moreOptions.click();
        }
        await page.waitForTimeout(1000);

        // Click "Delete" from the dropdown
        const deleteOption = await page.$('button:has-text("Delete"), span:has-text("Delete"), div[role="menuitem"]:has-text("Delete")');
        if (!deleteOption) {
          console.log('Could not find Delete option for ' + link + ' — closing modal');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          continue;
        }
        await deleteOption.click();
        await page.waitForTimeout(1000);

        // Confirm deletion — click "Delete" in the dialog
        const confirmDelete = await page.$('button:has-text("Delete"):not(:has(svg)), div[role="dialog"] button:has-text("Delete")');
        if (!confirmDelete) {
          // Try finding any Delete button in the dialog
          const dialogDelete = await page.$('div[role="dialog"] button:last-of-type');
          if (dialogDelete) {
            await dialogDelete.click();
          } else {
            console.log('Could not find confirmation button for ' + link);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            continue;
          }
        } else {
          await confirmDelete.click();
        }

        await page.waitForTimeout(2000);
        deletedCount++;
        console.log('Deleted post: ' + link + ' (' + deletedCount + '/' + MAX_POSTS + ')');

      } catch (err) {
        console.log('Error deleting ' + link + ': ' + err.message);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    if (!foundNew) {
      console.log('No more new posts found — scrolling down');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);
      // Check if we've reached the end
      const newLinks = await page.$$eval('article a[href*="/p/"]', (els) =>
        els.map((el) => el.getAttribute('href')).filter(Boolean)
      );
      if (newLinks.length === processedLinks.size) {
        console.log('No more posts to process');
        break;
      }
    }
  }

  console.log('DONE. Deleted ' + deletedCount + ' posts.');
  // await browser.close();
})();
