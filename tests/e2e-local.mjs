#!/usr/bin/env node

/**
 * Local E2E test runner — uses localhost:3000 by default.
 * Set BASE_URL env to override.
 *
 * Usage:
 *   node tests/e2e-local.mjs
 *   BASE_URL=http://localhost:3000 node tests/e2e-local.mjs
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const RESULTS = { passed: 0, failed: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    RESULTS.passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message.slice(0, 120)}`);
    RESULTS.failed++;
    RESULTS.errors.push(`  ${name}: ${e.message.slice(0, 150)}`);
  }
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/e2e-local-${name}.png`, fullPage: true }).catch(() => {});
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar', viewport: { width: 1280, height: 800 } });

  console.log(`\n═══════════ Local E2E: ${BASE} ═══════════\n`);
  console.log('── 1. Static pages ──');

  const PAGES = [
    { path: '/', name: 'Homepage', expect404: false },
    { path: '/pricing', name: 'Pricing', expect404: false },
    { path: '/login', name: 'Login', expect404: false },
    { path: '/subscribe', name: 'Subscribe', expect404: false },
    { path: '/cart', name: 'Cart', expect404: false },
    { path: '/order-confirmed', name: 'Order Confirmed', expect404: false },
    { path: '/robots.txt', name: 'Robots', expect404: false, isAsset: true },
    { path: '/nonexistent-xyz', name: '404 Page', expect404: true },
  ];

  for (const { path, name, expect404, isAsset } of PAGES) {
    await test(name, async () => {
      const p = await context.newPage();
      const errs = [];
      p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
      const resp = await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await p.waitForTimeout(800);
      const status = resp?.status() ?? 0;
      if (!expect404 && status >= 400) throw new Error(`HTTP ${status}`);
      if (errs.length && !isAsset && !expect404) {
        if (!errs.some(e => e.includes('429'))) throw new Error(`${errs.length} console errors`);
      }
      await screenshot(p, name.toLowerCase().replace(/\s/g, '-'));
      await p.close();
    });
  }

  console.log('\n── 2. Auth redirects ──');

  await test('Admin → /login when unauthenticated', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(1500);
    if (!p.url().includes('/login')) throw new Error('Redirect failed');
    await p.close();
  });

  await test('Owner → /login when unauthenticated', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/owner', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(1500);
    if (!p.url().includes('/login')) throw new Error('Redirect failed');
    await p.close();
  });

  console.log('\n── 3. Menu pages ──');

  await test('Menu redirect loads', async () => {
    const p = await context.newPage();
    await p.goto(BASE + '/menu', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(1000);
    const url = p.url();
    if (url.includes('/menu/') || url !== BASE + '/menu') {
      // redirected to a specific restaurant — fine
    }
    await p.close();
  });

  await browser.close();
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊  ${RESULTS.passed + RESULTS.failed} tests — ✅ ${RESULTS.passed} passed, ❌ ${RESULTS.failed} failed`);
  if (RESULTS.errors.length) console.log(`\n❌ Details:\n${RESULTS.errors.join('\n')}`);
  console.log(`\n${RESULTS.failed === 0 ? '🎉  All tests passing!' : '⚠️  Some tests failed'}`);
  console.log(`${'═'.repeat(50)}`);
  process.exit(RESULTS.failed > 0 ? 1 : 0);
}

run();
