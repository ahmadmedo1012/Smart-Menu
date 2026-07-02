#!/usr/bin/env node
/**
 * fb-campaign.js — Create a Facebook ad campaign via Ad Center
 * Usage: node fb-campaign.js <page_id> <objective> <budget>
 *   objective: "engagement" | "messages" | "traffic" | "leads"
 */

const { chromium } = require('playwright');

const FB_COOKIES = {
  c_user: '61553916910057',
  xs: '41%3AV-mtqDveBydDiA%3A2%3A1782998300%3A-1%3A-1%3A%3AAcwmaor8197CVcOyKalT3vhaPMS3qyDoRBkfP1I0ag'
};

async function main() {
  const pageId = process.argv[2];
  const objective = process.argv[3] || 'engagement';
  const budget = process.argv[4] || '30';

  if (!pageId) { console.error('Usage: node fb-campaign.js <page_id> <objective> <budget>'); process.exit(1); }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext();

  await ctx.addCookies([
    { name: 'c_user', value: FB_COOKIES.c_user, domain: '.facebook.com', path: '/' },
    { name: 'xs', value: FB_COOKIES.xs, domain: '.facebook.com', path: '/' },
  ]);

  const page = await ctx.newPage();

  await page.goto(`https://www.facebook.com/ad_center/create/consolidatedad/?entry_point=www_pages_product_picker&page_id=${pageId}`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  const text = await page.evaluate(() => document.body.innerText);
  console.log(`Campaign setup ready for page ${pageId}`);
  console.log(`Objective: ${objective}, Budget: ${budget} LYD`);
  console.log('Complete setup in the Ad Center UI');
  console.log(text.substring(0, 1000));

  await browser.close();
}

main().catch(console.error);
