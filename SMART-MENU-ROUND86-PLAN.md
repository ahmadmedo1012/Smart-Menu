# SMART-MENU — ROUND 86 MASTER PLAN
## الجولة الأعمق والأوسع: أمان + أداء + جودة كود + اختبارات + بنية تحتية + توثيق

**التاريخ:** 2026-09-06 · **القاعدة:** c5b37bf6 (جولة 85 مغلقة، كل البوابات خضراء)
**المنهجية:** تشخيص حقيقي عبر 4 وكلاء تدقيق متخصصين (أمان / أداء / جودة كود / اختبارات وCI وبنية) + بوابات محلية (tsc 0 / eslint 0 / vitest 520/520) + إنتاج سليم (200×5) + تدقيق تبعيات (8 ثغرات). **تم التحقق شخصياً من الحرجّين F1/F2/P2 — لا تخمين، كل بند موثّق بـ file:line.**

**المصدر:** تقارير الوكلاء الأربعة — 10 اكتشافات أمنية، 10 أداء، 10 جودة كود، 10 اختبارات/CI + 8 ثغرات npm audit.

---

## المرحلة A — تحصين الأمان (12 مهمة) 🔒

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| A1 | **[HIGH] POST /api/categories بلا بوابة دور لغير owner** — أي حساب USER يكتب قسماً في منيو أي مطعم (تشويه مباشر عبر revalidateMenu) | categories/route.ts:60-74 (GET يرفض USER عند :37 لكن POST لا) | بوابة requirePermission('MANAGE_RESTAURANTS') لغير owner + رفض USER |
| A2 | **[HIGH] GET /api/loyalty/stats يقرأ PII عبر cookie مزيّف** — fallback لـ `smart-menu-restaurant` cookie بلا فحص ملكية عند غياب requestedId | loyalty/stats/route.ts:22-33 | استخدام resolveRestaurantScope (فحص staff/owner موحد من stats-queries.ts:58-61) + حذف fallback الـ cookie |
| A3 | [MED] حذف blob عشوائي — deleteBlob يحذف أي URL في حساب Vercel Blob كله (حذف أصول مستأجر آخر عبر تخزين URL ضحيته ثم استبداله) | lib/blob.ts:4-10, items/[id]/route.ts:161-163, settings/route.ts:168-176, restaurants/[id]/route.ts:187-194 | تحقق URL ضد نطاق blob الخاص + بادئة `restaurants/{id}/` قبل del()، والتحقق عند الكتابة |
| A4 | [MED] عناصر الطلب غير مربوطة بمطعم الطلب — عناصر من مطعم آخر أو مخفية تُلوّث الإحصاءات والولاء | api/orders/route.ts:116-120 | `where: { id in [...], status:'available', category: { is: { restaurantId: body.restaurantId } } }` |
| A5 | [LOW-MED] حقن Markdown لتلغرام المدراء — اسم/مطعم المستخدم يظهر كرابط قابل للنقر في إشعارات المدراء (تصيّد) | lib/telegram.ts:24-28 + مصادر عند auth/register:90-94, restaurants:218-222 | esc() لت escapes الخاصة بـ MarkdownV2/Markdown قبل الاستيفاء |
| A6 | [LOW] receiptImageUrl يقبل javascript: ويُعرض كـ href للمدراء | subscriptions/route.ts:42, upgrade/route.ts:24 | refine https:// فقط |
| A7 | [LOW] نصوص بلا حدود (DB bloat + مفتاح حد المعدل) — customerName/notes/name بلا .max | orders/route.ts:18-28, orders/[id]:16-23, restaurants:21-30, auth/login:36 | .max مطابقة لـ reviews (name 50, phone 30, notes 500, description 500) + usernamePresence.max(100) |
| A8 | [LOW] requireAdmin يمرر sub_admin بلا أذونات — تعديل system-events وقراءة audit-logs كاملة | lib/auth.ts:42-46, admin/system-events:27-102, admin/audit-logs:20 | تحويل المسارين لـ requirePermission مناسبة |
| A9 | [LOW] GET /api/items/[id] غير مصرح يكشف العناصر المخفية | items/[id]/route.ts:11-34 | 404 لغير الموظفين إذا status≠available |
| A10 | [LOW] كلمة مرور بروفايل المدير تقبل 6 أحرف (السياسة 8) | admin/profile/route.ts:18 | PASSWORD_MIN_LENGTH المشترك |
| A11 | [FUNC] whatsapp/generate يرفض super_admin (403) | whatsapp/generate/route.ts:38-53 | إضافة super_admin للسلسلة |
| A12 | تقوية check-api-auth.mjs (file-level فاتته A1 سابقاً) + اختبار e2e سلبي: USER يحاول POST categories → 403 | check-api-auth.mjs | فحص لكل handler مصدّر + test سلبي |

## المرحلة B — الأداء (12 مهمة) ⚡

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| B1 | **[HIGH] أول "أضف للسلة" يحمّل runtime dotLottie (~172KB JS / ~55KB gz)** على مسار QR | premium-toast.tsx:15-18,71 + MenuPageClient.tsx:106-109 | مسار أيقونة متحركة CSS/SVG موجود بدل lottie لعربة السلة |
| B2 | **[HIGH] استعلام featured يشير لعمود غير موجود** (`MenuItem.restaurantId`) — **مؤكد تجريبياً: "column does not exist"** — الميزة معطلة على أي قاعدة مطابقة للمخطط + فشلا استعلام بكل revalidation | menu/[slug]/page.tsx:118-135، prisma/schema.prisma |谓询 عبر `"categoryId" IN (SELECT id FROM "MenuCategory" WHERE "restaurantId"=$1)` (كما في round83-seed.mjs:131) + partial index |
| B3 | **[HIGH] بحث المنيو: router.replace لكل ضغطة → رحلة RSC كاملة لكل حرف** (50-200KB flight لكل استعلام فريد) | MenuPageClient.tsx:66-85 | window.history.replaceState (مزامنة useSearchParams عبر History API) |
| B4 | [MED-HIGH] motion runtime كامل 144KB بمسار المنيو (الشبكة العادية تستخدم CSS أصلاً) | chunk 05370rfi6bt_h + MenuItemCard/OptimizedImage/StickyMenuHeader/FeaturedShowcase | LazyMotion + domAnimation + m. في مكونات المنيو (~60-70% من payload) |
| B5 | [MED] /pricing مكون client كامل + شلال fetch بعد hydrate (نفس نمط B2-85 الذي أُصلح للanding) | pricing/page.tsx:1 + fetch | server wrapper يمرر initialPlans (revalidate=300) |
| B6 | [MED] MenuClientSection 'use client' بلا hooks — الهيرو يُشحن ككود client | MenuClientSection.tsx:1-96 | تحويله لمكون server (الجزر التفاعلية معزولة أصلاً) |
| B7 | [MED] flight payload: كائن category كامل لكل عنصر + حقول ميتة (status/isActive/updatedAt) | page.tsx:178-214 | إرسال categories مرة واحدة + join بـ categoryId + حذف الحقول الميتة (تقليص 15-25%) |
| B8 | [MED-LOW] OrderDialog + ReviewSheet مستوردان ستاتيكياً (795 سطر dialogs تُحمّل مقدماً) + qrcode كامل (~45KB gz) بصفحة الولاء | MenuPageClient.tsx:13-14, ReferralQR.tsx:4 | dynamic() للاثنين + await import('qrcode') عند التحميل |
| B9 | [MED] استطلاعات orders تجلب projections كاملة (items+restaurant لكل صف، pageSize 50) كل 5-15 ث + groupBy شامل بلا فترة زمنية بمسار 30 ث | api/orders/route.ts:82-93, admin/stats/route.ts:106 | select نحيف للقائمة + حد فترة 90 يوماً للـ popular |
| B10 | [LOW] صفحة الطباعة include بلا select — عمود image (حتى 7MB data-URL) يُجلب لصفحة لا تعرض صوراً + awaits متتالية | menu/[slug]/print/page.tsx:28-37 | select للحقول المطلوبة فقط + Promise.all |
| B11 | [LOW] SW لا يخزن /_next/image cache-first + /api/orders/count بلا Cache-Control: no-store | public/sw.js:38, orders/count | إضافة /_next/image للمسار cache-first + no-store |
| B12 | [LOW] SEVEN_DAYS_AGO ثابت module-level — نافذة "الجديد" تتسع بمرور عمر الـ lambda | page.tsx:12,95,197 | حساب داخل الدالة (متوافق مع ISR) |

**ترحيل فهارس B13:** partial index `ON MenuItem(categoryId) WHERE isFeatured` + `MenuCategory(restaurantId, isActive, sortOrder)` + `Order(restaurantId, createdAt)` (raw SQL migration — يحذف أيضاً الفهارس المكررة: LoyaltyCard @@index(referralCode) والـ Session @@index(token) المكررة مع unique).

## المرحلة C — جودة الكود (12 مهمة) 🧹

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| C1 | **[HIGH] 7 مواقع تعرض نجاحاً كاذباً** — csrfFetch بلا res.ok: toast نجاح + تعديل حالة محلية على طلب مرفوض (403/422) | owner/menu:197,203,220,239; admin/menu:123,136; admin/restaurants:95,126 | csrfJson helper (يفحص res.ok + envelope ويرمي) |
| C2 | **[HIGH] استطلاع admin/orders كل 5 ث يمحو نتائج "عرض المزيد"** (fetch(1) يستبدل القائمة) | admin/orders/page.tsx:96,343 | استطلاع ID-probe مثل owner/orders:148-176 |
| C3 | [MED] حلقة استطلاع + جرس صوتي منسوخة ×8/×3 (~250 LOC + 3 as any) | 8 ملفات + 3 أصوات | usePollWhenVisible hook + lib/chime.ts |
| C4 | [MED] بوابة auth يدوية منسوخة ×11 صفحة admin (~220 LOC) + 2 صفحة owner تعيد اختراع useActiveRestaurant (بلا اشتراك حدث التبديل = بيانات قديمة) | 11 admin pages, owner/page:104-117, owner/menu:130-159 | useAccessGate hook + ترحيل الصفحتين للـ hook الموجود |
| C5 | [MED] نوع Plan معرّف 9 مرات + fallbacks `as unknown as Plan[]` ×3 | 9 ملفات | lib/plan-types.ts + fetchPlans() مشترك |
| C6 | [MED] useOrderDetail سباق استجابات (A→B تتأخر A فتطغى) | useOrderDetail.ts:81-92 | علم cancelled (نمط useActiveRestaurant) |
| C7 | [MED] مساعدات متباعدة: generateReferralCode بـ 4 بايت مقابل 8! + timingSafeEqualStrings مكرر رغم lib/secure-compare + pendingMismatch store ميت | orders/[id]:12, loyalty:24, admin/telegram/verify:13, telegram/webhook:15, store/cart.ts:56 | توحيد في lib + حذف الميت |
| C8 | [MED] PaymentDialog 753 سطر + استطلاع لا يفشل أبداً (401 → دوران صامت للأبد) + أرقام هاتف fallback مدمجة بالكود | PaymentDialog.tsx:193-218,56-57,87-90 | إصلاح الاستطلاع (res.ok + سقف إخفاق + منع تراكب) + lib/payment-constants.ts |
| C9 | [MED] 33 Label غير مرتبطة بحقولها في نماذج owner/admin (نفس فئة انتهاك axe التي أُصلحت للعام) | ItemDialog×12, LoyaltySettings×9, ... | نمط useId من round-79 |
| C10 | [LOW] نظافة أنواع: as unknown as timers ×3، fallbacks Plan[] ×3، owner/menu fetchItems بلا res.ok، `throw new Error()` فارغ ×10، toast خطأ لرسالة "غير متوفر" | مواقع محددة | إصلاحات موضعية |
| C11 | [MED] مغلفات API متبقية (owner/reviews بلا meta، whatsapp/generate شكل خاص، demo/fix-images مختلط) | 3-4 routes | ترحيل أخير لـ paginated()/error() + تبسيط fallbacks للعملاء |
| C12 | [LOW] تكرار أرقام Plan fallback (0910089975/0942119637) مدمج بالكود client-side | PaymentDialog.tsx:56-57 | lib/payment-constants.ts مشترك |

## المرحلة D — الاختبارات والCI والبنية والتوثيق (10 مهام) 🏗️

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| D1 | **[HIGH] db-unstick بلا try/catch — وميض DB يفشل البناء كله** + يقتل جلسات prod بلا تمييز (لكنه **لا يُحذف من Vercel** — هو إصلاح P1002!) | scripts/db-unstick.mjs:9,25-32 | try/catch كامل + قتل PIDs الخاملة فقط (قبل بدء البناء) + سجل |
| D2 | **[HIGH] CI لا يشغّل الاختبارات العميقة محلياً** (16 ملف/~63 حالة: payments/owner-CRUD/IDOR لا تعمل في CI أبداً) + تقرير prod-QA يُفقد (upload if:failure قبل الخطوة + continue-on-error) | ci.yml:141-158, package.json:16 | خطوة blocking لـ qa-teams على localhost + upload if:always لـ prod-QA |
| D3 | [HIGH] بلا تتبع أخطاء إنتاج (Sentry غائب، instrumentation no-op) — يتطلب حساب مالك | src/instrumentation.ts:5-7 | تجهيز الكود (dsn اختياري) + توثيق خطوة التفعيل كقرار مالك — بدون إضافة تبعية بلا مفتاح |
| D4 | [HIGH] اختبارات مفقودة للحرّاس: session.ts (6%)، تلغرام (0%×4) — **اختبار webhook الحالي يختبر نسخة منسوخة من الكود وليس الكود نفسه!** | coverage/lcov.info, telegram-webhook.test.ts:7-22 | اختبارات حقيقية للـ helpers المصدّرة + session.ts + fetch-json |
| D5 | [HIGH] عتبات التغطية لا تعمل في CI أصلاً (npm test بلا --coverage) | ci.yml:107 | vitest run --coverage في CI + رفع lcov artifact |
| D6 | [MED] CI workflow: بلا concurrency (إلغاء القديم) بلا timeout بلا permissions + chromium مرتين + wait-on غير مثبت + ترتيب بطيء | ci.yml | إصلاح شامل (concurrency/timeout/permissions/cache/ترتيب) |
| D7 | [MED] ثغرات npm audit الثمانية (browserslist≤4.28.6 عالية×2 عبر next، mysql2<3.22 عالية عبر prisma، والبقية) + تبعيات ميتة (@vercel/speed-insights بلا استيراد، tsx) + minimumReleaseAge معطل + main/license npm-init | pnpm audit, pnpm-workspace.yaml:7-8 | pnpm.overrides (browserslist/mysql2) + حذف الميت + تفعيل minimumReleaseAge |
| D8 | [MED] .env.example ناقص 7 متغيرات + PORT=3002 يناقض التوثيق/الاختبارات (3000) | env reads vs example | إكمال + تصحيح |
| D9 | [MED] round83-seed بلا حارس إنتاج (كتابة بيانات اختبار في prod بلا ALLOW_SEED) + ci-seed تعليق كاذب (100k والفعلي 600k) | round83-seed.mjs:15, ci-seed.mjs:26 | نفس حارس ci-seed + تصحيح التعليق |
| D10 | [MED] التوثيق: PROJECT.md يصف layout جذري غير موجود + PORT + أرقام قديمة؛ لا runbook استرجاع/نسخ احتياطي | PROJECT.md:140-141, README | تصحيح + docs/ops-runbook.md (Neon PITR + rollback الترحيلات) |

## المرحلة E — البوابات والنشر 🚦

1. tsc 0 · eslint 0 · vitest (بالتغطية) · check-api-auth (المقوى) · build
2. e2e محلي: security+api+ui+auth-verify (145) + عينة qa-teams (على الأقل team1/team4 لضمان A/B/C لم يكسر رحلات)
3. axe على صفحات المنيو العامة بعد B (لا تراجع a11y) — خاصة بعد B4/B6/B7
4. Commit لكل مرحلة بالتوقيع المفروض → push → Vercel → تحقق إنتاج (صفحات/رؤوس/featured/count) + فرق QA على الإنتاج
5. تحديث worklog + تقرير الختام docs/round86-closure-report.md

**قرارات مالك مؤجلة (لا تُنفذ):** تفعيل featured في محرر الإنتاج، تدوير TELEGRAM_BOT_TOKEN/DATABASE_URL/CRON_SECRET، حذف عمود showcaseTag القديم.
