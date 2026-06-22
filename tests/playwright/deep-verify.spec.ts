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

      page.on('console', msg => {
        const text = msg.text();
        // Skip known dev-mode noise
        if (text.includes('DevTools') || text.includes('service worker') || text.includes('Next.js') || text.includes('favicon')) return;
        if (msg.type() === 'error') consoleErrors.push(text);
      });
      page.on('response', resp => {
        const status = resp.status();
        const url = resp.url();
        // Skip CSRF-related 403s (first load before cookie is set) and file types
        if (status >= 400 && status !== 403 && (url.startsWith('http://localhost:3000') || url.startsWith('http://localhost:3001'))) {
          networkErrors.push({ url, status });
        }
      });

      const resp = await page.goto(path, { waitUntil: 'networkidle', timeout: 20000 });
      expect(resp?.status()).toBeLessThan(400);
      await page.waitForTimeout(500);

      // Report findings
      expect(consoleErrors.length).toBe(0);
      expect(networkErrors.length).toBe(0);
    });
  }
});
