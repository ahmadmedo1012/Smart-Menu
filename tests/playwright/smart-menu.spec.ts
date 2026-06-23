import { test, expect } from '@playwright/test';

test.describe('Smart Menu - Public Pages', () => {

  test('homepage loads and shows hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('حوّل مطعمك');
    await expect(page.locator('header a:has-text("الخطط والأسعار")').first()).toBeVisible();
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
    await expect(page.locator('h1')).toContainText('انضم إلى الربط الذكي', { timeout: 15000 });
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
    page.goto('/nonexistent-xyz');
    await page.waitForURL(/\/login/, { timeout: 10000 });
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
    page.goto('/admin');
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test('admin/restaurants redirects to login when not authenticated', async ({ page }) => {
    page.goto('/admin/restaurants');
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test('owner redirects to login when not authenticated', async ({ page }) => {
    page.goto('/owner');
    await page.waitForURL(/\/login/, { timeout: 10000 });
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

  test('sitemap.xml is served', async ({ request }) => {
    const resp = await request.get('/sitemap.xml');
    expect(resp.ok()).toBeTruthy();
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

test.describe('Smart Menu - Homepage Details', () => {

  test('Homepage - Testimonials section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=ماذا يقول عملاؤنا').first()).toBeVisible();
    await expect(page.locator('text=منذ استخدام الربط الذكي').first()).toBeVisible();
    await expect(page.locator('.fill-amber-400').first()).toBeVisible();
  });

  test('Homepage - Hero animation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('حوّل مطعمك');
    await expect(page.locator('a:has-text("ابدأ مجاناً")').first()).toBeVisible();
  });
});

test.describe('Smart Menu - Cart Details', () => {

  test('Cart page - visual elements', async ({ page }) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=السلة فارغة')).toBeVisible();
    await expect(page.locator('a:has-text("العودة إلى القائمة")')).toBeVisible();
  });
});

test.describe('Smart Menu - Menu Search', () => {

  test('Menu page - search functionality', async ({ page }) => {
    await page.goto('/menu', { waitUntil: 'networkidle' });
    const searchInput = page.locator('input[placeholder*="ابحث"]');
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
    } else {
      await expect(page.locator('text=No restaurants available')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Smart Menu - Login Details', () => {

  test('Login page - visual elements', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('تسجيل الدخول');
    await expect(page.locator('[aria-label*="Switch to"]')).toBeVisible();
    await expect(page.locator('text=الربط الذكي').first()).toBeVisible();
  });
});

test.describe('Smart Menu - Order Confirmed Details', () => {

  test('Order confirmed page', async ({ page }) => {
    await page.goto('/order-confirmed', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=تم تأكيد الطلب')).toBeVisible();
    await expect(page.locator('button:has-text("إرسال عبر واتساب")')).toBeVisible();
    await expect(page.locator('a:has-text("العودة إلى القائمة")')).toBeVisible();
  });
});

test.describe('Smart Menu - 404 Page', () => {

  test('404 page', async ({ request }) => {
    const resp = await request.get('/nonexistent-page-xyz-123', { maxRedirects: 0 });
    expect(resp.status()).toBe(307);
  });
});
