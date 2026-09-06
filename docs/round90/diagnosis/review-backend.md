# تشخيص g90-D2 — جيش المراجعة: التخصصات الخلفية (security · red-team · api-contract · data-migration)

**التاريخ:** جولة 90 · الوكيل D2 · **الوضع:** تشخيص فقط — صفر تعديل كود.
**النطاق:** الشجرة كاملة (ليس diff): `src/app/api/**` (60 مسارًا) · `src/lib/**` · `prisma/schema.prisma` + 19 هجرة · `src/proxy.ts`.
**المنهجية:** gstack review-army (specialists dispatch + Step 4.6 merge + red-team أخيرًا). تجاهلت أقسام Preamble/Telemetry.
**خط الأساس المستبعد المعلن:** 21 تحذير any الموروثة + 6 رسائل إنجليزية مؤجلة (dx-1 ب-6) — لا تُعاد هنا.

---

## خطوة التحقق البيئي (قاعدة البيئة)

- كل أوامر DB بُادئت بـ `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/smartmenu" SKIP_ENV_CHECK=true`.
- `npx prisma migrate status` → **19/19 مطبقة، Database schema is up to date!**
- `npx prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource` → **No difference detected** (لا انحراف datamodel↔قاعدة).
- `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma` (بظل SHADOW) → **No difference detected** (سلسلة الهجرات قابلة لإعادة التشغيل وتنتهي حرفيًا عند schema.prisma).
- ملاحظة CLI: `prisma diff` غير موجودة في إصدار Prisma الحالي (الأمر الصحيح `migrate diff`، و`--to-url` استُبدلت بـ`--to-config-datasource`).

---

## 1) تخصص security — النتائج

### ما هو متين (إيجابيات موثقة كدليل)
- **كلمة المرور:** PBKDF2-SHA512 بـ600k تكرار + ملح 32B + `timingSafeEqual`، ترقية شفافة عند الدخول (`src/lib/hash.ts:8,97`)، لا سقوط لصيغة نص صريح (`verifyHash:50`).
- **التوقيت الثابت في كل المواضع الحساسة:** CSRF (csrf.ts:97)، bearer الكرون (secure-compare.ts:9)، سر الويبهوك (webhook:165)، توكنات الربط (verify:49 / webhook:245) — كلها عبر `timingSafeEqualStrings`.
- **CSRF:** Origin مثبت على مضيف المنصة لا على ترويسات مرسِل + double-submit بكوكيز minting في proxy.ts:52 مع استثناءات مضبوطة exact-match (csrf.ts:8-21).
- **الجلسات:** توكن UUID → sha256 في القاعدة (session.ts:19)، سقف مطلق 7 أيام (session.ts:14)، تقليم 5 جلسات، حذف مرتّب عند الخروج.
- **مفاتيح الاشتقاق:** HKDF بفصل info (`hmac`/`aes-gcm`) من AUTH_SECRET (keys.ts:14-21)، AES-GCM بIV عشوائي 12B (config.ts:25). التحقق من قوة الأسرار في env.ts:10-17.
- **مسار الويبهوك:** fail-closed بلا سر (403 موحدة) + allowlist معرفات أدمن + anti-replay على توكنات الربط (نفس فضاء `link-token:` في المسارين) — كل البوابات الثلاث تعمل.
- **فصل IO:** جرد 60 مسارًا: لا يوجد مسار تغيير بلا بوابة — البوابات إما requireAuth/requirePermission/requireAdmin أو سر (CRON_SECRET/TELEGRAM_WEBHOOK_SECRET) أو مسار عام مقصود (plans/public/loyalty/claim/validate) — كلها بحدود.

### النتائج

**S-1 · CRITICAL (ثقة 8) — POST /api/owner/restaurants بلا بوابة دور: أي حساب USER يفتح مطعمًا حيًا مجانًا وبلا رؤية تشغيلية**
`src/app/api/owner/restaurants/route.ts:77` — `requireAuth()` فقط (بلا `requirePermission` ولا تحقق role). أي مسجل جديد بدور USER (`auth/register:66` يضبط USER) يجتاز كل البوابات:
- `isOwnerSubscriptionActive` ترجع true (UNPAID ≠ EXPIRED، planEnd فارغ — subscription-guard.ts:16-24).
- `maxMenus = user.plan?.maxMenus ?? 1` → 1، وعدد روابطه 0 → الشرط يمر (route:93,103).
- النتيجة: مطعم `isActive:true` (route:120) بحدود **schema الافتراضية 50 صنفًا/500 طلبًا** (schema.prisma:105-106) = **5× سقوف الخطة المجانية المعلنة** — إصلاح round87-A6 (restaurants/route.ts:170-177: freeCaps 10/100) طُبق على مسار التسجيل الذاتي الموازي فقط، لا هنا.
- **صفر audit وصفر notifyEvent** (قارن: restaurants POST:257-264 يسجل الاثنين) — إنشاء غير مرئي للمشغل.
- الأدلة المعاكسة أن هذا إغفال لا تصميم: (أ) إصلاح round86-A1 أغلق الثغرة نفسها في categories POST (`categories/route.ts:83-89` — كان USER يمر مستقيمًا) وبقيت مفتوحة هنا؛ (ب) بقية مسارات /api/owner كلها تقيد بالدور؛ (ج) GET على نفس المسار غير مؤذٍ لUSER (لا روابط) — POST وحده الفجوة.
- الأثر: حجز slugs (حجب أسماء أعمال حقيقية عن مسار الدفع — subscriptions/route.ts:62-76 يرفض المعلق فقط)، تلويث منصّي بصفحات /menu/<slug> عامة، وتفكيك طلبات الترقية لاحقًا (`subscriptions/upgrade:113` يكتفي بوجود رابط UserRestaurant — USER يملكه فيصبح دفعًا لمطعم لا يستطيع إدارة أصنافه).
- إصلاح مقترح: بوابة دور owner (أو MANAGE_RESTAURANTS) + تطبيق freeCaps مثل المسار الموازي + logAudit/notifyEvent + `.max()` على name/slug (انظر A-6).

**S-2 · CRITICAL (ثقة 7) — sub_admin يحمل MANAGE_USERS يعيد تعيين كلمة مرور super_admin = استيلاء كامل**
`src/app/api/admin/reset-password/route.ts:18` — البوابة `requirePermission("MANAGE_USERS")` تمرّ لـ sub_admin يحمل الإذن (auth.ts:67) ثم `prisma.user.update({ where: { id: body.userId } })` بلا أي حارس إضافي. التصعيد:
- sub_admin+MANAGE_USERS يعيد كلمة مرور super_admin (:25-27) → `deleteMany` جلساته (:30) → دخول بحساب super_admin.
- الشواهد أنها إغفال: كل مسارات العائلة نفسها تحرس مرتين — `admins/[id]:19,29` (`auth.role !== 'super_admin'` + «لا يمكن تعديل مدير عام»)، `users/[id]:37` (تعيين الأدوار super_admin فقط)، `users/[id]:114` (الحذف super_admin فقط + لا حذف مدير عام). reset-password وحده بلا الحارسين.
- إصلاح: `if (auth.role !== 'super_admin') return 403` + رفض استهداف `target.role === 'super_admin'` (نفس نص admins/[id]).

**S-3 · INFORMATIONAL (ثقة 8) — عمليات كتابة على قfeed الأحداث ببوابة إذن قراءة**
`src/app/api/admin/system-events/route.ts:71,95,124` — POST/PUT/DELETE على SystemEvent (سجل التشغيل الذي يحمل rbac.role_change وauth.lockout والدفع) بوابتها `VIEW_ANALYTICS` — أدنى إذن (لوحات). sub_admin بلا أي إذن كتابة يستطيع **تحرير/حذف** أحداث امتيازات مكتوبة (تعديل metadata بما فيه userId). قناة AuditLog الأصل أصلب (admin/audit-logs عبر requireAdmin ولا تُحرر عبر API) — لكن قناة SystemEvent هي القناة الثانية للامتيازات ويجب ألا تكون قابلة للكتابة بإذن قراءة. إصلاح: إذن كتابة صريح (EDIT_SETTINGS) أو super_admin للكتابة/الحذف.

**S-4 · INFORMATIONAL (ثقة 7) — إنشاء owner بلا تدقيق (وخلل نموذج multi-menu)**
`src/app/api/admin/create-owner/route.ts:26` — ينشئ حساب owner ببيانات اعتماد دون logAudit ولا notifyEvent (كل عائلة credentials الأخرى تدقق: reset-password:32، admins POST:44، users/[id]:57). كذلك لا ينشئ UserRestaurant — المالك الجديد يُدار عبر تساوي restaurantId فقط (كسر مع نمط الملكية في كل المسارات الأخرى). إصلاح: logAudit + إنشاء الرابط أو تعليق يوثق القصد.

**S-5 · INFORMATIONAL (ثقة 7) — طلبات على مطاعم موقوفة مقبولة**
`src/app/api/orders/route.ts:229` — فحص المطعم `findUnique` بلا `isActive` في مرشِّح: المالك الذي أوقف مطعمه (`owner/restaurants/[id] PATCH isActive:false` أو restaurants/[id]) يظل يستقبل طلبات عبر POST المباشر (تُحسب على سقف maxOrders والإحصاءات). إصلاح: `where: { id, isActive: true }` → 403/409 واضح.

**S-6 · INFORMATIONAL (ثقة 6) — ائتمانية ترويسات IP للـrate-limit غير متسقة وعرضة للنشر الذاتي**
نمطان متعاكسان: `x-real-ip` أولًا (login:32، orders:143، orders/[id]:63، subscriptions:22، upgrade:38، webhook:171، loyalty/stats:12، referral POST:25) مقابل أول قيمة `x-forwarded-for` أولًا (referrals/claim:30، loyalty:38، reviews:98، restaurants:15، upload:27). على Vercel تُفرض الترويستان من المنصة؛ على نشر self-hosted خلف proxy لا يطهر `x-real-ip` يستطيع العميل تسميم مفتاح الحد. إصلاح: مستخرِج IP واحد في lib (يفضّل أول x-forwarded-for ثم يوثق الافتراض).

**S-7 · INFORMATIONAL (ثقة 6) — تقييمات على أصناف مخفية**
`src/app/api/items/[id]/reviews/route.ts:120` — فحص الصنف بلا فلتر status: تقييمات عامة تُقبل على أصناف hidden/unavailable وتغذي avgRating العام. إصلاح: `where: { id, status: 'available' }`.

---

## 2) تخصص api-contract — النتائج

**A-1 · INFORMATIONAL (ثقة 8) — انقلاب دلالة 401/403 في فرعين متبقيين**
round89-E3 ثبتت القاعدة (غير مصادق=401، مصادق-ممنوع=403) وحدّثت users/restaurants — بقي فرعان يخالفان: `src/app/api/orders/[id]/route.ts:44` (GET: مالك مصادق بلا رابط → **401** بينما PUT لنفس الملف:88 يعطي 403) و`src/app/api/whatsapp/generate/route.ts:43` (مالك مصادق بلا ملكية → **401**). أثرها: عملاء الشرائح (rbac-negative e2e) سيلتقطون التغيير عند توحيدها. إصلاح: 403 في الموضعين.

**A-2 · INFORMATIONAL (ثقة 7) — سقف image في PUT لا يزال 7M (الانحراف الموثق E-4)**
`src/app/api/items/[id]/route.ts:114` — `z.string().max(7000000)` مقابل 200,000 في POST للـresource نفسه (items/route.ts:72). فئة DoS/انتفاخ DB + عدم اتساق عقدي بين مساري الكتابة لنفس المورد. (مؤجل رسميًا للمنسق — يُدرج هنا ببصمة للموجة 2).

**A-3 · INFORMATIONAL (ثقة 7) — سباق idempotency الطلب يُرجع 409 برسالة «اسم موجود»**
`src/app/api/orders/route.ts:220` — check-then-create على orderNo: إرسالان متزامنان (أو إعادة محاولة شبكة متأخرة) بنفس idempotencyKey → القيد الفريد يجعل الثاني يقفز إلى handleError → **409 «بيانات مكررة — هذا الاسم موجود مسبقاً»** (api-helpers:114) — رسالة «اسم» لطلب، بدل التأكيد الخامل 200 المتعاقد عليه (:225). إصلاح: التقاط P2002 على `orderNo` تحديدًا → إرجاع نفس شكل idempotent.

**A-4 · INFORMATIONAL (ثقة 6) — status صنف كسلسلة حرة في zod (تحقق متأخر)**
`items/[id]/route.ts:115` و`items/route.ts:73` — `status: z.string().optional()` بلا enum: قيمة غير صالحة تسقط لاحقًا كضجيج Prisma → 400 عام «بيانات غير صالحة» عبر handleError بدل مغلّف 422 validationError المتسق مع بقية الحقول (isValidOrderStatusFilter موجود جاهزًا في api-helpers:95).

**A-5 · INFORMATIONAL (ثقة 6) — PII تقييمات المالك غير متوافقة مع multi-menu**
`items/[id]/reviews/route.ts:56` — فحص ملكية المالك `item.category.restaurantId === auth.restaurantId` فقط (بدون UserRestaurant كما في كل مسارات المالك) → مالك متعدد المنيوهات يفقد أسماء/هواتف زبائن فرعه الثاني من نفس الواجهة. اتساق سلوكي لا أمن (PII محجوبة لا مكسورة).

**A-6 · INFORMATIONAL (ثقة 5) — POST /api/owner/restaurants بلا حدود طول**
`owner/restaurants/route.ts:10-16` — name/slug/description/phone/whatsapp بلا `.max()` (المخطط الموازي restaurants/route.ts:22-32 يحدّ 200/100/1000/30/30). الفشل يصل متأخرًا 400 عام من Prisma بدل 422 عربي.

ملاحظة: الرسائل الإنجليزية المتبقية (config:18 · subscriptions/status:14,21 · logout · loyalty/referral:36,78,103 · validate...) هي بند dx-1 ب-6 المؤجل أصلًا — مسجلة كمرجع لا كاكتشاف.

---

## 3) تخصص data-migration — النتائج

**التحقق الحي (كله أخضر):** 19/19 مطبقة · لا انحراف schema↔DB · لا انحراف migrations↔schema (تشغيل replay كامل عبر shadow DB). الإنتاج (w6-closure) ثبت مطابقة diff عبر قناة البناء في الجولة 89.

**M-1 · INFORMATIONAL (ثقة 9) — لا تراجع (down) لأي هجرة من 19 — والثلاث التدميرية بلا حارس زمن تشغيل**
نمط Prisma المعياري، لكن القائمة تتطلب تدقيق قابلية التراجع:
- `20260906055500_drop_showcase_tag:17` — `DROP COLUMN "showcaseTag"`: سلامة البيانات **تحققت قبل التطبيق** (0 أيتام) لكن الهجرة نفسها بلا حارس تشغيل — لو طُبقت على قاعدة قفزت هجرة 12 (backfill) تُفقد الشارات بصمت لا رجعة.
- `11_replay_parity:96` — DROP COLUMN severity **بحارس udt ممتاز** (يخضع فقط لو ليس enum بعد) — النمط الذي يُحتذى.
- `14_referral_unique_claim:3` — `DELETE FROM Referral` dedupe: حذف بيانات غير محفوظ (مبرَّر توثيقيًا — صفوف مكررة تضخم الإحصاء) لكن غير قابل للتراجع.
إصلاح: اعتماد حارس/نسخة أمان (SELECT INTO جدول مؤقت) قبل أي DROP/DELETE قادم، وتوثيق نقطة استعادة.

**M-2 · INFORMATIONAL (ثقة 8) — كل CREATE INDEX بلا CONCURRENTLY (6 هجرات)**
`7:1` · `8:9` · `9:2` · `13:9-11` · `20260906043248:21-28` · `20260906113124:2-4` — أقفال ACCESS EXCLUSIVE أثناء بناء الفهارس على جداول موثقة الأحجام (round88: Order 40,250 · OrderItem 80,718 · SystemEvent 60,000 · RewardTransaction 64,400). في الحجم الحالي ثوانٍ قليلة، لكنها: (أ) تنمو خطيًا مع البيانات، (ب) تجعل نشر zero-downtime مستحيلًا خلال الهجرة. (Prisma لا يدعم CONCURRENTLY داخل migrate — يتطلب SQL يدويًا مُوثقًا كاستثناء مثل فهرس SystemEvent التعبيري).

**M-3 · INFORMATIONAL (ثقة 7) — ترتيب التسمية المعجمي كمصيدة مستقبلية**
الأسماء المختلطة تجعل الترتيب الفعلي: `0_init < 0_zz < 10 < 11 < 12 < 13 < 14 < 2026* < 1_* < 2_* < … < 9_*` (أي أن 10-14 تجري **قبل** 1-9، والزمنية 2026* قبل 2_*). موثق ببراعة في ترويسات 0_zz/11/12 — لكن أي هجرة قادمة بتسمية `2_...` أو إعادة ترقيم ستعيد الترتيب بصمت (P3005/فقدان parity). توصية: أسماء زمنية فقط (مثل الثلاث الأخيرة) + فحص الترتيب في CI parity.

**M-4 · INFORMATIONAL (ثقة 5) — cast غير محروس في هجرة الحالة**
`6_add_payment_status_enum:4` — `USING status::text::"PaymentStatus"`: أي قيمة قديمة خارج القيم الثلاث تفشّل الهجرة منتصف النشر (block deploy). عمليًا الحالة كانت مقيدة بنفس القيم — خطر نظري مسجل.

**Multi-phase safety (إيجابي):** الهجرات 10/11/12 idempotent محروسة صراحة لسيناريو prod-السباق (objects موجودة مسبقًا) + 11 يغلق drift replay بالكامل — نموذج نشر مختلط قديم/جديد مدروس جيدًا.

---

## 4) red-team — دمج الخصومي (بعد التخصصات الثلاثة)

### R-1 · CRITICAL (ثقة 8) — **بند TOCTOU المعاملات المؤجل: مواضعه الدقيقة** (دليل الموجة 2)
جسم `prisma.$transaction` التفاعلية **بلا `isolationLevel`** في أي موضع بالكود (rg: صفر استخدام خارج generated) → عزل Postgres الافتراضي **READ COMMITTED** عبر محوّل pg. نمط «عدّ داخل المعاملة ثم أنشئ» يحمي من التسلسل، لا من **التزامن**:
| الموضع | العدّ | السقف | أثر السباق |
|---|---|---|---|
| `src/app/api/orders/route.ts:237` | `tx.order.count` | `restaurant.maxOrders` | 10 طلبات POST متزامنة كلها تعدّ N < السقف → تنشئ كلها → تجاوز سقف خطة المال بعدد المتزامن |
| `src/app/api/items/route.ts:229` | `tx.menuItem.count` | `maxItems` | تجاوز سقف الأصناف (كتابة متزامنة من المحرر + زبون؟ عمليًا owner متزامن) |
| `src/app/api/owner/restaurants/route.ts:103` | `tx.userRestaurant.count` | `maxMenus` | تجاوز عدد المنيوهات |
- **مقابل آمن موجود في المستودع نفسه** (النمط الذي يجب التعميم): loyalty/redeem `updateMany` بشرط ذري (`route:56-77`) · referral-conversion قلب شرطي (`updateMany WHERE status='pending'`:146-154) · orders/[id] اكتمال الطلب (تحديث مشروط + earn-row:122-217). هذه ثلاث براهين أن الفريق يعرف النمط الصحيح — الفجوة فقط في عدادات السقوف.
- إصلاح الموجة 2 (خيارات): (أ) قلب ذري على عدّاد مخزّن (`updateMany WHERE count < cap` على عمود counter)، أو (ب) `isolationLevel: 'Serializable'` مع إعادة المحاولة، أو (ج) قيد فريد طبيعي يمنح التجاوز.
- يُعلَّم كـ"known-deferred round89 closure" — بصمة مطابقة هنا كي يلتقطه أسطول الإصلاح.

### R-2 · INFORMATIONAL (ثقة 7) — نمو RateLimitEntry الصامت على serverless
`src/lib/rate-limit.ts:37-45` — منظف 120s (interval + unref) لا يعمل بجدارة على Vercel: النسخة مجمّدة بين الطلبات والمؤقت المُلغى إشعاره لا يستيقظ دوريًا. المنظف الفعلي الوحيد هو المسح الاحتمالي 1/32 (:97-103) — **وهو يحذف صفوف المفتاح نفسه فقط**؛ صفوف المفاتيح ذات الاستخدام الواحد (محاولات `acct:ip:username`، `claim:ip`، `link-token:*`، `order:ip`) تتراكم أبدًا. هجوم بطيء واحد: تدوير أسماء مستخدمين بمعدل 10/دقيقة من IP واحد ≈ **14K صف/يوم بلا إنذار** (فشل صامت بلا alerting — فئة red-team المسجلة). إصلاح: مسح زمني في مسار طلب (DELETE WHERE windowEnd < now() بحد 1/N احتمالي على مستوى الجدول لا المفتاح) أو cron موجود أصلًا (cleanup).

### R-3 · INFORMATIONAL (ثقة 6) — تخفيف مفتاح الحد بالعناصر المتحكم بها
- `loyalty/route.ts:42,107` — المفتاح `${ip}:${restaurantId}` وrestaurantId من body/cookie → تدوير المطاعم يضاعف الحصص (20/دقيقة لكل مطعم × عدد المطاعم من نفس IP).
- `login/route.ts:36,65` — `acct:${ip}:${username}`: اسم المستخدم فضاء لا نهائي عشوائي → لا يمرر حد 20 لكنه يولّد صفوفًا (يتقاطع مع R-2).
- الأثر محدود (لا يكسر حد الحساب الواحد) لكنه يضعف الحدود الجمleich تحت حمل 10x.

### R-4 · INFORMATIONAL (ثقة 6) — سيناريوهات 100ms/الازدواج المعادي
- طلبان بنقرة مزدوجة **بلا idempotencyKey** → طلبان حقيقيان (سلوك منتج غالبًا مقصود؛ لكن لا ديدون على (هاتف، مطعم، سلة) لأي حارس) — يذكر كعدائي-QA لا كخلل.
- سباق trim الجلسات (session.ts:27-37): قراءة ثم deleteMany — تسجيل دخول متزامن قد يترك 6 جلسات — بلا أثر أمني عملي.
- رحلة 10x على الاستطلاع: user/events + orders/count + stats محدودة 120/دقيقة/مستخدم (B-4) — تحت 10 مستخدمين متزامنين × استطلاع 15s تبقى ≤ 40 req/min — آمن؛ الضغط الحقيقي الوحيد على DB من R-2 (صفوف الحدود).

### R-5 · INFORMATIONAL (ثقة 7) — حدود الإخفاق الصامتة (تمسكت بالعقد أو وثقتها)
- إرسالات تيليجرام best-effort (subscriptions/upgrade/webhook) — **موثقة** كمتعاقد عليها: الدفع يلتزم حتى لو فشل الإشعار.
- `revalidateMenu(...).catch(() => {})` — فشل إبطال ISR = منيو عام قديم حتى TTL 60s (حدود موثقة).
- `attachReferralPhoneToOrder` (orders/route:282-289) بلا await للنتيجة ولا فشل مرئي — إحالة مفقودة بصمت (موثقة progressive enhancement داخل lib) — لكن مع R-1 تظهر حافة: المالك يرى الطلب مكتملًا والإحالة معلقة بلا أثر مرئي له.
- webhook يبتلع كل الأخطاء بـ 200 'OK' (مقصود لTelegram) لكن يعني أن فشل `resolveSubscriptionPayment` (مثال: SLUG_TAKEN) يظهر فقط في تويست toast — لا SystemEvent للفشل (الفشل الوحيد المُسجل حاليًا في subscription-decisions هو error log نصي لا صف حدث).

### R-6 · دمج التخصصات (cross-category)
- **S-1 × upgrades:** ثغرة USER-مطعم تولّد حالة مدفوعة-غير قابلة للإدارة (upgrade عبر رابط الملكية يمر لكن role يبقى USER) — إصلاح S-1 يغلق السلسلة كلها.
- **S-2 × audit:** استيلاء sub_admin يستعمل مسارًا **مدققًا** (reset-password يسجل logAudit:32) — الحذف اللاحق للتدقيق ممكن عبر S-3 إن كان المهاجم يحمل VIEW_ANALYTICS أيضًا: سلسلة privilege-event محو مزدوجة القناتين.
- **A-2 × S-7:** مساران متبقيان لحدود مدخلات متأخرة (7M image، status كسلسلة) — نفس فئة dx-2 #9 التي أغلقت في 89.

---

## الخلاصة المدمجة (Step 4.6)

- **التخصصات المرسلة:** security · api-contract · data-migration · red-team (كلها dispatched، لا gating).
- **النتائج بعد الدمج والفرز:** 4 نتائج CRITICAL (S-1، S-2، R-1، + لا ثالث) — في الواقع **3 CRITICAL** (S-1، S-2، R-1) و**13 INFORMATIONAL**.
- MULTI-SPECIALIST CONFIRMED: A-2 (api-contract) + الأثر الخلفي في S-1 (freeCaps) — بصمتان مستقلتان على نفس الجذر.
- **PR Quality Score (شجرة كاملة تشخيصيًا):** `max(0, 10 − (3×2 + 13×0.5))` = **0/10** — متوقع في وضع تشخيص كامل الشجرة؛ الأخطر هي S-1/S-2 القابلة للإغلاق بأسطر معدودة، وR-1 الموكل رسميًا للموجة 2.
- الحالة العامة المتينة: لا مسار تغيير بلا مصادقة/إذن، crypto نظيف، CSRF/جلسات/ويبهوك محصنة — الثغرات في **حافة اتساق الأدوار** لا في الأساس.

---

## النتائج — JSON (سطر بسطر)

{"severity":"CRITICAL","confidence":8,"path":"src/app/api/owner/restaurants/route.ts","line":77,"category":"authorization-bypass","summary":"POST بلا بوابة دور: حساب USER يمر (isOwnerSubscriptionActive يرجع true لUNPAID) وينشئ مطعمًا isActive:true بحدود schema 50/500 (5× سقوف الخطة المجانية — إصلاح round87-A6 طُبق في restaurants POST فقط) بلا logAudit ولا notifyEvent — حجز slugs وتلويث منصة وكسر قيد الترقية","fix":"بوابة role==='owner' أو requirePermission(MANAGE_RESTAURANTS) + freeCaps كمسار التسجيل الموازي + logAudit/notifyEvent + حدود طول name/slug","fingerprint":"src/app/api/owner/restaurants/route.ts:77:authorization-bypass","specialist":"security"}
{"severity":"CRITICAL","confidence":7,"path":"src/app/api/admin/reset-password/route.ts","line":18,"category":"privilege-escalation","summary":"sub_admin يحمل MANAGE_USERS يعيد تعيين كلمة مرور أي مستخدم بمن فيهم super_admin (بلا حارس role ولا حارس هدف) ويسحب جلساته = استيلاء كامل؛ كل مسارات العائلة (admins/[id]:19,29 · users/[id]:37,114) تحرس مرتين","fix":"إضافة auth.role!=='super_admin'→403 + رفض استهداف target.role==='super_admin' (نفس نص admins/[id])","fingerprint":"src/app/api/admin/reset-password/route.ts:18:privilege-escalation","specialist":"security"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/app/api/admin/system-events/route.ts","line":71,"category":"audit-integrity","summary":"كتابة/تحرير/حذف SystemEvent (يحمل rbac.role_change وauth.lockout) ببوابة VIEW_ANALYTICS (إذن قراءة) — أدنى امتياز يستطيع العبث بسجل أحداث الامتيازات الثانوي","fix":"بوابة إذن كتابة صريح (EDIT_SETTINGS) أو super_admin للـPOST/PUT/DELETE مع إبقاء GET للقراءة","fingerprint":"src/app/api/admin/system-events/route.ts:71:audit-integrity","specialist":"security"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/admin/create-owner/route.ts","line":26,"category":"audit-gap","summary":"إنشاء حساب owner ببيانات اعتماد دون logAudit ولا notifyEvent ولا رابط UserRestaurant — عائلة credentials الوحيدة غير المدققة، وكسر مع نموذج multi-menu","fix":"logAudit(create) + notifyEvent + إنشاء UserRestaurant link أو تعليق قرار موثق","fingerprint":"src/app/api/admin/create-owner/route.ts:26:audit-gap","specialist":"security"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/orders/route.ts","line":229,"category":"validation-boundary","summary":"قبول طلبات لمطاعم غير نشطة — فحص المطعم بلا isActive: المطعم الموقوف (isActive:false) يستمر في استقبال طلبات POST مباشرة تحسب على السقف والإحصاء","fix":"where:{id, isActive:true} → 403/409 عربي واضح","fingerprint":"src/app/api/orders/route.ts:229:validation-boundary","specialist":"security"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/lib/rate-limit.ts","line":37,"category":"header-trust","summary":"مستخرج IP متباين بين المسارات (x-real-ip أولًا في login:32/orders:143/subscriptions:22/upgrade:38/webhook:171 مقابل أول x-forwarded-for في claim:30/loyalty:38/reviews:98/restaurants:15) — على نشر self-hosted خلف proxy لا يطهر x-real-ip يملك العميل مفتاح الحد","fix":"مستخرج IP موحد في lib (أول قيمة x-forwarded-for) + توثيق افتراض النشر على Vercel","fingerprint":"src/lib/rate-limit.ts:37:header-trust","specialist":"security"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/app/api/items/[id]/reviews/route.ts","line":120,"category":"validation-boundary","summary":"تقييمات عامة تُقبل على أصناف مخفية/غير متاحة (فحص الصنف بلا status) وتغذي avgRating المعروض عامًا","fix":"where:{id, status:'available'} قبل إنشاء التقييم","fingerprint":"src/app/api/items/[id]/reviews/route.ts:120:validation-boundary","specialist":"security"}
{"severity":"INFORMATIONAL","confidence":8,"path":"src/app/api/orders/[id]/route.ts","line":44,"category":"status-semantics","summary":"مالك مصادق بلا رابط ملكية يستلم 401 في GET بينما PUT لنفس الملف (:88) يعطي 403 — مخالف لقاعدة round89-E3 (مصادق-ممنوع=403)؛ نفس الانقلاب في whatsapp/generate:43","fix":"403 في الموضعين + تحديث فحوص rbac e2e المرتبطة إن وُجدت","fingerprint":"src/app/api/orders/[id]/route.ts:44:status-semantics","specialist":"api-contract"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/items/[id]/route.ts","line":114,"category":"payload-bound","summary":"سقف image في PUT لا يزال 7,000,000 حرف مقابل 200,000 في POST لنفس المورد (انحراف E-4 الموثق للمنسق) — فئة DoS/انتفاخ DB وعدم اتساق عقدي","fix":"توحيد .max(200_000) برسالة الضغط نفسها","fingerprint":"src/app/api/items/[id]/route.ts:114:payload-bound","specialist":"api-contract"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/orders/route.ts","line":220,"category":"idempotency-race","summary":"check-then-create على orderNo: إرسالان متزامنان بنفس idempotencyKey → القيد الفريد يوجه الثاني إلى 409 «بيانات مكررة — هذا الاسم موجود مسبقاً» (رسالة اسم لطلب) بدل تأكيد 200 الخامل المتعاقد (:225)","fix":"التقاط P2002 على orderNo تحديدًا وإرجاع success({orderNo, already:true},200)","fingerprint":"src/app/api/orders/route.ts:220:idempotency-race","specialist":"api-contract"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/app/api/items/[id]/route.ts","line":115,"category":"late-validation","summary":"status كسلسلة حرة في zod (PUT:115 وPOST items:73) — قيمة غير صالحة تسقط كضجيج Prisma إلى 400 عام بدل مغلّف 422 validationError المتسق","fix":"z.enum(ItemStatus) أو whitelist كما في isValidOrderStatusFilter","fingerprint":"src/app/api/items/[id]/route.ts:115:late-validation","specialist":"api-contract"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/app/api/items/[id]/reviews/route.ts","line":56,"category":"multi-menu-consistency","summary":"PII تقييمات المالك بفحص auth.restaurantId فقط (بلا UserRestaurant) — مالك متعدد المنيوهات يفقد أسماء/هواتف زبائن فرعه الثاني، مخالف نمط كل مسارات المالك","fix":"فحص رابط userRestaurant كما في items/settings/stats","fingerprint":"src/app/api/items/[id]/reviews/route.ts:56:multi-menu-consistency","specialist":"api-contract"}
{"severity":"INFORMATIONAL","confidence":5,"path":"src/app/api/owner/restaurants/route.ts","line":10,"category":"schema-bounds","summary":"createSchema بلا .max على name/slug/description/phone/whatsapp (المخطط الموازي restaurants:22-32 يحدّ 200/100/1000/30/30) — فشل متأخر 400 عام","fix":"مطابقة حدود restaurantInputSchema","fingerprint":"src/app/api/owner/restaurants/route.ts:10:schema-bounds","specialist":"api-contract"}
{"severity":"INFORMATIONAL","confidence":9,"path":"prisma/migrations/20260906055500_drop_showcase_tag/migration.sql","line":17,"category":"irreversible-migration","summary":"DROP COLUMN بلا حارس تشغيل ولا down: سلامة البيانات تحققت قبل التطبيق فقط؛ قاعدة قفزت هجرة 12 تفقد الشارات بصمت — و14_referral_unique_claim:3 يحذف صفوفًا بلا نسخة أمان (لا تراجع لأي هجرة من 19)","fix":"حارس udt/وجود (نمط migration 11:84-97) أو SELECT INTO نسخة أمان قبل أي DROP/DELETE قادم","fingerprint":"prisma/migrations/20260906055500_drop_showcase_tag/migration.sql:17:irreversible-migration","specialist":"data-migration"}
{"severity":"INFORMATIONAL","confidence":8,"path":"prisma/migrations/20260906043248_add_round88_indexes/migration.sql","line":21,"category":"index-lock","summary":"كل CREATE INDEX في 6 هجرات بلا CONCURRENTLY (7/8/9/13/20260906043248/20260906113124) — أقفال حصرية على جداول 40-80K صف أثناء نشر قناة البناء؛ تنمو مع البيانات وتمنع zero-downtime","fix":"للجداول الكبيرة مستقبلًا: SQL يدوي CONCURRENTLY خارج سلسلة prisma (مستثنى موثق كفهرس SystemEvent التعبيري)","fingerprint":"prisma/migrations/20260906043248_add_round88_indexes/migration.sql:21:index-lock","specialist":"data-migration"}
{"severity":"INFORMATIONAL","confidence":7,"path":"prisma/migrations/0_zz_replayability_prereq/migration.sql","line":1,"category":"ordering-footgun","summary":"الترتيب المعجمي يجعل 10-14 تجري قبل 1-9 والزمنية 2026* قبل 2_* — موثق في 3 ترويسات لكن أي تسمية مستقبلية 2_* أو إعادة ترقيم تعيد الترتيب بصمت (P3005/فقدان parity)","fix":"أسماء زمنية فقط للهجرات القادمة + فحص ترتيب ضمن CI parity","fingerprint":"prisma/migrations/0_zz_replayability_prereq/migration.sql:1:ordering-footgun","specialist":"data-migration"}
{"severity":"INFORMATIONAL","confidence":5,"path":"prisma/migrations/6_add_payment_status_enum/migration.sql","line":4,"category":"unguarded-cast","summary":"USING status::text::PaymentStatus بلا حارس — أي قيمة قديمة خارج الثلاث تفشّل الهجرة منتصف النشر (خطر نظري: القيم كانت متطابقة)","fix":"ALTER مع USING CASE fallback أو تدقيق قيم مسبق","fingerprint":"prisma/migrations/6_add_payment_status_enum/migration.sql:4:unguarded-cast","specialist":"data-migration"}
{"severity":"CRITICAL","confidence":8,"path":"src/app/api/orders/route.ts","line":237,"category":"toctou-race","summary":"بند TOCTOU المؤجل المحدد بدقة: عدّ+إنشاء داخل $transaction بعزل READ COMMITTED افتراضي (صفر isolationLevel في src/) — التزامن يجاوز السقوف: orders:237 (maxOrders) · items:229 (maxItems) · owner/restaurants:103 (maxMenus)؛ النمط الذري الصحيح موجود في المستودع (redeem updateMany:56، referral flip:146، orders/[id]:122)","fix":"قلب ذري على عدّاد (updateMany WHERE count<cap) أو Serializable مع retry أو قيد فريد — للموجة 2","fingerprint":"src/app/api/orders/route.ts:237:toctou-race","specialist":"red-team"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/lib/rate-limit.ts","line":37,"category":"silent-growth","summary":"منظف 120s لا يعمل بجدارة على serverless (نسخة مجمّدة + unref) والمسح 1/32 يحذف صفوف المفتاح نفسه فقط — صفوف المفاتيح أحادية الاستخدام (acct:ip:username، claim:ip، link-token:) تتراكم أبدًا: ~14K صف/يوم من IP واحد بلا إنذار","fix":"مسح احتمالي على مستوى الجدول (DELETE WHERE windowEnd<now بحد اقتراع) أو جدولة ضمن cron/cleanup القائم","fingerprint":"src/lib/rate-limit.ts:37:silent-growth","specialist":"red-team"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/app/api/loyalty/route.ts","line":42,"category":"rate-key-dilution","summary":"مفتاح الحد ${ip}:${restaurantId} وrestaurantId متحكم به من body/cookie — تدوير المطاعم يضاعف الحصص (20/دقيقة لكل مطعم)؛ ونفس الكاردينالية في acct:ip:username (login:36)","fix":"حد إجمالي لكل IP بمعزل عن المعرف المتحكم به أو تقسيم الحصص بوعي","fingerprint":"src/app/api/loyalty/route.ts:42:rate-key-dilution","specialist":"red-team"}
{"severity":"INFORMATIONAL","confidence":6,"path":"src/lib/session.ts","line":27,"category":"benign-race","summary":"trim الجلسات قراءة ثم deleteMany — تسجيل دخول متزامن قد يترك 6+ جلسات (بلا أثر عملي)؛ يذكر كخريطة سباقات لا كخلل","fix":"لا شيء عاجلًا — قيد count في الاستعلام إن لزم","fingerprint":"src/lib/session.ts:27:benign-race","specialist":"red-team"}
{"severity":"INFORMATIONAL","confidence":7,"path":"src/app/api/orders/route.ts","line":282,"category":"silent-failure","summary":"attachReferralPhoneToOrder بلا انتظار نتيجة ولا حدث فشل مرئي — إحالة تضيع بصمت للمالك (موثقة progressive enhancement داخليًا لكن مع R-1 تشكل حافة عدم اتساق مرئية)؛ فشل resolveSubscriptionPayment في webhook يظهر toast فقط بلا SystemEvent","fix":"SystemEvent تحذيري عند فشل attach/conversion في مسار الطلب (النمط موجود في referral-conversion:203)","fingerprint":"src/app/api/orders/route.ts:282:silent-failure","specialist":"red-team"}

---

**ترتيب الإصلاح المقترح للموجة 2 (حسب الأثر/الجهد):** S-1 (بوابة دور + freeCaps) → S-2 (حارسان) → R-1 (النمط الذري للتعميم على 3 عدادات) → S-3 (بوابة كتابة الأحداث) → A-1/A-2/A-3 (توحيد دلالات وسقوف) → M-1/M-2 (حارس/CONCURRENTLY للهجرات القادمة) → R-2/R-3.
