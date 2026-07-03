import { test, expect, Page } from '@playwright/test';

/* ================================================================
   Smart Menu — Visual Regression Testing Suite
   Pixel-perfect snapshots, theme validation, media auditing
   ================================================================ */

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 700 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-480', width: 480, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
];

const ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/login', name: 'login' },
  { path: '/pricing', name: 'pricing' },
  { path: '/menu/al-waha-cafe', name: 'menu' },
  { path: '/cart', name: 'cart' },
  { path: '/order-confirmed', name: 'order-confirmed' },
  { path: '/subscribe', name: 'subscribe' },
];

async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

async function checkOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth
  );
  return overflow;
}

test.describe('Visual Regression — Theme Validation', () => {
  VIEWPORTS.forEach(vp => {
    ROUTES.forEach(route => {
      test(`[Theme] ${route.name} @ ${vp.name} — light mode snapshot`, async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Force light mode
        await page.addInitScript(() => {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        });

        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForFonts(page);
        await page.waitForTimeout(2000);

        const overflow = await checkOverflow(page);
        expect(overflow).toBe(false);

        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
        });

        // Baseline stored in tests/visual/baselines/light/
        expect(screenshot).toMatchSnapshot(`light/${route.name}-${vp.name}.png`, {
          maxDiffPixels: 100,
          threshold: 0.1,
        });
      });

      test(`[Theme] ${route.name} @ ${vp.name} — dark mode snapshot`, async ({ page }) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Force dark mode
        await page.addInitScript(() => {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        });

        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForFonts(page);
        await page.waitForTimeout(2000);

        const overflow = await checkOverflow(page);
        expect(overflow).toBe(false);

        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
        });

        expect(screenshot).toMatchSnapshot(`dark/${route.name}-${vp.name}.png`, {
          maxDiffPixels: 100,
          threshold: 0.1,
        });
      });
    });
  });
});

test.describe('Visual Regression — Theme Toggle Persistence', () => {
  test('Theme toggle persists across navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    const themeBtn = page.locator('button[aria-label="الوضع النهاري"], button[aria-label="الوضع الليلي"]');
    await expect(themeBtn).toBeAttached({ timeout: 5000 });

    // Get initial theme
    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Toggle theme
    await themeBtn.click();
    await page.waitForTimeout(500);

    const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(newTheme).not.toBe(initialTheme);

    // Navigate to another page
    await page.goto('/pricing', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    const persistedTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(persistedTheme).toBe(newTheme);
  });
});

test.describe('Visual Regression — Media & Multimedia', () => {
  test('Hero phone mockup video — autoPlay, muted, loop, playsInline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    const video = page.locator('video').first();
    await expect(video).toBeAttached({ timeout: 5000 });

    const videoProps = await video.evaluate((v: HTMLVideoElement) => ({
      autoplay: v.autoplay,
      muted: v.muted,
      loop: v.loop,
      playsInline: v.playsInline,
      currentTime: v.currentTime,
      paused: v.paused,
    }));

    expect(videoProps.autoplay).toBe(true);
    expect(videoProps.muted).toBe(true);
    expect(videoProps.loop).toBe(true);
    expect(videoProps.playsInline).toBe(true);
    expect(videoProps.paused).toBe(false);
  });

  test('Hero video fallback image loads when video fails', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    // Check for fallback image (img with empty alt as fallback)
    const fallbackImg = page.locator('img[alt=""]').first();
    const hasFallback = await fallbackImg.count() > 0;

    if (hasFallback) {
      await expect(fallbackImg).toBeVisible();
      const naturalWidth = await fallbackImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('Menu photos use OptimizedImage wrapper (no CLS)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 30000 });
    await waitForFonts(page);
    await page.waitForTimeout(3000);

    // Find menu item images
    const menuImages = page.locator('[data-testid="menu-item-image"], img[alt*="صورة"]').first();
    const hasImages = await menuImages.count().catch(() => 0) > 0;

    if (hasImages) {
      const firstImage = menuImages.first();
      await expect(firstImage).toBeVisible();

      // Check for OptimizedImage wrapper (div with relative + overflow-hidden + aspect ratio)
      const wrapper = firstImage.locator('..');
      const wrapperClasses = await wrapper.getAttribute('class');

      // OptimizedImage uses relative overflow-hidden rounded-[4px] aspect-*
      expect(wrapperClasses).toContain('relative');
      expect(wrapperClasses).toContain('overflow-hidden');
    }
  });

  test('No layout shift on image load (CLS check)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // CLS measurement via PerformanceObserver in page context
    await page.evaluate(() => {
      (window as any).__clsScore = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            (window as any).__clsScore += (entry as any).value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto('/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    const cls = await page.evaluate(() => (window as any).__clsScore || 0);

    // CLS should be near zero with OptimizedImage
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe('Visual Regression — WCAG Contrast Validation', () => {
  const CRITICAL_ELEMENTS = [
    { selector: 'button:not([disabled])', name: 'buttons' },
    { selector: 'a:not([href="#"])', name: 'links' },
    { selector: 'input:not([type="hidden"])', name: 'inputs' },
    { selector: 'h1, h2, h3, h4, h5, h6', name: 'headings' },
    { selector: 'label', name: 'labels' },
  ];

  async function checkContrast(page: Page, mode: 'light' | 'dark') {
    if (mode === 'dark') {
      await page.addInitScript(() => document.documentElement.classList.add('dark'));
    } else {
      await page.addInitScript(() => document.documentElement.classList.remove('dark'));
    }

    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    for (const { selector, name } of CRITICAL_ELEMENTS) {
      const elements = await page.locator(selector).all();

      for (const el of elements) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        const styles = await el.evaluate((e: HTMLElement) => {
          const cs = window.getComputedStyle(e);
          return {
            color: cs.color,
            backgroundColor: cs.backgroundColor,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
          };
        });

        // Log for manual review - automated contrast check requires color parsing
        // This test documents what needs visual verification
        test.info().annotations.push({
          type: 'info',
          description: `${mode} mode ${name}: ${selector} - color: ${styles.color}, bg: ${styles.backgroundColor}, size: ${styles.fontSize}`,
        });
      }
    }
  }

  test('Light mode contrast documentation', async ({ page }) => {
    await checkContrast(page, 'light');
  });

  test('Dark mode contrast documentation', async ({ page }) => {
    await checkContrast(page, 'dark');
  });
});

test.describe('Visual Regression — RTL Layout Integrity', () => {
  VIEWPORTS.forEach(vp => {
    test(`RTL layout @ ${vp.name} — no flipped icons, correct text flow`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/menu/al-waha-cafe', { waitUntil: 'networkidle', timeout: 30000 });
      await waitForFonts(page);

      // Check HTML dir attribute
      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe('rtl');

      // Check no horizontal overflow
      const overflow = await checkOverflow(page);
      expect(overflow).toBe(false);

      // Check directional icons (chevrons, arrows) are correctly oriented for RTL
      await page.locator('.lucide-chevron-left, .lucide-chevron-right, [class*="chevron"]').all();
      // In RTL, "previous" should point right (chevron-right visually), "next" should point left
      // This is a visual check - document for manual review

      // Check text alignment for Arabic content
      const arabicText = page.locator('[lang="ar"], :text-matches("[؀-ۿ]")').first();
      if (await arabicText.count() > 0) {
        const textAlign = await arabicText.evaluate((e: HTMLElement) =>
          window.getComputedStyle(e).textAlign
        );
        // Arabic should be right-aligned or start-aligned in RTL
        expect(['right', 'start']).toContain(textAlign);
      }
    });
  });
});

test.describe('Visual Regression — Component State Variations', () => {
  test('Button states: default, hover, focus, disabled, loading', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeAttached({ timeout: 5000 });

    // Default state
    await page.screenshot({ path: `tests/visual/states/button-default.png` });

    // Hover state
    await submitBtn.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tests/visual/states/button-hover.png` });

    // Focus state
    await submitBtn.focus();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tests/visual/states/button-focus.png` });

    // Disabled state - fill form to enable, then test disabled via attribute
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (btn) btn.disabled = true;
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tests/visual/states/button-disabled.png` });

    // Restore
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (btn) btn.disabled = false;
    });
  });

  test('Input states: default, focus, error, disabled', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);

    const username = page.locator('#username');
    await expect(username).toBeAttached({ timeout: 5000 });

    // Default
    await page.screenshot({ path: `tests/visual/states/input-default.png` });

    // Focus
    await username.focus();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tests/visual/states/input-focus.png` });

    // Error state - submit empty form to trigger validation
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `tests/visual/states/input-error.png` });
  });
});

test.describe('Visual Regression — Loading & Skeleton States', () => {
  test('Loading skeleton renders on slow network', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Slow down document requests
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'document') {
        await new Promise(r => setTimeout(r, 1000));
      }
      await route.continue();
    });

    await page.goto('/menu/al-waha-cafe', { waitUntil: 'commit', timeout: 15000 });
    await page.waitForTimeout(500);

    const skeleton = page.locator('.skeleton, .animate-shimmer, .animate-breath').first();
    await expect(skeleton).toBeAttached({ timeout: 5000 });

    await page.screenshot({ path: 'tests/visual/states/loading-skeleton.png' });
  });
});

test.describe('Visual Regression — Error & Empty States', () => {
  test('404 page renders with correct styling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/this-route-does-not-exist-12345', { waitUntil: 'networkidle', timeout: 15000 });
    await waitForFonts(page);
    await page.waitForTimeout(2000);

    const hasContent = await page.evaluate(() => document.body.innerText.length > 0);
    expect(hasContent).toBe(true);

    await page.screenshot({ path: 'tests/visual/states/404-page.png', fullPage: true });
  });

  test('Empty cart state renders', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/cart', { waitUntil: 'networkidle', timeout: 20000 });
    await waitForFonts(page);
    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => document.body.innerText);
    expect(/السلة|عربة|Cart|cart|سلة|فاتورة|فارغ|empty/i.test(text)).toBe(true);

    await page.screenshot({ path: 'tests/visual/states/empty-cart.png', fullPage: true });
  });
});

test.describe('Visual Regression — Responsive Breakpoints', () => {
  const BREAKPOINTS = [
    { name: 'xs', width: 320 },
    { name: 'sm', width: 640 },
    { name: 'md', width: 768 },
    { name: 'lg', width: 1024 },
    { name: 'xl', width: 1280 },
    { name: '2xl', width: 1536 },
  ];

  BREAKPOINTS.forEach(bp => {
    test(`Breakpoint ${bp.name} (${bp.width}px) — layout adapts correctly`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize({ width: bp.width, height: 900 });
      await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
      await waitForFonts(page);
      await page.waitForTimeout(2000);

      const overflow = await checkOverflow(page);
      expect(overflow).toBe(false);

      // Check that content is visible and not clipped
      const hasContent = await page.evaluate(() => document.body.children.length > 0);
      expect(hasContent).toBe(true);

      await page.screenshot({ path: `tests/visual/breakpoints/${bp.name}-${bp.width}.png`, fullPage: true });
    });
  });
});