# تقرير التفتيش الأمني العميق — الجولة 94 / الوكيل B (2-b) «أمن أعمق — أبعاد جديدة»

- **خط الأساس**: `aec233ba` (r93-closure) — نفس بصمة الإنتاج الحي.
- **المنهج**: تدقيق بحث-فقط (لا تعديل كود). قراءة سطر-بسطر لدورة حياة الجلسات (session.ts/auth.ts/proxy.ts/login/logout)، مساري تيليجرام (webhook + link/verify + keys/secure-compare/telegram-api)، مسار واتساب، سباقات الإحالات/الولاء/الطلبات (سطر-بسطر مع schema.prisma للقيود)، محرك RateLimit وسلوكه عند الامتلاء، upload، تغطية CSRF (مطابقة الـmatcher + البحث عن Server Actions)، مسح PII، أسرار حزمة العميل، وكل استعمالات `$queryRaw/$executeRaw`. البحث بـ`rg --no-ignore` في src/app/api (درس r93 — تحققت أن سطر `upload/` أُزيل من `.git/info/exclude` فعلاً: 65 مسارًا مرئية الآن).
- **منع التكرار**: قرأت `docs/round93-inspection-b.md` كاملًا وتحققت من تثبيت إصلاحاته (انظر §1). النتائج أدناه **جديدة** غير مغطاة في r92/r93.

## خلاصة تنفيذية

| خطورة | العدد |
|---|---|
| CRIT | 0 |
| HIGH | 1 |
| MED | 0 |
| LOW | 5 |
| INFO | 2 |

مسارات المال الأساسية (أسعار الطلبات، المدفوعات، الاشتراكات) بقيت محصنة. أبرز جديد: **مسار واحد عالي الخطورة في نظام الإحالات** — مسار `POST /api/loyalty/referral` (مصادَق، غير محصور بمطعم، بلا أي واجهة تستخدمه) يقبل `referredPhone` من أي متصل بأي تحقق ملكية، بينما محرك التحويل يكافئ صاحب الكود تلقائيًا عند إكمال طلبات **أصحاب تلك الأرقام** — أي احتيال نقاط ولاء (وجبات مجانية) عبر «حشو أرقام» قابل للتوسيع. البقية: حدود/عيوب صغيرة موثقة بأدلتها.

---

## §0 — حالة إصلاحات r92/r93 (تحقق، لا إعادة اكتشاف)

| الإصلاح | الحالة | الدليل |
|---|---|---|
| PII مراجعات sub_admin (r93 MED-1) | ✅ مثبت | `items/[id]/reviews/route.ts:56-97` — sub_admin بلا إذن يمر عبر رابط UserRestaurant فقط |
| ترميز Markdown تيليجرام (r93 MED-2) | ✅ مثبت | `subscription-decisions.ts:142-143` — `escMarkdown(result.restaurant.name)` قبل التركيب |
| حد معدل items/restaurants المجهول (r93 MED-3) | ✅ مثبت | `items/route.ts:28` (60/min)، `restaurants/[id]/route.ts:20,86-90` (60/min قبل أي عمل) |
| إزالة `upload/` من `.git/info/exclude` (r93 LOW-11) | ✅ مثبت | الملف يحوي الآن تعليق r93-W1a ولا سطر `upload/` |
| **LOW-9 (اسم blob بـ32 بت عشوائية)** | ⚠️ **ما زال مفتوحًا** | `upload/route.ts:77` — `${Date.now()}-${crypto.randomUUID().slice(0, 8)}` كما هو |

---

## §1 — HIGH-1: حشو أرقام الإحالة عبر `POST /api/loyalty/referral` → نقاط ولاء من طلبات الآخرين (احتيال وجبات مجانية)

**التصنيف**: HIGH (مسار مالي-مجاور، قابل للاستغلال عن بُعد بحساب مجاني).

**الأدلة** (كلها مقروءة سطرًا-سطرًا):

1. `src/app/api/loyalty/referral/route.ts:21-35` — البوابة الوحيدة `requireAuth()` (أي دور — **بما فيه USER** الذي ينشئه التسجيل الذاتي المجاني `auth/register/route.ts:75`)، ثم `findUnique({ where: { referralCode } })` بلا **أي** ربط نطاق: لا مطابقة `auth.restaurantId` ببطاقة المُحيل للمالك، لا إذن لـsub_admin/USER.
2. `src/app/api/loyalty/referral/route.ts:9-15, 63-72` — `referredPhone` حر (≤30 حرفًا) يقبل من المتصل **بلا أي تحقق ملكية** — قارن بمسار المطالبة المجهول الذي يربط الهاتف ببصمة الجلسة (`referral-conversion.ts:236-258`).
3. `src/lib/referral-conversion.ts:110-118` — التحويل عند إكمال الطلب يطابق `referredPhone: order.customerPhone` بمساواة نصية حرفية على **أي** صف إحالة pending في المطعم (الأقدم أولًا)، ثم `:153-161` قلب شرطي، و`:164-184` مكافأة `floor(total × referrerRewardPct%)` **نقاط لبطاقة المُحيل**.
4. `src/app/api/orders/[id]/route.ts:218-247` — الإكمال يستدعي `convertReferralForCompletedOrder` تلقائيًا (المساران: tx-accrual وplain-update).
5. الاستبدال: `loyalty/redeem/route.ts:57-58` — 5 نقاط = وجبة مجانية، والنقاط تُستبدل بحضور العميل عند الطاقم.
6. **المسار يتيم في الواجهة**: `rg "loyalty/referral"` في src لا يرجع أي مستهلك fetch (المستهلكون الفعليون: `/api/loyalty` في LoyaltyWidget/ShareAfterOrder و`/api/referrals/claim` في ReferralHandler) — أي endpoint كتابي حي يغذي مسار المال بلا واجهة ولا بوابة نطاق.

**سيناريو الاستغلال** (كله عن بُعد):
- المهاجم يسجل حسابًا مجانيًا (USER) → ينشئ بطاقة ولاء بمطعم الضحية عبر `POST /api/loyalty` (مجهول، بهاتفه) → يحصل على `referralCode` خاصًا به.
- يصوغ N صف إحالة pending عبر `POST /api/loyalty/referral` بكوده وبأرقام هواتف **تخمينية/معروفة لعملاء المطعم** (قيود التفرد `(referralCode, referredName)` تُراوَغ بـ`referredName` مختلف لكل صف؛ حد المعدل 10/min/IP يُراوَغ بتدوير IP — نمط r91-D1 الموثق نفسه).
- كل طلب حقيقي يُكمله مالك المطعم لهاتف مطابق → تحويل تلقائي → بطاقة المهاجم تكسب 10% من قيمة الطلب نقاطًا. طلب 50 د.ل = 5 نقاط = **وجبة مجانية كاملة**. سقف 10 تحويلات/كود، ويزيد بتعدد البطاقات/الرموز (كل هاتف للمهاجم = كود جديد).
- الخصم على الضحية صفر (`orders/route.ts:306`) — الخسارة تظهر عند الاستبدال: وجبات مجانية غير مكتسبة للـ«مُحيل».

**لماذا HIGH وليس MED**: خسارة مالية مباشرة (طعام فعلي) قابلة للأتمتة، البوابة مجرد حساب مجاني، بلا أي تحقق ملكية أو نطاق مستأجر، والعدّ (limit) لا يقيد عدد الصفوف المعلّقة بل التحويلات لكل كود — والتوسيع بتعدد الرموز ممكن. المخففات (تُذكر بأمانة): يتطلب معرفة/تخمين أرقام عملاء حقيقية بصيغتها الحرفية عند الدفع، والاستبدال يتطلب حضورًا عند الطاقم، والسقف 10/كود.

**الإصلاح المقترح** (محدد): في `loyalty/referral/route.ts` بعد `findUnique`:
```ts
// owner: ربط ملكية بالمطعم (UserRestaurant مثل loyalty/redeem:43-47)
// sub_admin: APPROVE_ORDERS + نفس مطعم البطاقة · USER: 403 مطلقًا
```
أو الأبسط والأكثر أمانًا (المسار يتيم UI): **أزل POST كليًا** وابقِ GET، أو حوّله لقراءة فقط — المسار المجهول الموثوق (`/api/referrals/claim` + `attachReferralPhoneToOrder`) يغطي الحالة الشرعية كاملة بتحقق بصمة الجلسة. أضف اختبارًا بنمط `r92-subadmin-pii.test.ts` يثبت: «USER لا يستطيع إنشاء إحالة» + «إحالة بهاتف غير مالك الجلسة لا تتحول».

---

## §2 — LOW-1: `POST /api/whatsapp/generate` — جلب قبل الترخيص (oracle 404/403) + بلا حد معدل

- `src/app/api/whatsapp/generate/route.ts:19-58` — `findUnique` للطلب (سطر 19-35) يجري **قبل** فروع الترخيص (38-58): أي مستخدم مصادَق (حتى USER) يميّز الطلبات الموجودة عن غير الموجودة عبر 404 مقابل 403 — عدّاد IDs محدود القيمة (لا PII في الرد).
- المسار كله **بلا limiter** (r93 وثّق «بلا» في المصفوفة) — مُصادَق، لكن استدعاء متكرر يضرب DB ويحدّث `whatsappSent=true` (سطر 80) كأثر جانبي مجاني.
- **الإصلاح**: انقل `findUnique` بعد فروع الترخيص (غيّر الاستعلام ليضم شرط restaurantId)، وأضف `createDbRateLimiter({windowMs:60_000,max:20})` بمفتاح `wa-gen:${auth.userId}` (نمط items/[id] PUT).

## §3 — LOW-2: حد الجلسات المتزامنة «5» يسمح فعليًا بـ6 (off-by-one) + trim غير ذري

- `src/lib/session.ts:23-49` — `trimExpiredSessions` يجري **قبل** `prisma.session.create`: عند وجود 5 جلسات نشطة لا يحذف trim شيئًا (الشرط `> 5`) ثم تُنشأ السادسة؛ عند الدخول التالي يرى 6 فيُبقي أحدث 5 ويُنشئ سادسة — **الحالة المستقرة 6 جلسات** رغم `MAX_SESSIONS_PER_USER = 5` (سطر 15). كذلك التسلسل `findMany→deleteMany` (27-37) بلا معاملة — دخولان متزامنان قد يتقاطعان (أثر لحظي فقط).
- التأثير العملي: ضعف دفاع-في-العمق فقط (سقف الجلسات وساد إضافي على سرقة الكوكيز المتزامنة) — بلا استغلال منفرد.
- **الإصلاح**: نفّذ الـtrim **بعد** الإنشاء داخل معاملة واحدة، أو غيّر الشرط إلى `active.length >= MAX_SESSIONS_PER_USER` قبل الإنشاء مع حذف الأقدم.

## §4 — LOW-3: `POST /api/admin/telegram/verify` — الرمز غير مربوط بالمتصل (خطف قناة إشعارات)

- `src/app/api/admin/telegram/verify/route.ts:16-85` — البوابة `requirePermission('EDIT_SETTINGS')` لكن لا فحص أن `data.userId === auth.userId`: حامل EDIT_SETTINGS يلتقط رمز ربط (5 دقائق، أحادي الاستخدام) صدر لمدير آخر (تسريب paste/شاشة) فيستطيع ربط حساب **الضحية** بـ`telegramChatId` يخصه (سطر 78-85) — يستقبل إشعارات مدفوعات/قرارات موجهة للضحية. نفس الخاصية موجودة في مسار webhook `/start verify_` **بالتصميم** (المدير يفتح رابطه بنفسه) — الرمز بذلك «bearer credential» لقناة الإشعارات؛ مقبول، لكن مسار الـAPI الإداري لا يستوجبها.
- **الإصلاح**: `if (data.userId !== auth.userId) return error('رمز غير مخصص لك', 403)` — سطر واحد.

## §5 — LOW-4: إنشاء بطاقة ولاء مجهول بأي هاتف → تسمم اسم العميل (card squatting)

- `src/app/api/loyalty/route.ts:58-81` — أول قادم ينشئ البطاقة لأي هاتف مع `customerName` اختياري حر (≤50): من سبق ضحيةَ الرقم يمتلك كود إحالتها ويضع اسمًا يظهر في لوحة ولاء المالك (`referredName`/customerName تُعرض في loyalty/stats — r87-A4 وثّق التقييد لا الملكية). البطاقة نفسها لا تُستبدل إلا بحضور صاحب الهاتف عند الطاقم — أثر التسمم تشغيلي/سمعة أكثر منه مالي.
- **الإصلاح**: عند إنشاء بطاقة بهاتف لم يُصدر الطلبُ منه طلبًا مكتملًا، خزّن `customerName=''` وتجاهل مدخله، أو أضف تحقق OTP خفيفًا عند تسمية البطاقة.

## §6 — LOW-5: `/api/config` مقروء لأي مصادَق (بما فيه USER مجاني التسجيل)

- `src/app/api/config/route.ts:8-30` — `requireAuth()` فقط ثم كل الإعدادات غير السرية (رسوم، قواعد سحب): التعليق نفسه يقول «internal — require a session»، لكن التسجيل الذاتي المفتوح يجعل «session» بلا قيمة حصرية. لا أسرار (isSecret مستبعد) — تسريب معلومات تشغيلية داخلية فقط.
- **الإصلاح**: `requireAdmin()` أو `requirePermission('EDIT_SETTINGS')` للمسار (القارئ الحقيقي: إعدادات الأدمن).

## §7 — INFO-1: Service Worker يكاش HTML صفحات المحمية (إعادة تشغيل offline)

- `public/sw.js:174-186` — `networkFirst` يخزن أي تنقل ناجح (`cache.put`) بما فيه `/owner/*` و`/admin/*`: بعد الخروج على جهاز مشترك، قطع الشبكة ثم فتح `/owner` يخدم القشرة المخزنة. البيانات نفسها كلها عبر API network-only (سطر 71-79) ولا صفحة محمية SSR بيانات اليوم (تحقق: مكونات `'use client'` + layout بلا جلب) — فالوضع الحالي **قشرة فارغة فقط**، لكنه فخ كامن إذا استُخدم SSR بيانات مستقبلاً.
- **الإصلاح**: استثنِ `/owner|/admin` من `cache.put` في networkFirst (نفس فلسفة API_CACHEABLE allowlist — قائمة بيضاء بدل السماح العام).

## §8 — INFO-2: ثغرات r93 المفتوحة المتبقية (حالة، لا إعادة اكتشاف)

- LOW-9 (اسم blob 32 بت) — مفتوح، الدليل أعلاه §0.
- INFO-13 (`SKIP_ENV_CHECK` يعطّل فحص env حتى في الإنتاج، `env.ts:45-52`) وINFO-12 (stripTags في register فقط) — بلا تغيير عن r93.

---

## §9 — ما تحققنا أنه سليم (قراءة فعلية، لا تخمين — لا يُبلَّغ كثغرة)

1. **دورة حياة الجلسة** (`session.ts` كاملًا): توكن `crypto.randomUUID()` (122 بت) مخزّن **SHA-256** مع `token @unique` (schema:435) — بحث DB بلا توقيت؛ كوكي httpOnly+secure(prod)+lax+path=/ (52-58)؛ نافذة منزلقة 24h بتجديد DB-only عند نصف العمر مقيدًا بحد مطلق 7 أيام (8-14, 162-177)؛ المنتهية/المطلقة تُحذف فور عرضها (133-150)؛ **لا إعادة استخدام منتهية**؛ الإصلاح التام يثبت الجلسة (التوكن يولد خادميًا بعد المصادقة)؛ logout يحذف الصف بـretry مزدوج (61-95) وCSRF يغطي POST الخروج (proxy:183-189)؛ إبطال عند تغيير كلمة المرور (r93). الفجوة الوحيدة = LOW-2 أعلاه.
2. **تسجيل الدخول**: معادلة توقيت بـ`pbkdf2Sync` **متزامن** فعلاً (`void verifyHash(...)` login:91 + hash.ts:48-55 — الحرق يقع قبل إرسال الرد)؛ 401 موحد؛ ثلاث طبقات قفل (10/min ip:username + 20/15min acct:ip:username + 20/15min acct:username — كلها exemptFromRelax) مع SystemEvent للقفل.
3. **Webhook تيليجرام**: fail-closed حرفيًا (سر غائب = 403 موحدة كالتخمين الخاطئ، webhook:156-170) + `timingSafeEqualStrings` (secure-compare:22-27)؛ الحد **بعد** التحقق (174-175)؛ أزرار الموافقة خلف allowlist أدمن (52-65)؛ رموز الربط HMAC-SHA256 بمفتاح HKDF(AUTH_SECRET) صلاحية 300ث + anti-replay ذري على `RateLimitEntry @@unique(key,windowEnd)` (schema:502) بلا نافذة إعادة تشغيل (فحص exp يسبق الحذف بالكنس دائمًا)؛ `editMessageText/answerCallbackQuery` في webhook **بلا parse_mode** (telegram-api:84-119) — لا حقن Markdown في مسار الأزرار.
4. **CSRF**: الـmatcher (proxy:219-238) يغطي كل الـ65 مسار API (لا مسار ينتهي بامتداد مستثنى — تحقق يدوي) + جذور /owner,/admin للصفحات؛ Origin **إلزامي** (غيابه = 403، csrf:60-63)؛ double-submit بمقارنة زمنية (94-100)؛ **لا توجد Server Actions** (`rg "use server"` = صفر) فلا مسار تحوّر يمر خارج proxy؛ الإعفاءات (webhook بسرّه، validate بلا آثار، cron بBearer timing-safe، health GET-only) مبررة موثقة.
5. **السباقات**: المطالبة المجهولة محمية بقيد `@@unique([referralCode, referredName])` (schema:376) + التقاط P2002 (claim:65-70)؛ إنشاء loyalty/referral داخل tx بـ`FOR UPDATE` (route:55-74)؛ التحويل: قلب شرطي idempotent + قفل صف البطاقة + سقف/كود + فهرس orderId (conversion:142-161)؛ كسب نقاط الطلب: `updateMany` شرطي + صف earn يمنع التكرار (orders/[id]:119-217)؛ الاستبدال: `updateMany` بشرط `points gte` (redeem:71-92)؛ سقوف الخطط: `FOR UPDATE` (orders:281, items:272, owner/restaurants:122)؛ الدفع المعلق: فهرس فريد جزئي → P2002 → 409 (subscriptions:113-124). لا double-claim قابل للاستغلال في أي مسار فُحص.
6. **RateLimit**: upsert ذري رحلة-واحدة مع fallback قراءة عند سباق الإنشاء؛ **fail-closed** عند فشل DB (`count=null → count=max+1`, rate-limit:107-110)؛ التنظيف ثلاثي (interval 120s غير موثوق على serverless + كنس احتمالي 1/32 محدود 512 صفًا + أسبوعي cron بحد 1h) — الامتلاء غير وارد فعليًا والانتهاء عند امتلاء = 429 لا تجاوز.
7. **Upload**: قائمة أنواع JPEG/PNG/WEBP/AVIF + magic bytes موسعة فاشلًا-مغلقًا (48 بايت، عائلة AVIF كاملة)؛ 5MB مزدوجة الفحص؛ auth + 5/min(ip+user)؛ المسار `restaurants/{id}/` أو `staff/` من أرقام فقط — **لا path traversal** (لا اسم ملف من العميل إطلاقًا)؛ حذف/تخزين الوسائط بحارس مستأجر (blob.ts:35-50, 58-71).
8. **PII**: لا مسار جديد يسرّب أسماء/هواتف بلا بوابة — GET orders/[id] وwhatsapp/generate خلف owner-link/APPROVE_ORDERS (orders/[id]:40-54)؛ تصدير CSV **توليد-عميل** من بيانات API المحصّبة نفسها مع حارس حقن معادلات CSV (owner/orders/page.tsx:215-229)؛ /api/user/events يفلتر داخل الاستعلام (user/events:31-38)؛ loyalty العام يقنّع الاسم/الهاتف (loyalty:86,130)؛ audit-logs super_admin فقط.
9. **أسرار العميل**: `rg process.env` عبر src — في ملفات `'use client'` ورد فقط `NEXT_PUBLIC_WHATSAPP_NUMBER` (Footer.tsx:11، FloatingWhatsApp.tsx:9 — عام بالتصميم) و`NEXT_PUBLIC_DOMAIN` في ملفات خادم. **صفر أسرار خادم في الحزمة**. مفاتيح HKDF/AES تُشتق خادميًا من AUTH_SECRET (keys.ts).
10. **SQL الخام**: كل الاستعمالات السبعة عشر template literals بمعاملات مُعاملة (orders:281, loyalty/referral:56, referral-conversion:142, subscription-decisions:193, owner/restaurants:122, items:272, reviews:187 ($executeRaw معاملان), stats/advanced ×10, admin/stats ×2, menu/[slug]:103, sitemap:54, db.ts:166) — قيم مرقّمة أرقامًا/تواريخ/سلاسل مقيّدة؛ **لا `$queryRawUnsafe` في كود التطبيق** (فقط تعريفات generated). لا حقن.

---

## §10 — الأولويات للمنسق

1. **HIGH-1** (§1): بوابة نطاق + ملكية على `POST /api/loyalty/referral` أو إزالته (يتيم UI) + اختبار تثبيت — ملف واحد، لا تقاطع مع وكلاء آخرين.
2. **LOW-3** (§4): سطر ربط الرمز بالمتصل في verify.
3. **LOW-1** (§2): نقل findUnique بعد البوابات + limiter.
4. LOW-2/5/6 وINFO-1: تحسينات رخيصة تُجمَّع في موجة واحدة صغيرة.

> تنبيه: كل النتائج قابلة للإصلاح بأمان في موجة واحدة — لا تتقاطع مع ملفات موجات الوكلاء الآخرين المتوقعة (الواجهة/الاختبارات/التبعيات).
