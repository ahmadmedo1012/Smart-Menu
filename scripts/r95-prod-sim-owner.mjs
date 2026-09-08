/**
 * Round 95-E — PRODUCTION user simulation — Journey 2: new restaurant owner.
 * Target: https://menu.smart-link.ly (commit 931d6cd5).
 *
 * Register → dashboard → menu CRUD (category + 2 items, one with an options
 * group) → public menu check → QR → CLEANUP (delete items + category; primary
 * restaurant deletion is attempted and documented) → logout + auth guard.
 * Evidence shots under download/r95-prod-sim/ (o1..o8).
 *
 * Run: node scripts/r95-prod-sim-owner.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/z/my-project/download/r95-prod-sim';
mkdirSync(OUT, { recursive: true });
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'https://menu.smart-link.ly';

const ts = Date.now().toString().slice(-8);
const OWNER = `sim95-${ts}`;
const PASSWORD = 'Sim95#Pass95';
const REST_NAME = 'مطعم محاكاة 95';
const SLUG = 'sim95-cafe';
const CAT_NAME = 'مشروبات sim95';
const ITEM_A = 'كابتشينو sim95'; // with an options group (الحجم)
const ITEM_B = 'شاي sim95';

const results = [];
const consoleErrors = [];
const pageErrors = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? '✓' : '✗'} [${id}] ${detail}`);
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

let loginPostStatus = 0;
let registerPostStatus = 0;
page.on('response', (r) => {
  if (r.url().endsWith('/api/auth/login') && r.request().method() === 'POST') loginPostStatus = r.status();
  if (r.url().endsWith('/api/auth/register') && r.request().method() === 'POST') registerPostStatus = r.status();
});

const toastText = async (p, ms = 3500) => {
  await p.waitForTimeout(ms);
  const t = await p.locator('[role="alert"]').allInnerTexts().catch(() => []);
  return t.join(' | ').trim();
};

try {
  // ── o1: login page ──
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2200);
  const loginStyles = await page.evaluate(() => {
    const card = document.querySelector('main .rounded-2xl') ?? document.querySelector('form')?.closest('div');
    return {
      htmlClass: document.documentElement.className,
      cardBg: card ? getComputedStyle(card).backgroundColor : null,
      hasUserField: !!document.querySelector('input[placeholder="اسم المستخدم"]'),
      hasPassField: !!document.querySelector('input[placeholder="كلمة المرور"]'),
    };
  });
  await page.screenshot({ path: `${OUT}/o1-login.png` });
  check('o1.login', loginStyles.hasUserField && loginStyles.hasPassField && loginStyles.htmlClass.includes('dark'),
    `login card present (user/pass fields), html class="${loginStyles.htmlClass}", card bg=${loginStyles.cardBg}`);

  // ── o2: wrong credentials ──
  await page.getByPlaceholder('اسم المستخدم').fill('sim95-ghost-nope');
  await page.getByPlaceholder('كلمة المرور').fill('WrongPassword!95');
  await page.locator('button[type="submit"], button:has-text("دخول")').first().click();
  await page.waitForTimeout(4500);
  const errToast = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
  const errText = errToast.join(' | ');
  await page.screenshot({ path: `${OUT}/o2-login-error.png` });
  check('o2.loginError', loginPostStatus >= 400 && loginPostStatus < 500 && errText.length > 0,
    `wrong login → POST /api/auth/login = ${loginPostStatus} (no 5xx) · visible message: "${errText}"`);

  // ── o3: register a new owner via /subscribe (free plan) ──
  await page.goto(`${BASE}/subscribe`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  // choose the free plan
  await page.locator('button').filter({ hasText: 'مجاني' }).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.locator('button').filter({ hasText: 'مجاني' }).first().click();
  const cta = page.locator('button').filter({ hasText: 'متابعة مع خطة' }).first();
  await page.waitForTimeout(1500); // let the plan selection land
  await cta.click({ timeout: 20000 }); // click auto-waits for enabled
  await page.getByRole('heading', { name: 'بيانات المنيوهات' }).waitFor({ state: 'visible', timeout: 20000 });

  // menu (restaurant) step — THE restaurant is created inside the signup wizard
  await page.getByPlaceholder('اسم المطعم (مثال: مقهى الواحة)').fill(REST_NAME);
  await page.getByPlaceholder('الرابط المختصر (مثال: al-waha-cafe)').fill(SLUG);
  await page.getByPlaceholder('وصف المطعم (اختياري)').fill('مطعم اختباري أنشأه وكيل المحاكاة 95-E — سيُحذف محتواه بعد الجولة');
  await page.getByPlaceholder('رقم الهاتف (مثال: 0912345678)').fill('0912345678');
  await page.getByPlaceholder('رقم الواتساب (مثال: 0912345678)').fill('0912345678');
  // advance to the account step
  await page.locator('button:has-text("التالي")').first().click();
  await page.getByPlaceholder('اسم المستخدم (3 أحرف على الأقل)').waitFor({ state: 'visible', timeout: 20000 });
  await page.getByPlaceholder('اسم المستخدم (3 أحرف على الأقل)').fill(OWNER);
  await page.getByPlaceholder(/^كلمة المرور/).fill(PASSWORD);
  // advance to the review step
  await page.locator('button:has-text("التالي")').first().click();
  await page.getByRole('heading', { name: 'راجع بياناتك ثم أكّد' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/o3-register.png` });
  check('o3.subscribeForm', true, `subscribe wizard reached the review step (free plan, user=${OWNER}, restaurant="${REST_NAME}", slug=${SLUG})`);

  // create the account
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  await page.waitForURL(/\/owner/, { timeout: 30000 }).catch(() => {});
  if (!page.url().includes('/owner')) {
    // single retry after the register rate-limit window (production pattern)
    await page.waitForTimeout(15000);
    const retry = page.locator('button:has-text("إنشاء الحساب والبدء")');
    if (await retry.count()) {
      await retry.first().click();
      await page.waitForURL(/\/owner/, { timeout: 30000 }).catch(() => {});
    }
  }
  const dashBody = await page.locator('body').innerText().catch(() => '');
  check('o3.register', page.url().includes('/owner') && registerPostStatus === 201,
    `POST /api/auth/register → ${registerPostStatus} · auto-login redirect → ${page.url()} · dashboard text visible=${dashBody.includes('لوحة التحكم')}`);

  // ── o4: dashboard ──
  await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);
  const bodyTxt = await page.locator('body').innerText();
  const kpiOk = bodyTxt.includes('إجمالي الطلبات') && bodyTxt.includes('طلبات اليوم') && bodyTxt.includes('الأصناف');
  const activeOk = bodyTxt.includes('متصل — يستقبل الطلبات');
  await page.screenshot({ path: `${OUT}/o4-dashboard.png` });
  check('o4.dashboard', kpiOk && activeOk,
    `dashboard KPIs (إجمالي الطلبات/طلبات اليوم/الأصناف)=${kpiOk}, "متصل — يستقبل الطلبات"=${activeOk}`);

  // ── o5: restaurants page (the created restaurant) ──
  await page.goto(`${BASE}/owner/restaurants`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const restBody = await page.locator('body').innerText();
  const restOk = restBody.includes(REST_NAME) && restBody.includes(`/menu/${SLUG}`) && restBody.includes('الأساسي');
  await page.screenshot({ path: `${OUT}/o5-restaurant-create.png` });
  check('o5.restaurant', restOk,
    `restaurants page lists "${REST_NAME}" /menu/${SLUG} with «الأساسي» badge=${restOk} (created via the signup wizard — free plan maxMenus=1)`);

  // curious owner: try adding a SECOND menu → expect free-plan cap error
  await page.getByRole('button', { name: 'إضافة منيو جديد' }).click();
  await page.getByLabel('اسم المطعم *').fill('منيو sim95 ثانٍ');
  await page.getByLabel('الرابط المختصر *').fill('sim95-cafe-2');
  await page.locator('div').filter({ hasText: /^منيو جديد/ }).getByRole('button', { name: 'إضافة', exact: true }).click();
  const capToast = await toastText(page, 4000);
  await page.screenshot({ path: `${OUT}/o5b-second-menu-cap.png` });
  check('o5.planCap', capToast.length > 0 && !capToast.includes('تمت إضافة'),
    `second-menu attempt on free plan blocked with message: "${capToast.slice(0, 160)}"`);

  // ── o6: menu CRUD — category + 2 items ──
  await page.goto(`${BASE}/owner/menu`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'إدارة المنيو' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(1500);

  // category
  await page.getByRole('button', { name: 'تصنيف جديد' }).click();
  let catDialog = page.locator('[role="dialog"]').first();
  await catDialog.getByRole('heading', { name: 'إضافة تصنيف' }).waitFor({ state: 'visible', timeout: 10000 });
  await catDialog.getByPlaceholder('مشروبات ساخنة').fill(CAT_NAME);
  await catDialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  const catToast = await page.getByText('تمت الإضافة').first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  await page.getByText(CAT_NAME, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  check('o6.category', catToast, `category "${CAT_NAME}" created (toast "تمت الإضافة"=${catToast})`);

  // item A with an options group
  const catCard = page.locator('div.rounded-md').filter({ hasText: CAT_NAME }).first();
  await catCard.click();
  await page.waitForTimeout(900);
  await catCard.getByRole('button', { name: 'إضافة صنف' }).first().click();
  let itemDialog = page.locator('[role="dialog"]').first();
  await itemDialog.getByRole('heading', { name: 'إضافة صنف' }).waitFor({ state: 'visible', timeout: 10000 });
  await itemDialog.getByPlaceholder('كابتشينو').fill(ITEM_A);
  await itemDialog.getByLabel('السعر (د.ل)').fill('12');
  await itemDialog.getByRole('button', { name: 'إضافة مجموعة خيارات' }).click();
  await itemDialog.getByPlaceholder('الحجم').fill('الحجم');
  await itemDialog.getByLabel('الحد الأدنى').fill('1');
  await itemDialog.getByRole('button', { name: 'إضافة خيار إلى المجموعة رقم 1' }).click();
  await itemDialog.getByPlaceholder('مثال: كبير').first().fill('كبير');
  await itemDialog.getByLabel('السعر ± (د.ل)').first().fill('2');
  // second option (وسط +1.5) — best-effort
  try {
    await itemDialog.getByRole('button', { name: 'إضافة خيار إلى المجموعة رقم 1' }).click();
    await itemDialog.getByPlaceholder('مثال: كبير').last().fill('وسط');
    await itemDialog.getByLabel('السعر ± (د.ل)').last().fill('1.5');
  } catch (e) {
    check('o6.option2', false, `second option row could not be added: ${String(e).split('\n')[0]}`);
  }
  await page.screenshot({ path: `${OUT}/o6-item-a-dialog.png` });
  await itemDialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  await page.getByText('تمت إضافة الصنف').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(ITEM_A, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });

  // item B (plain)
  const catCard2 = page.locator('div.rounded-md').filter({ hasText: CAT_NAME }).first();
  await catCard2.getByRole('button', { name: 'إضافة صنف' }).first().click();
  itemDialog = page.locator('[role="dialog"]').first();
  await itemDialog.getByRole('heading', { name: 'إضافة صنف' }).waitFor({ state: 'visible', timeout: 10000 });
  await itemDialog.getByPlaceholder('كابتشينو').fill(ITEM_B);
  await itemDialog.getByLabel('السعر (د.ل)').fill('8');
  await itemDialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  await page.getByText('تمت إضافة الصنف').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(ITEM_B, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/o6-menu-crud.png` });
  check('o6.items', true, `2 items created: "${ITEM_A}" (12 د.ل + خيارات الحجم: كبير +2 / وسط +1.5) و "${ITEM_B}" (8 د.ل)`);

  // ── o6b: public menu shows the new restaurant with the options flow ──
  const custCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
  const custPage = await custCtx.newPage();
  try {
    await custPage.goto(`${BASE}/menu/${SLUG}`, { waitUntil: 'networkidle', timeout: 90000 });
    await custPage.waitForTimeout(3000);
    const h1 = await custPage.evaluate(() => document.querySelector('h1')?.textContent?.trim());
    const pill = await custPage.getByText('خيارات متاحة').first().isVisible().catch(() => false);
    // open the item with options → fieldset + choose → total updates
    const cardH2 = custPage.locator('h2').filter({ hasText: ITEM_A }).first();
    await cardH2.scrollIntoViewIfNeeded();
    await cardH2.click();
    const dlg = custPage.locator('[role="dialog"]').first();
    await dlg.waitFor({ state: 'visible', timeout: 10000 });
    const fs = dlg.locator('fieldset[aria-label="الحجم"]');
    const fsVisible = await fs.isVisible().catch(() => false);
    let gateOk = null; let totalAfter = null;
    if (fsVisible) {
      await dlg.getByRole('button', { name: 'أرسل الطلب عبر واتساب' }).click();
      const alertTxt = await dlg.getByRole('alert').first().innerText().catch(() => '');
      gateOk = /الحجم/.test(alertTxt);
      await dlg.locator('button').filter({ hasText: 'كبير' }).first().click();
      await custPage.waitForTimeout(700);
      totalAfter = await dlg.getByText('14').first().isVisible().catch(() => false);
    }
    await custPage.screenshot({ path: `${OUT}/o6b-public-menu-options.png` });
    check('o6b.publicOptions', /مطعم محاكاة 95/.test(h1 ?? '') && pill && fsVisible,
      `public menu /menu/${SLUG}: h1="${h1}", «خيارات متاحة» pill=${pill}, الحجم fieldset=${fsVisible}, required-gate alert=${gateOk}, total 12→14=${totalAfter}`);
    await custPage.keyboard.press('Escape').catch(() => {});
  } catch (e) {
    check('o6b.publicOptions', false, `public menu check interrupted: ${String(e).split('\n')[0]}`);
  } finally {
    await custCtx.close();
  }

  // ── o7: QR page ──
  await page.goto(`${BASE}/owner/qr`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'رمز QR' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2500);
  const qrImg = page.locator('img[src*="qrserver"]').first();
  const qrImgVisible = await qrImg.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  const qrUrlVal = await page.locator('#qr-url-input').inputValue().catch(() => '');
  await page.screenshot({ path: `${OUT}/o7-qr.png` });
  check('o7.qr', qrImgVisible && qrUrlVal.includes(`/menu/${SLUG}`),
    `QR page: image loaded=${qrImgVisible}, menu URL field="${qrUrlVal}"`);

  // ── o8a: CLEANUP — delete the 2 items + the category ──
  await page.goto(`${BASE}/owner/menu`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('heading', { name: 'إدارة المنيو' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2000);
  const catCard3 = page.locator('div.rounded-md').filter({ hasText: CAT_NAME }).first();
  await catCard3.click();
  await page.waitForTimeout(900);
  const deletedItems = [];
  for (const itemName of [ITEM_A, ITEM_B]) {
    try {
      const row = catCard3.locator('div.px-5.py-3').filter({ hasText: itemName }).first();
      await row.getByTitle('حذف').click();
      const confirmDlg = page.locator('[role="dialog"]').filter({ hasText: 'تأكيد الحذف' }).first();
      await confirmDlg.getByRole('button', { name: 'حذف', exact: true }).click();
      await page.getByText('تم الحذف').first().waitFor({ state: 'visible', timeout: 10000 });
      deletedItems.push(itemName);
      await page.waitForTimeout(1200);
    } catch (e) {
      check(`o8.itemDelete.${itemName}`, false, `delete failed: ${String(e).split('\n')[0]}`);
    }
  }
  // category delete
  let catDeleted = false;
  try {
    const catCard4 = page.locator('div.rounded-md').filter({ hasText: CAT_NAME }).first();
    await catCard4.getByTitle('حذف').first().click();
    const confirmDlg = page.locator('[role="dialog"]').filter({ hasText: 'تأكيد الحذف' }).first();
    await confirmDlg.getByRole('button', { name: 'حذف', exact: true }).click();
    await page.getByText('تم الحذف').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1500);
    catDeleted = !(await page.getByText(CAT_NAME, { exact: true }).first().isVisible().catch(() => false));
  } catch (e) {
    check('o8.catDelete', false, `category delete failed: ${String(e).split('\n')[0]}`);
  }
  await page.screenshot({ path: `${OUT}/o8a-cleanup-menu.png` });
  check('o8.cleanupItems', deletedItems.length === 2,
    `deleted via UI: ${deletedItems.join(' + ')}${deletedItems.length === 2 ? '' : ' (partial!)'}`);
  check('o8.cleanupCategory', catDeleted, `category "${CAT_NAME}" deleted=${catDeleted}`);

  // ── o8b: restaurant deletion attempt (primary → expect blocked) ──
  await page.goto(`${BASE}/owner/restaurants`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const trashBtn = page.locator('button[title="حذف"], button[title="لا يمكن حذف المنيو الأساسي"]').first();
  const trashDisabled = await trashBtn.isDisabled().catch(() => 'n/a');
  const trashTitle = await trashBtn.getAttribute('title').catch(() => null);
  await page.screenshot({ path: `${OUT}/o8b-restaurant-delete.png` });
  check('o8.restaurantDelete', trashDisabled === true,
    `primary restaurant delete button disabled=${trashDisabled} (title="${trashTitle}") — deletion NOT offered for the primary menu on the free plan`);

  // settings page: confirm there is no restaurant-delete there either
  await page.goto(`${BASE}/owner/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const settingsBody = await page.locator('body').innerText();
  const settingsHasRestDelete = settingsBody.includes('حذف المطعم') || settingsBody.includes('حذف المنيو');
  await page.screenshot({ path: `${OUT}/o8c-settings.png` });
  check('o8.settingsDelete', !settingsHasRestDelete,
    `owner settings page offers restaurant deletion: ${settingsHasRestDelete} (only logo/gallery image deletes exist)`);

  // ── o8: logout + auth guard ──
  await page.locator('button:has-text("تسجيل الخروج")').first().click();
  await page.waitForURL(/\/login/, { timeout: 20000 }).catch(() => {});
  const afterLogoutUrl = page.url();
  check('o8.logout', afterLogoutUrl.includes('/login'),
    `logout redirects to ${afterLogoutUrl} (the task expected the home page — actual behaviour is /login)`);
  await page.screenshot({ path: `${OUT}/o8-logout.png` });

  // guard: /owner while logged out must bounce to /login
  await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const guardUrl = page.url();
  await page.screenshot({ path: `${OUT}/o8-logout-guard.png` });
  check('o8.guard', guardUrl.includes('/login'), `visiting /owner while logged out → redirected to ${guardUrl}`);

  // /dashboard literal probe (task asked for it; the real dashboard is /owner)
  const dashResp = await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
  const dashStatus = dashResp ? dashResp.status() : 0;
  const dashText = await page.locator('body').innerText().catch(() => '');
  check('o8.dashboard404', dashStatus === 404, `GET /dashboard → ${dashStatus} (${dashText.includes('404') || dashText.includes('غير موجود') || dashText.includes('غير موجودة') ? 'not-found page' : 'no not-found text'})`);
} catch (e) {
  check('journey2.fatal', false, `journey 2 interrupted: ${String(e).split('\n')[0]}`);
  await page.screenshot({ path: `${OUT}/o-journey2-error.png` }).catch(() => {});
}

await ctx.close();
await browser.close();

console.log('\n════ JOURNEY 2 SUMMARY ════');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.id}: ${r.detail}`);
console.log(`\nconsole errors (${consoleErrors.length}):`, JSON.stringify(consoleErrors.slice(0, 10)));
console.log(`page errors (${pageErrors.length}):`, JSON.stringify(pageErrors.slice(0, 10)));
console.log(`\nRESULT: ${results.filter((r) => r.ok).length}/${results.length} checks passed`);
console.log(`TEST-DATA: owner=${OWNER} pass=${PASSWORD} restaurant="${REST_NAME}" slug=${SLUG}`);
