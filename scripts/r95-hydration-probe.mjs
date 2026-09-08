// r95: reproduce menu hydration stall + capture console/page errors
import { chromium } from 'playwright';

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' })).newPage();

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('requestfailed', (r) => failedRequests.push(`${r.url().slice(-70)} → ${r.failure()?.errorText}`));

await page.goto('http://localhost:3000/menu/al-waha-cafe', { waitUntil: 'domcontentloaded', timeout: 45000 });
try {
  await page.waitForSelector('[role="group"][aria-label="تصفية الأصناف حسب القسم"]', { timeout: 20000 });
  console.log('HYDRATED OK — category group visible');
} catch {
  console.log('STILL STUCK — no category group after 20s');
}
console.log('PAGE ERRORS:', pageErrors.length ? pageErrors : 'none');
console.log('CONSOLE ERRORS:', consoleErrors.length ? consoleErrors.slice(0, 5) : 'none');
console.log('FAILED REQUESTS:', failedRequests.length ? failedRequests.slice(0, 5) : 'none');
await browser.close();
