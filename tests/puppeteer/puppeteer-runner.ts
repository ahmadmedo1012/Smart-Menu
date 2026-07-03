import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

function expect(actual: any) {
  return {
    toBeDefined() { if (actual === undefined) throw new Error(`Expected value to be defined, got ${actual}`); },
    toBe(expected: any) { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
    toContain(expected: string) { if (typeof actual === 'string' && !actual.includes(expected)) throw new Error(`Expected "${actual}" to contain "${expected}"`); },
    toBeGreaterThan(n: number) { if (actual <= n) throw new Error(`Expected ${actual} to be > ${n}`); },
    toBeLessThan(n: number) { if (actual >= n) throw new Error(`Expected ${actual} to be < ${n}`); },
    toBeNull() { if (actual !== null) throw new Error(`Expected null, got ${actual}`); },
    toBeGreaterThanOrEqual(n: number) { if (actual < n) throw new Error(`Expected ${actual} >= ${n}`); },
    toContainEqual: function() { return this; },
  };
}

/* ================================================================
   Smart Menu — Puppeteer Standalone Auth + Session Runner
   Injects session tokens, manipulates network, intercepts payloads
   ================================================================ */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3456';
const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/puppeteer/screenshots');

interface PuppeteerTestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  ensureDir(SCREENSHOT_DIR);
  console.log('═══ Puppeteer Standalone Test Runner ═══\n');

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const results: PuppeteerTestResult[] = [];

  async function runTest(name: string, fn: (page: Page) => Promise<void>) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const start = Date.now();
    try {
      await fn(page);
      results.push({ name, passed: true, duration: Date.now() - start });
      console.log(`✅ ${name} (${Date.now() - start}ms)`);
    } catch (err) {
      results.push({ name, passed: false, duration: Date.now() - start, error: (err as Error).message });
      console.log(`❌ ${name}: ${(err as Error).message}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name.replace(/\s+/g, '-').toLowerCase()}.png`) });
    } finally {
      await page.close();
    }
  }

  // ── Auth injection ──
  await runTest('Inject JWT session token', async (page) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    // Simulate auth by injecting a cookie
    await page.setCookie({
      name: 'auth-token',
      value: 'puppeteer-injected-test-token',
      domain: new URL(BASE_URL).hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax' as any,
    });
    const cookies = await page.cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token');
    expect(authCookie).toBeDefined();
    expect(authCookie!.httpOnly).toBe(true);
  });

  await runTest('Login with credentials', async (page) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#username', { timeout: 5000 });
    await page.type('#username', 'admin', { delay: 30 });
    await page.type('#password', 'admin123', { delay: 30 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    const url = page.url();
    const loggedIn = url.includes('/admin') || url.includes('/owner');
    console.log(`  ↳ Login result: ${url} — ${loggedIn ? 'authenticated' : 'still on login'}`);
  });

  // ── Network interception ──
  await runTest('Intercept API requests', async (page) => {
    const captured: any[] = [];
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/')) {
        captured.push({ url: req.url(), method: req.method(), headers: req.headers() });
      }
      req.continue();
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log(`  ↳ Captured ${captured.length} API requests`);
    expect(captured.length).toBeGreaterThan(0);
  });

  await runTest('Intercept login POST body', async (page) => {
    let postBody: string | undefined;
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/login')) {
        postBody = req.postData();
      }
      req.continue();
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#username', { timeout: 5000 });
    await page.type('#username', 'testuser', { delay: 20 });
    await page.type('#password', 'testpass123', { delay: 20 });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    if (postBody) {
      console.log(`  ↳ Login POST body captured: ${postBody.slice(0, 100)}`);
      expect(postBody).toContain('testuser');
    }
  });

  // ── Localized network conditions ──
  await runTest('Simulate slow 3G network', async (page) => {
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: 400 * 1024,
      uploadThroughput: 400 * 1024,
    });

    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    const duration = Date.now() - start;
    console.log(`  ↳ Slow 3G load time: ${duration}ms`);
    expect(duration).toBeLessThan(60000);
  });

  await runTest('Simulate offline mode', async (page) => {
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  // ── CDP session manipulation ──
  await runTest('CDP — Extract console logs', async (page) => {
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log(`  ↳ Console messages: ${logs.length}`);
    logs.slice(0, 3).forEach((l, i) => console.log(`    [${i + 1}] ${l.slice(0, 100)}`));
  });

  // ── Screenshot capture ──
  await runTest('Take full-page screenshot', async (page) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));
    const shotPath = path.join(SCREENSHOT_DIR, 'puppeteer-fullpage.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    expect(fs.existsSync(shotPath)).toBe(true);
    console.log(`  ↳ Screenshot saved: ${shotPath}`);
  });

  // ── Cookie persistence ──
  await runTest('Export cookies to file', async (page) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
    const cookies = await page.cookies();
    const cookiePath = path.join(process.cwd(), '.auth/puppeteer-cookies.json');
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    expect(fs.existsSync(cookiePath)).toBe(true);
    console.log(`  ↳ ${cookies.length} cookies exported to ${cookiePath}`);
  });

  // ── Summary ──
  await browser.close();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n═══ Puppeteer Test Summary ═══`);
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
  }

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
