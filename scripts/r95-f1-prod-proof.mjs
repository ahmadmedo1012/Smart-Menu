/**
 * Round 95 — FINAL production proof of the F1 referral fix (exact spec selectors)
 * Flow: menu → item dialog (واتساب order) → /cart → review → confirm → loyalty referral
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/z/my-project/download/r95-prod-final';
mkdirSync(OUT, { recursive: true });
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'https://menu.smart-link.ly';

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();

// stub wa.me so no real message is ever sent
await ctx.route('**/wa.me/**', (r) => r.fulfill({ status: 200, body: 'stub' }));

const loyaltyCalls = [];
page.on('response', async (r) => {
  if (r.url().endsWith('/api/loyalty') && r.request().method() === 'POST') {
    loyaltyCalls.push({ status: r.status(), body: (await r.text().catch(() => '')).slice(0, 150) });
  }
});

try {
  // 1. Menu page (wait for hydration — category group is the marker)
  await page.goto(`${BASE}/menu/al-waha-cafe`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[role="group"][aria-label="تصفية الأصناف حسب القسم"]').waitFor({ timeout: 20000 });
  console.log('menu hydrated ✓');

  // 2. Open a simple item (كابتشينو — no options needed on prod) via its options/add control
  const itemCard = page.locator('h2').filter({ hasText: 'كابتشينو' }).first();
  await itemCard.waitFor({ timeout: 10000 });
  // click the card's primary action: prefer the dedicated خيارات/add label
  const optBtn = page.getByLabel(/خيارات كابتشينو|أضف كابتشينو/).first();
  if (await optBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await optBtn.click();
  } else {
    await itemCard.click(); // fallback: open by title
  }
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ timeout: 10000 });

  // 3. Customer info inside the dialog + send
  await dialog.getByPlaceholder('الاسم (اختياري)').fill('مُحقق الإحالة 95');
  await dialog.getByPlaceholder('رقم الهاتف (اختياري)').fill('0915557799');
  await dialog.getByRole('button', { name: 'أرسل الطلب عبر واتساب' }).click();
  await dialog.getByText('تم إرسال الطلب!').waitFor({ timeout: 15000 });
  console.log('order dialog sent ✓');

  // 4. Auto-redirect to /cart
  await page.waitForURL(/\/cart/, { timeout: 25000 });
  const phone = page.locator('#cart-phone');
  await phone.waitFor({ timeout: 15000 });
  await phone.fill('0915557799');
  await page.getByRole('button', { name: 'مراجعة الطلب وإرساله' }).click();
  const review = page.locator('[role="dialog"]').first();
  await review.getByRole('heading', { name: 'مراجعة الطلب' }).waitFor({ timeout: 10000 });
  await review.getByRole('button', { name: 'تأكيد وإرسال' }).click();
  await page.waitForURL(/order-confirmed/, { timeout: 30000 });
  console.log('order-confirmed ✓:', page.url().slice(0, 110));
  await page.screenshot({ path: `${OUT}/f1-04-confirmed.png` });

  // 5. Loyalty dialog auto-opens (~1.2s) → phone → referral link
  const loyPhone = page.locator('#shareafter-phone');
  await loyPhone.waitFor({ state: 'visible', timeout: 20000 });
  await loyPhone.fill('0915557799');
  await page.getByRole('button', { name: /احصل على رابط الإحالة/ }).click();
  await page.getByText('رابط الإحالة الخاص بك').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/f1-05-referral-link.png` });
  const linkEl = page.locator('[dir="ltr"]').filter({ hasText: /ref=/ }).first();
  const linkText = (await linkEl.textContent().catch(() => '')) || '';
  console.log('LOYALTY CALLS:', JSON.stringify(loyaltyCalls));
  console.log('REFERRAL LINK:', linkText.trim().slice(0, 110));
  const ok = loyaltyCalls.some((c) => c.status === 200) && /ref=/.test(linkText);
  console.log(ok ? 'F1 FIX VERIFIED ON PRODUCTION ✅' : 'F1 STILL BROKEN ❌');
} catch (e) {
  console.log('ERR:', e.message.split('\n')[0]);
  await page.screenshot({ path: `${OUT}/f1-error.png` }).catch(() => {});
  console.log('LOYALTY CALLS:', JSON.stringify(loyaltyCalls));
}
await browser.close();
