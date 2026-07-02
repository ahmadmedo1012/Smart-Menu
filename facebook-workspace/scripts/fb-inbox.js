#!/usr/bin/env node
/**
 * fb-inbox.js — Read and reply to Facebook inbox messages via Playwright
 * Usage: node fb-inbox.js <asset_id> [action] [params]
 *   action: "list" | "reply" | "mark-read"
 */

const { chromium } = require('playwright');
const path = require('path');

const FB_COOKIES = {
  c_user: '61553916910057',
  xs: '41%3AV-mtqDveBydDiA%3A2%3A1782998300%3A-1%3A-1%3A%3AAcwmaor8197CVcOyKalT3vhaPMS3qyDoRBkfP1I0ag'
};

async function main() {
  const assetId = process.argv[2];
  const action = process.argv[3] || 'list';

  if (!assetId) { console.error('Usage: node fb-inbox.js <asset_id> [list|reply]'); process.exit(1); }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext();

  await ctx.addCookies([
    { name: 'c_user', value: FB_COOKIES.c_user, domain: '.facebook.com', path: '/' },
    { name: 'xs', value: FB_COOKIES.xs, domain: '.facebook.com', path: '/' },
  ]);

  const page = await ctx.newPage();

  if (action === 'list') {
    await page.goto(`https://business.facebook.com/latest/inbox/all?asset_id=${assetId}`, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    console.log(text.substring(0, 3000));
  }

  if (action === 'reply') {
    const threadId = process.argv[4];
    const message = process.argv[5];
    if (!threadId || !message) { console.error('Need threadId and message'); process.exit(1); }
    await page.goto(`https://business.facebook.com/latest/inbox/messenger?asset_id=${assetId}&selected_item_id=${threadId}&thread_type=FB_MESSAGE`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    // Type and send
    const textbox = page.locator('[contenteditable="true"]').first();
    await textbox.fill(message);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    console.log('Reply sent');
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
