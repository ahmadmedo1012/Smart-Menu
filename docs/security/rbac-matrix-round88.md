# مصفوفة RBAC — الجولة 88 (الوكيل B-1)

> الأدوار: `guest` (لا جلسة) · `USER` (جلسة دور مستخدم عادي) · `owner` (مالك مرتبط بمطعم عبر `User.restaurantId` + روابط `UserRestaurant`) · `sub_admin(0)` (أدمن فرعي بصلاحيات فارغة) · `admin` (الدور القديم الموثوق كلياً عدا MANAGE_USERS) · `super_admin`.
> الدليل لكل خلية هو الكود في `src/app/api/**` (الحرّاس: `requireAuth`/`requirePermission`/سلالم الأدوار المضمّنة) — مثبتة باختبارات `tests/unit/rbac-matrix.test.ts` + `tests/security/rbac-negative.test.ts`.
> `own` = المورد داخل مطعم المالك (أو مطعم يملك له رابط `UserRestaurant`) · `آخر` = مطعم مستأجر آخر.

## 1) المصادقة والانفتاح العام

| المسار | guest | USER | owner | sub_admin(0) | admin | super_admin |
|---|---|---|---|---|---|---|
| POST /api/auth/login | 200/401 | 200/401 | 200/401 | 200/401 | 200/401 | 200/401 |
| POST /api/auth/register | 201 | 409 | 409 | 409 | 409 | 409 |
| POST /api/auth/logout | 200 | 200 | 200 | 200 | 200 | 200 |
| GET /api/auth/me | 401 | 200 | 200 | 200 | 200 | 200 |
| GET /api/plans · /api/health · /api/public/featured · /api/public/stats | 200 عام | 200 | 200 | 200 | 200 | 200 |
| POST /api/orders (إنشاء طلب) | 201 (معدل 30/د) | 201 | 201 | 201 | 201 | 201 |
| POST /api/restaurants (تسجيل ذاتي username+password) | 201 (معدل 5/د) | — | — | — | — | — |
| POST /api/restaurants (بلا username/password — إنشاء إداري) | 403 | 403 | 403 | 403 | 201 | 201 |
| POST /api/subscriptions/validate (فحص مسبق) | 200 (معدل 10/د) | 200 | 200 | 200 | 200 | 200 |
| POST /api/referrals/claim (كود إحالة) | 200/404 (معدل 10/د) | 200/404 | 200/404 | 200/404 | 200/404 | 200/404 |
| GET /api/loyalty?phone&restaurantId (استعلام بطاقة) | 200/404 (معدل 20/د) | 200/404 | 200/404 | 200/404 | 200/404 | 200/404 |
| POST /api/loyalty (إصدار بطاقة عميل) | 201 (معدل 20/د) | 201 | 201 | 201 | 201 | 201 |
| GET /api/restaurants/[id] | 200 إسقاط عام فقط | 200 عام | 200 كامل (own) | 200 كامل مع VIEW_ANALYTICS وإلا إسقاط عام | 200 كامل | 200 كامل |

## 2) عناصر المنيو والتصنيفات

| المسار | guest | USER | owner | sub_admin(0) | admin | super_admin |
|---|---|---|---|---|---|---|
| GET /api/items?restaurantId | 200 (available فقط) | 200 (available فقط) | 200 own · 403 آخر | 200 (كل الحالات) | 200 | 200 |
| GET /api/items/[id] | 200/404 (المخفي→404) | 200/404 | 200 own · 404 آخر للمخفي | 200 | 200 | 200 |
| POST /api/items | 401 | 403 | 201 own (بحدود الخطة) | 403 | 201 | 201 |
| PUT /api/items/[id] | 401 | 403 | 200 own · 403 آخر | 403 | 200 | 200 |
| DELETE /api/items/[id] | 401 | 403 | 200 own · 403 آخر | 403 | 200 | 200 |
| GET /api/categories?restaurantId | 401 | 403 | 200 own · 403 آخر | 200 | 200 | 200 |
| POST /api/categories | 401 | 403 | 201 own | 403 | 201 | 201 |
| PUT /api/categories/[id] | 401 | 403 | 200 own · 403 آخر | 403 | 200 | 200 |
| DELETE /api/categories/[id] | 401 | 403 | 200 own · 403 آخر | 403 | 200 | 200 |

## 3) الطلبات والإحصاءات

| المسار | guest | USER | owner | sub_admin(0) | admin | super_admin |
|---|---|---|---|---|---|---|
| GET /api/orders | 401 | 403 | 200 own · 403 آخر · 400 بلا مطعم | 200 (الكل) | 200 | 200 |
| GET /api/orders/[id] | 401 | 403 | 200 own · 401 آخر | 403 (بلا APPROVE_ORDERS) | 403 (بلا APPROVE_ORDERS)¹ | 200 |
| PUT /api/orders/[id] | 401 | 403 | 200 own · 403 آخر | 403 (بلا APPROVE_ORDERS) | 403 (بلا APPROVE_ORDERS)¹ | 200 |
| GET /api/orders/count | 401 | 403 | 200 own · 403 آخر | 200 | 200 | 200 |
| GET /api/stats · /api/stats/advanced | 401 | 403 | 200 own · 403 آخر | 200 | 200 | 200 |
| GET /api/owner/restaurants | 401 | 200 (قائمة فارغة) | 200 own (حراسة اشتراك) | 200 (قائمة فارغة) | 200 (فارغة) | 200 (أي userId) |
| GET /api/owner/reviews | 401 | 401 | 200 own | 401 | 401 | 401 |
| POST /api/whatsapp/generate | 401 | 403 | 200 own · 401 آخر | 403 (بلا APPROVE_ORDERS) | 403 (بلا APPROVE_ORDERS)¹ | 200 |
| GET /api/user/events | 401 | 200 own فقط | 200 own | 200 own | 200 own | 200 own |

¹ السلّة المضمّنة في مسارات orders/[id] وwhatsapp/generate تتحقق من `permissions.includes('APPROVE_ORDERS')` يدوياً حتى للدور القديم `admin` — أضيق من `requirePermission` (الذي يمرر admin تلقائياً). سلوك قائم موثق، ليس ثغرة (رفض افتراضي).

## 4) الإعدادات والولاء والاشتراكات

| المسار | guest | USER | owner | sub_admin(0) | admin | super_admin |
|---|---|---|---|---|---|---|
| GET/PUT /api/settings?restaurantId | 401 | 403 | 200 own · 403 آخر | 403 (بلا MANAGE_RESTAURANTS) | 200 | 200 |
| POST /api/loyalty/redeem | 401 | 403 | 200 own · 403 آخر | 403 (بلا APPROVE_ORDERS) | 403 (بلا APPROVE_ORDERS) | 200 |
| GET /api/loyalty/stats | 401 | 403 | 200 own | 200 | 200 | 200 |
| POST /api/loyalty/referral | 401 | 200 | 200 | 200 | 200 | 200 |
| POST /api/subscriptions | 401 | 200 | 200 | 200 | 200 | 200 |
| GET /api/subscriptions/status | 401 | 200 (مدفوعاته فقط) | 200 own | 200 own | 200 own | 200 own |
| POST /api/subscriptions/upgrade | 401 | 200 | 200 | 200 | 200 | 200 |
| POST /api/upload | 401 | 201 (staff/) | 201 (restaurants/{id}/) | 201 | 201 | 201 |
| GET /api/config | 401 | 200 (غير السرّي فقط) | 200 | 200 | 200 | 200 |

## 5) سطح الأدمن (كل ما تحت /api/admin و/api/users و/api/restaurants الإداري)

| المسار | guest | USER | owner | sub_admin(0) | admin | super_admin |
|---|---|---|---|---|---|---|
| GET /api/users | 401 | 401 | 401 | 200 | 200 | 200 |
| PATCH /api/users/[id] (تغيير دور) | 401 | 401 | 403 | 403 (بلا MANAGE_USERS) | 403 (MANAGE_USERS حصري لـ super) | 200 |
| DELETE /api/users/[id] | 401 | 401 | 403 | 403 | 403 | 200 |
| GET /api/restaurants (قائمة الأدمن) | 401 | 401 | 403 | 403 (بلا VIEW_ANALYTICS) | 200 | 200 |
| PUT /api/restaurants/[id] | 401 | 403 | 200 own (مخطط مقيد) | 200 عبر رابط (مخطط مقيد) | 200 كامل | 200 |
| DELETE /api/restaurants/[id] | 401 | 403 | 403 | 403 | 200 | 200 |
| GET /api/admin/stats | 401 | 401 | 403 | 403 (بلا VIEW_ANALYTICS) | 200 | 200 |
| GET/POST/PUT/DELETE /api/admin/system-events | 401 | 401 | 403 | 403 (بلا VIEW_ANALYTICS) | 200 | 200 |
| GET /api/admin/audit-logs | 401 | 401 | 401 | 403 (super_admin حصراً — تعمّد موثق في الكود: السجل يكشف IP وأفعال كل المستخدمين) | 403 (نفس التعمّد) | 200 |
| POST /api/admin/reset-password | 401 | 401 | 403 | 403 | 403 (MANAGE_USERS super فقط) | 200 |
| GET/PUT/DELETE /api/admin/config | 401 | 401 | 403 | 403 (بلا EDIT_SETTINGS) | 200 | 200 |
| POST /api/admin/create-owner | 401 | 401 | 403 | 403 (بلا MANAGE_RESTAURANTS) | 200 | 200 |
| GET/POST /api/admin/admins (+[id] PUT/DELETE/POST) | 401 | 401 | 403 | 403 (بلا MANAGE_USERS) | 403 (MANAGE_USERS super فقط) | 200 |
| GET/POST /api/admin/subscriptions | 401 | 401 | 403 | 403 (بلا MANAGE_SUBSCRIPTIONS) | 200 | 200 |
| GET/PUT /api/admin/notification-preferences · profile | 401 | 401 | 403 | 403 (بلا EDIT_SETTINGS) | 200 | 200 |
| POST /api/admin/events/trigger | 401 | 401 | 403 | 403 (بلا EDIT_SETTINGS) | 200 | 200 |
| POST /api/seed | 404 (الإنتاج) · محلياً 401/403 | — | — | — | 200 محلياً | 200 محلياً |
| POST /api/demo/fix-images | 404 (الإنتاج) · محلياً 401 | — | — | — | — | — |

## 6) قناتا الآلة (بلا جلسات)

| المسار | الشرط |
|---|---|
| POST /api/telegram/webhook | 403 إلا مع `x-telegram-bot-api-secret-token` صحيح (timing-safe) · معدل 120/30ث |
| GET /api/cron/cleanup · /api/cron/subscription-expiry | 401 إلا مع Bearer CRON_SECRET (timing-safe، مطلوب إلزامياً) |

## قرارات موثقة

1. **audit-logs (تحقق لا تغيير):** المسار يحصر القراءة في super_admin حصراً (تعليق صريح في الكود: «Audit logs expose IPs + actions of ALL users — super_admin only») بينما صفحة الواجهة تقبل admin/sub_admin بصلاحية VIEW_ANALYTICS — عدم توافق تجميلي فقط (API أضيق من الواجهة = الاتجاه الآمن). بقي كما هو؛ الصفحة تُعرض لغير super_admin لكن الجلب يرجع 403 (لا تسريب). خيار المستقبَل: ضبط predicate الصفحة إلى super_admin — ملك الواجهة (الوكيل E/المنسق).
2. `sub_admin` يقرأ `/api/categories` و`/api/items` لأي مطعم بلا صلاحية: مقروء فقط (بيانات منيو) والدور موثوق جزئياً — نفس قرار round86-A8 للقراءات المحدودة؛ لم يُغيّر.
3. `USER` في `/api/owner/restaurants` يحصل على قائمة روابطه (فارغة) — لا كشف بيانات؛ بقي كما هو.
4. سلّتا `/api/orders/[id]` و`/api/whatsapp/generate` تشترطان APPROVE_ORDERS يدوياً حتى للدور القديم `admin` (أضيق من requirePermission الذي يمرره تلقائياً) — رفض افتراضي، سلوك قائم موثق لا يُخفف.
