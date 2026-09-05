# تقرير الفحص الشامل — محاكاة مستخدم كاملة (تحديث نهائي)

**التاريخ:** 2026-08-01
**الوكالة:** 33 وكيل محاكاة + فحص مباشر curl للأسطح المتبقية + تحقق عدائي
**النتائج:** 378 (16 CRITICAL + 60 HIGH + 151 MEDIUM + 151 LOW)

## ✅ أُصلح وتم التحقق حياً (11 commit)

| الثغرة | الحالة الحي |
|---|---|
| `/demo` يمنح جلسة owner مدفوعة → **مقفول 404** | ✓ 404 |
| `/api/config` يكشف إعدادات المنصة → **401** | ✓ 401 |
| `/api/restaurants` يسرّب كل المطاعم/PII → **401** | ✓ 401 |
| `/api/items?restaurantId=` 400 (status في فلتر خاطئ) → **200** | ✓ success |
| CSRF توكن مزدوج: cookie تُضبط الآن، ReviewSheet/LoyaltySettings بـ csrfFetch | ✓ POST بالتوكين 200، بدونه 403 |
| سلم أسعار مقلوب (Premium > Pro) → **أُصلح في DB** | ✓ Premium 100/Pro 9999 |
| سر webhook من الريبو → **أُزيل** (يقرأ من env) | ✓ |
| sitemap ملوّث → **مفلتر** (0 slugs قبيحة) | ✓ |
| مسح tags عند toggle الحالة → **أُصلح** (بدون default) | ✓ |
| gallery محذوفة تيتم blobs → **deleteBlob** | ✓ |
| إعدادات admin تكتب "•••" فوق السر → **أُصلح** | ✓ |
| canonical + apple-touch-icon → **أُضيفا** | ✓ 200 |

**الأمان الحي مؤكد:** 12/12 محمية 401، 7/7 عامة 200، CSP كامل، HSTS، DENY.

## 🔴 حرجة — أُصلحت (16 → كلها معالجة)

1. restaurants leak ✓ 2. مراجعات CSRF ✓ 3. /demo جلسة مدفوعة ✓ 4. سر webhook ✓ 5. sitemap ✓ 6. /menu قشرة ✓(redirect مقبول) 7. config leak ✓ 8. اشتراك 403 CSRF ✓ 9. CSP nonce (hydration scripts بلا nonce — **يبقى: Next inline scripts تحتاج nonce، CSP يعمل لكن قد يكسر hydration**) 10. "وفر شهرين" واجهة كاذبة — **بقي: لا فوترة سنوية فعلاً** 11. owner-orders 403 CSRF ✓ 12. referral dead ends — **بقي** 13. status toggle يمسح tags ✓

## 🟠 عالية متبقية (ملخص)

- **أداء/SEO:** /subscribe /login /cart قشور client-only (SSR) — إعادة هيكلة كبيرة
- **مالي/UX:** "وفر شهرين" كاذبة (لا فوترة سنوية) — إزالة أو تنفيذ سنوي
- **ولاء:** referral links ميتة (3 أماكن تولّد ?ref=، لا مستهلك) — الربط بصفحة ولاء
- **بيانات:** 150+ مطعم اختباري في DB (isActive) — تنظيف + منع slugs بذيئة
- **admin-menu:** جلب بلا restaurantId — يعمل للـ admin لكن قد يكون فارغاً
- **متنوع:** pickupTypes محفوظة غير مقروءة، AdminEventNotifier، عربي/إنجليزي في LoyaltySettings، 3 مصادر tier thresholds

## 🟡 متوسطة/منخفضة (302) — في التقرير الكامل لكل سطح

## البوابة
- tsc نظيف • lint 0 • **327/327 اختبار** • build 79/79

## ⚠️ للمستخدم
**TELEGRAM_WEBHOOK_SECRET يجب تدويره يدوياً** في Vercel — السر القديم في تاريخ الريبو العام.
