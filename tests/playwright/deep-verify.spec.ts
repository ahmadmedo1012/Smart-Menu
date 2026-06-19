import { test, expect } from '@playwright/test';

test.describe('Deep Verification - Console & Network', () => {
  const PAGES = [
    { path: '/', name: 'Homepage' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/login', name: 'Login' },
    { path: '/subscribe', name: 'Subscribe' },
    { path: '/cart', name: 'Cart' },
    { path: '/order-confirmed', name: 'Order Confirmed' },
  ];

  for (const { path, name } of PAGES) {
    test(`${name} — no console errors, no 4xx/5xx`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const networkErrors: { url: string; status: number }[] = [];

      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('response', resp => {
        const status = resp.status();
        if (status >= 400 && resp.url().startsWith('http://localhost:3000')) {
          networkErrors.push({ url: resp.url(), status });
        }
      });

      const resp = await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 });
      expect(resp?.status()).toBeLessThan(400);

      // Take screenshot for visual reference
      await page.screenshot({ path: `/tmp/verify-${name.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true });

      // Report findings
      expect(consoleErrors.length).toBe(0);
      expect(networkErrors.length).toBe(0);
    });
  }
});
