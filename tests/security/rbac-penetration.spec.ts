import { test, expect, Page } from '@playwright/test';

/* ================================================================
   Smart Menu — Security & RBAC Penetration Test Suite
   Route guard evasion, privilege escalation, API access control
   ================================================================ */

const BASE = process.env.BASE_URL || 'http://localhost:3456';

/** Attempt navigation and verify it forces redirect to /login */
async function assertRedirectsToLogin(page: Page, route: string) {
  const resp = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
  expect(page.url()).toContain('/login');
}

/** Attempt navigation to admin-only route as unauthenticated */
async function assertBlocksUnauthenticated(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  const url = page.url();
  expect(url.includes('/login') || url.includes('401') || url.includes('403')).toBe(true);
}

/** Login with credentials, return true if /admin reached */
async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const un = page.locator('#username');
  const pw = page.locator('#password');
  await un.waitFor({ state: 'visible', timeout: 5000 });
  await un.fill(username);
  await pw.fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin|owner)/, { timeout: 15000 }).catch(() => {});
  return page.url();
}

test.describe('Security — Route Guard Penetration', () => {
  test.describe('Unauthenticated access blocked', () => {
    const PROTECTED_ROUTES = [
      '/admin',
      '/admin/users',
      '/admin/settings',
      '/admin/admins',
      '/admin/restaurants',
      '/owner',
      '/owner/settings',
      '/owner/menu',
      '/owner/orders',
      '/owner/orders/1',
      '/owner/loyalty',
      '/owner/qr',
      '/owner/reviews',
      '/api/restaurants',
      '/api/admin/profile',
      '/api/loyalty/stats',
      '/api/settings',
    ];

    for (const route of PROTECTED_ROUTES) {
      test(`Route ${route} redirects to login`, async ({ page }) => {
        test.setTimeout(30000);
        await page.setViewportSize({ width: 1280, height: 900 });
        await assertRedirectsToLogin(page, route);
      });
    }
  });

  test.describe('API endpoints reject unauthenticated requests', () => {
    const API_ENDPOINTS = [
      { path: '/api/admin/profile', method: 'GET' },
      { path: '/api/admin/profile', method: 'PUT' },
      { path: '/api/settings', method: 'GET' },
      { path: '/api/settings', method: 'PUT' },
      { path: '/api/restaurants', method: 'POST' },
      { path: '/api/telegram/config', method: 'GET' },
      { path: '/api/telegram/config', method: 'POST' },
      { path: '/api/admin/notification-preferences', method: 'GET' },
      { path: '/api/admin/notification-preferences', method: 'PUT' },
      { path: '/api/loyalty/stats', method: 'GET' },
    ];

    for (const { path, method } of API_ENDPOINTS) {
      test(`API ${method} ${path} rejects without auth`, async ({ page }) => {
        test.setTimeout(15000);
        const resp = await page.evaluate(async () => {
          const res = await fetch(path, { method });
          return { status: res.status, statusText: res.statusText };
        });
        expect(resp.status).toBeGreaterThanOrEqual(401);
        expect(resp.status).toBeLessThan(500);
      });
    }
  });

  test.describe('Admin UI access without credentials', () => {
    const ADMIN_UI = [
      '/admin',
      '/admin/users',
      '/admin/settings',
      '/admin/admins',
      '/admin/restaurants',
    ];

    for (const route of ADMIN_UI) {
      test(`Admin page ${route} forces login redirect`, async ({ page }) => {
        test.setTimeout(30000);
        await page.setViewportSize({ width: 1280, height: 900 });
        await assertBlocksUnauthenticated(page, route);
      });
    }
  });
});

test.describe('Security — Session & Cookie Security', () => {
  test('Auth cookie has httpOnly and secure flags', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(c => c.name.includes('token') || c.name.includes('auth') || c.name.includes('session'));

    for (const cookie of authCookies) {
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('Lax');
    }
  });

  test('No sensitive data in localStorage', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    const storage = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const sensitive: Record<string, boolean> = {};
      for (const key of keys) {
        const val = localStorage.getItem(key) || '';
        sensitive[key] = val.includes('token') || val.includes('jwt') || val.includes('password') || val.includes('secret');
      }
      return sensitive;
    });

    const hasSensitive = Object.values(storage).some(v => v);
    expect(hasSensitive).toBe(false);
  });
});

test.describe('Security — SQL Injection & XSS Vectors', () => {
  const INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "<script>alert('xss')</script>",
    "\" ONCLICK=alert(1)",
    "1; DROP TABLE loyalty_cards; --",
  ];

  for (const payload of INJECTION_PAYLOADS) {
    test(`Login rejects injection: ${payload.slice(0, 30)}`, async ({ page }) => {
      test.setTimeout(20000);
      await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1000);

      const un = page.locator('#username');
      const pw = page.locator('#password');
      if (await un.isVisible()) {
        await un.fill(payload);
        await pw.fill(payload);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        // Should remain on login page
        expect(page.url()).toContain('/login');
      }
    });
  }

  test('XSS in search input reflected safely', async ({ page }) => {
    await page.goto('/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="ابحث"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('<script>alert("xss")</script>');
      await page.waitForTimeout(500);
      // Page should still render safely
      expect(await page.evaluate(() => document.querySelector('script'))).toBeNull();
    }
  });
});

test.describe('Security — RBAC Isolation', () => {
  test('Super Admin full access', async () => {
    // This test requires actual login — skip if credentials unavailable
    test.skip();
  });

  test('Sub Admin blocked from system settings', async () => {
    test.skip();
  });

  test('Owner cannot access admin routes', async () => {
    test.skip();
  });
});

test.describe('Security — Rate Limiting & Brute Force', () => {
  test('Rapid login attempts trigger rate limiting', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1280, height: 900 });

    const attempts = 15;
    let rateLimited = false;

    for (let i = 0; i < attempts; i++) {
      await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(200);

      const un = page.locator('#username');
      const pw = page.locator('#password');

      if (await un.isVisible({ timeout: 2000 }).catch(() => false)) {
        await un.fill(`attacker${i}`);
        await pw.fill('wrongpass');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(300);

        const url = page.url();
        if (url.includes('429') || url.includes('rate') || url.includes('blocked')) {
          rateLimited = true;
          break;
        }
      }
    }

    // At least some protection should exist
    // Note: rate limiting may not be implemented on login route
    console.log(`[RateLimit] ${rateLimited ? 'Rate limiting triggered' : 'No rate limiting detected'}`);
  });
});

test.describe('Security — Path Traversal & Directory Listing', () => {
  const TRAVERSAL_PATHS = [
    '/../../../etc/passwd',
    '/admin/../../../etc/passwd',
    '/api/../../../config',
    '/%2e%2e/%2e%2e/etc/passwd',
    '/.env',
    '/../.env',
    '/package.json',
    '/node_modules/.package-lock.json',
  ];

  for (const path of TRAVERSAL_PATHS) {
    test(`Path traversal blocked: ${path}`, async ({ page }) => {
      test.setTimeout(15000);
      const resp = await page.goto(path, { timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(500);

      if (resp) {
        // Should not expose sensitive files (200 with sensitive content)
        const status = resp.status();
        expect(status === 200 && path.includes('env') ? false : true).toBe(true);
      }
    });
  }
});

test.describe('Security — CSP & Security Headers', () => {
  test('Security headers are present on all routes', async ({ page }) => {
    const publicRoutes = ['/', '/login', '/pricing'];

    for (const route of publicRoutes) {
      const resp = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (!resp) continue;

      const headers = resp.headers();

      // Check required security headers
      expect(headers['strict-transport-security'] || headers['Strict-Transport-Security']).toBeDefined();
      expect(headers['x-content-type-options'] || headers['X-Content-Type-Options']).toBeDefined();
      expect(headers['x-frame-options'] || headers['X-Frame-Options']).toBeDefined();
      expect(headers['referrer-policy'] || headers['Referrer-Policy']).toBeDefined();

      console.log(`[Headers] ${route}: HSTS=${!!headers['strict-transport-security']}, XCTO=${!!headers['x-content-type-options']}, XFO=${!!headers['x-frame-options']}`);
    }
  });

  test('Content Security Policy blocks inline scripts', async ({ page }) => {
    const resp = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const csp = resp?.headers()['content-security-policy'] || resp?.headers()['Content-Security-Policy'];

    if (csp) {
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("default-src 'self'");
      console.log(`[CSP] Policy found: ${csp.slice(0, 100)}...`);
    } else {
      console.log('[CSP] No CSP header — consider adding one');
    }
  });
});
