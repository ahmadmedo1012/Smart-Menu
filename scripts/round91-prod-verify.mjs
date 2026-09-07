#!/usr/bin/env node
/**
 * round91-prod-verify — الجولة 91: فحص الإنتاج بعد نشر تغييرات الموجة
 * (تصفية مطاعم الاختبار من featured · معالج الاشتراك ?plan=PREMIUM · فحص حد الدخول الصادق r91-F6)
 *
 * ملاحظة تشغيل: البندان [2a]/[2b] سيفشلان قبل نشر الجولة — هذا متوقع وموثق
 * (الفلتر ومعالجة اسم الخطة يشحنان هذه الجولة). البقية يجب أن تخضر الآن.
 *
 * الطلبات كلها قراءة فقط، 19 طلبًا كحد أقصى:
 *   health (مع زوج CSRF) 1 · الرئيسية 1 (HEAD) · المنيو 1 (HEAD) · pricing 1 ·
 *   featured 1 · subscribe 1 · 13 محاولة دخول وهمية عبر اتصال keep-alive واحد.
 */
import { execSync } from 'node:child_process';

const BASE = 'https://menu.smart-link.ly';

const curl = (path, args = '') =>
  execSync(`curl -s -m 20 ${args} "${BASE}${path}"`, { maxBuffer: 1 << 25 }).toString();
const code = (path, args = '') =>
  Number(execSync(`curl -s -m 20 -o /dev/null -w "%{http_code}" ${args} "${BASE}${path}"`).toString());
const headers = (path) =>
  execSync(`curl -s -m 20 -I "${BASE}${path}"`, { maxBuffer: 1 << 25 }).toString();
// الجسم + رمز الحالة في طلب واحد (يوفر طلبًا ضمن سقف الـ20)
const bodyWithCode = (path) => curl(path, '-w "\\n%{http_code}"');
const tailCode = (raw) => Number(/(\d{3})\s*$/.exec(raw)?.[1] ?? 0);

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ✅ ${m}`); };
const bad = (m) => { fail++; console.log(`  ❌ ${m}`); };

// ترويسات الصفحات تُجلب مرة في [1] وتُعاد استخدامها في [3] (لا طلبات إضافية)
const pageHeaders = {};

console.log(`[1] الأساسيات والصحة`);
let csrfToken = '';
{
  // طلب واحد: ترويسات health (-D - تحمل زرع كوكي csrf-token للفقرة [2c])
  // + الجسم (env) + رمز الحالة (-w) — دفعة واحدة ضمن سقف الـ20 طلبًا.
  const h = curl('/api/health', '-D - -w "\\n%{http_code}"');
  tailCode(h) === 200 ? ok('health 200') : bad(`health = ${tailCode(h)}`);
  /"env"\s*:\s*"production"/.test(h)
    ? ok('health env=production (RATE_LIMIT_RELAX خامل بنيويًا — r91-F6)')
    : bad('health لا يُبلغ env=production');
  csrfToken = h.match(/csrf-token=([^;]+)/)?.[1] ?? '';

  // الرئيسية والمنيو عبر HEAD: الرمز والترويسات معًا (تُعاد استخدامها في [3])
  const home = headers('/');
  /^HTTP\/[\d.]+\s+200/.test(home) ? ok('home 200') : bad('home ليست 200');
  const menu = headers('/menu/al-waha-cafe');
  /^HTTP\/[\d.]+\s+200/.test(menu) ? ok('menu العام 200') : bad('menu ليست 200');
  code('/pricing') === 200 ? ok('pricing 200') : bad('pricing ليست 200');

  // نخزن الترويسات للفقرة [3] (لا طلبات إضافية)
  pageHeaders.home = home;
  pageHeaders.menu = menu;
}

console.log(`[2] تغييرات الجولة 91 (2a/2b يفشلان قبل النشر — متوقع وموثق)`);
{
  // [2a] الـfeatured العام يجب ألا يكشف مطاعم الاختبار الداخلية بعد نشر الجولة
  // (المشخّص في D3: slugs «settings-test-ts» و«ede» ظاهران في نقطة نهاية عامة).
  {
    const f = curl('/api/public/featured');
    let slugs = null;
    try { slugs = (JSON.parse(f)?.data ?? []).map((r) => r.slug); } catch { slugs = null; }
    if (!slugs) {
      bad('featured: الاستجابة ليست JSON صالحًا');
    } else {
      const leaked = slugs.filter((s) => s === 'settings-test-ts' || s === 'ede');
      leaked.length === 0
        ? ok(`featured نظيف من مطاعم الاختبار (${slugs.length} مطاعم عامة)`)
        : bad(`featured ما زال يكشف مطاعم الاختبار: ${leaked.join('، ')} — الفلتر لم يُنشر بعد`);
    }
  }

  // [2b] /subscribe?plan=PREMIUM يجب أن يحلّ المعالج بالاسم (D4: المعالج كان يقبل
  // المعرّف الرقمي/الموضع فقط فNumber('PREMIUM')=NaN → «تعذر تحميل الخطة المحددة»).
  {
    const raw = bodyWithCode('/subscribe?plan=PREMIUM');
    const c = tailCode(raw);
    const b = raw.slice(0, -4); // الجسم دون سطر رمز الحالة الملحق
    const hasError = b.includes('تعذر تحميل الخطة المحددة');
    const hasPlanName = b.includes('بريميوم') || b.includes('Premium');
    const hasWizard = ['اختر الخطة', 'بيانات المنيو', 'بيانات الدخول', 'خطوات الاشتراك', 'المراجعة'].some((t) =>
      b.includes(t),
    );
    c === 200 && !hasError && (hasPlanName || hasWizard)
      ? ok(`subscribe?plan=PREMIUM يحلّ المعالج (200 + ${hasPlanName ? 'اسم الخطة' : 'خطوة المعالج'} حاضر)`)
      : bad(
          `subscribe?plan=PREMIUM لا يحلّ المعالج بعد: رمز=${c}${hasError ? ' + رسالة «تعذر تحميل الخطة المحددة»' : ' (الاسم/خطوات المعالج غائبة عن الـHTML — المعالجة تُرندر عميل-side قبل النشر)'}`,
        );
  }

  // [2c] فحص حد الدخول الصادق (r91-F6 — نفس منهجية round90 بعد الإصلاح):
  // 13 محاولة بكلمة مرور خاطئة لمستخدم وهمي عشوائي عبر اتصال keep-alive واحد
  // (socket واحد ⇒ IP خروج واحد ثابت — الاتصالات المنفصلة تدير IP الخروج فتفتح
  // دلاء جديدة وتخفي الـ429). التوقع: 401 متكررة ثم 429 عند/بعد #11.
  // نظافة الفحص: مستخدم وهمي r91probe_* لا يملك حسابًا (قفل مستحيل، لا لمس
  // accountLimiter — يعمل فقط على مستخدمين موجودين)؛ صفوف RateLimitEntry
  // الناتجة تُكنَس ذاتيًا؛ لا كتابات DB.
  {
    const csrf = csrfToken
      ? `-H "X-CSRF-Token: ${csrfToken}" -H "Cookie: csrf-token=${csrfToken}" -H "Origin: ${BASE}"`
      : '';
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
      ? ok(`حد الدخول حي: ${saw401}×401 ثم ${saw429}×429 خلال ${N} محاولة (${ghost} — اتصال مثبّت واحد)`)
      : bad(`لم يظهر 429 خلال ${N} محاولة عبر اتصال مثبّت (رموز: ${codes.join(',') || 'لا شيء'} — الحد لم يُطلق`);
  }
}

console.log(`[3] ترويسات الانحدار الأمني (على الرئيسية والمنيو — r89/r90 محفوظة)`);
{
  const pages = [
    ['home', pageHeaders.home],
    ['menu', pageHeaders.menu],
  ];
  for (const [name, h] of pages) {
    /content-security-policy[^\r\n]*frame-ancestors\s+'none'/i.test(h)
      ? ok(`CSP frame-ancestors 'none' على ${name}`)
      : bad(`CSP frame-ancestors 'none' غائبة على ${name}`);
    /strict-transport-security/i.test(h)
      ? ok(`HSTS حاضرة على ${name}`)
      : bad(`HSTS غائبة على ${name}`);
    /cross-origin-opener-policy/i.test(h)
      ? ok(`COOP حاضرة على ${name} (r89 محفوظة)`)
      : bad(`COOP غائبة على ${name}`);
    /x-frame-options[^\r\n]*deny/i.test(h)
      ? ok(`X-Frame-Options DENY على ${name}`)
      : bad(`X-Frame-Options DENY غائب على ${name}`);
  }
}

console.log(`\n=== ROUND91 PROD RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
