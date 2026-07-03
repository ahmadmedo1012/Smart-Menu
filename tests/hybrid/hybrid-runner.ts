import { chromium, Browser, BrowserContext, Page } from 'playwright';
import puppeteer, { Browser as PuppeteerBrowser, Page as PuppeteerPage } from 'puppeteer';

/* ================================================================
   Smart Menu — Hybrid Playwright + Puppeteer Core Test Runner
   Orchestrates parallel cross-browser execution with dedicated
   Puppeteer contexts for auth persistence and network interception
   ================================================================ */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3456';
const STORAGE_STATE = '.auth/admin-session.json';

interface TestResult {
  name: string;
  browser: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshots?: string[];
}

class HybridTestRunner {
  private playwrightBrowser: Browser | null = null;
  private puppeteerBrowser: PuppeteerBrowser | null = null;
  private results: TestResult[] = [];

  async initialize() {
    console.log('[HybridRunner] Initializing browsers...');

    // Playwright for cross-browser matrix
    this.playwrightBrowser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Puppeteer for low-level protocol access
    this.puppeteerBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    });

    console.log('[HybridRunner] Browsers ready');
  }

  async cleanup() {
    if (this.playwrightBrowser) await this.playwrightBrowser.close();
    if (this.puppeteerBrowser) await this.puppeteerBrowser.close();
  }

  // === PUPPETEER AUTH CONTEXT ===

  async createAuthenticatedContext(role: 'super_admin' | 'admin' | 'sub_admin' | 'owner' = 'super_admin'): Promise<{
    page: PuppeteerPage;
    context: BrowserContext;
    cookies: any[];
  }> {
    const pwContext = await this.playwrightBrowser!.newContext({
      storageState: role === 'super_admin' ? STORAGE_STATE : undefined,
      locale: 'ar',
      viewport: { width: 1280, height: 900 },
    });

    const ppPage = await this.puppeteerBrowser!.newPage();
    ppPage.setViewport({ width: 1280, height: 900 });

    // If we have storage state, inject cookies into Puppeteer
    const fs = await import('fs');
    if (fs.existsSync(STORAGE_STATE)) {
      const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'));
      for (const cookie of state.cookies) {
        await ppPage.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || 'localhost',
          path: cookie.path || '/',
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as any,
        });
      }
    }

    return { page: ppPage, context: pwContext, cookies: [] };
  }

  async persistAuthSession(role: string, page: PuppeteerPage) {
    const cookies = await page.cookies();
    const storageState = {
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
      origins: [],
    };

    const fs = await import('fs');
    const path = `.auth/${role}-session.json`;
    fs.writeFileSync(path, JSON.stringify(storageState, null, 2));
    console.log(`[Auth] Persisted ${role} session to ${path}`);
  }

  async loginWithPuppeteer(username: string, password: string): Promise<PuppeteerPage> {
    const page = await this.puppeteerBrowser!.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#username', { timeout: 10000 });

    await page.type('#username', username, { delay: 50 });
    await page.type('#password', password, { delay: 50 });
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    return page;
  }

  // === NETWORK INTERCEPTION ===

  async interceptAPIRequests(page: PuppeteerPage, patterns: string[]): Promise<Record<string, any[]>> {
    const captured: Record<string, any[]> = {};

    for (const pattern of patterns) {
      captured[pattern] = [];
    }

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      for (const pattern of patterns) {
        if (url.includes(pattern)) {
          captured[pattern].push({
            url,
            method: req.method(),
            headers: req.headers(),
            postData: req.postData(),
          });
        }
      }
      req.continue();
    });

    page.on('response', async (res) => {
      const url = res.url();
      for (const pattern of patterns) {
        if (url.includes(pattern)) {
          const idx = captured[pattern].findIndex(r => r.url === url);
          if (idx >= 0) {
            captured[pattern][idx].response = {
              status: res.status(),
              headers: res.headers(),
              body: await res.json().catch(() => res.text()),
            };
          }
        }
      }
    });

    return captured;
  }

  // === PLAYWRIGHT CROSS-BROWSER MATRIX ===

  async runCrossBrowserMatrix(testFn: (page: Page, browserName: string) => Promise<void>) {
    const browsers = ['chromium', 'webkit', 'firefox'];

    for (const browserName of browsers) {
      const browser = await this.launchPlaywrightBrowser(browserName);
      const context = await browser.newContext({ locale: 'ar' });
      const page = await context.newPage();

      try {
        console.log(`[Matrix] Running on ${browserName}...`);
        await testFn(page, browserName);
        this.results.push({
          name: testFn.name,
          browser: browserName,
          status: 'passed',
          duration: 0,
        });
      } catch (error) {
        this.results.push({
          name: testFn.name,
          browser: browserName,
          status: 'failed',
          duration: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await context.close();
        await browser.close();
      }
    }
  }

  private async launchPlaywrightBrowser(name: string): Promise<Browser> {
    const { chromium, webkit, firefox } = await import('playwright');
    switch (name) {
      case 'chromium': return chromium.launch({ headless: true });
      case 'webkit': return webkit.launch({ headless: true });
      case 'firefox': return firefox.launch({ headless: true });
      default: throw new Error(`Unknown browser: ${name}`);
    }
  }

  // === LOCALIZED NETWORK CONDITIONS ===

  async simulateNetworkCondition(page: PuppeteerPage, condition: 'offline' | 'slow-3g' | 'fast-3g' | 'slow-4g' | 'fast-4g') {
    const client = await page.target().createCDPSession();
    const presets: Record<string, any> = {
      offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
      'slow-3g': { offline: false, latency: 400, downloadThroughput: 400 * 1024, uploadThroughput: 400 * 1024 },
      'fast-3g': { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024, uploadThroughput: 750 * 1024 },
      'slow-4g': { offline: false, latency: 100, downloadThroughput: 4 * 1024 * 1024, uploadThroughput: 3 * 1024 * 1024 },
      'fast-4g': { offline: false, latency: 20, downloadThroughput: 12 * 1024 * 1024, uploadThroughput: 10 * 1024 * 1024 },
    };
    await client.send('Network.emulateNetworkConditions', presets[condition]);
  }

  // === RUNNER EXECUTION ===

  recordResult(result: TestResult) {
    this.results.push(result);
  }

  getResults(): TestResult[] {
    return this.results;
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    console.log('\n========== HYBRID TEST SUMMARY ==========');
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);

    for (const r of this.results) {
      let icon: string;
      if (r.status === 'passed') icon = '✅';
      else if (r.status === 'failed') icon = '❌';
      else icon = '⏭️';
      console.log(`${icon} [${r.browser}] ${r.name} - ${r.status}${r.error ? `: ${r.error}` : ''}`);
    }
    console.log('===========================================\n');

    return { passed, failed, skipped };
  }
}

// Export for use in test files
export type { TestResult };
export { HybridTestRunner };

// CLI entry point
if (require.main === module) {
  (async () => {
    const runner = new HybridTestRunner();
    await runner.initialize();

    try {
      // Example: Run a cross-browser test
      await runner.runCrossBrowserMatrix(async (page, browserName) => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        const title = await page.title();
        console.log(`[${browserName}] Title: ${title}`);
        if (!title.includes('Smart Menu')) throw new Error('Title mismatch');
      });

      // Example: Puppeteer auth context
      const { page: ppPage } = await runner.createAuthenticatedContext('super_admin');
      await ppPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
      const adminText = await ppPage.evaluate(() => document.body.innerText);
      console.log(`[Puppeteer] Admin page loaded: ${adminText.length} chars`);

      await runner.persistAuthSession('super_admin', ppPage);
    } finally {
      await runner.cleanup();
      runner.printSummary();
    }
  })();
}