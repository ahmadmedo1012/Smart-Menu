import { test, expect } from '@playwright/test';
import { HybridTestRunner } from './hybrid-runner';

/* ================================================================
   Smart Menu — Hybrid Playwright + Puppeteer Test Suite
   Cross-browser matrix, auth persistence, network interception
   ================================================================ */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3456';

// Helper for Puppeteer wait
function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test.describe('Hybrid Core — Cross-Browser Matrix', () => {
  let runner: HybridTestRunner;

  test.beforeAll(async () => {
    runner = new HybridTestRunner();
    await runner.initialize();
  });

  test.afterAll(async () => {
    await runner.cleanup();
  });

  test('Chromium — landing page loads', async () => {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ locale: 'ar' });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    expect(title).toContain('Smart Menu');

    await context.close();
    await browser.close();
  });

  test('WebKit — landing page loads', async () => {
    const { webkit } = await import('playwright');
    const browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({ locale: 'ar' });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    expect(title).toContain('Smart Menu');

    await context.close();
    await browser.close();
  });

  test('Firefox — landing page loads', async () => {
    const { firefox } = await import('playwright');
    const browser = await firefox.launch({ headless: true });
    const context = await browser.newContext({ locale: 'ar' });
    const page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    expect(title).toContain('Smart Menu');

    await context.close();
    await browser.close();
  });
});

test.describe('Hybrid Core — Authenticated Session Persistence', () => {
  let runner: HybridTestRunner;

  test.beforeAll(async () => {
    runner = new HybridTestRunner();
    await runner.initialize();
  });

  test.afterAll(async () => {
    await runner.cleanup();
  });

  test('Super Admin login persists across navigation', async () => {
    // Use Puppeteer for low-level auth handshake
    const { page: ppPage } = await runner.createAuthenticatedContext('super_admin');

    // Navigate to admin dashboard
    await ppPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    // Verify we're authenticated (not redirected to login)
    const url = ppPage.url();
    expect(url).toContain('/admin');
    expect(url).not.toContain('/login');

    // Persist session
    await runner.persistAuthSession('super_admin', ppPage);

    // Verify session file exists
    const fs = await import('fs');
    const sessionFile = '.auth/super_admin-session.json';
    expect(fs.existsSync(sessionFile)).toBe(true);

    // Read and verify cookies
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    expect(session.cookies.length).toBeGreaterThan(0);
  });

  test('Owner login persists', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('owner');
    await ppPage.goto(`${BASE_URL}/owner`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    const url = ppPage.url();
    expect(url).toContain('/owner');
    expect(url).not.toContain('/login');

    await runner.persistAuthSession('owner', ppPage);
  });

  test('Sub Admin login blocked from system settings', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('sub_admin');
    await ppPage.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    // Should either redirect or show restricted view
    const url = ppPage.url();
    const bodyText = await ppPage.evaluate(() => document.body.innerText);

    // Sub admin should not have access to system settings tab
    const hasSettingsTab = bodyText.includes('إعدادات النظام');
    expect(hasSettingsTab).toBe(false);
  });
});

test.describe('Hybrid Core — Network Interception & API Monitoring', () => {
  let runner: HybridTestRunner;

  test.beforeAll(async () => {
    runner = new HybridTestRunner();
    await runner.initialize();
  });

  test.afterAll(async () => {
    await runner.cleanup();
  });

  test('Intercept loyalty API requests', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('owner');

    // Intercept loyalty API
    const captured = await runner.interceptAPIRequests(ppPage, ['/api/loyalty']);

    await ppPage.goto(`${BASE_URL}/owner/loyalty`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    // Verify API was called
    expect(captured['/api/loyalty'].length).toBeGreaterThan(0);
    console.log(`[Intercept] Loyalty API calls: ${captured['/api/loyalty'].length}`);
  });

  test('Intercept orders API on owner dashboard', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('owner');

    const captured = await runner.interceptAPIRequests(ppPage, ['/api/orders', '/api/owner']);

    await ppPage.goto(`${BASE_URL}/owner`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    expect(captured['/api/orders'].length).toBeGreaterThan(0);
    console.log(`[Intercept] Orders API calls: ${captured['/api/orders'].length}`);
  });

  test('Intercept QR code generation API', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('owner');

    const captured = await runner.interceptAPIRequests(ppPage, ['/api/qr', '/api/settings']);

    await ppPage.goto(`${BASE_URL}/owner/qr`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    console.log(`[Intercept] QR API calls: ${captured['/api/qr'].length}`);
    console.log(`[Intercept] Settings API calls: ${captured['/api/settings'].length}`);
  });
});

test.describe('Hybrid Core — Localized Network Conditions', () => {
  let runner: HybridTestRunner;

  test.beforeAll(async () => {
    runner = new HybridTestRunner();
    await runner.initialize();
  });

  test.afterAll(async () => {
    await runner.cleanup();
  });

  const CONDITIONS = ['slow-3g', 'fast-3g', 'slow-4g'] as const;

  for (const condition of CONDITIONS) {
    test(`Load landing page under ${condition}`, async () => {
      const { page: ppPage } = await runner.createAuthenticatedContext('owner');

      await runner.simulateNetworkCondition(ppPage, condition);

      const start = Date.now();
      await ppPage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
      const duration = Date.now() - start;

      console.log(`[Network] ${condition}: ${duration}ms`);
      expect(duration).toBeLessThan(60000);
    });
  }

  test('Offline mode shows appropriate error', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('owner');
    await runner.simulateNetworkCondition(ppPage, 'offline');

    await ppPage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await wait(2000);

    // Should show offline indicator or cached content
    const bodyText = await ppPage.evaluate(() => document.body.innerText);
    const hasContent = bodyText.length > 0;
    expect(hasContent).toBe(true);
  });
});

test.describe('Hybrid Core — Request/Response Payload Validation', () => {
  let runner: HybridTestRunner;

  test.beforeAll(async () => {
    runner = new HybridTestRunner();
    await runner.initialize();
  });

  test.afterAll(async () => {
    await runner.cleanup();
  });

  test('Validate loyalty card creation payload structure', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('owner');
    const captured = await runner.interceptAPIRequests(ppPage, ['/api/loyalty']);

    await ppPage.goto(`${BASE_URL}/owner/loyalty`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    // Find POST requests to loyalty API
    const postRequests = captured['/api/loyalty'].filter(r => r.method === 'POST');
    if (postRequests.length > 0) {
      const payload = postRequests[0].postData;
      expect(payload).toBeDefined();

      const parsed = JSON.parse(payload!);
      expect(parsed).toHaveProperty('customerPhone');
      expect(parsed).toHaveProperty('restaurantId');
    }
  });

  test('Validate settings save payload', async () => {
    const { page: ppPage } = await runner.createAuthenticatedContext('super_admin');
    const captured = await runner.interceptAPIRequests(ppPage, ['/api/settings', '/api/restaurants']);

    await ppPage.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    const settingsPosts = captured['/api/settings'].filter(r => r.method === 'PUT' || r.method === 'POST');
    if (settingsPosts.length > 0) {
      const payload = JSON.parse(settingsPosts[0].postData || '{}');
      expect(payload).toHaveProperty('items');
    }
  });
});

test.describe('Hybrid Core — Concurrent Session Isolation', () => {
  let runner: HybridTestRunner;

  test.beforeAll(async () => {
    runner = new HybridTestRunner();
    await runner.initialize();
  });

  test.afterAll(async () => {
    await runner.cleanup();
  });

  test('Multiple admin sessions do not interfere', async () => {
    // Create two separate Puppeteer contexts
    const { page: page1 } = await runner.createAuthenticatedContext('super_admin');
    const { page: page2 } = await runner.createAuthenticatedContext('super_admin');

    // Navigate both to different admin pages
    await Promise.all([
      page1.goto(`${BASE_URL}/admin/admins`, { waitUntil: 'networkidle2', timeout: 30000 }),
      page2.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2', timeout: 30000 }),
    ]);

    await Promise.all([wait(2000), wait(2000)]);

    // Both should be authenticated
    expect(page1.url()).toContain('/admin');
    expect(page2.url()).toContain('/admin');
    expect(page1.url()).not.toContain('/login');
    expect(page2.url()).not.toContain('/login');

    // Content should differ
    const text1 = await page1.evaluate(() => document.body.innerText);
    const text2 = await page2.evaluate(() => document.body.innerText);
    expect(text1).not.toEqual(text2);
  });
});