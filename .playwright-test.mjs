import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push({text: msg.text().slice(0,200), url: msg.location().url}); });
await page.goto('https://smart-menu-sigma.vercel.app/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 30000 });
console.log('ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
