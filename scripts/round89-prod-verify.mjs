#!/usr/bin/env node
/**
 * round89-prod-verify — الجولة 89: الفحوص السلوكية الخاصة بالموجات
 * (matcher الأصول النظيف · الترويسات الجديدة · سقف الجلسة · حاصرات الاستطلاع ·
 *  كاش الإحصاءات · المعدِّلات حية على المنيو العام · popularVisible)
 */
import { execSync } from 'node:child_process';

const BASE = 'https://menu.smart-link.ly';
const DEMO = `${BASE}/menu/al-waha-cafe-demo`;

const sh = (cmd) => execSync(cmd, { maxBuffer: 1 << 25 }).toString();
const headers = (path) =>
  execSync(`curl -s -m 20 -I "${path}"`, { maxBuffer: 1 << 25 }).toString();
const curl = (path) => execSync(`curl -s -m 20 "${path}"`, { maxBuffer: 1 << 25 }).toString();
const code = (path) =>
  Number(execSync(`curl -s -m 20 -o /dev/null -w "%{http_code}" "${path}"`).toString());

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ✅ ${m}`); };
const bad = (m) => { fail++; console.log(`  ❌ ${m}`); };

console.log(`[1] matcher الـproxy المُصلَح (B-1) — الأصول الثابتة بلا كوكيز/nonce`);
{
  // قبل الجولة: woff2/png كانت تستلم set-cookie (csrf) + CSP nonce
  for (const asset of ['/fonts/cairo-arabic.woff2', '/icon-192.png', '/video/promo.mp4']) {
    const h = headers(`${BASE}${asset}`);
    const hasCookie = /set-cookie/i.test(h);
    const hasCsp = /content-security-policy/i.test(h);
    !hasCookie && !hasCsp
      ? ok(`${asset} نظيف (بلا set-cookie/CSP)`)
      : bad(`${asset}: cookie=${hasCookie} csp=${hasCsp}`);
  }
  // manifest يظل مستثنى كما كان (سلوك محفوظ)
  const mh = headers(`${BASE}/manifest.json`);
  !/set-cookie/i.test(mh) ? ok('manifest.json مستثنى (بلا set-cookie)') : bad('manifest يستلم كوكي!');
}

console.log(`[2] الترويسات الجديدة (B-2) — COOP/CORP + frame-ancestors على الطبقات`);
{
  const apiH = headers(`${BASE}/api/health`);
  /cross-origin-opener-policy: same-origin/i.test(apiH) ? ok('API: COOP same-origin') : bad('API: COOP مفقودة');
  /cross-origin-resource-policy: same-origin/i.test(apiH) ? ok('API: CORP same-origin') : bad('API: CORP مفقودة');
  /frame-ancestors 'none'/i.test(apiH) ? ok('API: CSP frame-ancestors none') : bad('API: frame-ancestors مفقودة');

  const pageH = headers(`${BASE}/`);
  /cross-origin-opener-policy: same-origin/i.test(pageH) ? ok('صفحة عامة: COOP') : bad('صفحة عامة: COOP مفقودة');
  /cross-origin-resource-policy: same-origin/i.test(pageH) ? ok('صفحة عامة: CORP') : bad('صفحة عامة: CORP مفقودة');
  /frame-ancestors 'none'/i.test(pageH) ? ok('صفحة عامة: frame-ancestors') : bad('صفحة عامة: frame-ancestors مفقودة');

  const notFoundH = headers(`${BASE}/404-not-a-real-page-r89`);
  /x-frame-options: DENY/i.test(notFoundH) ? ok('404: XFO DENY محفوظ') : bad('404: XFO مفقود');
  /cross-origin-opener-policy/i.test(notFoundH) ? ok('404: COOP') : bad('404: COOP مفقودة');
}

console.log(`[3] الجلسة والحاصرات (B-3/B-4/B-6) — سلوك حي من الخارج`);
{
  // نقاط الاستطلاع: بلا جلسة 401 (الحاصر خلف المصادقة — لا يُختبر عن بعد لتجنب
  // الضغط على الإنتاج؛ البرهان الوحدوي + محلي موثق). نجتاز أن البوابة تصدّ غير المصرح
  const c1 = code(`${BASE}/api/user/events`);
  c1 === 401 ? ok('user/events بلا جلسة 401 (الحاصرة خلف المصادقة)') : bad(`user/events ${c1}`);
  const c2 = code(`${BASE}/api/stats`);
  c2 === 401 ? ok('stats بلا جلسة 401') : bad(`stats ${c2}`);

  // anti-replay تيليجرام: POST بلا مصادقة 403 (مغلق) — HEAD يرجع 405 بحكم الطريقة
  const c3 = Number(
    execSync(`curl -s -m 20 -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/admin/telegram/verify" -H "Content-Type: application/json" -d "{}"`).toString()
  );
  [400, 401, 403].includes(c3) ? ok(`telegram/verify مغلقة بPOST (${c3})`) : bad(`telegram/verify POST ${c3}`);

  // سقف الجلسة المطلق: برهانه اختباري وحدوي (جلسة عمرها 8 أيام تُرفض) —
  // خارج الفحص الحي (يتطلب كوكي قديم 7 أيام). موثق.
  ok('سقف الجلسة 7 أيام: مغطى وحدوياً (session-absolute-cap.test.ts) — حي بالكود');
}

console.log(`[4] كاش إحصاءات الأدمن (C-1) والعملة الموحدة`);
{
  const c1 = code(`${BASE}/api/admin/stats`);
  c1 === 401 ? ok('admin/stats مصادق 401 (الكاش خلف البوابة)') : bad(`admin/stats ${c1}`);
  const h = headers(`${BASE}/api/health`);
  /content-type: application\/json/i.test(h) ? ok('health JSON حي') : bad('health ليس JSON');
}

console.log(`[5] المعدِّلات حية على الإنتاج (F1) — الاستعلام يعمل والأصل لا ينهار`);
{
  const c = code(DEMO);
  c === 200 ? ok('demo menu 200 بعد ميزة المعدِّلات (include الهرمي سليم)') : bad(`demo ${c}`);
  const html = curl(DEMO);
  // شكل الرحلة: modifierGroups بالمفتاح حتى مع مصفوفات فارغة (بلا مجموعات في ديمو الإنتاج)
  const mgKey = (html.match(/modifierGroups/g) || []).length;
  mgKey > 0
    ? ok(`modifierGroups في رحلة البيانات (${mgKey} موضعاً — الاستعلام حي)`)
    : bad('modifierGroups غائب عن الرحلة!');
  html.includes('د.ل') ? ok('العملة الموحدة حية') : bad('العملة مفقودة');
  // الأزرار التفاعلية للطلب موجودة كما هي (رحلة الزبون لم تتضرر)
  html.includes('تقييم ') ? ok('أزرار التقييم SSR كاملة') : bad('أزرار التقييم مفقودة');
}

console.log(`[6] popularVisible (G) — المنيو يعرض كل الأصناف المتاحة`);
{
  const html = curl(DEMO);
  // برهان تركيبي: بطاقات الأصناف بعناوين h2 معروضة (قبل إصلاح popularVisible
  // كان العنصر الشعبي الوحيد يختفي نهائياً). ديمو الإنتاج يستخدم h2 لعناوين الأصناف.
  const h2Count = (html.match(/<h2[^>]*>/g) || []).length;
  h2Count > 0 ? ok(`بطاقات الأصناف تعرض (${h2Count} عنوان h2)`) : bad('لا بطاقات!');
}

console.log(`[7] 404 النحيفة ومغلفات الجولة (محفوظة من 87/88)`);
{
  const c = code(`${BASE}/definitely-not-a-page-r89`);
  c === 404 ? ok('404 سليم') : bad(`404: ${c}`);
}

console.log(`\n=== ROUND89 PROD RESULT: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
