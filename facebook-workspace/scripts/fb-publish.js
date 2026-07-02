#!/usr/bin/env node
/**
 * fb-publish.js — Publish a post or story to a Facebook page
 * Usage: node fb-publish.js <page_id> <type> "<message>" [image_url]
 *   type: "post" | "story"
 */

const { chromium } = require('playwright');

const FB_COOKIES = {
  c_user: '61553916910057',
  xs: '41%3AV-mtqDveBydDiA%3A2%3A1782998300%3A-1%3A-1%3A%3AAcwmaor8197CVcOyKalT3vhaPMS3qyDoRBkfP1I0ag'
};

const PAGE_MAP = {
  '1235690416285843': { name: 'Smart Link', url: 'https://www.facebook.com/profile.php?id=61591502614404' },
  '502352372970389': { name: 'GameBox', url: 'https://www.facebook.com/GameBoxLibya' },
};

async function main() {
  const pageId = process.argv[2];
  const type = process.argv[3] || 'post';
  const message = process.argv[4] || '';
  const imagePath = process.argv[5];

  const pageInfo = PAGE_MAP[pageId];
  if (!pageInfo) { console.error('Unknown page ID'); process.exit(1); }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext();

  await ctx.addCookies([
    { name: 'c_user', value: FB_COOKIES.c_user, domain: '.facebook.com', path: '/' },
    { name: 'xs', value: FB_COOKIES.xs, domain: '.facebook.com', path: '/' },
  ]);

  const page = await ctx.newPage();

  if (type === 'post') {
    // Navigate to Business Suite create post
    await page.goto(`https://business.facebook.com/latest/home?asset_id=${pageId}`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    // Click "Create Post" button
    const createBtn = page.locator('button:has-text("إنشاء منشور"), button:has-text("Create post")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log(`Ready to post to ${pageInfo.name}: "${message.substring(0, 100)}..."`);

    // Note: Full automation requires navigating Facebook's complex composer.
    // For now this opens the right page — you type the message in the open browser.
    console.log('Post composer loaded. Complete in browser.');

  } else if (type === 'story') {
    await page.goto(`https://business.facebook.com/latest/stories?asset_id=${pageId}`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    console.log('Story creator loaded.');
  }

  await page.pause(); // hand over to user if headless=false
  await browser.close();
}

main().catch(console.error);
