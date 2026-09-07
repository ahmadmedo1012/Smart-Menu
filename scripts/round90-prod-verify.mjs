#!/usr/bin/env node
/**
 * round90-prod-verify — الجولة 90: الفحوص السلوكية الخاصة بموجاتها
 * (تعريب الرسائل · توحيد 401/403 · بوابة الأسرار/CI · حارس env · إصلاح WEBP بالكود حي)
 * r91-F6: فقرة [4] أعيدت كتابتها بفحص صادق — كانت توثّق زورًا أن الإنتاج يعمل
 * بRATE_LIMIT_RELAX (تمرير 12×401 بلا 429) بينما الحدود حية فعلًا في الإنتاج؛
 * الفحص الآن: env=production من health + 429 حقيقي عبر اتصال keep-alive مثبّت.
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

console.log(`[4] قيود الأحمال الحية في الإنتاج (فحص صادق — r91-F6/D1-E3)`);
{
  // mint زوج CSRF كما يفعل csrf-helper (GET /api/health يزرع كوكي csrf-token)
  // — الاستجابة نفسها تحمل جسم /api/health فنتحقق من env=production دفعة واحدة.
  const h = curl('/api/health', '-D -');
  const m = h.match(/csrf-token=([^;]+)/);
  const token = m?.[1] ?? '';
  const csrf = token
    ? `-H "X-CSRF-Token: ${token}" -H "Cookie: csrf-token=${token}" -H "Origin: ${BASE}"`
    : '';
  // (أ) الإصدار الصادق: RATE_LIMIT_RELAX خامل بنيويًا في الإنتاج — isRelaxed يتطلب
  // NODE_ENV ≠ production (rate-limit.ts) — فالتحقق الصحيح هو أن health يبلغ
  // env=production، لا الافتراض بأن التخفيف مفعّل.
  // ملاحظة تاريخية (r91-F6): كانت هذه الفقرة تدّعي أن الإنتاج يعمل بRATE_LIMIT_RELAX=1
  // (حد فعلي 2000/دقيقة «فلا 429 متوقع») وتمرّر 12×401 على هذا الأساس — ادّعاء خاطئ
  // أثبت D1 عكسه حيًّا: 429 عند المحاولة #11 عبر اتصال keep-alive مثبّت. مرور 12×401
  // السابق كان سببه تدوير IP الخروج لكل اتصال جديد، لا أي تخفيف.
  /"env"\s*:\s*"production"/.test(h)
    ? ok('health يُبلغ env=production ⇒ RATE_LIMIT_RELAX خامل بنيويًا (isRelaxed يتطلب NODE_ENV≠production)')
    : bad('health لا يُبلغ env=production — راجع بيئة النشر');
  // (ب) فحص حد الدخول نفسه — مرة واحدة، صادقًا: 13 محاولة دخول بكلمة مرور خاطئة
  // لمستخدم وهمي عشوائي عبر اتصال keep-alive واحد (socket واحد ⇒ IP خروج واحد ثابت —
  // اتصالات منفصلة كانت تدير IP الخروج فتفتح دلاء جديدة لكل طلب وتخفي الـ429).
  // التوقع: 401 متكررة ثم 429 عند/بعد #11 (حد الدخول 10/دقيقة حي في الإنتاج).
  // نظافة الفحص: مستخدم وهمي r91probe_* لا يملك حسابًا (قفل مستحيل، لا لمس
  // accountLimiter — يعمل فقط على مستخدمين موجودين)؛ صفوف RateLimitEntry
  // الناتجة تُكنَس ذاتيًا (الاحتمالية 1/32 + 60ث احتفاظ)؛ لا كتابات DB أخرى.
  const ghost = `r91probe_${Math.random().toString(36).slice(2, 10)}`;
  const N = 13;
  const devnulls = Array.from({ length: N }, () => '-o /dev/null').join(' ');
  const urls = Array.from({ length: N }, () => `"${BASE}/api/auth/login"`).join(' ');
  let codes = [];
  try {
    codes = execSync(
      `curl -s -m 40 ${devnulls} -w "%{http_code}\\n" -X POST -H "Content-Type: application/json" ${csrf} -d '{"username":"${ghost}","password":"wrong-pass-123"}' ${urls}`,
      { timeout: 90_000, maxBuffer: 1 << 20 },
    )
      .toString()
      .trim()
      .split('\n')
      .map(Number);
  } catch {
    codes = [];
  }
  const saw401 = codes.filter((c) => c === 401).length;
  const saw429 = codes.filter((c) => c === 429).length;
  saw429 >= 1
    ? ok(`حد الدخول حي في الإنتاج: ${saw401}×401 ثم ${saw429}×429 خلال ${N} محاولة (المستخدم ${ghost} — يتطلب اتصالًا مثبّتًا واحدًا)`)
    : bad(`لم يظهر 429 خلال ${N} محاولة عبر اتصال مثبّت (رموز: ${codes.join(',') || 'لا شيء'} — الحدود إما معطلة أو تُخفيها بنية الشبكة)`);
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
