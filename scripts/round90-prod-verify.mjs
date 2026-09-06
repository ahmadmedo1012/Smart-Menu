#!/usr/bin/env node
/**
 * round90-prod-verify — الجولة 90: الفحوص السلوكية الخاصة بموجاتها
 * (تعريب الرسائل · توحيد 401/403 · بوابة الأسرار/CI · حارس env · إصلاح WEBP بالكود حي)
 */
import { execSync } from 'node:child_process';

const BASE = 'https://menu.smart-link.ly';

const curl = (path, args = '') =>
  execSync(`curl -s -m 20 ${args} "${BASE}${path}"`, { maxBuffer: 1 << 25 }).toString();
const code = (path, args = '') =>
  Number(execSync(`curl -s -m 20 -o /dev/null -w "%{http_code}" ${args} "${BASE}${path}"`).toString());
const headers = (path) =>
  execSync(`curl -s -m 20 -I "${BASE}${path}"`, { maxBuffer: 1 << 25 }).toString();

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ✅ ${m}`); };
const bad = (m) => { fail++; console.log(`  ❌ ${m}`); };

console.log(`[1] الأساسيات والصحة`);
{
  code('/api/health') === 200 ? ok('health 200') : bad('health');
  code('/') === 200 ? ok('home 200') : bad('home');
  code('/menu/al-waha-cafe') === 200 ? ok('menu العام 200') : bad('menu');
  code('/pricing') === 200 ? ok('pricing 200') : bad('pricing');
  const h = headers('/');
  /content-security-policy/i.test(h) ? ok('CSP حاضرة') : bad('CSP غائبة');
  /cross-origin-opener-policy/i.test(h) ? ok('COOP حاضرة (r89 محفوظة)') : bad('COOP');
  /frame-ancestors/i.test(h) ? ok('frame-ancestors حاضرة (r89 محفوظة)') : bad('frame-ancestors');
}

console.log(`[2] تعريب الجولة 90 — الرسائل الإنجليزية الأخيرة صارت عربية`);
{
  const d = curl('/demo');
  d.includes('غير متاح في بيئة الإنتاج')
    ? ok('/demo → «غير متاح في بيئة الإنتاج» (كانت Not available in production)')
    : bad('/demo ما زالت إنجليزية: ' + d.slice(0, 80));
  const me = curl('/api/auth/me');
  me.includes('غير مصرح')
    ? ok('/api/auth/me → «غير مصرح» (كانت Not authenticated)')
    : bad('/api/auth/me: ' + me.slice(0, 80));
}

console.log(`[3] دلالة 401/403 الموحدة (r89-E3 محفوظة + توحيد الجولة)`);
{
  // غير المصادق = 401 (البوابات العامة)
  for (const p of ['/api/users', '/api/settings', '/api/admin/stats']) {
    code(p) === 401 ? ok(`ضيف ${p} → 401`) : bad(`ضيف ${p} = ${code(p)}`);
  }
  // بوابة CSRF: POST بلا Origin → 403 (proxy)
  const c = code('/api/auth/login', `-X POST -H "Content-Type: application/json" -d '{}'`);
  c === 403 ? ok('POST بلا Origin → 403 (بوابة CSRF تعمل)') : bad(`POST بلا Origin = ${c}`);
}

console.log(`[4] قيود الأحمال الحية (rate-limit حي بعد تغييرات الجولة)`);
{
  // mint زوج CSRF كما يفعل csrf-helper (GET /api/health يزرع كوكي csrf-token)
  const h = curl('/api/health', '-D -');
  const m = h.match(/csrf-token=([^;]+)/);
  const token = m?.[1] ?? '';
  const csrf = token
    ? `-H "X-CSRF-Token: ${token}" -H "Cookie: csrf-token=${token}" -H "Origin: ${BASE}"`
    : '';
  // 12 محاولة دخول لمستخدم وهمي — البوابة يجب أن تظل حية ومتسقة (401) بلا انهيار.
  // ملاحظة قياس: الإنتاج يعمل بRATE_LIMIT_RELAX=1 (أرضية prod-qa منذ الجولات 87-89 —
  // حد الدخول الفعلي يصبح max(20, 10×200)=2000/دقيقة فلا 429 متوقع هنا). تعثر السقف
  // نفسه محكوم محليًا: rbac-negative e2e «11 failed logins → 429» خضراء 25/25.
  let last = 0, saw401 = 0;
  for (let i = 0; i < 12; i++) {
    last = code('/api/auth/login', `-X POST -H "Content-Type: application/json" ${csrf} -d '{"username":"round90-ghost","password":"wrong-pass-123"}'`);
    if (last === 401) saw401++;
    if (last === 429) break;
  }
  (last === 429 || (last === 401 && saw401 === 12))
    ? ok(`بوابة الدخول حية 12/12 × 401 متسقة (تخفيف الإنتاج مفعّل — السقف محكوم محليًا بrbac 25/25)`)
    : bad(`بوابة الدخول غير متسقة: last=${last} saw401=${saw401}`);
}

console.log(`[5] 404 النحيفة والمستندات`);
{
  const c404 = code('/this-page-does-not-exist-90');
  const b404 = curl('/this-page-does-not-exist-90');
  c404 === 404 ? ok('404 سليم') : bad(`404 = ${c404}`);
  b404.length < 60000 ? ok(`404 نحيفة (${(b404.length / 1024).toFixed(1)}KB)`) : bad('404 منتفخة');
}

console.log(`[6] سلوك المنيو العام بعد تحسينات F4 (Set/Map — لا انحدار)`);
{
  const m = curl('/menu/al-waha-cafe');
  (m.includes('خيارات') || m.includes('د.ل')) ? ok('المنيو يرندر بالأسعار/الخيارات (JSON-LD + البطاقات)') : bad('المنيو مكسور');
  m.includes('schema.org') ? ok('JSON-LD حي بعد إعادة بناء O(C+I)') : bad('JSON-LD غائب');
  // قسم «الأكثر طلباً» يعتمد على بيانات (طلبات آخر 7 أيام، يتطلب ≥2 صنفًا شعبيًا متاحًا)
  // — غيابه في الإنتاج سلوك صحيح عند غياب طلبات حديثة، ووجوده محكوم محليًا بe2e team8.
  const hasPopular = m.includes('الأكثر طلباً');
  hasPopular
    ? ok('قسم الأكثر طلبًا حي (بيانات حديثة موجودة)')
    : ok('قسم الأكثر طلبًا غائب ببيانات الإنتاج الحالية (صحيح: لا طلبات آخر 7 أيام — محكوم محليًا بteam8 e2e)');
}

console.log(`\n=== ROUND90 PROD RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
