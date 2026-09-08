// r92-prod-audit — وكيل 1-a: تدقيق حي للإنتاج menu.smart-link.ly بمتصفح حقيقي
// قراءة فقط: لا تسجيل دخول، لا إرسال طلبات، لا POST/PUT/DELETE. تفاعل واجهة فقط
// (تصفية فئة + إضافة صنف للسلة محليًا + تبديل الوضع الداكن) دون إتمام أي طلب.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); // من node_modules المشروع

const BASE = 'https://menu.smart-link.ly';
const OUT = '/home/z/my-project/download/r92-audit';
mkdirSync(OUT, { recursive: true });

const EXEC = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const PAGES = [
    { name: 'home', path: '/' },
    { name: 'menu', path: '/menu/al-waha-cafe' },
    { name: 'menu-ewewe', path: '/menu/al-waha-cafeewewe' },
    { name: 'pricing', path: '/pricing' },
    { name: 'login', path: '/login' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function auditPage(browser, { name, path }) {
    const report = {
        page: name,
        path,
        url: BASE + path,
        consoleErrors: [],
        consoleWarnings: [],
        pageErrors: [],
        failedResponses: [],
        requestFailed: [],
        title: null,
        dir: null,
        lang: null,
        h1: null,
        domNodes: 0,
        images: { total: 0, broken: [], missingAlt: [], formats: {} },
        buttons: { total: 0, disabled: 0 },
        links: { total: 0, empty: 0 },
        perf: {},
        resources: { count: 0, transferBytes: 0, byType: {} },
        fonts: [],
    };

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        locale: 'ar-LY',
        extraHTTPHeaders: { 'Accept-Language': 'ar' },
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
        const t = msg.type();
        if (t === 'error') report.consoleErrors.push(msg.text().slice(0, 500));
        else if (t === 'warning') report.consoleWarnings.push(msg.text().slice(0, 300));
    });
    page.on('pageerror', (err) => report.pageErrors.push(String(err).slice(0, 500)));
    page.on('response', (res) => {
        const s = res.status();
        if (s >= 400) report.failedResponses.push({ status: s, url: res.url().slice(0, 300) });
    });
    page.on('requestfailed', (req) =>
        report.requestFailed.push({
            url: req.url().slice(0, 300),
            failure: req.failure()?.errorText,
        }),
    );

    try {
        const resp = await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
        report.httpStatus = resp?.status();
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await sleep(2500); // استقرار الصور/الحركات

        report.data = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const imgs = [...document.querySelectorAll('img')];
            const broken = [];
            const missingAlt = [];
            const formats = {};
            for (const img of imgs) {
                if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
                    broken.push(img.src.slice(0, 200));
                }
                if (!img.hasAttribute('alt')) missingAlt.push((img.src || '').slice(0, 120));
                const m = (img.currentSrc || img.src || '').match(/\.([a-z0-9]+)(?:\?|$)/i);
                if (m) formats[m[1].toLowerCase()] = (formats[m[1].toLowerCase()] || 0) + 1;
            }
            const resources = performance.getEntriesByType('resource');
            const byType = {};
            let transfer = 0;
            for (const r of resources) {
                transfer += r.transferSize || 0;
                const t = r.initiatorType || 'other';
                byType[t] = (byType[t] || 0) + 1;
            }
            const buttons = [...document.querySelectorAll('button')];
            const links = [...document.querySelectorAll('a')];
            return {
                title: document.title,
                dir: document.documentElement.getAttribute('dir'),
                lang: document.documentElement.getAttribute('lang'),
                h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 120) ?? null,
                domNodes: document.getElementsByTagName('*').length,
                images: {
                    total: imgs.length,
                    broken,
                    missingAlt,
                    formats,
                },
                buttons: {
                    total: buttons.length,
                    disabled: buttons.filter((b) => b.disabled).length,
                },
                links: {
                    total: links.length,
                    empty: links.filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
                },
                perf: nav
                    ? {
                          ttfbMs: Math.round(nav.responseStart - nav.requestStart),
                          domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
                          loadMs: Math.round(nav.loadEventEnd),
                          transferBytes: nav.transferSize || 0,
                          encodedBodyBytes: nav.encodedBodySize || 0,
                          decodedBodyBytes: nav.decodedBodySize || 0,
                      }
                    : {},
                resources: { count: resources.length, transferBytes: transfer, byType },
                fonts: [...document.fonts].map((f) => ({ family: f.family, status: f.status })),
            };
        });
        report.title = report.data.title;
        report.dir = report.data.dir;
        report.lang = report.data.lang;

        // LCP
        report.lcpMs = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    try {
                        const po = new PerformanceObserver((l) => {
                            const entries = l.getEntries();
                            resolve(entries.length ? Math.round(entries[entries.length - 1].startTime) : null);
                        });
                        po.observe({ type: 'largest-contentful-paint', buffered: true });
                    } catch {
                        resolve(null);
                    }
                    setTimeout(() => resolve(null), 3000);
                }),
        );

        await page.screenshot({ path: `${OUT}/shot-${name}.png` });
    } catch (e) {
        report.fatal = String(e).slice(0, 400);
    }
    await context.close();
    return report;
}

async function auditMenuInteractions(browser) {
    const out = { steps: [] };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-LY' });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 300)));
    page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 300)));

    const step = (name, ok, detail) => out.steps.push({ name, ok, detail });

    try {
        await page.goto(BASE + '/menu/al-waha-cafe', { waitUntil: 'load', timeout: 60000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await sleep(2000);

        // 1) overflow أفقي؟
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        step('no-horizontal-overflow', overflow <= 1, `scrollWidth delta = ${overflow}px`);

        // 2) الفئات
        const catGroup = page.locator('[aria-label="تصفية الأصناف حسب القسم"]');
        const catCount = await catGroup.locator('button').count();
        const catTexts = await catGroup.locator('button').allTextContents();
        step('category-filters-present', catCount > 1, `عدد أزرار الفئات: ${catCount} — [${catTexts.map((t) => t.trim()).join(' | ')}]`);

        const itemsBefore = await page.locator('button[aria-label^="إضافة"]').count();
        step('items-rendered', itemsBefore > 0, `أزرار إضافة ظاهرة: ${itemsBefore}`);

        // 3) تصفية فئة ثانية
        if (catCount > 1) {
            await catGroup.locator('button').nth(1).click();
            await sleep(1200);
            const itemsAfter = await page.locator('button[aria-label^="إضافة"]').count();
            step('category-filter-works', itemsAfter > 0 && itemsAfter !== itemsBefore, `بعد اختيار «${catTexts[1]?.trim()}»: ${itemsAfter} صنف (كان ${itemsBefore})`);
            await catGroup.locator('button').first().click();
            await sleep(1200);
        }

        // 4) إضافة صنف إلى السلة (تفاعل واجهة فقط — لا إرسال)
        const addBtn = page.locator('button[aria-label^="إضافة"]').first();
        await addBtn.click();
        await sleep(1500);
        const cartBtn = page.locator('[aria-label^="السلة -"]');
        const cartLabel = (await cartBtn.count()) ? await cartBtn.first().getAttribute('aria-label') : null;
        step('cart-add-works', !!cartLabel && !/0/.test(cartLabel ?? ''), `aria-label زر السلة بعد الإضافة: «${cartLabel}»`);
        await page.screenshot({ path: `${OUT}/shot-menu-cart.png` });

        // فتح السلة (Sheet محلي) ثم إغلاقها — لا إرسال
        if (await cartBtn.count()) {
            await cartBtn.first().click();
            await sleep(1500);
            const sheetVisible = await page.locator('[role="dialog"]').count();
            step('cart-sheet-opens', sheetVisible > 0, `dialogs: ${sheetVisible}`);
            await page.screenshot({ path: `${OUT}/shot-menu-cart-open.png` });
            const close = page.locator('[aria-label="إغلاق"]').first();
            if (await close.count()) {
                await close.click();
                await sleep(800);
            }
        }

        // 5) الوضع الداكن
        const themeBtn = page.locator('button[aria-label="الوضع الليلي"], button[aria-label="الوضع النهاري"]').first();
        if (await themeBtn.count()) {
            const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
            await themeBtn.click();
            await sleep(1000);
            const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
            step('theme-toggle-works', before !== after, `dark=${before} → dark=${after}`);
            await page.screenshot({ path: `${OUT}/shot-menu-dark.png` });
            await themeBtn.click(); // إرجاع
            await sleep(800);
        } else {
            step('theme-toggle-works', false, 'زر تبديل الوضع غير موجود في DOM');
        }

        out.consoleErrors = consoleErrors;
    } catch (e) {
        out.fatal = String(e).slice(0, 400);
    }
    await context.close();
    return out;
}

(async () => {
    const browser = await chromium.launch({ executablePath: EXEC, headless: true });
    const results = { pages: [], menuInteractions: null, generatedAt: new Date().toISOString() };

    for (const p of PAGES) {
        console.log(`audit: ${p.path}`);
        results.pages.push(await auditPage(browser, p));
    }
    console.log('audit: menu interactions (mobile)');
    results.menuInteractions = await auditMenuInteractions(browser);

    await browser.close();
    writeFileSync(`${OUT}/r92-browser-audit.json`, JSON.stringify(results, null, 2));
    console.log(`saved: ${OUT}/r92-browser-audit.json`);

    // ملخص سريع للكونسول
    for (const p of results.pages) {
        console.log(
            `  ${p.page}: status=${p.httpStatus} title="${p.title?.slice(0, 40)}" dom=${p.data?.domNodes} imgs=${p.data?.images.total} broken=${p.data?.images.broken.length} noAlt=${p.data?.images.missingAlt.length} consoleErr=${p.consoleErrors.length} failed4x5x=${p.failedResponses.length} ttfb=${p.data?.perf.ttfbMs}ms lcp=${p.lcpMs}ms`,
        );
        p.consoleErrors.slice(0, 3).forEach((e) => console.log(`    console: ${e.slice(0, 160)}`));
        p.failedResponses.slice(0, 3).forEach((f) => console.log(`    ${f.status}: ${f.url.slice(0, 140)}`));
    }
})();
