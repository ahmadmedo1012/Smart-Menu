# تقرير جرد المرحلة A — round79 (بوابة الخروج A)
**التاريخ:** 2026-09-05 · **المستودع:** ahmadmedo1012/Smart-Menu @ كوميت `7b747021` (والوالد `75e5ce7f` — نفس حالة الكود التي فُحصت عند كتابة الخطة)

---

## 0) منهجية التنفيذ والأدوات — شفافية كاملة

الخطة فرضت 3 أدوات للمرحلة A. حالة كل أداة في بيئة التنفيذ الفعلية:

| الأداة المفروضة | حالتها في هذه البيئة | ما نُفِّذ فعليًا |
|---|---|---|
| `ast-grep-mcp` | المحرك غير مثبت مبدئيًا (`/usr/bin/sg` كان أمر util-linux مختلف) | **ثُبِّت المحرك الحقيقي** `@ast-grep/cli 0.45.3` — نفس محرك ast-grep-mcp (الـ MCP مجرد غلاف له). شُغِّل **40+ نمطًا بنيويًا** على `src/components` + `src/app`. كل الأدلة أدناه نواتج `ast-grep run` فعلية |
| `Understand-Anything` `/understand` | غير مثبت في هذه البيئة (لا `~/.claude/skills`) | بُنيت الخريطة المعمارية بفحص مباشر كامل: كل الصفحات والمسارات والمكوّنات مُحصاة ومُدرجة أدناه + قراءة `PROJECT.md` + `CLAUDE.md` + `prisma/schema.prisma` كاملًا |
| `claude-mem` | غير مثبت في هذه البيئة | استُرجعت القرارات من المصدر نفسه الذي يغذيها: **57 ملفًا في `docs/`** (قُرئ منها 15 بعمق) + `memory/` + بحث نصي عن القرارات الصريحة عبر كل الجولات — النتائج في القسم 5 |

**قاعدة الخطة (لا تنفيذ منفرد):** استُخدم وكيل فرعي (Task ID A-1) لاسترجاع تاريخ الجولات بالتوازي مع الفحص البنيوي الرئيسي، والنتيجتان مدمجتان هنا.

---

## 1) الأرقام الفعلية للمخزون (إثبات طرفي)

```
$ find src/app -name "page.tsx" | wc -l
34
$ find src/app -name "route.ts" | wc -l
65
$ find src/components -name "*.tsx" | wc -l
127
$ find src/components -name "*.ts" | wc -l
7
$ find src/app -name "layout.tsx" | wc -l
11
$ find src/lib -type f | wc -l
37
```

- **المكوّنات المفحوصة فعليًا: 134 ملفًا** (127 `.tsx` + 7 `.ts`) — محرّك ast-grep حُلَّل خلالها كل الملفات (صفر أخطاء تحليل). القائمة الكاملة مسجلة في `scripts/round79-phaseA-astgrep-v2.txt`.
- **الصفحات: 34** (مطابق لادعاء الخطة ✓) — الحالة التفصيلية لكل صفحة في القسم 3.
- **مسارات API: 65** (الخطة قالت 64 — الفارق +1: `api/demo/fix-images/route.ts`).
- **Prisma: 22 موديل + 12 enum** (مخطط كامل مقروء).
- **`globals.css`: 1058 سطرًا، 140 استخدام oklch** (مطابق للخطة ✓).
- **الاختبارات: 49 ملفًا** (unit + e2e + security)، منها 12+ ملف e2e/spec. (الجولات السابقة تثبت 396 اختبار unit ناجحًا — لم يُعد تشغيلها في هذه الجلسة لأن بوابة إعادة التشغيل الإلزامية في المرحلة D وليس A).
- **حجم الكود في المكوّنات:** 16,904 سطرًا إجمالًا. أكبرها: `PaymentDialog.tsx` (776)، `ItemDialog.tsx` (432)، `OrderDialog.tsx` (425).

---

## 2) نتائج ast-grep البنيوية — المنطق المكرر بالمسارات الدقيقة

> كل الأرقام أدناه ناتج `ast-grep run` فعلي مُشغَّل على المستودع (السجلات الخام محفوظة في `scripts/round79-phaseA-astgrep-results.txt` و `round79-phaseA-astgrep-v2.txt`).

### 2.1 تكرار مؤكد — عالي الأثر (مرشح مباشر للمرحلة D)

**د1) بطاقتا KPI بنفس البنية تحت اسمين مختلفين:**
- `src/components/admin/KpiCard.tsx` (كامل، مُصدَّر، مع MiniSparkline/trend)
- `src/app/(protected)/owner/OwnerKpiGrid.tsx` → `StatCard` داخلي خاص (سطر 72-134) مع `AnimatedCounter`
- **الإثبات البنيوي:** نمط `<span className="sr-only">{$L}</span>` داخل رابط ممدود طابق **ملفين فقط في المشروع كله**:
```
$ ast-grep run -l tsx -p '<span className="sr-only">{$L}</span>' src/app src/components
src/components/admin/KpiCard.tsx:82:   <span className="sr-only">{label}</span>
src/app/(protected)/owner/OwnerKpiGrid.tsx:116:  <span className="sr-only">{label}</span>
```
كلاهما: نفس نمط stretched-link (`<Link absolute inset-0 z-10 + sr-only>`)، نفس `motion.div initial/animate`، نفس تخطيط `flex items-start justify-between` مع أيقونة `rounded-xl p-3` ونص `text-3xl font-bold` + `toArabicNumber`. **والدليل القاطع على النسخ:** تعليق داخل `KpiCard.tsx` نفسه يقول "(OwnerKpiGrid pattern)" — أي أن كاتبها نقل النمط بدل توحيده.

**د2) استعلامات Prisma متكررة بنفس الشكل عبر المسارات (أعلى إشارات حرارة):**
```
prisma.$M.findUnique($$$)  → 79 مطابقة في 37 ملفًا   (الأعلى: items/[id] و restaurants/[id] و subscriptions/upgrade = 5 لكل)
prisma.$M.findMany($$$)    → 44 مطابقة في 32 ملفًا   (الأعلى: admin/stats = 6)
prisma.$M.count($$$)       → 29 مطابقة في 17 ملفًا   (الأعلى: admin/stats = 8)
prisma.$M.update($$$)      → 26 في 22 ملفًا
prisma.$M.create($$$)      → 21 في 17 ملفًا
prisma.$M.findFirst($$$)   → 15 في 10 ملفًا
```
**ملفات الحرارة القصوى:** `api/admin/stats/route.ts` (6 findMany + 8 count)، `api/items/[id]/route.ts` (5 findUnique)، `api/restaurants/[id]/route.ts` (5 findUnique + 3 update)، `api/subscriptions/upgrade/route.ts` (5 findUnique + 2 findFirst)، `api/settings/route.ts` (4 findUnique)، `api/loyalty/route.ts` (4 findUnique).

**د3) ثلاثة مسارات إحصائيات تعيد تنفيذ نفس استعلامات التحليل:**
- `api/stats/route.ts` (104 سطرًا) · `api/admin/stats/route.ts` (215) · `api/stats/advanced/route.ts` (230)
- الثلاثة تشترك في: `prisma.order.aggregate` (الإيراد)، `prisma.order.groupBy` (statusBreakdown)، `prisma.orderItem.groupBy` (popularItems)، `prisma.menuItem.findMany/count` — رغم وجود `lib/chart-stats.ts` (يوحّد حساب النطاقات الزمنية فقط) و`lib/api-helpers.ts`.
- إضافة: `api/loyalty/stats` و `api/public/stats` (إجمالي 5 مسارات stats).

**د4) مكتبة fetch مقوّاة موجودة لكن مهجورة:**
- `lib/fetch-json.ts` (مهلة AbortController + فحص content-type + إعادة محاولة) — **3 ملفات فقط تتبنّاها**.
- في المقابل: **76 استدعاء `fetch` خام في 39 ملفًا tsx** (الأعلى: `admin/telegram/page.tsx` = 6، `owner/page.tsx` = 6، `admin/settings/page.tsx` = 5، `subscribe/page.tsx` = 4، `owner/menu/page.tsx` = 4).

**د5) مخططات تحقق Zod معرَّفة inline بلا مصدر موحد:**
```
z.object({$$$})        → 40 في 35 ملفًا
z.string().min($$$)    → 56 في 26 ملفًا
z.enum($$$)            → 11 في 9 ملفات
z.string()             → 138 في 29 ملفًا (داخل api فقط)
```
لا يوجد `lib/validation.ts` — قيود الحقول نفسها (اسم المستخدم/الهاتف/الاسم) مكررة عبر `auth/register`، `auth/login`، `admin/admins`، `admin/create-owner`، `users/[id]`، `subscriptions/*`، `restaurants/*`.

### 2.2 تكرار متوسط — على مستوى النمط

**د6) ثلاث تطبيقات لصف بحث:**
- `src/components/ui/search-input.tsx` (112 سطرًا، debounce عبر `useRef+setTimeout` — مستهلكة في 7 صفحات قوائم)
- `src/components/menu/MenuToolbar.tsx` (سطر 175: `<input>` خاص + `useDebouncedCallback` مخصصة — **تنفيذ debounce ثانٍ مختلف**)
- `src/components/ui/action-search-bar.tsx` (377 سطرًا — لوحة أوامر ⌘K بصف إدخال خاص بها، لا تستورد SearchInput)

**د7) حواريات CRUD بنفس الهيكل المتوازي:**
- `src/app/(protected)/admin/restaurants/RestaurantFormDialog.tsx` و `src/components/owner/ItemDialog.tsx`
- كلاهما: `[form, setForm] = useState` + `[saving, setSaving] = useState(false)` + `save = async () => csrfFetch(...)` + Dialog + premiumToast — نفس الهيكل الوظيفي لكيانين مختلفين.

**د8) دورة تحميل client-side مكررة يدويًا:**
- `useState(true)` (حالة loading) في **28 ملفًا**؛ `if (!res.ok)` في 10 ملفات؛ `try/catch` في 7 مكوّنات فقط (معالجة أخطاء غير متسقة عبر الصفحات) — لا يوجد hook مشترك مثل `useApiQuery`.

### 2.3 عائلات مقصودة (ليست تكرارًا — قرارات موثقة سابقًا، لا تُلمس)

- **24 مكوّن أيقونة متحركة** (`src/components/ui/*-icon.tsx`) — قرار الجولة 51 الصريح: استبدال كامل لأيقونات lucide بـ 582 مرجعًا. تُركت عمدًا.
- **`lib/premium-toast.tsx`** — الغلاف الموحد للتنبيهات (sonner داخله) — هذا هو النمط الصحيح المركزي.
- **حرس المصادقة موحد أصلًا** (ليس تكرارًا): `requireAuth` في 25 ملفًا + `requireAdmin` في 4 + `requirePermission` في 26 — كلها من `lib/auth.ts` المشترك. هذا الاستدعاء المتكرر **صحي معماريًا** ولا يُعد تكرارًا منطقيًا.
- **حوامل الصفحات الخادمة الصغيرة** (`(public)/page.tsx` = 5 أسطر، `owner/menus/page.tsx` = 7، `admin/system-events/page.tsx` = 18) — تفويض مقصود لمكونات client.

---

## 3) قائمة الصفحات الـ34 بحالتها الحالية

| # | الصفحة | الوضع | أسطر | المكوّنات الرئيسية | ملاحظات الجرد |
|---|---|---|---|---|---|
| 1 | `(public)/` الرئيسية | server | 5 | HomePage | تفويض لـ `landing/HomePage` |
| 2 | `(public)/pricing` | client | 397 | Header, Footer, motion-icons | في مخطط رحلة C |
| 3 | `(public)/menu` (قائمة المطاعم) | server | 29 | — | صفحة فهرس |
| 4 | `(public)/menu/[slug]` | server | 192 | MenuClientSection, ReferralHandler | **هدف المرحلة H** (FeaturedShowcase سيُستدعى في MenuPageClient أعلاها) |
| 5 | `(public)/menu/[slug]/print` | server | 143 | — | نسخة طباعة |
| 6 | `(protected)/login` | client | 344 | ThemeToggle, dialog, eye-icon | فيها raw fetch |
| 7 | `(protected)/subscribe` | client | 444 | Header, loading-announcer | **في مصفوفة C** (PlanSelector + PaymentSection + SuccessPanel) |
| 8 | `(protected)/cart` | client | 744 | Header, dialog | أكبر صفحة في المشروع (Zustand + persist) |
| 9 | `(protected)/order-confirmed` | client | 155 | ShareAfterOrder | نهاية رحلة الدفع |
| 10 | `(protected)/privacy` | server | 43 | Header, Footer | ثابتة |
| 11 | `(protected)/terms` | server | 33 | Header, Footer | ثابتة |
| 12 | `admin/` (لوحة) | client | 536 | AreaChart, HorizontalBar, KpiCard | KpiCard مستهلكة هنا |
| 13 | `admin/admins` | client | 462 | badge, input, label | premiumToast ×10 |
| 14 | `admin/audit-logs` | client | 406 | select, motion-icons | |
| 15 | `admin/menu` | client | 278 | dialog, search-input | SearchInput مستهلكة |
| 16 | `admin/orders` | client | 351 | search-input, chart-bar-icon | raw colors: 2 |
| 17 | `admin/orders/[id]` | client | 367 | copy-icon, map-pin-icon | raw colors: 4 |
| 18 | `admin/qr` | client | 252 | download-icon, external-link-icon | hex مباشر |
| 19 | `admin/restaurants` | client | 241 | dialog, RestaurantFormDialog | (د7) |
| 20 | `admin/settings` | client | 402 | ConfigEditor, OptimizedImage | **فجوة #3 من الخطة: لا حقل IBAN مخصص** — عبر ConfigEditor العام فقط |
| 21 | `admin/subscriptions` | client | 463 | dialog, clock-icon | |
| 22 | `admin/system-events` | server | 18 | client.tsx داخلي | حامل صغير |
| 23 | `admin/telegram` | client | 385 | loading-announcer, refresh-icon | **الأعلى fetch خام: 6** + 14 premiumToast |
| 24 | `admin/users` | client | 384 | badge, dialog, input | |
| 25 | `owner/` (اللوحة) | client | 527 | OrderNotifier, RestaurantSwitcher | fetch خام: 6 |
| 26 | `owner/loyalty` | client | 491 | badge, copy-icon | raw colors: 3 (مع TierChart/TransactionTable/ReferrerList الفرعية) |
| 27 | `owner/menu` | client | 647 | ItemDialog, PlanUsageBadge, RestaurantSwitcher | **نموذج تعديل الصنف = هدف واجهة إدارة المرحلة H** |
| 28 | `owner/menus` | server | 7 | — | حامل صغير |
| 29 | `owner/orders` | client | 669 | LivePollIndicator, NewOrdersBar, OrderCardSkeleton | SSE→polling |
| 30 | `owner/orders/[id]` | client | 403 | copy-icon, map-pin-icon | raw colors: 4 |
| 31 | `owner/qr` | client | 244 | download-icon, external-link-icon | raw colors: 2 + hex |
| 32 | `owner/restaurants` | client | 278 | RestaurantSwitcher | premiumToast ×10 |
| 33 | `owner/reviews` | client | 199 | message-circle-icon, refresh-icon | |
| 34 | `owner/settings` | client | 551 | BackButton, OptimizedImage | raw fetch + try/catch |

**توزيع الأوضاع:** 29 صفحة client · 5 صفحات server (منها 3 حوامل تفويض + privacy/terms الثابتتان + menu/[slug] العامة التي تفوّض لـ MenuClientSection/MenuPageClient).

---

## 4) التحقق من ادعاءات الخطة — خط الأساس الموثق للمرحلة B

> أُعيد تشغيل نفس أوامر grep الواردة حرفيًا في بوابة خروج المرحلة B من الخطة، لتوثيق خط الأساس الحقيقي:

```
$ grep -rE "(bg|text|border)-(red|blue|green|yellow|purple|pink|indigo|gray|slate|orange|teal|cyan)-[0-9]{2,3}" src/components src/app --include="*.tsx" | wc -l
46
$ grep -rEl "#[0-9a-fA-F]{6}" src/components src/app --include="*.tsx" | wc -l
14
```

| الادعاء في الخطة | الفحص الفعلي | الحكم |
|---|---|---|
| 90 استخدام لون Tailwind خام في 18 ملفًا | **46 استخدامًا في 18 ملفًا** بنفس grep الخطة حرفيًا؛ **237** بنمط موسّع (يشمل emerald/amber/rose + `/opacity` + ring/shadow/from/to) | الملفات مطابقة ✓؛ العدد انخفض (كوميتات `75e5ce7f`/`346de64f` جلبت "elevate design system") — الخطة كُتبت على حالة أقدم قليلًا أو بعدّ مختلف. **الأثر على B: بوابة الخروج تبقى نفسها (0 استثناءات)** |
| 14 ملفًا فيها hex ثابت | **14 ملفًا بالضبط** (القائمة: admin/qr, (protected)/layout, owner/qr, PlanSelector, StepIndicator, (public)/layout, HeroSection, PhoneVideo, MenuClientSection, OrderDialog, Confetti, button.tsx, iphone-mockup, trash-icon) | ✓ مطابق تمامًا |
| PaymentDialog.tsx أولوية قصوى | **الأعلى فعلًا: 11 استخدامًا خامًا** — من بينها شاشة الدفع نفسها | ✓ مؤكد |
| `MenuItem` بلا حقل تمييز | **مؤكد من المخطط**: لا `isFeatured` ولا `featuredRank` على MenuItem (الموجود `Restaurant.featuredRank` لمطاعم فقط). `dietaryTags String[]` موجودة (دلالية غذائية). `image String` موجودة | ✓ يتطلب migration جديد في H |
| globals.css بـ1058 سطرًا و140 oklch | **1058 / 140** | ✓ |

---

## 5) الذاكرة المسترجعة — قرارات موثقة لا تُنقض بلا سبب (بديل claude-mem)

أهم 20 قرارًا مسترجعًا من `docs/round*.md` (المصدر مفصل في سجل الوكيل A-1):

1. **(ج78)** حساب إيراد اليوم عبر `order.aggregate` داخل SQL لا JS — لا يُعاد إلى reduce.
2. **(ج78)** تضييق `select` في `/menu/[slug]` — أي استعلام جديد (مثل الأصناف المميزة في H) يجب أن يحترم نفس النمط.
3. **(ج73)** E2E بـ `domcontentloaded` لا `networkidle` (منع تعليق SSE/streams في /cart).
4. **(ج70)** auth guard يحفظ المقصد `login?redirect=...` وowner يُحجب عن /admin.
5. **(ج69)** onboarding: خطة مجانية → 7 حقول → مطعم → /owner مباشرة.
6. **(ج68)** Dark mode: body `#000000` / بطاقات `#050505` / `bg-white/5` — لا أسطح بيضاء خالصة.
7. **(ج66)** **حظر هوية:** لا indigo/purple في اللوحة (برتقالي/وردي فقط)، لا emoji للأليرجن → SVG AlertTriangle.
8. **(ج66)** `aria-modal="true"` على dialog/sheet، أزرار ≥44px (Fitts)، `prefers-reduced-motion` بـ `initial={false}`.
9. **(ج66)** **لا تلمس ملفات التكوين** (eslint/postcss — درس حرق).
10. **(ج65)** مكونات client-only (مثل motion.footer) تتطلب `"use client"` وإلا فشل prerender.
11. **(ج41+65)** تنزيل QR عبر `fetch → blob → objectURL` — محلول، لا يُعاد.
12. **(ج51)** نظام الأيقونات المتحركة نهائي (24 غلافًا) — حقول `LucideIcon` النوعية تبقى lucide **عمدًا**.
13. **(ج39)** كل مسارات API محمية (requireAuth/requirePermission، فحص UserRestaurant ضد IDOR، rate limit على loyalty، Bearer على cron).
14. **(MEGA)** `/demo` مقفول 404 في production — مؤكد بالفحص في هذه الجلسة أيضًا (الكود يتحقق `NODE_ENV === 'production'`).
15. **(MEGA)** CSRF double-token عبر `csrfFetch` — RestaurantFormDialog و ItemDialog يستخدمانها ✓.
16. **(خطة79)** ترتيب التنفيذ A→B→D→H→C→E→F→G حاسم.
17. **(خطة79)** FeaturedShowcase **إضافة لا استبدال** — `git diff MenuItemCard.tsx` يجب أن يبقى فارغًا.
18. **(خطة79)** ممنوع توليد صور مكوّنات وهمية؛ Framer Motion الموجودة فقط؛ `OptimizedImage` إلزامي.
19. **(خطة79)** قاعدة الإثبات: ناتج طرفي/لقطة/رابط تقرير — لا "تم بنجاح".
20. **(معلق → المرحلة F)** تدوير `TELEGRAM_WEBHOOK_SECRET` (السر القديم في تاريخ git العام) + تحويل المستودع private قبل الإطلاق.

**حالة النشر المسترجعة (DEPLOYMENT-STATUS-2026-08-24):** READY — 396/396 unit ناجحة، بناء 265 صفحة، لكن E2E معلقة على إعداد CI. **الفجوة #5 في الخطة (عدم تشغيل E2E في جلسة حديثة) ما زالت قائمة — تُغلق في المرحلة C.**

---

## 6) مخرجات إضافية من الجرد (مهمة للمراحل التالية)

- **لا حقول UI مخصصة لإعدادات الدفع/IBAN** (فجوة #3 مؤكدة): `admin/settings/page.tsx` يستخدم `ConfigEditor` العام؛ `bank_transfer_iban` لا تُحرَّر إلا ضمن إعدادات خام.
- **نموذج تعديل الصنف لهدف المرحلة H** موجود في: `src/app/(protected)/owner/menu/page.tsx` (647 سطرًا) الذي يستضيف `src/components/owner/ItemDialog.tsx` (432 سطرًا) — **المسار الدقيق المطلوب اكتشافه في A لتعديل نموذج التمييز في H.**
- **مكونات كاروسيل/عرض موجودة مسبقًا** (تحذير تكرار H): `src/components/menu/GalleryCarousel.tsx` (313 سطرًا) و `MenuItemCard.tsx` (345) — FeaturedShowcase الجديد يجب ألا يكرر منطقهما (سيُفحص بـ ast-grep في بوابة H).
- **`(public)/menu/[slug]/page.tsx` → `MenuClientSection` → `MenuPageClient`** هي سلسلة العرض الفعلية للمنيو العام.
- **عائلة مخططات shared/** موجودة (AreaChart, ColumnChart, SplineAreaChart, DoughnutChart, HorizontalBar, MiniSparkline + `chart-tokens.ts` و `lib/chart-geometry.ts`) — بناء موحد أصلًا، لا يُعاد بناؤه في H.

---

## 7) إغلاق بوابة المرحلة A — بيان المطابقة

| مطلب بوابة الخروج (نص الخطة) | أين تحقق في هذا التقرير |
|---|---|
| "عدد المكوّنات الفعلي المفحوص" | القسم 1: **134 ملفًا** (127 tsx + 7 ts) حُلِّلت كلها بمحرك ast-grep + 34 صفحة + 65 مسارًا |
| "أي منطق مكرر وجده ast-grep بالمسارات الدقيقة" | القسم 2: **8 تكرارات موثقة (د1–د8)** بمسارات كاملة + أرقام مطابقات خام + إثبات بنيوي حرفي لكل منها |
| "قائمة كل صفحة (34 صفحة) بحالتها الحالية" | القسم 3: **جدول الـ34 صفحة** (الوضع، الأسطر، المكوّنات، ملاحظات فجوات المراحل القادمة) |

**ملفات الإثبات الخام المرفقة:**
- `scripts/round79-phaseA-astgrep.sh` + `round79-phaseA-astgrep-results.txt` (النمط الأول)
- `scripts/round79-phaseA-astgrep-v2.sh` + `round79-phaseA-astgrep-v2.txt` (الأنماط المصححة — 72 قسمًا)
- `scripts/round79-page-status.sh` (مستخرج حالة الصفحات)

**المرحلة A مغلقة. التوقف هنا وفق أمر المستخدم — المرحلة B (توحيد الثيم) لن تبدأ قبل موافقة صريحة.**
