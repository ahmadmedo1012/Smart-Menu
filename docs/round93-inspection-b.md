# تقرير التفتيش الأمني العميق — الجولة 93 / الوكيل 1-b «المدقق الأمني العميق»

- **النطاق**: الكود المحلي عند `HEAD = e68c2c1f` (ر92 مدمجة بالكامل، غير منشورة في الإنتاج بعد — الإنتاج على r91 `0429f11b`).
- **المنهج**: قراءة سطر-بسطر لكل بوابة تفويض في **65 مسار API** (على القرص؛ انظر INFO-11 أدناه حول لماذا ترى أدوات rg ‏64 فقط)، مع فحص جلسات/CSRF/حدود المعدل/تنقية المدخلات/الرفع/تسريبات المعلومات/تيليجرام/الأسرار/فتحات أخرى.
- **حُرّم تعديل أي كود** — تدقيق فقط. هذا الملف هو الاستثناء الوحيد.

## خلاصة تنفيذية

| خطورة | العدد |
|---|---|
| CRIT | 0 |
| HIGH | 0 |
| MED | 3 |
| LOW | 8 |
| INFO | 4 (+توثيق سليم موسع) |

لا توجد ثغرة قابلة للاستغلال عن بُعد في مسارات المال أو المصادقة: أسعار الطلبات تُحسب خادميًا، الخصم مُصفَّر صفر، قيود الدفع المعلق فريدة على مستوى الفهرس، سقوف الخطط داخل معاملات بقفل `FOR UPDATE`، الويب-هوك مغلق فشلًا (fail-closed) بسرّ مقارن زمنيًا، وCSRF مزدوج الإرسال مع Origin. أهم ما تبقى: **بقية واحدة من عائلة r92-B1** (PII المراجعات لـ sub_admin بلا أذونات)، **حقن Markdown تيليجرام** في مسار قرارات الاشتراك (نفس صنف r86-A5)، و**استعلامان DB مجهولان بلا حدّ معدل**. كما كُشف **عمى أدوات بحث** يخفي مسار الرفع عن كل فحص rg قادم.

---

## أولًا: مصفوفة المسارات الكاملة (65 مسارًا)

البوابة تعني أول حاجز يصادفه الطالب؛ حدود المعدل كما هي في الكود (الافتراضي: بلا حد).

| # | المسار | الطرق | البوابة | حدود المعدل | ملاحظات |
|---|---|---|---|---|---|
| 1 | /api/admin/admins | GET, POST | `requirePermission(MANAGE_USERS)`؛ POST يضيف `role==='super_admin'` | بلا | GET: قائمة الأدمن؛ POST: إنشاء sub_admin بأذونات مقيّدة بالenum |
| 2 | /api/admin/admins/[id] | PUT, DELETE, POST | `MANAGE_USERS` + super_admin | بلا | حارس «لا يمكن تعديل/حذف مدير عام» (:29/:63)؛ POST = إبطال جلسات مستهدف |
| 3 | /api/admin/audit-logs | GET | `requireAdmin` + **super_admin فقط** (:23) | 30/min/IP | يكشف IPs وأسماء الفاعلين — مقصود للمدير العام |
| 4 | /api/admin/config | GET, PUT, DELETE | `EDIT_SETTINGS` | بلا | الأسرار AES-GCM + قناع `••••••••`؛ لا كتابة القناع فوق القيمة |
| 5 | /api/admin/create-owner | POST | `MANAGE_RESTAURANTS` | بلا | audit + notify؛ اسم/مستخدم بلا تنقية (INFO-12) |
| 6 | /api/admin/events/trigger | POST | `EDIT_SETTINGS` | بلا | حدث اختبار فقط |
| 7 | /api/admin/notification-preferences | GET, PUT | `EDIT_SETTINGS` | بلا | تفضيلات إشعارات الطاقم |
| 8 | /api/admin/profile | GET, PUT | `EDIT_SETTINGS` | بلا | تغيير كلمة المرور يطلب الحالية (verifyHash) ويُبطل بقية الجلسات (:108-117) |
| 9 | /api/admin/reset-password | POST | `MANAGE_USERS` + حارس هدف super_admin (:37) | 5/min/IP | يُبطل كل جلسات المستهدف (:46) |
| 10 | /api/admin/stats | GET | `VIEW_ANALYTICS` | بلا | إحصاءات المنصة |
| 11 | /api/admin/subscriptions | GET, POST | `MANAGE_SUBSCRIPTIONS` | بلا | القرار عبر `resolveSubscriptionPayment` (idempotent بحالة pending) |
| 12 | /api/admin/system-events | GET, POST, PUT, DELETE | `VIEW_ANALYTICS` (r86-A8) | بلا | واحد/حذف حدث تشغيلي |
| 13 | /api/admin/telegram/approvers | GET, POST | `EDIT_SETTINGS` | بلا | telegramId بregex BigInt؛ label ≤100 |
| 14 | /api/admin/telegram/approvers/[id] | DELETE | `EDIT_SETTINGS` | بلا | — |
| 15 | /api/admin/telegram/link | POST | `EDIT_SETTINGS` | بلا | توكن ربط HMAC-SHA256 (مفتاح HKDF) صلاحية 5 دقائق |
| 16 | /api/admin/telegram/verify | POST | `EDIT_SETTINGS` | بلا | تحقق HMAC timing-safe (:49) + anti-replay (:68-76) |
| 17 | /api/auth/login | POST | عام | 10/min (ip:username) + 20/15min (acct:ip:username **و** acct:username) — كلاهما `exemptFromRelax` | معادلة توقيت DUMMY_HASH (:39/:91)، 401 موحد بلا أوراكل محتوى |
| 18 | /api/auth/logout | POST | عام | بلا | يدمّر جلسة حامل الكوكيز فقط (متأخر retries موثقة) |
| 19 | /api/auth/me | GET | `requireAuth` | بلا | دور/أذونات/حالة اشتراك فقط — بلا PII |
| 20 | /api/auth/register | POST | عام | 5/min/IP | **تنقية قبل zod** (r92-wave3:36-46)؛ 409 اسم مستخدم (LOW-8) |
| 21 | /api/categories | GET, POST | `requireAuth`؛ GET: owner-link أو sub_admin ب`MANAGE_RESTAURANTS` (r92-wave3-3:44) أو admin/super؛ POST: owner-link أو `MANAGE_RESTAURANTS` | بلا | سقف 1000 قسم؛ revalidateMenu |
| 22 | /api/categories/[id] | PUT, DELETE | owner-link أو `MANAGE_RESTAURANTS` | بلا | audit + purge ISR |
| 23 | /api/config | GET | `requireAuth` | بلا | يستبعد صفوف `isSecret` |
| 24 | /api/cron/cleanup | GET | `CRON_SECRET` timing-safe (fail-closed إن غاب :15) | بلا | مسح جلسات/تدقيق/أحداث/RateLimitEntry قديمة |
| 25 | /api/cron/subscription-expiry | GET | `CRON_SECRET` timing-safe (:17) | بلا | تحويل PAID منتهية إلى EXPIRED |
| 26 | /api/demo/fix-images | POST | production-block 404 (:42) + `requireAuth` | بلا | dev فقط |
| 27 | /api/health | GET | عام | بلا | liveness + commitSha (عام عمدًا) — لا بيانات حساسة |
| 28 | /api/items | GET, POST | GET: `requireAuth` (مجهول/USER = available فقط)؛ POST: owner-link أو `MANAGE_RESTAURANTS` | **بلا** (انظر MED-3/LOW-6) | POST: سقف maxItems داخل tx بقفل `FOR UPDATE` (:250) + guard صور |
| 29 | /api/items/[id] | GET, PUT, DELETE | GET: عام للavailable؛ المخفي يتطلب طاقم/owner-link (:100-111)؛ PUT/DELETE: owner-link أو `MANAGE_RESTAURANTS` | PUT: 20/min/user (r91) | سعر مخفض ≤ أصلي؛ حذف blob بنطاق المستأجر |
| 30 | /api/items/[id]/reviews | GET, POST | GET: عام **بلا PII** إلا «isOwner» (:56 يمنح sub_admin/admin/super بلا فحص إذن — **MED-1**)؛ POST: عام | POST: 5/min/IP + 30/h/item | تحديث المعدل الذري SQL (:161-165)؛ revalidate |
| 31 | /api/loyalty | GET, POST | عام | (ip:restaurant) 20/min + `loyalty-ip` 60/min (r90-F4) | الرد يقنّع customerName/Phone (:86/:130) |
| 32 | /api/loyalty/redeem | POST | `requireAuth` + owner-link أو APPROVE_ORDERS (:28-40) | بلا | استبدال ذري بشرط `points: {gte}` (:56-70) |
| 33 | /api/loyalty/referral | GET, POST | GET: عام؛ POST: `requireAuth` | GET: 20/min/IP؛ POST: 10/min/IP | GET بلا اسم المحيل (r85-A2)؛ سقف 10 تحويلات/كود بقفل (:56) |
| 34 | /api/loyalty/stats | GET | `requireAuth` + `resolveRestaurantScope` (sub_admin يحتاج VIEW_ANALYTICS — r92-B1) | 20/min | PII المحيلين خلف البوابة |
| 35 | /api/orders | GET, POST | GET: `requireAuth` + owner-scope؛ sub_admin يحتاج APPROVE_ORDERS (r92-B1:87)؛ POST: **عام** | GET: 60/min/user؛ POST: 30/min/IP | إعادة حساب أسعار خادمية + خصم=0 + سقف maxOrders بFOR UPDATE + idempotency |
| 36 | /api/orders/[id] | GET, PUT | `requireAuth` + owner-link أو APPROVE_ORDERS (:49-51/:92-94) | PUT: 30/min/IP | مسار إكمال الطلب: كسب نقاط + تحويل إحالة ذريان |
| 37 | /api/orders/count | GET | `requireAuth` + owner-scope؛ sub_admin يمر **بلا إذن** (LOW-5) | 120/min/user | عدّ فقط (بلا PII) |
| 38 | /api/owner/restaurants | GET, POST | `requireAuth` + اشتراك نشط؛ GET: owner (userId= لsuper فقط)؛ POST: owner أو `MANAGE_RESTAURANTS` (r90 S-1) | بلا | سقف maxMenus بFOR UPDATE على صف المستخدم |
| 39 | /api/owner/restaurants/[id] | PATCH, DELETE | اشتراك نشط + owner-link أو (admin/super/sub_admin بMANAGE_RESTAURANTS) (r92-wave3-2) | بلا | DELETE يمنع حذف الأساسي للمالك |
| 40 | /api/owner/reviews | GET | `requireAuth({requireRestaurant})` + دور owner/طاقم (r92-wave3-4) + اشتراك | بلا | sub_admin بلا restaurantId → 401/فراغ — لا تسريب |
| 41 | /api/plans | GET | عام | كاش 5 دقائق في الذاكرة | كتالوج الخطط |
| 42 | /api/public/featured | GET | عام | ISR 60ث | استبعاد fixtures (r92-A1) |
| 43 | /api/public/stats | GET | عام | ISR 60ث | عدّادان فقط |
| 44 | /api/referrals/claim | POST | عام | 10/min/IP | بصمة جلسة مجهولة (sha256 لأول hop) |
| 45 | /api/restaurants | GET, POST | GET: `requirePermission(VIEW_ANALYTICS)` (r86-A8)؛ POST: عام (تسجيل ذاتي) أو `MANAGE_RESTAURANTS` | POST: 5/min/IP | حجب mass-assignment للخطة (r76:147)؛ سقوف الخطة المجانية |
| 46 | /api/restaurants/[id] | GET, PUT, DELETE | GET: عام (إسقاط محدود :98-114) أو تفصيل: owner/admin/super أو sub_admin بVIEW_ANALYTICS (:88-90)؛ PUT: owner-link (مخطط ضيق) أو MANAGE_RESTAURANTS (مخطط إداري)؛ DELETE: MANAGE_RESTAURANTS | بلا | حارس media tenant (r86-A3) |
| 47 | /api/seed | POST | production-block + `requireAdmin` | بلا | ADMIN_PASSWORD إلزامي عند الإنشاء |
| 48 | /api/settings | GET, PUT | owner-link أو `MANAGE_RESTAURANTS` (طاقم) | بلا | قيمة ≤20k؛ slug regex؛ حارس صور |
| 49 | /api/stats | GET | `requireAuth` + `resolveRestaurantScope` (sub_admin: VIEW_ANALYTICS) | 120/min | إيراد/أصناف شائعة |
| 50 | /api/stats/advanced | GET | مثله | 120/min | — |
| 51 | /api/subscriptions | POST | `requireAuth` | 5/min/IP | سعر خادمي = سعر الخطة؛ قيد فريد pending (P2002→409) |
| 52 | /api/subscriptions/status | GET | `requireAuth` (findFirst بuserId) | بلا | حالة دفعتك فقط |
| 53 | /api/subscriptions/upgrade | POST | `requireAuth` + ملكية المطعم (:107-117) | 5/min/IP | قيد فريد pending؛ ترقية لأعلى فقط |
| 54 | /api/subscriptions/validate | POST | عام (10/min/IP) | 10/min/IP | CSRF-exempt (بلا آثار جانبية — تحقق توفر فقط) |
| 55 | /api/telegram/broadcast-targets | GET, POST | `EDIT_SETTINGS` | بلا | — |
| 56 | /api/telegram/broadcast-targets/[id] | PATCH, DELETE | `EDIT_SETTINGS` | بلا | — |
| 57 | /api/telegram/config | GET, POST | `EDIT_SETTINGS` | بلا | التوكن مشفر ولا يُعاد أبدًا؛ إعادة تسجيل webhook بالسر |
| 58 | /api/telegram/diagnose | GET | `EDIT_SETTINGS` | بلا | تشخيص بوت |
| 59 | /api/telegram/test | POST | `EDIT_SETTINGS` | بلا | رسالة اختبار |
| 60 | /api/telegram/webhook | POST | **سرّ** `x-telegram-bot-api-secret-token` timing-safe + fail-closed (:154-170) | 120/30ث **بعد** التحقق | قائمة أدمن للـcallback (:52)؛ ربط بحساب عبر HMAC + anti-replay (:249-270)؛ await callback (r92) |
| 61 | /api/upload | POST | `requireAuth` | 5/min (ip+user) | magic bytes JPEG/PNG/WEBP/AVIF؛ 5MB؛ **SVG/HTML مرفوضان**؛ مسار tenant |
| 62 | /api/user/events | GET | `requireAuth` (فلترة userId داخل الاستعلام :34) | 120/min/user | بث أحداث المستخدم نفسه فقط |
| 63 | /api/users | GET | `requireAuth` + دور طاقم فقط (:13 — sub_admin **بلا إذن** — LOW-4) | بلا | directory ملاك بلا بريد/هاتف |
| 64 | /api/users/[id] | PATCH, DELETE | `MANAGE_USERS`؛ الأدوار/المطعم: super_admin فقط (:33-38)؛ DELETE: super_admin + حارس (:124) | بلا | PATCH بلا حارس هدف super_admin (LOW-7) |
| 65 | /api/whatsapp/generate | POST | `requireAuth` + owner-link أو APPROVE_ORDERS (:50-53) | بلا | يولّد نص واتساب لطلبك؛ encodeURIComponent |

**CSRF (شامل)**: كل POST/PUT/PATCH/DELETE تحت /api يمر عبر `src/proxy.ts:183-189` → `assertSameOrigin` (csrf.ts:54-101): فحص Origin مقابل host النشر + double-submit token بKوقي مقارنة زمنية `timingSafeEqualStrings`. الإعفاءات الثلاثة موثقة ومبررة (webhook بسرّه، validate بلا آثار جانبية، cron بBearer). المسارات الديناميكية للصفحات العامة تحصل على كوكي CSRF أول زيارة عبر أي GET غير قابل للكاش (بما فيه GET للـAPI) — مسار المراجعات/السلة يعملان.

---

## ثانيًا: النتائج المفصلة

### MED-1 — sub_admin بأذونات صفرية يقرأ PII مراجعات المنصة كاملة (بقية عائلة r92-B1)
- **[MED]** `src/app/api/items/[id]/reviews/route.ts:56` — `if (auth.authorized && ['super_admin', 'sub_admin', 'admin'].includes(auth.role ?? '')) { isOwner = true; }`
- **الوصف**: العضوية الدور وحدها (sub_admin بلا أي إذن) تفتح فرع `isOwner` الذي يضيف `customerName` و`customerPhone` إلى select الرد (:85). r92-B1 أغلقت الطلبات (orders:87) والإحصاءات (stats-queries:70) وloyalty-stats، لكن مسار المراجعات بقي خارج الإصلاح — وهو نفس الصنف (التعليق في owner/reviews:14-17 يسمي عائلة أدواره المشروعة صراحة).
- **سيناريو الاستغلال**: sub_admin أُنشئ بأذونات فارغة (أو سُحبت أذونه) يمرّ على `/api/items/1/reviews` … `/api/items/N/reviews` بأرقام متتالية فيقرأ أسماء وأرقام هواتف كل مُقيّمين كل مطاعم المنصة.
- **الإصلاح المقترح (نصًا)**: في فرع الطاقم، امنح `isOwner` لـ sub_admin فقط إذا احتوى `auth.permissions` على `VIEW_ANALYTICS` (نفس بوابة restaurants/[id]:88-90) — أو `MANAGE_RESTAURANTS` إن اعتُبرت مراجعات جزءًا من إدارة المحتوى؛ أضف اختبارًا بأسلوب `r92-subadmin-pii.test.ts` يثبّت المصفوفة الجديدة.

### MED-2 — حقن Markdown في تيليجرام عبر قيم مستخدم غير مرمّزة (صنف r86-A5)
- **[MED]** `src/lib/subscription-decisions.ts:132` و`:284-286` و`:292` (وأخفها `:286` menuList) — الرسائل تُبنى بقالب نصي ثم تُرسل `parse_mode: 'Markdown'`.
- **الوصف**: `notifyEvent` (telegram.ts:30) يرمّز محارف Markdown `_*[]()`\\()` في كل قيمة مستخدم منذ r86-A5، لكن نداءات `sendTelegramNotification`/`notifyUserViaTelegram` المباشرة في مسار الموافقة على الدفع تُقحِم بلا ترميز: `result.restaurant.name` (اسم مطعم يضعه المالك)، `menus[].name` (اسم منيو مؤقت يضعه زبون الدفع عبر payment-schema، ≤200 حرف)، و`result.user.username` (اسم مستخدم من التسجيل — stripTags في register يزيل `<…>` لكن يُبقي `[نص](رابط)` سليمًا).
- **سيناريو الاستغلال**: زبون يدفع باسم مطعم مؤقت `[اضغط هنا](https://phish.example)` → عند موافقة الأدمن تصل الرسالة `✅ تم تأكيد الدفع… • المنيوهات: [اضغط هنا](https://phish.example)` فتُعرض **رابطًا قابلًا للنقر** في قناة الموافقة وأيضًا لكل المستخدمين المرتبطين (البث ليس adminOnly في :287). نفس الشيء عبر username في `userPart`. هذا بالضبط ما أصلحه r86-A5 في notifyEvent («رابط تصيّد داخل قناة عمليات الأدمن»).
- **الإصلاح المقترح (نصًا)**: صدّر دالة `esc()` من telegram.ts (أو انسخها) وطبيقها على كل القيم المستخدمة في تلك الرسائل قبل التركيب؛ أو مرّر الرسائل عبر `notifyEvent` نفسه. أضف اختبار وحدة بنمط `notify-event-escape.test.ts` على `resolveSubscriptionPayment` يمرر اسمًا يحوي `[]( )` ويثبت الترميز.

### MED-3 — استعلاما DB مجهولان بلا حدّ معدل ولا كاش (متاحية/DoS)
- **[MED]** `src/app/api/items/route.ts:102-190` (GET) و`src/app/api/restaurants/[id]/route.ts:74-114` (GET).
- **الوصف**: كل نقاط النهاية العامة الأخرى محمية: إما بحد معدل (orders POST، reviews، loyalty، referrals/claim، validate، login/register) أو بكاش ISR/ذاكرة (plans، public/featured، public/stats). أما GET /api/items فيقبل **زوارًا مجهولين** (requireAuth يعيد authorized:false ثم يستمر التنفيذ — المتاح فقط `status:'available'` :147) ويشغّل `findMany` مع `include modifierGroups.options` لكل صفحة، وGET /api/restaurants/[id] للمجهول يشغّل `findUnique` عام لكل معرف. لا حد ولا كاش في أيٍّ منهما.
- **سيناريو الاستغلال**: حلقة curl موزعة (أو سكربت واحد) تضرب `/api/items?restaurantId=1&page=1..100` و`/api/restaurants/1..N` — كل طلب رحلة DB كاملة؛ لا RateLimitEntry تُنشأ أصلًا فلا يقيّده شيء. على Neon المسبك قد يستهلك الاتصالات ويؤثر على مسارات المال.
- **الإصلاح المقترح (نصًا)**: أضف `createDbRateLimiter` بمفتاح IP (مثل 60-120/min) لكلا المسارين بعد فرع 400 وقبل الاستعلام (نمط orders GET:58-61)؛ أو فعّل `export const revalidate = 60` على قراءة المجهولين (الطاقم يبقى ديناميكيًا عبر searchParams — يتطلب فصلًا أو `Cache-Control: private`).

### LOW-4 — قائمة /api/users تعطى لـ sub_admin صفر الأذونات
- **[LOW]** `src/app/api/users/route.ts:13` — `if (!["super_admin", "sub_admin", "admin"].includes(auth.role))` — بلا فحص إذن.
- **الوصف**: sub_admin بلا أي إذن يسرد مستخدمي المنصة (id/username/name/role/restaurant). لا بريد/هاتف في select، لكنها فئة «دليل المنصة» التي أغلقت r86-A8 للمطاعم خلف `VIEW_ANALYTICS` (restaurants:64) — اتساقًا يجب أن تخضع هذه لنفس البوابة.
- **الإصلاح**: `requirePermission('VIEW_ANALYTICS')` أو احتواء `auth.permissions` عليها لفرع sub_admin.

### LOW-5 — /api/orders/count يمنح sub_admin عدّادات المنصة بلا إذن
- **[LOW]** `src/app/api/orders/count/route.ts:48` — sub_admin يمر ضمن الطاقم بلا فحص إذن (عدّ only، بلا PII).
- **الإصلاح**: نفس بوابة APPROVE_ORDERS المستخدمة في GET /api/orders (اتساق المصفوفة)، أو VIEW_ANALYTICS إن اعتُبر تجميعيًا.

### LOW-6 — POST /api/items بلا حدّ معدل (PUT مقيّد)
- **[LOW]** `src/app/api/items/route.ts:192` بلا limiter بينما `items/[id]/route.ts:16` قيّد PUT ب20/min منذ r91-F-B لذات السبب (حمولة صورة 200KB + كتابة مجموعات المعدّلات). POST يحمل نفس الحمولة وأثقل (nested create).
- **الإصلاح**: `createDbRateLimiter({windowMs:60_000,max:20})` بمفتاح `items-post:${auth.userId}` بعد بوابة 401 (نفس نمط PUT).

### LOW-7 — PATCH /api/users/[id] بلا حارس «مدير عام» (احتمال self-lockout)
- **[LOW]** `src/app/api/users/[id]/route.ts:33-53` — الحارس موجود في DELETE (:124) وفي admins/[id] (:29/:63) لكن PATCH يمكن لsuper_admin أن يُنزل دور **آخر super_admin (أو نفسه!)** إلى owner → فقدان آخر مدير عام لا يستعاد إلا من DB مباشرة. footgun تشغيلي لا هجوم.
- **الإصلاح**: أضف `if (target.role === 'super_admin' && parsed.data.role !== undefined) return 403 «لا يمكن تعديل مدير عام»` (ومنع تعديل الذات للدور تحديدًا).

### LOW-8 — تعداد أسماء المستخدمين في التسجيل/التحقق
- **[LOW]** `register/route.ts:55` (409 «اسم المستخدم موجود مسبقاً») و`subscriptions/validate/route.ts:35` («مستخدم بالفعل»). login سليم تمامًا (401 موحد + معادلة توقيت). تعداد التسجيل مقبول عمومًا كمتطلب UX (إبلاغ المستخدم فورًا) — يوثق كقرار، ويخفف بحد 5/min/10min الموجود. لا إصلاح إلزامي.

### LOW-9 — عشوائية اسم blob المرفوع 32 بت فقط
- **[LOW]** `upload/route.ts:77` — `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`: الطابع الزمني قابل للتخمين و8 hex = 32 بت عشوائية فعلية. الملفات عامة على CDN. تعداد ~2^32 نظريًا غير عملي لكنه تحت المعيار المريح. **الإصلاح**: استخدم `crypto.randomUUID()` كاملًا (122 بت) في اسم الملف.

### LOW-10 — سياسة كلمات المرور: طول فقط (8+)
- **[LOW]** `constants.ts:2` + `validation.ts:39-49`. لا قائمة كلمات شائعة ولا فحص تكوين. PBKDF2-SHA512 ب600k يعوض جزئيًا. بذور بيئة الاختبار (admin/smart123، waha/waha123 dev-only) تمر بالسياسة بالكاد. **الإصلاح**: رفع الحد إلى 10+ أو إضافة top-1000 blocklist عند الإنشاء (register/admins/create-owner/reset).

### LOW-11 (أدوات) — `.git/info/exclude` يحوي `upload/` فيُخفي مسار الرفع عن كل بحث ripgrep
- **[LOW]** ملف `.git/info/exclude` المحلي يحوي سطر `upload/`. **مثبت**: `rg --files src/app/api` يعيد 64 ملفًا و`--no-ignore` يعيد 65 — `src/app/api/upload/route.ts` (أكثر مسارات حساسية أمنيًا) غائب صامتًا عن كل grep/rg مستقبلي. git نفسه يتتبع الملف (النشر غير متأثر). فحوص الجولات السابقة التي استخدمت rg رأت «64 مسارًا». **الإصلاح**: احذف سطر `upload/` من `.git/info/exclude` (إن وُجد لسبب محلي فقيّده بـ`/download/` فقط) — أو اجعل `check-api-auth.mjs` (fs-based، يرى 65) هو المرجع الرسمي لعدّ المسارات في التوثيق.

### INFO-12 — التنقية (stripTags) موجودة في register فقط
- r92-wave3 أصلح ترتيب «تنقية قبل zod» في `auth/register` وحده. بقية الكتابات الحرة (reviews:124، orders customerName:181، items:197، categories:80، restaurants:133، settings:137، admin/admins:26، create-owner:22، users/[id]:27) تقبل HTML خام بلا strip. **لا توجد ثغرة قابلة للاستغلال**: كل العرض عبر React (ترميز تلقائي)، notifyEvent يرمّز، JSON-LD يهرّب `<` (menu/[slug]/page.tsx:322)، واتساب encodeURIComponent — لكن Durable XSS من الدرجة الأولى يكفي خطأ عرض واحد مستقبلي. **توصية**: عمّم sanitizeInput على schema الحقول الحرة أو أضف regex رفض محارف تحكم في الحقول العامة (reviews/orders أولًا — عامة الكتابة).

### INFO-13 — SKIP_ENV_CHECK يتخطى فحص env حتى في الإنتاج
- `env.ts:45-52` + `db.ts:25`: الضبط `SKIP_ENV_CHECK=true` في بيئة إنتاجية يعطّل حارس المتغيرات كليًا (موثق كـ CI فقط). مقبول كمخرج طوارئ لكن يستحق قاعدة نشر تتحقق من غيابه في Vercel.

### INFO-14 — /demo (GET) ينشئ جلسة عبر طلب GET في dev فقط
- `src/app/demo/route.ts:7` GET يبني جلسة PAID-owner. مسدود في الإنتاج (:12). في dev: login-CSRF عبر GET نظري (ضحية تفتح رابط /demo فتُسجَّل دخولها بحساب وها التجريبي). مقبول (حساب demo، بيئة dev)، يوثق فقط. مسارات seed/demo/fix-images كلها production-blocked ✓.

---

## ثالثًا: ما تحققنا أنه «سليم» (لا تبلغ عنه كثغرة)

1. **r92-B1 (فجوة sub_admin PII)** — سليمة في: orders GET (`orders/route.ts:81-87`)، stats-queries (`stats-queries.ts:66-72`)، loyalty/stats (يمر عبر resolveRestaurantScope). اختبارات r92-subadmin-pii تثبّت المصفوفة. البقية الوحيدة في المراجعات (MED-1 أعلاه).
2. **B2 (trust-proxy)** — قرار موثق بعمق في `client-ip.ts:25-38` مع مخرج `TRUST_PROXY_DEPTH=0` في .env.example؛ canonicalization + validation سليمة.
3. **B3 (check-api-auth verb-level)** — يعمل ويمر على 65 مسارًا (fs-based؛ انظر LOW-11) مع self-test.
4. **CSRF** — Origin موثّق بجذر الثقة الصحيح (`csrf.ts:25-35`: لا يثق بX-Forwarded-Host) + double-submit + `timingSafeEqualStrings`. الإعفاءات الثلاث مبررة. matcher الحديث (r89-B1) يغطي كل شيء ما عدا الأصول الثابتة.
5. **الجلسات** (`session.ts`) — توكن UUID عشوائي يُخزن **مُهشّرًا SHA-256** (لا session fixation: التوكن يولد خادميًا بعد المصادقة)؛ httpOnly + secure(prod) + sameSite=lax؛ نافذة منزلقة 24س مع **سقف مطلق 7 أيام** (r89-B3)؛ حد 5 جلسات/مستخدم؛ الإبطال عند تغيير كلمة المرور في المسارين (profile:111 + reset-password:46)؛ مقارنات DB بلا توقيت (index lookup). ملاحظة تصميمية موثقة: التجديد DB-only بلا Set-Cookie لتجنب إحياء الجلسة بعد الخروج.
6. **تسجيل الدخول** — معادلة توقيت DUMMY_HASH (r90-F6) + backstop على اسم المستخدم وحده (r91-D1) + رسالة 401 موحدة + قفل 20/15دقيقة مع SystemEvent تحذيري.
7. **مسارات المال** — إعادة حساب كامل للأسعار من DB (orders:189-241) بما فيها مُعدّلات مملوكة للمطعم وisAvailable؛ الخصم مقسوم صفر (:306)؛ سقف الطلبات/الأصناف/المنيوهات داخل معاملات بقفل `FOR UPDATE` على صف المطعم/المستخدم؛ فهرس فريد جزئي للدفع المعلق → P2002→409 (r90-F1 T2)؛ idempotency للطلبات يرد تأكيدًا خاملًا بلا PII (round-77)؛ كسب النقاط والتحويل ذريان ومحصنان ضد التكرار.
8. **Telegram webhook** — سرّ إلزامي fail-closed (غيابه = 403 موحدة كالتخمين الخاطئ، :156-165) + timingSafe؛ الحد بعد التحقق (لا يحرق الميزانية)؛ أزرار الموافقة خلف قائمة أدمن (env + DB BigInt)؛ توكنات الربط HMAC-SHA256 بمفتاح HKDF مشتق من AUTH_SECRET/JWT_SECRET مع anti-replay ذري؛ callback_query داخل try مع await (r92-wave3-1).
9. **الرفع** — قائمة أنواع JPEG/PNG/WEBP/AVIF فقط (**SVG/HTML مرفوضان** = لا XSS عبر رابط الصورة)؛ فحص magic bytes موسّع (بما فيه عائلة AVIF ftyp)؛ حد 5MB (content-length + فعلي)؛ auth + 5/min(ip+user)؛ مسار tenant للمسح المقيّد (`blob.ts` deleteBlob يرفض العابر للمستأجرين)؛ `mediaUrlError` يمنع `javascript:` وتخزين روابط blob لمطعم آخر.
10. **تسريبات المعلومات** — `handleError` يعيد رسائل عربية عامة بلا stack (api-helpers.ts:99-133)؛ صفحات الخطأ تسجل message فقط (DefaultError)؛ التوكنات لا تُسجل (grep نظيف)؛ كوكي CSRF غير httpOnly مقصود (double-submit)؛ bot token مشفر AES-GCM ولا يعاد أبدًا؛ config العام يستبعد isSecret؛ login/register يعيدان الحد الأدنى.
11. **حقن SQL** — لا شيء: كل الاستعلامات Prisma parameterized، والـraw الخمسة كلها template literals بمعاملات (`$queryRaw\`… ${id} FOR UPDATE\``).
12. **XSS مخزّن** — React يرمّز كل النصوص؛ لا `dangerouslySetInnerHTML` ببيانات مستخدم (الثلاثة الموجودة: HIGH_CONTRAST_BOOT_SCRIPT ثابت + JSON-LD مع تهريب `<`)؛ اسم/هاتف الطلب يمرّان عبر WhatsApp encodeURIComponent.
13. **فتح redirect** — `login/page.tsx:39-42` safeRedirect يرفض غير `/` و`//`؛ redirect الكوكيز في proxy يضبط المسار الداخلي فقط.
14. **SSRF** — كل الجلب الخارجي إلى `api.telegram.org` فقط (توكنات/توكن)؛ receiptImageUrl يُخزن ويُعرض كصورة عميل ولا يُجلب خادميًا.
15. **الأسرار** — env.ts يفرض DATABASE_URL(postgres) + JWT_SECRET≥64 + AUTH_SECRET≥32 + DOMAIN؛ المشتقات HKDF (keys.ts)؛ الاختيارية fail-closed (TELEGRAM_WEBHOOK_SECRET غائب=رفض؛ CRON_SECRET غائب=رفض؛ BLOB غائب=500). استخدامات process.env خارج env.ts كلها اختيارية بمواثيق .env.example.
16. **RBAC مصفوفة الأدوار** — MANAGE_USERS محجوز عن admin (legacy) لمنع تصعيد (`auth.ts:70-76`)؛ حراس هدف super_admin في admins/reset-password/DELETE users؛ admin لا يستطيع إنشاء sub_admin (route:24).
17. **حدود المعدل** — كل النقاط الحساسة العامة مقيدة (login مزدوج exemptFromRelax، register 5، orders 30، reviews 5+30/ساعة/صنف، loyalty مزدوج، claim 10، validate 10، subscriptions/upgrade 5، upload 5، webhook 120/30ث) + حدود user-scoped للـpolling (60/120/min). الفجوات المتبقية موثقة أعلاه (MED-3/LOW-4/5/6).

---

## رابعًا: ملخص مرتب للأولوية

1. **MED-1** فجوة sub_admin/PII في المراجعات — إصلاح باب واحد + اختبار (نفس نمط r92-B1، نصف ساعة).
2. **MED-2** ترميز Markdown في رسائل الموافقة — تصدير esc() وتطبيقه في 4 مواضع + اختبار.
3. **MED-3** حد معدل لمساري items/restaurants[id] للقراءة المجهولة.
4. **LOW-11** تنظيف `.git/info/exclude` (خطر أدوات تدقيق مستقبلي — رخيص جدًا).
5. ثم LOW-4/5/6/7/9 (اتساق بوابات/حدود) وLOW-10 وINFO-12 (توحيد التنقية).

> ملاحظة للمنسق: كل النتائج الثلاث MED صالحة للإصلاح في موجة واحدة صغيرة بأمان — لا تتقاطع مع ملفات أي وكيل آخر.
