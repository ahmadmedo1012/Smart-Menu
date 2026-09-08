# SMART-MENU — ROUND 87 MASTER PLAN
## جولة الحصن الداخلي: سلامة المنطق + كفاءة الاستطلاعات + مسح الدين المتراكم

**التاريخ:** 2026-09-06 · **القاعدة:** 59937bc6 (جولة 86 مغلقة، كل البوابات خضراء، الإنتاج سليم)
**المنهجية:** تشخيص عبر 4 وكلاء متوازيين (أمان / أداء / جودة كود / اختبارات+بنية) — 40 نتيجة موثقة بـ file:line. **تم التحقق شخصياً من 7 نتائج حرجة قبل هذه الخطة** (S1 media-guard بعد الكتابة، S3 TOCTOU، P4 CartSlideOver ثابت، Q1 fail-open، T2 اختبار يختبر نسخة، T3 wait-on غير مثبت، P2 استعلام بلا حد زمني). خط الأساس المحلي جارٍ (tsc 0 حتى الآن) والإنتاج 200.

**الملخص التشخيصي:**
- **أمان (S):** المسار الخارجي محصّن (تم التحقق نظيفاً: جلسات، CSRF، تلغرام، رفع، حدود معدل) — لكن الثغرات الباقية كلها "داخل الجدران": حرّاس بعد الكتابة، حدود نصوص على مسارات PUT، TOCTOU على حد القوائم، تسجيل مجاني بلا حدود الخطة المعلنة.
- **أداء (P):** مسار QR تحسّن كثيراً — الباقي استطلاعات تسحب صفحات كاملة كل 5-15 ث (0.6-0.9GB/يوم لتبويب أدمن مفتوح)، 20 استعلاماً متتالياً كل 30 ث، و2 chunks JS ميتة على مسار QR.
- **جودة (Q):** بوابة auth منسوخة ×11 مع صفحة واحدة تفشل مفتوحةً، عنقود كود ميت 284KB + تبعية، 12 رمياً بلا رسالة، 37 `!` من نوع خاطئ واحد.
- **اختبارات (T):** مسار المال (اعتماد الولاء + اعتماد الاشتراك) بلا اختبار حقيقي واحد — أحدها يختبر نسخة منسوخة من المنطق؛ CI يسحب wait-on غير مثبت من npm بلا قفل.

---

## المرحلة A — إغلاق ثغرات سلامة المنطق (10) 🔒

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| A1 | **[MED] حارس الصورة في PUT /api/items/[id] يعمل بعد الكتابة ويُتخطى عند غياب صورة قائمة** | items/[id]/route.ts:156 (update) ثم :172-176 (الحارس بشرط `existing.image &&`) | نقل mediaUrlError قبل update + التحقق كلما وُجد body.image (مطابقة ترتيب POST) |
| A2 | **[MED] PUT /api/restaurants/[id] بلا حدود نصوص ولا فحص slug ولا تحقق media** | restaurants/[id]/route.ts:10-42,124-137 | مطابقة قيود POST (name 200, slug 100+SLUG_RE, description 1000, phone 30) + سقف gallery (10×2000) + mediaUrlError للـ logo/gallery |
| A3 | **[MED-LOW] TOCTOU حد القوائم في POST /api/owner/restaurants — العد خارج المعاملة** | owner/restaurants/route.ts:78-82 ثم tx:86 | نقل count+limit داخل $transaction بنمط OrderLimitError الموجود |
| A4 | **[MED-LOW] نصوص بلا حدود على POST عام: loyalty + referral (تُعرض لاحقاً في لوحة المالك)** | loyalty/route.ts:17-21, loyalty/referral/route.ts:8-12 | .max(50)/.max(30) + سقف label تلغرام (100) |
| A5 | **[LOW-MED] GET /api/restaurants/[id]: sub_admin بلا أذونات يقرأ الصف الكامل PII لأي مطعم** | restaurants/[id]/route.ts:49-53,75-96 | بوابة requirePermission('VIEW_ANALYTICS') لفرع التفاصيل الكاملة للطاقم |
| A6 | **[LOW-MED] التسجيل الذاتي بلا حدود الخطة المجانية — 50/500 بدل 10/100 المعلنة** | restaurants/route.ts:166-177, schema.prisma:105-106 | قراءة صف Free plan وكتابة maxItems/maxOrders (fallback ثابت 10/100) |
| A7 | **[LOW-MED] تقييمات عامة بلا ربط طلب — مناورة تقييمات المنافسين عبر IP دوّارة** | items/[id]/reviews/route.ts:90-136 | سقف عام لكل صنف (30/ساعة عبر محدد معدل DB بمفتاح item) |
| A8 | **[LOW] أي owner يقرأ عناصر مخفية لمطعم آخر عبر GET /api/items/[id] (سلم أدوار بلا نطاق مستأجر)** | items/[id]/route.ts:32-38 | ملكية UserRestaurant لفرع المخفي (مطابقة PUT/DELETE بنفس الملف) |
| A9 | **[LOW] سباق claim الإحالة (find→create بلا قيد فريد) + مسار converted ميت** | referrals/claim/route.ts:48-64, schema.prisma Referral | هجرة 14: @@unique([referralCode, referredName]) مع تنظيف التكرارات + P2002→already:true؛ مسار التحويل يوثّق كقرار مالك |
| A10 | **[LOW] PUT /api/admin/config: value بلا نوع/حد + isSecret يُصفّر ضمنياً عند الغياب** | admin/config/route.ts:11-17,69-89 | value: z.string().max(20000) (stringify عند الحاجة) + الحفاظ على isSecret القائم عند غياب الحقل |

## المرحلة B — كفاءة الاستطلاع ومسار QR (10) ⚡

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| B1 | **[HIGH] 3 استطلاعات لوحات تسحب صفحات كاملة كل 5-15 ث (admin/menu ~100KB×12s + admin/orders 20KB×5s + owner/orders 8KB×15s)** | admin/menu/page.tsx:50-72, admin/orders/page.tsx:98-123, owner/orders/page.tsx:152-186 | نمط probe: pageSize=1 → مقارنة meta.total + id + updatedAt الأحدث → سحب كامل عند التغير فقط (−~97%)؛ setRestaurants فقط عند التغير |
| B2 | **[HIGH] /api/stats popular-items بلا حد زمني — twin-B9-86 الفائت** | stats/route.ts:31, stats-queries.ts:89-113 | since: 90 يوماً (سطر واحد) |
| B3 | **[HIGH] /api/admin/stats: 20 استعلاماً في 12 موجة متتالية، يُستطلع كل 30 ث** | admin/stats/route.ts:64-143 | Promise.all واحدة للمستقل + موجة ثانية للإرواء → 12→3 |
| B4 | **[MED-HIGH] CartSlideOver + Sheet/@base-ui (15.6KB gz) يُشحنان ستاتيكياً بكل صفحة منيو ويرسمان null حتى أول إضافة** | (public)/menu/layout.tsx:1-12, CartSlideOver.tsx:41 | layout server + بوابة client خفيفة: dynamic(ssr:false) عند totalItems>0 فقط |
| B5 | **[MED] not-found الجذري يستورد Header الكامل → كود Header بـ 4 chunks متزامنة بكل صفحة منيو (~10.6KB gz)** | not-found.tsx:5, manifests | 404 جذري مبسط بلا Header (روابط Link فقط) — Header يخرج من المخطط المتزامن |
| B6 | **[MED] AdminEventNotifier يسحب 50 صفاً كاملاً كل 15 ث — المسار بلا sinceId** | AdminEventNotifier.tsx:10,16, admin/system-events/route.ts:34-42 | دعم sinceId (id> منذ، asc, take 50) + المُنبّه يبني lastId (نمط user/events) |
| B7 | **[MED] owner/reviews يجسّد كل معرفات الأصناف لبناء IN ضخم ×2** | owner/reviews/route.ts:34-40 | where علاقة: menuItem→category→restaurantId (النمط الموجود) |
| B8 | **[MED-LOW] loyalty/stats: 7 استعلامات في 5-6 موجات → موجتان** | loyalty/stats/route.ts:32-134 | دمج المستقل في Promise.all الأولى |
| B9 | **[LOW-MED] /api/items يشحن embed category→restaurant بلا مستهلك لدور owner (~13KB/صفحة)** | items/route.ts:83-93, owner/menu لا يقرأه | select نحيف للـ owner (category: id,name,nameAr) |
| B10 | **[LOW-MED] promo.mp4: 1.09MB، 1080×1920، بمسار صوتي AAC رغم muted** | public/videos/promo.mp4, PhoneVideo.tsx | إعادة ترميز 540×960 بلا صوت (~450KB، −55%) |

## المرحلة C — جودة الكود (10) 🧹

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| C1 | **[HIGH] بوابة auth يدوية ×11 صفحة أدمن (−190 LOC) مع صفحة users تفشل مفتوحةً + خروج منسوخ ×3** | admin/users/page.tsx:86 (.catch(()=>{})) + 11 موقعاً + تسجيلات الخروج | hook موحد useAccessGate + <AccessDenied/> + ترحيل 11 + إغلاق fail-open + توحيد الخروج |
| C2 | **[HIGH] عنقود كود ميت: LottieAnimation + barrel بلا مستورد + 284KB animations + تبعية @dotlottie** | LottieAnimation.tsx, shared/index.ts (0 مستورد), public/animations/* | حذف الكل + إسقاط التبعية (Confetti حي — يبقى) |
| C3 | **[MED-HIGH] 12 throw بلا رسالة + 11 catch يبتلع رسالة السيرفر + admin/orders بلا رد فعل عند فشل تغيير الحالة** | ConfigEditor:99,113…, admin/orders:147-150 | ترحيل 6 ملفات إلى csrfJson + getErrorMessage + else/rollback لتحديث الحالة |
| C4 | **[MED] 37 `!` في subscription-decisions من نوع معامل خاطئ واحد** | subscription-decisions.ts:47-229 | NonNullable<Awaited<ReturnType<…>>> للمعاملين — تختفي كلها |
| C5 | **[MED] owner/reviews مغلف غير قياسي + العميل يحسب الإحصاءات على أول 50 تقييماً فقط + فلترة مزدوجة** | owner/reviews/route.ts:69, page.tsx:53-59 | paginated() + قراءة meta.total للإحصاء أو حساب سيرفري + حذف الفلترة المكررة |
| C6 | **[MED] 3 حوارات بلا اسم reachable (Sheet الجوال ×2 + ShareAfterOrder)** | owner/layout:153, admin/layout:132, ShareAfterOrder:139 | SheetTitle/DialogTitle sr-only |
| C7 | **[MED] PaymentDialog 768 سطراً ×6+ مسؤوليات + deps خاطئة في الاستطلاع** | PaymentDialog.tsx:193-255 | استخراج usePaymentStatusPoll (توسيع usePollWhenVisible بـ inFlight/failureCap) + ReceiptUpload + ProviderPicker؛ إصلاح deps |
| C8 | **[MED-LOW] صفحة عامة إنجليزية بالكامل + تنسيقات تواريخ منافسة ×4** | (public)/menu/page.tsx:25-26, ReviewSheet:353, ReferrerList:93… | تعريب fallback + formatDateShort في lib/format والترحيل ×4 |
| C9 | **[LOW] 5 as any + 2 as unknown as + تعليق قديم يكذب** | kinetic-text:132, owner/page:277, cart:108… | إصلاحات موضعية + حذف التعليق |
| C10 | **[LOW] parsePagination منسوخ ×11 بDefaults متباينة + key={i} على قائمة قابلة لإعادة الترتيب** | 11 مسارات, owner/settings:340-342 | helper مشترك + key={url} للمعرض + تحديث أرقام README |

## المرحلة D — اختبارات حقيقية + CI + توثيق (10) 🏗️

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| D1 | **[HIGH] دورة حياة الطلب + احتساب الولاء: صفر تغطية بأي مستوى** | orders/[id]/route.ts:104-231 (0% lcov), لا e2e يغير حالة | unit بنمط tx-mock (pending→completed يحتسب، مزدوج يُحظر، toggle ذهاب/إياب) + تمديد round5: تقدم الحالة للطلب الجديد |
| D2 | **[HIGH] اختبار الاشتراكات يختبر نسخة منسوخة — فرع الموافقة (المسار المالي) بلا اختبار حقيقي** | subscription-decisions.test.ts:9-18 (لا يستورد الوحدة) | إعادة كتابة باستيراد resolveSubscriptionPayment بنمط txMock: verified جديد/ترقية/already/not_found؛ حذف النسخ |
| D3 | **[MED-HIGH] CI يسحب wait-on غير المثبت من npm بلا قفل (خارج minimumReleaseAge)** | ci.yml:154, pnpm-lock: 0 مرجع | pnpm add -D wait-on مقنن |
| D4 | **[MED] رحلات بلا تغطية: تقييم/معرض/رجوع المعالج/طباعة/ثبات السمة + اختبار سفسطائي** | ReviewSheet, GalleryCarousel, SubscribeForm:538, persona-6:58 | round87-journeys.spec: تقييم كامل/معرض ظاهر/رجوع المعالج/محتوى الطباعة/السمة قبل-بعد + إصلاح persona-6 |
| D5 | **[MED] ratchet يعمل لكن lcov لا يُرفع + 18 ملف lib صفر%** | ci.yml:129,190-231; fetch-json/blob/get-error-message 0% | رفع lcov artifact (if:always) + unit لـ fetch-json (fetch mocked) وblob (حارس النطاق) وget-error-message |
| D6 | **[MED] Dockerfile: node:22 ضد engines≥24 + pnpm@latest بلا قفل + لا يُبنى أبداً** | Dockerfile:1-2 vs package.json:79-81 | node:24-alpine + pnpm@11.9.0 مقنن |
| D7 | **[MED] دين التقلاج: 164 sleep منها 36≥3 ث + 85 networkidle — أسوأها في helpers مشتركة** | qa-helpers:28-38, team1:33-44, team4:73-80 | استبدال sleeps في المساعدات المشتركة بانتظار حالة (textContent/placeholder) — ينتقل الأثر لكل المواصفات |
| D8 | **[LOW-MED] مشروع webhook ميت مكرر + auth-verify يتجاهل BASE_URL** | playwright.config.ts:26-33,94 | حذف المشروع المكرر + baseURL من env |
| D9 | **[LOW-MED] توثيق متقادم: أرقام README/PROJECT، فهرس docs يقف عند 85، SKIP_ENV_CHECK غير معلن** | README:55,89, PROJECT:3,229,354, docs/README:1 | جولة تحديث واحدة شاملة |
| D10 | **[LOW] SW قاعدة تحديث الإصدار مكسورة (v5 منذ round79) + لا بوابة parity للهجرات + prod-qa بلا كاش متصفح** | sw.js:1-2, ci.yml, vercel.json | قفزة v6 مع تغيير السلوك (سقف LRU لمخبأة الصور) + prisma migrate diff في CI + كاش المتصفح لـ prod-qa + maxDuration للـ cron |

## المرحلة E — البوابات والنشر 🚦

1. tsc 0 · eslint 0 · vitest (هدف ≥560 بعد D1/D2/D5) · check-api-auth · build
2. e2e محلي: core + الفرق 1-7 + round87-journeys الجديدة + أمان 80/86
3. axe إنتاجي بعد B (سكربت round86-axe-sweep قابل لإعادة الاستخدام) — لا تراجع
4. Commits لكل مرحلة بالتوقيع الإلزامي → push → تحقق إنتاجي (scripts/round86-prod-verify.mjs) + فرق QA على الإنتاج
5. تقرير docs/round87-closure-report.md + worklog

**قرارات مالك مؤجلة (تُوثّق ولا تُنفّذ):** تفعيل featured بالمحرر، تدوير الأسرار، حذف showcaseTag (الكتابة المزدوجة مستمرة عمداً حتى القرار)، مسار تحويل الإحالة إلى converted (مكافأة المُحيل)، ترحيل LazyMotion الكامل (47.5KB gz — جولة مخصصة).
