# الجولة 90 — دمج نتائج التشخيص والفرز (Wave 1.5)

> دمج بمنهجية gstack review-army Step 4.6: بصمات → إزالة تكرار → بوابات ثقة → دفعات إصلاح.
> المصادر: cso-audit.md · review-backend.md · review-quality.md · investigation.md · health-devex.md · qa-live.md

## الإحصاء الكلي
- **من 6 وكلاء تشخيص**: 37 نتيجة غير استشارية + 2 advisory (بعد فرز التكرار والرفض المُوثَّق)
- **CRITICAL: 8** · **HIGH: 5** · **MEDIUM: 11** · **LOW: 13**
- MULTI-SPECIALIST CONFIRMED: سقف PUT image ‏(4 وكلاء: D1+D2+D3+D4 — ثقة 10/10)

## المُرفوض بالدليل (لا إصلاح مطلوب)
- «السلة ترسل 403 صامت للزائر» — مرفوض حيًا: الزائر يطلب 201 بنجاح (الضيف مسموح بالتصميم)؛ الـ403 كان PlanLimitError
- 5 عائلات ادعاءات VLM من D6 رُفضت بدليل كودي (placeholders غير موجودة، اتجاهات RTL صحيحة…)

## التأكيدات المتقاطعة الكبرى (الجولة التالية فورًا)
1. **CI أحمر عند HEAD**: check-secrets exit 1 بسبب fixture وهمي + سطر خطة r89 (كلاهما ليس سرًا حقيقيًا) — البوابة الأولى في CI تعطل كل خط الأساس بينما Vercel ينشر بغض النظر [D1 HIGH + تحقق مباشر من المنسق]
2. **بوابة دور غائبة**: POST /api/owner/restaurants — أي USER ينشئ مطعمًا نشطًا بحدود 5× [D2 CRITICAL]
3. **تصعيد صلاحيات**: reset-password — sub_admin يعيد كلمة مرور super_admin [D2 CRITICAL]
4. **TOCTOU مسار المال**: دفعة معلقة واحدة قابلة للتكرار (findFirst-then-create) → دفع مزدوج [D4 T2 CRITICAL] + عدّادات السقوف الثلاثة قابلة للتجاوز بالتزامن [D2 R-1 + D4 T1/T3]
5. **سقف صورة PUT = 7M** مقابل 200k في POST [4 وكلاء]

## دفعات الموجة 2 (وكلاء متوازون، ملفات غير متقاطعة)

### F1 «الأمن والمعاملات» (الأثقل أمنيًا)
- S-1: بوابة دور + freeCaps + audit + notify + حدود schema في owner/restaurants POST
- S-2: حراسة reset-password من استهداف super_admin
- T2: فهرس فريد جزئي (userId WHERE pending) + P2002→409 — هجرة +subscriptions/upgrade
- T1: ذرية maxOrders في orders/route.ts + معالجة P2002 لidempotency (→200 already) + رفض مطعم غير نشط
- ذرية maxItems (items:229) وmaxMenus (owner/restaurants:103)
- T4: تقييمات — increment ذري بدل القيم المطلقة
- T3: سقف الإحالات — قلب ذري
- اختبارات وحدة لكل إصلاح

### F2 «CI/CD والليلي»
- إصلاح بوابة check-secrets (FILE_ALLOWLIST موثقة للfixture والخطة)
- SHA-pinning لكل actions
- CODEOWNERS
- workflow ليلي nightly-flake (PW_RETRIES=0 + تنظيف RateLimitEntry بين التكرارات)
- env-override في playwright.config.ts لretries

### F3 «العقود والتعريب»
- سقف PUT image → 200k + اختبار مرآة
- توحيد 401/403 (orders/[id]:44 + whatsapp/generate:43)
- status → z.enum في items POST/PUT
- بوابة كتابة system-events (EDIT_SETTINGS) مع إبقاء GET
- create-owner: logAudit + notifyEvent
- فحص multi-menu لتقييمات المالك (UserRestaurant)
- تعريب 13 رسالة (الست الموثقة + 7 المكتشفة)
- dummy-hash في login لموازنة توقيت المستخدم غير الموجود

### F4 «الأداء وUX»
- admin/orders: Promise.all بدل الشلال التسلسلي
- settings: deleteBlob بPromise.allSettled
- menu/[slug]: Set/Map بدل O(F×I)/O(C×I)
- cart toast: إظهار body.error الفعلي (403/429)
- OrderNotifier: طبقة/إغلاق مناسب
- تنسيق تاريخ عربي في فلاتر الطلبات
- rate-limit: مسح احتمالي على مستوى الجدول (نمو 14K صف/يوم)
- loyalty: حد إجمالي لكل IP (تخفيف تمييع المفاتيح)
- Intl.PluralRules الأصلي (advisory — بحارس الاختبارات القائمة)

### F5 «بحيرات الاختبار» (10 ملفات جديدة في tests/unit/)
upload-route (magic bytes) · whatsapp-generate (مصفوفة أدوار) · system-events-writes · broadcast-targets · cron-cleanup · rate-limit-race · config-bot-token · create-owner · restaurants-create · notify-event-escape

### F6 «DevEx والنظافة»
- حارس DATABASE_URL في env.ts (فشل مبكر برسالة عربية بدل فشل صامت)
- تحديث أرقام README (1082/20 هجرة) + خطوات e2e
- سكربتات: db:migrate/seed · typecheck · knip
- knip.config موثق (استثناءات CLI) + eslint ignores للcoverage
- حذف alias الميت sendTelegramMessage
- تبسيك سلسلة fallback الهجرة المنتهية (advisory — بحارس .catch)

## أفعال المالك (خارج نطاق الوكلاء — للتذكير في الإغلاق)
1. **تدوير كلمة مرور Neon فورًا** (مكشوفة في 95 commit تاريخي، لم تُدوَّر)
2. إبطال أي PAT قديم غير مستخدم
