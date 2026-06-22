import { test, expect } from '@playwright/test';

test.describe('Smart Menu - Public Pages', () => {

  test('homepage loads and shows hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('حوّل مطعمك');
    await expect(page.locator('nav a:has-text("الخطط والأسعار")').first()).toBeVisible();
  });

  test('pricing page loads and shows plan table', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('اختر خطتك');
    await expect(page.locator('text=شهري').first()).toBeVisible();
  });

  test('login page has form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('تسجيل الدخول');
  });

  test('subscribe page loads with plan selection', async ({ page }) => {
    await page.goto('/subscribe');
    await expect(page.locator('text=اختر خطة تناسب مطعمك')).toBeVisible();
  });

  test('menu redirects to first restaurant or shows empty state', async ({ page }) => {
    await page.goto('/menu');
    const currentUrl = page.url();
    if (currentUrl.includes('/menu/') && !currentUrl.endsWith('/menu')) {
      await expect(page.locator('h1')).toBeVisible();
    } else {
      expect(currentUrl).toContain('/menu');
    }
  });

  test('unknown route redirects to login via proxy', async ({ page }) => {
    await page.goto('/nonexistent-xyz', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login/);
  });

  test('cart page shows empty state', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('text=السلة فارغة')).toBeVisible();
  });

  test('order-confirmed shows confirmation', async ({ page }) => {
    await page.goto('/order-confirmed');
    await expect(page.locator('text=تم تأكيد الطلب')).toBeVisible();
  });
});

test.describe('Smart Menu - Auth Redirects', () => {

  test('admin redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin/restaurants redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/restaurants');
    await expect(page).toHaveURL(/\/login/);
  });

  test('owner redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/owner');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Smart Menu - SEO & Static Files', () => {

  test('robots.txt is served with directives', async ({ request }) => {
    const resp = await request.get('/robots.txt');
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    expect(text.toLowerCase()).toContain('user-agent');
    expect(text).toContain('Disallow');
  });

  test('sitemap.xml is served', async ({ page }) => {
    const resp = await page.goto('/sitemap.xml');
    expect(resp?.ok()).toBeTruthy();
  });

  test('favicon.ico is served', async ({ page }) => {
    const resp = await page.goto('/favicon.ico');
    expect(resp?.ok()).toBeTruthy();
  });

  test('manifest.json is served', async ({ page }) => {
    const resp = await page.goto('/manifest.json');
    expect(resp?.ok()).toBeTruthy();
  });
});
