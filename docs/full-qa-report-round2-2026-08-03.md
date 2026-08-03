# تقرير الفحص الشامل — الجولة 2 (full-qa-report-round2)

**التاريخ**: 2026-08-03
**النطاق**: إغلاق الفجوات الأربع + تعميق التغطية (دفع/أمن/multi-menu) + cross-browser + CI

---

## المرحلة صفر — إغلاق الفجوات الأربع (اكتملت ✓)

### (أ) lint error في team1-auth.spec.ts ✅
- `let statuses` → `const statuses` (سطر 108) — **npm run lint = exit 0** (0 errors)

### (ب) شرط mock لـ settings-tenant.test.ts ✅
- أضفت `prisma.userRestaurant` للـ mock (كان ناقصاً — السبب الجذري للـ 500)
- أضفت حالة "owner WITH legitimate UserRestaurant link CAN modify restaurant B"
- صححت `authHolder` ليشمل `userId`
- **npm test = exit 0 (346/346)** — كانت تُفشل قبل

### (ج) سكربت التحقق/التنظيف QA ✅
- أنشأت `scripts/qa-cleanup-check.mjs` (يستعلم/he يدَه, يحذف, يعيد الاستعلام)
- **الدليل الحرفي قبل/بعد**:
  ```
  === BEFORE === users: 8, restaurants: 0
    #571 qa_bank_c_52052191 ... #578 qa_madar_52575119
  DELETED: 0 restaurants, 8 users
  === AFTER === users: 0, restaurants: 0
  ```
- (جولة سابقة: cleaned 6 users + 2 restaurants → 0)

### (د) selectors موضعية `input.nth(N)` ✅
- أنشأت `tests/e2e/qa-helpers.ts` (fillSubscribeForm بالـ placeholder الثابت / login بريتري)
- استبدلت الـ nth بأغلبية الملفات: **`input.nth` من 73 → 3** (باقي 3 في team4 هي `.nth(1)` على placeholder مكرر للمنيو الثاني — مقبولة لأنها فوق selector ثابت، ليست ترتيباً عشوائياً)
- أعدت team1-5 لاستخدام helpers

## المرحلة ١ — توسيع (amal)
| الفريق | قبل | بعد | الحالة |
|--------|-----|-----|--------|
| team4 (الدفع) | 4 | **10** (مدار كامل + مبلغ 0/سالب/نص/فوق السقف) | 9/10 ✅ (1 XSS ا季…) |
| team7 (أمن/IDOR/XSS جديد) | — | **7** | 6/7 ✅ |
| team3 (multi-menu) | 8 | **11** (switcher + orders/settings tenant) | 11/11 ✅ |

المدار: تدفق كامل → "бантظار موافقة الإدارة" بدون عدّاد ✓ (بعد ملء هاتف المحفظة)
الدفع/المبلغ: amount 0/سالب/"abc"/500 كلها **مرفوضة** (ليست 201) ✓

### النتاج
- **XSS item** فشل بسبب rate-limit مؤقت على حساب الاختبار (429) — كود الاختبار أصلح (استخدام OWNER_A + rid 316 الذي لديه categories) لكن فشل تشغيلياً أخيراً (rate limit). سلوك حماية صحيح.
- **IDOR**: OWNER_A لا يصل لـ OWNER_B (settings/orders/create/update) — كلها 401/403 ✓

## المرحلة ٢ — cross-browser + CI
- أضافت projects `qa-cross-browser` (firefox) + `qa-cross-browser-webkit` في playwright.config.ts
- أضافت خطوة CI "Production QA regression (qa-teams)" تعمل على push لـ main — مختلطة من موقع إنتاج حقيقي، `continue-on-error`

## التسليم
1. codes: tests/e2e/qa-helpers.ts, team{1,3,4,7}-*.spec.ts, scripts/{qa-cleanup-check.mjs}
2. playwright.config.ts (qa-cross-browser, qa-cross-browser-webkit)
3. .github/workflows/ci.yml (production QA step)
4. traf: docs/full-qa-report-round2-2026-08-03.md
5. Orums: `npm run lint && npm test` → **exit 0 معاً** ✓

## إجابة صادقة للـ "ادعي الاكتمال"
- ❌ **ليس 100% صفر أخطاء**: اختبار XSS item لا يمر حالياً (rate-limit مؤقت، كود الاختبار أصلح، يحتاج فترة هدوء لإعادة تآكيد)
- ✅ أخطاء الحظر الحقيقية من الجولة القديمة (lint stale settings-tenant500/health QA بيانات) كلها اغلقت &حم
- توضيح العد: 38 سطر `test(` + team6 loops تُنتج 24 اختبار تقيم → عدد حقيقي بعد التشغيل: ~72 مبحReferenced