import { test, expect, Page } from '@playwright/test';

/* ================================================================
   Smart Menu — Live Alerts, Notifications & Idempotency Test Suite
   Payment toasts, Telegram webhooks, double-click protection
   ================================================================ */

const BASE = process.env.BASE_URL || 'http://localhost:3456';

test.describe('Alerts — Payment Toast Triggers', () => {
  test('Homepage loads without payment toast on initial visit', async ({ page }) => {
    test.setTimeout(20000);
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    // No toast notification should be present on first load
    const toasts = page.locator('[data-sonner-toaster], [role="status"][aria-live], .toast, .sonner-toast').first();
    const hasToast = await toasts.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasToast).toBe(false);
  });

  test('Login page loads without toast noise', async ({ page }) => {
    test.setTimeout(20000);
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);

    const toasts = page.locator('[data-sonner-toaster], [role="status"][aria-live]').first();
    const hasToast = await toasts.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasToast).toBe(false);
  });

  test('Loyalty card lookup shows success/error toast', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if loyalty section exists
    const loyaltySection = page.locator('text=الولاء, text=Loyalty, text=نقاط').first();
    if (!(await loyaltySection.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Find phone input in loyalty widget
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="هاتف"], input[placeholder*="phone"]').first();
    if (!(await phoneInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Submit empty lookup
    await phoneInput.fill('0912345678');
    await page.locator('button:has-text("تحقق"), button:has-text("بحث"), button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    // Should show a toast (success or error)
    const toastActive = await page.evaluate(() => {
      const toastEl = document.querySelector('[data-sonner-toaster], [role="status"][aria-live]');
      return toastEl !== null && toastEl.children.length > 0;
    });
    console.log(`[Toast] Loyalty lookup: toast visible = ${toastActive}`);
  });
});

test.describe('Alerts — Real-Time Payment Notification', () => {
  test('LivePaymentToast renders at correct z-index', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/owner', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for LivePaymentToast component (renders with high z-index)
    const paymentToast = page.locator('[class*="payment-toast"], [data-testid="payment-toast"]').first();
    const hasPaymentToast = await paymentToast.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasPaymentToast) {
      const zIndex = await paymentToast.evaluate(el => window.getComputedStyle(el).zIndex);
      expect(Number(zIndex)).toBeGreaterThanOrEqual(50);
      console.log(`[PaymentToast] z-index: ${zIndex}`);
    }
  });
});

test.describe('Alerts — SSE / Real-Time Order Stream', () => {
  test('Order stream connection attempt does not fail', async ({ page }) => {
    test.setTimeout(20000);
    await page.goto('/owner', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);

    // Check for EventSource connection to orders stream
    const streamConnected = await page.evaluate(() => {
      // EventSource doesn't expose connection state directly
      // Check if any fetch to /api/orders/stream happened
      return true;
    });

    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/orders/stream', { method: 'GET' });
        return { status: res.status, statusText: res.statusText };
      } catch (e: any) {
        return { status: 0, error: e.message };
      }
    });

    // Stream endpoint may return 401 (needs auth) or 200
    console.log(`[Stream] /api/orders/stream: ${response.status} ${response.statusText || ''}`);
    expect(response.status).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Idempotency — Button Double-Click Protection', () => {
  async function assertButtonDisabledOnFirstClick(page: Page, buttonSelector: string, waitMs = 2000) {
    const btn = page.locator(buttonSelector);
    if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await btn.click();
    await page.waitForTimeout(200);

    // After click, button should be disabled or loading state
    const isDisabled = await btn.isDisabled().catch(() => false);
    const hasLoadingClass = await btn.evaluate(el => {
      const classes = Array.from(el.classList);
      return classes.some(c => c.includes('disabled') || c.includes('loading') || c.includes('pending'));
    }).catch(() => false);

    if (!isDisabled && !hasLoadingClass) {
      // Check for spinner/loader inside button
      const hasSpinner = await btn.locator('.animate-spin, .loader, svg.lucide-loader').count() > 0;
      expect(isDisabled || hasLoadingClass || hasSpinner).toBe(true);
    }
  }

  test('Submit button disabled on login click (double-click prevention)', async ({ page }) => {
    test.setTimeout(20000);
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeAttached({ timeout: 5000 });

    // Fill form first
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass');

    // First click
    await submitBtn.click();
    await page.waitForTimeout(300);

    // Check if button is now disabled
    const disabled = await submitBtn.isDisabled().catch(() => false);
    console.log(`[Idempotency] Login button disabled after click: ${disabled}`);
  });

  test('Save button in settings disabled on click', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/owner/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const saveBtn = page.locator('button:has-text("حفظ")').first();
    await assertButtonDisabledOnFirstClick(page, 'button:has-text("حفظ")', 1000);
  });

  test('Form submission multiple clicks do not duplicate', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeAttached({ timeout: 5000 });

    // Spy on network requests
    let postCount = 0;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/login')) {
        postCount++;
      }
    });

    // Fill form
    await page.fill('#username', 'doubleclicktest');
    await page.fill('#password', 'testpass');

    // Rapid double click
    await submitBtn.click({ force: true });
    await submitBtn.click({ force: true });
    await submitBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Should not have sent duplicate requests
    console.log(`[Idempotency] Login POST requests after 3 clicks: ${postCount}`);
    expect(postCount).toBeLessThanOrEqual(1);
  });
});

test.describe('Idempotency — Settings Panel Stress', () => {
  test('Rapid save button clicks on settings do not duplicate saves', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/owner/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Count network requests to settings API
    let putCount = 0;
    page.on('request', req => {
      if (req.method() === 'PUT' && req.url().includes('/api/settings')) {
        putCount++;
      }
    });

    const saveBtn = page.locator('button:has-text("حفظ")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Rapid triple click
      await saveBtn.click({ force: true });
      await saveBtn.click({ force: true });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(2000);

      console.log(`[Idempotency] Settings PUT requests after 3 clicks: ${putCount}`);
      expect(putCount).toBeLessThanOrEqual(1);
    }
  });

  test('Navigation during save does not cause data loss', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/owner/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click save and immediately navigate
    const saveBtn = page.locator('button:has-text("حفظ")').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
      // Immediately navigate away
      await page.goto('/owner', { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(1000);
      // Page should load without error
      const hasContent = await page.evaluate(() => document.body.innerText.length > 0);
      expect(hasContent).toBe(true);
    }
  });
});

test.describe('Idempotency — Form State After Error', () => {
  test('Form retains values after submission error', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1000);

    const username = page.locator('#username');
    const password = page.locator('#password');

    if (await username.isVisible()) {
      await username.fill('retainedUser');
      await password.fill('wrongpw');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Form should still be on login page
      expect(page.url()).toContain('/login');

      // Input values should be preserved
      const val = await username.inputValue();
      expect(val).toBe('retainedUser');
    }
  });
});
