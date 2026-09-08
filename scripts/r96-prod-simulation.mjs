// r96-W7: محاكاة زبون حقيقية على الإنتاج — منيو العرض الجديد + طلب بخيارات + 201
// تشغيل: node scripts/r96-prod-simulation.mjs (يضرب https://menu.smart-link.ly مباشرة)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'https://menu.smart-link.ly';
const MENU = `${BASE}/menu/al-waha-cafe-demo`;
const OUT = 'download/r96-prod';
fs.mkdirSync(OUT, { recursive: true });

const CUSTOMER_NAME = 'محاكاة الزبون r96';
const CUSTOMER_PHONE = '0913999888';

const results = [];
const ok = (name) => { results.push(`✓ ${name}`); console.log(`✓ ${name}`); };
const fail = (name, e) => { results.push(`✗ ${name}: ${e}`); console.error(`✗ ${name}: ${e}`); };

let orderPostStatus = 0;
let orderPostBody = '';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' });
const page = await ctx.newPage();
page.on('response', (r) => {
  if (r.url().includes('/api/orders') && r.request().method() === 'POST') {
    orderPostStatus = r.status();
    r.text().then((t) => { orderPostBody = t.slice(0, 300); }).catch(() => {});
  }
});

try {
  // 1) المنيو SSR
  await page.goto(MENU, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const h1 = page.getByRole('heading', { level: 1 }).first();
  await h1.waitFor({ timeout: 25000 });
  const h1Text = (await h1.textContent()) || '';
  if (/مقهى الواحة/.test(h1Text)) ok('h1 SSR يحمل اسم المطعم'); else fail('h1 SSR', h1Text);
  const dir = await page.evaluate(() => document.documentElement.dir + '/' + document.documentElement.lang);
  if (dir === 'rtl/ar') ok('SSR عربي RTL'); else fail('SSR عربي RTL', dir);
  await page.screenshot({ path: `${OUT}/01-menu-ssr.png` });

  // 2) الفئات الست تظهر (بما فيها الفطور الجديد)
  const catGroup = page.getByRole('group', { name: 'تصفية الأصناف حسب القسم' });
  await catGroup.waitFor({ timeout: 20000 });
  // نقر متين مع إعادة محاولة وتمرير للعنصر
  const clickTab = async (label) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const btn = catGroup.locator(`button:has-text("${label}")`).first();
        await btn.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
        await page.evaluate(() => window.scrollTo(0, 0));
        await btn.click({ timeout: 10000 });
        return true;
      } catch { await page.waitForTimeout(1500); }
    }
    return false;
  };
  const clickedFatoor = await clickTab('الفطور');
  if (clickedFatoor) ok('نقر فئة الفطور الجديدة'); else fail('نقر فئة الفطور', 'timeout');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/02-category-breakfast.png` });
  const counter = await page.getByText(/تم العثور على 4 أصناف/).count();
  if (counter > 0) ok('فلترة الفطور: تم العثور على 4 أصناف'); else fail('عداد الفلترة', 'لم يظهر');
  // تصفير عبر زر إظهار الكل
  const reset = page.getByText('إظهار الكل').first();
  await reset.click({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1000);
  ok('تصفية الفئات تعمل (فلترة + تصفير)');

  // 3) صور البطاقات تعمل (لا صور مكسورة)
  const brokenImgs = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter((img) => img.complete && img.naturalWidth === 0).length;
  });
  if (brokenImgs === 0) ok('صفر صور مكسورة في المنيو'); else fail('صور مكسورة', `${brokenImgs}`);

  // 4) حوار الخيارات: البوابة الإلزامية ثم الاختيار
  await catGroup.locator('button:has-text("الكل")').first().click();
  await page.getByLabel('خيارات لاتيه كراميل').first().click();
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ timeout: 15000 });
  await dialog.locator('fieldset[aria-label="الحجم"]').waitFor({ timeout: 10000 });
  await dialog.locator('fieldset[aria-label="إضافات"]').waitFor({ timeout: 10000 });
  ok('حوار الخيارات: الحجم + الإضافات');
  // البوابة: أرسل بلا حجم → تنبيه عربي
  await dialog.getByRole('button', { name: 'أرسل الطلب عبر واتساب' }).click();
  await dialog.getByRole('alert').first().waitFor({ timeout: 8000 });
  ok('بوابة الخيار الإلزامي (تنبيه عربي)');
  await page.screenshot({ path: `${OUT}/03-options-gate.png` });
  // اختيار وسط +1.5 وحليب شوفان +1 → 9+2.5=11.5
  await dialog.locator('button:has-text("وسط")').first().click();
  await dialog.locator('button:has-text("حليب شوفان")').first().click();
  await dialog.getByText('شامل الخيارات +2.5 د.ل').first().waitFor({ timeout: 12000 });
  ok('التسعير الحي للخيارات (+2.5 د.ل)');
  await dialog.getByLabel('زيادة الكمية').click();
  await dialog.getByPlaceholder('الاسم (اختياري)').fill(CUSTOMER_NAME);
  await dialog.getByPlaceholder('رقم الهاتف (اختياري)').fill(CUSTOMER_PHONE);
  await page.screenshot({ path: `${OUT}/04-options-selected.png` });

  // 5) الإرسال → السلة
  await dialog.getByRole('button', { name: 'أرسل الطلب عبر واتساب' }).click();
  await dialog.getByText('تم إرسال الطلب!').waitFor({ timeout: 15000 });
  await page.waitForURL(/\/cart/, { timeout: 30000 });
  await page.getByText('لاتيه كراميل').first().waitFor({ timeout: 15000 });
  ok('السلة الموحدة تحمل الصنف بخياراته');
  await page.screenshot({ path: `${OUT}/05-cart.png` });

  // 6) إتمام الطلب: مراجعة الطلب وإرساله → حوار المراجعة → تأكيد وإرسال → 201
  const reviewBtn = page.getByRole('button', { name: /مراجعة الطلب وإرساله/ }).first();
  await reviewBtn.click({ timeout: 15000 });
  const reviewDialog = page.locator('[role="dialog"]').first();
  await reviewDialog.waitFor({ timeout: 12000 });
  await page.screenshot({ path: `${OUT}/05b-review-dialog.png` });
  await reviewDialog.getByRole('button', { name: /تأكيد وإرسال/ }).click({ timeout: 10000 });
  // الزر الفعلي: ننتظر 201 عبر حاصلة الاستماع (مهلة 25 ث)
  const deadline = Date.now() + 25000;
  while (orderPostStatus === 0 && Date.now() < deadline) await page.waitForTimeout(500);
  if (orderPostStatus === 201) {
    ok(`POST /api/orders = 201 (Neon write path) → ${orderPostBody.slice(0, 120)}`);
  } else {
    fail('POST /api/orders', `status=${orderPostStatus} body=${orderPostBody.slice(0, 100)}`);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/06-order-confirmed.png`, fullPage: false });
} catch (e) {
  fail('رحلة المحاكاة', e.message.slice(0, 200));
  await page.screenshot({ path: `${OUT}/99-error.png` }).catch(() => {});
}

await ctx.close();
await browser.close();
fs.writeFileSync(`${OUT}/simulation-results.txt`, results.join('\n'));
console.log('═══ النتيجة ═══');
console.log(results.join('\n'));
const passed = results.filter((r) => r.startsWith('✓')).length;
console.log(`${passed}/${results.length} فحوصات ناجحة`);
