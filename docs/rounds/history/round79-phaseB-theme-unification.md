# تقرير المرحلة B — توحيد نظام الثيم والألوان (بوابة الخروج B)

**التاريخ:** 2026-09-05 · **المستودع:** ahmadmedo1012/Smart-Menu (فرع main، تعديلات غير مُرسَلة بعد) · **الترتيب الملزم:** A→**B**→D→H→C→E→F→G

---

## 0) الأدوات الإلزامية — حالة فعلية ومنهجية (شفافية كاملة)

| الأداة المفروضة في الخطة | حالة التنفيذ الفعلي | الإثبات |
|---|---|---|
| `impeccable` | **استُنسخ الأصل الرسمي** `github.com/pbakaus/impeccable` (v3.6.1 CLI · 61 كاشفًا حتميًا) إلى `/home/z/my-project/skills/impeccable-src` وشُغِّل فعليًا: `detect src/` قبل البدء (خط أساس 8 anti-patterns) وبعد الانتهاء (8 = لم يُدخل أي جديد)، واتُّبعت مراجع أوامره الثلاثة (audit → polish → critique) | النواتج الطرفية أدناه + تقريرا الوكيلين المعزولين |
| `ui-ux-pro-max` | **استُنسخ الأصل الرسمي** `github.com/nextlevelbuilder/ui-ux-pro-max-skill` وشُغِّل `search.py` فعليًا للتحقق من القيم الدلالية (نجاح أخضر/خطأ أحمر/تحذير كهرماني + قاعدة تباين 4.5:1) بدل اختراعها | ناتج البحث في سجل التنفيذ |
| `axe-core` | **شُغِّل عبر متصفح فعلي** (Playwright + axe-core 4.13.0 من devDependencies المشروع نفسه) على 62 حالة صفحة×ثيم، مع **مقارنة علمية قبل/بعد** عبر git stash | `axe-results.json` + `contrast-*.json` |

**منهجية `/impeccable critique` النهائي (اتُّبعت حرفيًا):** التقييمان A (مراجعة تصميمية) و B (كاشف حتمي + أدلة متصفح) نُفِّذا كوكيلين فرعيين معزولين متوازيين، ثم دُمجا في توليف أدناه — كما تفرضه مراجعة critique.md (منع التنفيذ المنفرد).

---

## 1) بوابة الخروج — الإثبات الطرفي الحرفي

### 1.1 أمر البوابة الأول (ألوان Tailwind خام) — قبل → بعد

```
$ grep -rE "(bg|text|border)-(red|blue|green|yellow|purple|pink|indigo|gray|slate|orange|teal|cyan)-[0-9]{2,3}" src/components src/app --include="*.tsx" | wc -l
46          ← خط الأساس (موثّق في تقرير المرحلة A، أُعيد التحقق في بداية B)
0           ← الناتج النهائي ✓ (شرط الخطة: 0 — تحقق بلا أي استثناء متبقٍ)
```

### 1.2 أمر البوابة الثاني (ملفات hex سداسي) — قبل → بعد

```
$ grep -rEl "#[0-9a-fA-F]{6}" src/components src/app --include="*.tsx" | wc -l
14          ← خط الأساس
0           ← الناتج النهائي ✓ (شرط الخطة: 0)
```

### 1.3 فحص أوسع من البوابة (الهدف النصي للخطة: "صفر استثناءات")

- العائلات الخام الموسعة (emerald/amber/rose/sky/slate/gray/yellow/violet...): **90+ استخدامًا عند البدء → 0 الآن**
- `src/lib` (خارج نطاق grep البوابة لكنه داخل الهدف): عولج كاملًا — `order-status.ts` (10 استبدالات) و`premium-toast.tsx` (4) → فحص مستقل = **0**
- التحقق البنيوي الكامل: `npm run typecheck` = **صفر أخطاء** · `npm run lint` = **صفر أخطاء** · `npm run build` = **نجاح كامل (84/84 صفحة ثابتة + sitemap)**

### 1.4 لقطات الشاشة الفعلية (شرط البوابة الثالث)

**64 لقطة PNG فعلية** في `download/round79-phaseB/screenshots/`:
- **62 لقطة** = 31 صفحة فعلية × وضْعا Light/Dark (RTL عربي كامل، 1440px، تسجيل دخول حقيقي للصفحات المحمية owner/admin عبر النموذج نفسه)
- **+2 لقطتان** لحالة **PaymentDialog مفتوحًا فعليًا** (اختيار خطة مدفوعة → "متابعة مع خطة المدفوعة" → "ادفع الآن" → الحوارية المؤكدة `[role="dialog"]` ظاهرة) في الوضعين — لأن الخطة صنّفت PaymentDialog أولوية قصوى
- قائمة الملفات: `owner-*.png` (12 صفحة×2) · `admin-*.png` (12×2) · `public-*.png` (7×2) · `PaymentDialog-open-{light,dark}.png`

---

## 2) ما نُفِّذ فعليًا

### 2.1 توكِنات جديدة في `globals.css` (كما تفرض الخطة: الألوان تمر عبر globals.css)

| التوكِن | القيمة | الدلالة |
|---|---|---|
| `--destructive-foreground` | oklch(0.98 0 0) بالوضعين | نص فوق أسطح الخطأ (يكمل عائلة success/warning/info-foreground) |
| `--c-espresso` + `--color-espresso` | #1a130b | النص الداكن فوق أسطح flame/saffron (بديل 5 استخدامات hex حرفية) |
| `--c-bloom` + `--color-bloom` | oklch(0.56 0.2 16) | وردي العلامة (قرار ج66: الهوية برتقالي/وردي — بديل rose-500/600/700) |
| `--whatsapp` / `--whatsapp-deep` | #25D366 / #20bd5a | لون علامة واتساب الخارجي (theme-independent بالتعريف) |
| `--c-device-*` (5) | #0b0b0d/#837a72/#a69a8a/#000/#070708 | مواد جهاز iPhone الفيزيائية في iphone-mockup/PhoneVideo |
| `--confetti-*` (12) | كما كانت حرفيًا | لوحة جسيمات الاحتفال (ديكور theme-independent) |
| `--success` (فاتح) / `--info` (فاتح) / `--warning` (فاتح) | 0.48 / 0.48 / 0.52 | **ثنائية السطوع كنمط `--primary` نفسه** — إصلاح WCAG AA للنصوص في الوضع الفاتح (انظر 3.2) |

### 2.2 حجم التغيير الفعلي

- **~200 استبدال دلالي محقَّق** في 48 ملفًا (سكربتات تحقق بعدّ مطابقة حرفية لكل نمط: `scripts/round79-phaseB-replace.py` + fixups + `round79-phaseB-critique-fixes.py`)
- **الخريطة الدلالية المطبَّقة** (مُصادق عليها من بيانات ui-ux-pro-max): red→destructive · green/emerald→success (الأسطح النباتية/dietary→**basil** كما يُصرّح تعليق التوكِن نفسه) · amber-600/700→warning · نجوم التقييم→saffron/ember (ذهب العلامة) · slate/gray→muted-foreground/muted · sky/cyan→info · purple→حظر ج66 → saffron/ember · rose→bloom · hex واتساب→whatsapp · #1a130b→espresso
- **PaymentDialog.tsx (الأولوية القصوى)**: كل حالاته (approved/rejected/pending + بطاقة رمز التحويل + زر النسخ والاتصال) أصبحت success/destructive كاملة مع `*-foreground` الصحيحة
- **الاستثناء الموثَّق الوحيد** (تفرضه المنصة، لا خيار تصميمي): `<meta name="theme-color">` لا يقبل متغيرات CSS — مُركز في `src/lib/brand.ts` (BRAND_THEME_COLOR) مع تعليق يوثّق السبب والمزامنة مع manifest/offline.html. **لم يبقَ أي hex سداسي في أي tsx تحت components/app.**
- hex الثلاثية المبرَّرة المتبقية (خارج نمط grep السداسي أصلًا): `#fff/#000` في card.tsx (قناع compositing) وReferralQR (قابلية مسح QR) — حرفية عمدًا لتفقد وظيفتها

---

## 3) القصة الكاملة للتباين (axe-core) — بالأرقام لا بالوعود

### 3.1 المنهجية العلمية

قِيست المقارنة بمصفوفة ثابتة (13 صفحة × وضْعا) ثلاث مرات بنفس السكربت: **baseline** (الكود قبل B عبر `git stash` مؤقت + إعادة بناء) → **after** (بعد الاستبدالات) → **final** (بعد إصلاحات التقييم).

### 3.2 النتائج الطرفية

```
BASELINE (قبل B): 118 عقدة فشل تباين
AFTER   (بعد الاستبدالات الأولى): 124  → ⚠️ انحدار +6 عقد في /owner/orders
   التشخيص: أزرار تقدّم الطلب نصّها text-info/text-success بسطوع وحيد بالوضعين
   (الأزرق 0.55 = 3.9:1 والأخضر 0.62 = 2.9:1 على أبيض — تحت 4.5:1)
FINAL   (بعد إصلاح ثنائية السطوع): 113  → ✅ صفر انحدارات + 4 صفحات تحسّنت:
   /admin/orders [light] 2→0 · /owner/loyalty [light] 1→0 · /owner/reviews [light] 1→0 · /owner [light] 2→1
   /owner/orders عاد 16/29 = خط الأساس تمامًا
```

**العقد الـ113 المتبقية كلها سابقة للمرحلة B ومطابقة للخط الأساس حرفيًا** (أنماط `text-muted-foreground/60-70` ونصوص `text-orange` على أسطح شفافة عبر وضع داكن) — مشكلة نظامية في مستوى التوكِنات النصية الثانوية لا تُحلّ دون إعادة معايرة `--muted-foreground`/`--orange` الشاملة (كسر بصري محتمل يتجاوز نطاق B "بلا كسر بصري") — **موثّقة كتوصية للمرحلة G/جولة لاحقة، مع حفظ كل ملفات القياس** (`contrast-baseline/after/final.json`).

### 3.3 إصلاح انحدار رُصد ثم أُصلح داخل نفس المرحلة (دورة audit→polish فعلية)

ثنائية السطوع الجديدة (success/info/warning داكنة في الفاتح كنمط primary) أصلحت الانحدار الستة وحسّنت 4 صفحات إضافية — الإصلاح الجذري في "أضيق مستوى صحيح" (مبدأ polish الحرفي).

---

## 4) `/impeccable critique` النهائي — التوليف المزدوج (وكيلان معزولان)

### 4.1 كاشف العيوب الحتمي (الوكيل B — ناتج طرفي)

```
$ node skills/impeccable-src/cli/bin/cli.js detect src/
8 anti-patterns found.   EXIT: 2
   ├─ gradient-text ×4 (globals.css — أنماط العناوين المتدرجة للعلامة، مقصودة كأسلوب هوية)
   ├─ broken-image ×3 (admin/qr:175, owner/qr:155, GalleryCarousel:260 — إيجابيات كاذبة موثّقة: src ديناميكي من QR API/معرض)
   └─ bounce-easing ×1 (design-tokens.ts:145 — ease.spring مقصود للتفاعلات المرنة)
الحكم: صفر نتائج جديدة أدخلتها المرحلة B (8→8 مطابقة، gradient-text انزاح أسطر +36 فقط بسبب إضافات التوكِنات)
```

### 4.2 المراجعة التصميمية (الوكيل A — أخذت نتائجه كأوامر إصلاح ونُفِّذت)

| ملاحظة A | المعالجة الفعلية |
|---|---|
| **P1** تباين أخضر واتساب منقسم (زر واحد whatsapp وزران success) | وُحِّدت الأزرار الثلاثة (ReferralCard, ShareAfterOrder, OrderDialog) على `bg-whatsapp hover:bg-whatsapp-deep` |
| **P1** نقطة عمياء: `src/lib` خارج البوابة وفيه خامات | عولج order-status.ts (10) + premium-toast.tsx (4) — فحص مستقل = 0 |
| **P1** warning بلا ثنائية سطوع (2.71:1 فاتح) | أُصلحت: `--warning` الفاتح = oklch(0.52 0.13 60) |
| **P2** نحو التقييم مُزيَّف (رقم تقييم warning بينما النجوم saffron) | MenuItemCard رقم التقييم → `text-ember dark:text-saffron` |
| **P2** سلّم الدرجات ذهب=برونز=orange | ذهبي → `from-saffron to-ember` · برونزي → `from-ember/60 to-ember/85` |
| **P2** ضرر المسافات البادئة (1456 سطرًا كاذبًا من 42 حقيقيًا في globals.css) | **أُصلح جذريًا**: استُخرج diff الحقيقي، استُعيدت نسخ HEAD الأصلية، أُعيد تطبيق التغييرات — **diff نهائي 389 سطرًا خام = 389 حقيقية (صفر ضجيج)** |
| **P3** متغيرا badge باسم مخادع (purple يُظهر saffron) | أُعيد التسمية: `purple→saffron` و`emerald→success` (صفر مستهلكين — آمن) |
| **P3** أيقونات حالة PaymentDialog text-white | → `text-success-foreground`/`text-destructive-foreground` |
| **P3** `#000` سادسة في iphone-mockup:128 | → `var(--c-device-screen)` |

### 4.3 حكم التوليف النهائي

النظام الدلالي **مكتمل ومتسق عبر 48 ملفًا**؛ البوابتان = 0/0 بأدلة طرفية؛ الكاشف الحتمي لا يجد جديدًا؛ التباين **صفر انحدار + صافي تحسّن −5**. ما تبقّى موثّق بمساراته كديون معلنة لا كفجوات صامتة.

---

## 5) اكتشافات جانبية موثّقة (خارج نطاق B — للمراحل اللاحقة)

1. **تاريخ migrations غير قابل للتثبيت على قاعدة فارغة**: `5_add_telegram_approvers_bigint` يعدّل جدول `TelegramApprover` غير موجود في snapshot الأساس `0_init` — أي نشر نظيف سيفشل (استُخدم `prisma db push` للبيئة المحلية). **→ يُرحَّل للمرحلة F/النشر.**
2. `package.json` يستدعي `prisma/seed.ts` غير الموجود في المستودع (seed عبر `/api/seed` يتطلب أدمن + ADMIN_PASSWORD).
3. عقد التباين الـ113 السابقة (أنماط muted-foreground/orange) — إعادة معايرة مستوى النظام لجولة لاحقة.

---

## 6) فهرس كل الإثباتات (قابلة للفتح)

| النوع | المسار |
|---|---|
| لقطات الشاشة (64) | `download/round79-phaseB/screenshots/*.png` |
| نتائج axe الكاملة (62 تشغيلة) | `download/round79-phaseB/axe-results.json` |
| مقارنات التباين قبل/بعد/نهائي | `download/round79-phaseB/contrast-{baseline,after,fixed,final}.json` |
| سكربتات التنفيذ القابلة للتكرار | `scripts/round79-phaseB-replace.py` · `round79-phaseB-axe-shots.mjs` · `round79-phaseB-contrast-{count,detail}.mjs` · `round79-phaseB-critique-fixes.py` · `round79-phaseB-seed.ts` · `round79-phaseB-paymentdialog-shot.mjs` · `pg-env/` (PostgreSQL مدمجة) |
| تقارير الوكيلين A/B | مسجّلة كاملة في `worklog.md` (Task B-CRIT-A / B-CRIT-B) |

**بوابة المرحلة B مغلقة بالأدلة أعلاه — التوقف هنا كما يفرض أمر المستخدم. المرحلة D (تحقق التكرار عبر AST) لن تبدأ قبل موافقة صريحة.**
