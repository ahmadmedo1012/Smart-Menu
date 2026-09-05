// Render OG image via page.setContent with embedded brand fonts (serverless)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ROOT = '/home/z/my-project/Smart-Menu';
const template = readFileSync('new URL('./og-template.html', import.meta.url).pathname', 'utf8');

// Inline the woff2 fonts as data URIs so no server is needed
const readex = readFileSync(ROOT + '/public/fonts/readex-pro.woff2');
const readexLatin = readFileSync(ROOT + '/public/fonts/readex-pro-latin.woff2');
const b64 = f => f.toString('base64');
const html = template
  .replace("src: url('/fonts/readex-pro.woff2')", `src: url(data:font/woff2;base64,${b64(readex)})`)
  .replace("src: url('/fonts/readex-pro-latin.woff2')", `src: url(data:font/woff2;base64,${b64(readexLatin)})`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); // font parse + layout settle
await page.screenshot({ path: ROOT + '/public/og-default.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('OG_IMAGE_RENDERED serverless 1200x630');
