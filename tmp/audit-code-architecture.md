# تدقيق بنية الكود — Smart Menu
> تاريخ: 2026-07-08

---

## 1. PROJECT_ARCHITECTURE.md vs الكود الفعلي

### 1.1 ملفات مُشار لها في ARCHITECTURE ولكنها غير موجودة في src/

- **المشكلة**: `src/lib/events.ts` (EventEmitter) مشار إليه في ARCHITECTURE.md السطر 220 (`events.ts — re-exports EventEmitter`) ومذكور في 5.2 و8 و9 كمكوّن أساسي لـ SSE. الملف لا وجود له. لا يوجد `EventEmitter` في أي ملف ضمن `src/`.
- **الدليل**: `src/lib/events.ts` — غير موجود. `grep -rn "EventEmitter" src/` — صفر نتائج.
- **الخطورة**: **Critical** — ARCHITECTURE يوثق بنية غير موجودة. SSE يعمل حالياً كـ EventEmitter افتراضي (ربما عبر `require('events')` ضمني) لكن ملف `events.ts` الموعود مفقود.

- **المشكلة**: `src/components/admin/LivePaymentToast.tsx` مشار إليه في ARCHITECTURE.md السطر 180 ("0 consumers — dead component"). الملف غير موجود في src/ الرئيسية.
- **الدليل**: `ls src/components/admin/LivePaymentToast.tsx` — غير موجود. الملف موجود فقط في worktrees قديمة (`.claude/worktrees/`).
- **الخطورة**: **High** — وثيقة تذكر كومبوننت ميت لكن الكومبوننت محذوف فعلياً (أو لم يوجد أصلاً في هذا الفرع).

- **المشكلة**: `src/components/menu/StarRating.tsx` مشار إليه في ARCHITECTURE.md السطر 174 ("0 consumers — unused"). غير موجود في src/ الرئيسية.
- **الدليل**: `ls src/components/menu/StarRating.tsx` — غير موجود. موجود فقط في worktrees.
- **الخطورة**: **Medium** — ARCHITECTURE يوثق ملف غير موجود.

- **المشكلة**: `src/actions/` — محجوزة في ARCHITECTURE.md السطر 234-236 لـ Server Actions. المجلد غير موجود.
- **الدليل**: `ls src/actions/` — "NOT FOUND".
- **الخطورة**: **Low** — مجرد حجز للمستقبل، لكن الوثيقة تدّعي وجوده.

### 1.2 تباين أعداد المستهلكين (consumers)

- **المشكلة**: `FloatingWhatsApp` — ARCHITECTURE.md السطر 137 يدّعي "2 consumers". الفعلي: 3 مكالمات (layout.tsx + HomePage.tsx + التعريف نفسه). كما أنه يُستدعى مرتين: مرة في layout.tsx (شامل لكل الصفحات) ومرة في HomePage.tsx — هذا تكرار (double render).
- **الدليل**: `grep -rn "FloatingWhatsApp" src/` → layout.tsx:6+105, HomePage.tsx:7+87, FloatingWhatsApp.tsx:6.
- **الخطورة**: **High** — التكرار يعني ظهور زر واتساب مرتين على صفحة الهبوط.

### 1.3 ادعاءات عن ملفات موجودة

- **المشكلة**: `src/generated/` — ARCHITECTURE.md السطر 231-233 يدّعي وجود `Prisma client types generated from schema`. لكن `src/generated/` يحتوي فقط على `prisma/`، لا يوجد أنواع مُولّدة بشكل واضح.
- **الدليل**: `ls src/generated/` → `prisma/`.
- **الخطورة**: **Low** — prisma client types موجودة في `node_modules/.prisma/` افتراضياً.

### 1.4 ادعاءات عن video/

- **المشكلة**: `src/video/` — ARCHITECTURE.md السطر 237 يقول "Video-related assets". لكنه يحتوي على كود Remotion (React components: PromoVideo.tsx, PhoneFrame.tsx, HighlightOverlay.tsx, VideoBg.tsx)، ليس أصول/ملفات فيديو.
- **الدليل**: `ls src/video/` → scenes/, HighlightOverlay.tsx, PhoneFrame.tsx, PromoVideo.tsx, Root.tsx, VideoBg.tsx, index.ts, shared.ts.
- **الخطورة**: **Low** — خطأ في التوصيف، لا خطأ في البنية.

---

## 2. تكرار واتساق الكومبوننتس

### 2.1 FloatingWhatsApp — Double Render

- **المشكلة**: مكوّن FloatingWhatsApp يُستدعى في `layout.tsx` (شامل لكل الصفحات) ومرة أخرى في `HomePage.tsx`. هذا يسبّب ظهور زرّي واتساب عائمين على صفحة الهبوط.
- **الدليل**: `src/app/layout.tsx:105` + `src/components/landing/HomePage.tsx:87`.
- **الخطورة**: **High** — خطأ مرئي للمستخدمين.

### 2.2 TestimonialsSection vs ClientsSection — تكرار وظيفي

- **المشكلة**: قسمان منفصلان لعرض آراء العملاء: `TestimonialsSection.tsx` (carousel كلاسيكي) و`ClientsSection.tsx` (orbital carousel عبر `CircularTestimonials`). يظهران متتاليين في HomePage (السطر 83-84). خطة التطوير (visual overhaul) نصّت على حذف TestimonialsSection، لكنه لم يُحذف.
- **الدليل**: `src/components/landing/sections/TestimonialsSection.tsx:1-200` + `src/components/landing/sections/ClientsSection.tsx:1-118` + `src/components/landing/HomePage.tsx:83-84`.
- **الخطورة**: **Medium** — تكرار وظيفي يزيد طول الصفحة ويشتت التركيز.

### 2.3 Optional Chaining غير متسق

- **المشكلة**: Project يقول "TypeScript: Strict mode" (ARCHITECTURE.md السطر 1172)، لكن بعض الملفات لا تستخدم optional chaining أو null checks بشكل متسق.
- **الأمثلة**:
  - `src/components/shared/Confetti.tsx:5` — يستخدم hardcoded blue (#3b82f6) في SHAPE_COLORS بدون استخدام token.
- **الخطورة**: **Low**

---

## 3. بقايا كود ميت وخطط لم تكتمل

### 3.1 useMe Hook — بدون مستهلكين

- **المشكلة**: `src/hooks/useMe.ts` — هوك لجلب بيانات `/api/auth/me`. لا يوجد أي import أو استخدام له خارج ملف تعريفه. ARCHITECTURE.md يعترف بذلك ("0 consumers — likely dead").
- **الدليل**: `grep -rn "useMe" src/ --include="*.tsx" --include="*.ts"` — فقط `src/hooks/useMe.ts` نفسه.
- **الخطورة**: **Medium** — كود ميت، 820 بايت بدون فائدة.

### 3.2 StarRating.tsx مفقود (كان ميتاً)

- **المشكلة**: ARCHITECTURE.md يشير إلى `StarRating.tsx` ككود ميت (0 consumers). الملف محذوف من الفرع الرئيسي. دليل على تنظيف غير مكتمل للوثيقة.
- **الدليل**: ARCHITECTURE.md السطر 174.
- **الخطورة**: **Low** — المحتوى محذوف، الوثيقة فقط تحتاج تحديث.

### 3.3 LivePaymentToast.tsx مفقود (كان ميتاً)

- **المشكلة**: ARCHITECTURE.md يشير إلى `LivePaymentToast` ككود ميت. الملف غير موجود الآن. بقايا في مراجع العمل (tests/alerts/live-alerts.spec.ts لا تزال تشير له).
- **الدليل**: `src/components/admin/LivePaymentToast.tsx` غير موجود. `tests/alerts/live-alerts.spec.ts:66` لا يزال يشير له.
- **الخطورة**: **Medium** — اختبارات تشير لكومبوننت محذوف.

### 3.4 Confetti.tsx يحتوي blue hardcoded

- **المشكلة**: `Confetti.tsx` يستخدم `#3b82f6` (blue) في ألوان SHAPE_COLORS (السطر 5). ARCHITECTURE.md السطر 18 يقول "No blue themes".
- **الدليل**: `src/components/shared/Confetti.tsx:5`.
- **الخطورة**: **Low** — كونفيتي مؤقت، لا يؤثر على واجهة ثابتة.

### 3.5 badge.tsx — لا يزال blue variant موجوداً

- **المشكلة**: خطة التطوير (Task 1, Step 2) نصّت على تغيير badge.tsx blue → gold، لكن الكود لا يزال `blue: "bg-blue-500/15..."` في السطر 24.
- **الدليل**: `src/components/ui/badge.tsx:24`.
- **الخطورة**: **Medium** — مخالفة لخطة التطوير المتفق عليها.

---

## 4. globals.css — تحليل نظام التصميم

### 4.1 نظام الألوان — Orange بدلاً من Gold

- **الحقيقة**: لا يوجد `--gold` في globals.css. لون العلامة التجارية هو `--orange: oklch(0.55 0.19 45)`. ARCHITECTURE.md السطر 19 يقول "Orange brand" وهذا متسق مع الكود. لكن خطة التطوير (Task 1) تتحدث عن "gold" — تعارض بين الخطة والواقع.
- **الدليل**: `src/app/globals.css:142` — `--orange: oklch(0.55 0.19 45)`; لا يوجد `--gold` في الملف كاملاً.
- **الخطورة**: **Medium** — الخطة والكود غير متوافقين.

### 4.2 نظام Radius — شاذ (sm > md)

- **الحقيقة**: `--radius-sm: 16px` (السطر 67), `--radius-md: 12px` (السطر 68), `--radius-lg: 24px`, `--radius-xl: 28px`. sm=16px > md=12px. هذا غير تقليدي (عادة sm < md).
- **الدليل**: `src/app/globals.css:67-70`.
- **الخطورة**: **Low** — قد يكون متعمداً لنمط "بينتو"، لكنه غير متوافق مع توقعات Tailwind.

### 4.3 نظام الخطوط — 5 تعريفات مع تداخل كبير

- **الحقيقة**: 5 font families معرفة: `--font-sans`, `--font-mono`, `--font-display`, `--font-arabic`, `--font-body`, `--font-heading`. معظمها تشترك في نفس الخطوط (Cairo كأولوية أولى للجميع).
- **الدليل**: `src/app/globals.css:24-29`.
- **الخطورة**: **Low** — 3-4 عائلات كافية.

### 4.4 نظام الظلال — 4-tier مع dark/light

- **الحقيقة**: نظام متكامل: 4 مستويات ظل (`--shadow-sm` إلى `--shadow-xl`) + `--shadow-glow`. كل مستوى معرف للـ dark (ـ 175) والـ light (ـ 234-238). متسق مع ARCHITECTURE.md.
- **الدليل**: `src/app/globals.css:170-175, 233-238`.
- **الخطورة**: **None** — يعمل كما هو موصوف.

### 4.5 Glass tokens — كاملة

- **الحقيقة**: `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-shadow`, `--glass-shadow-lg`, مع كلاسات `.glass-card`, `.glass`, `.glass-strong` (السطور 357-370). متسق مع نظام التصميم.
- **الخطورة**: **None**

---

## 5. تحليل Landing Page Components

### 5.1 نمط متكرر — Eyebrow Tag في كل قسم

- **الحقيقة**: كل قسم في landing يبدأ بنفس الـ Eyebrow tag. نفس الكود مكرر 6 مرات:
  ```
  className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-4 py-1 text-[0.65rem] font-medium text-orange mb-5"
  ```
  يمكن استخراجه إلى كومبوننت واحد.
- **الأدلة**:
  - FeaturesSection.tsx:25
  - HowItWorksSection.tsx:22
  - TestimonialsSection.tsx:84
  - ClientsSection.tsx:67
  - ShowcaseSection.tsx:33
  - FinalCTASection.tsx:45
- **الخطورة**: **Medium** — صيانة 6 نسخ من نفس الكود يزيد احتمالية عدم الاتساق.

### 5.2 نمط تكراري — Section heading h2

- **الحقيقة**: نفس نمط العنوان (motion.h2 مع نفس الانتقالات) يتكرر في معظم الأقسام.
- **الخطورة**: **Low** — يمكن تحسينه لكنه يعمل.

### 5.3 FeaturesSection يستخدم neutral-950 بدلاً من theme tokens

- **المشكلة**: `FeaturesSection.tsx:19` يستخدم `from-neutral-950/50 via-transparent to-neutral-950/30`. هذا يضعف التكامل مع نظام الـ theming (خاصة في الوضع الفاتح).
- **الدليل**: `src/components/landing/sections/FeaturesSection.tsx:19`.
- **الخطورة**: **Low** — النتيجة البصرية مقبولة، لكنها تخالف نمط استخدام theme tokens.

### 5.4 Header — إعادة تعريف mobileLinkVariants داخلياً

- **المشكلة**: `mobileLinkVariants` معرّف في Header.tsx (السطور 39-47) ولا يُعاد استخدامه. لو كان يحتاج لمشاركته مع مكونات أخرى، لكان أفضل في ملف motion.ts.
- **الخطورة**: **Low**

---

## 6. خطة التطوير (Visual Overhaul) vs الواقع

الملف: `docs/superpowers/plans/2026-06-26-smart-menu-visual-overhaul.md`

### 6.1 الملفات التي كان يفترض إنشاؤها ولم تُنشأ

| الملف المطلوب | الحالة |
|--------------|--------|
| `PhoneShowcaseSection.tsx` | غير موجود |
| `StatsSection.tsx` | غير موجود |
| `DisplayCards.tsx` | غير موجود |
| `CTASection.tsx` | غير موجود |

### 6.2 الملفات التي كان يفترض حذفها ولم تُحذف

| الملف المطلوب حذفه | الحالة |
|-------------------|--------|
| `TestimonialsSection.tsx` | موجود (HomePage.tsx:83) |
| `ShowcaseSection.tsx` | موجود (HomePage.tsx:30) |
| `ClientsSection.tsx` | موجود (HomePage.tsx:84) |

### 6.3 Steps من الخطة لم تنفذ

- **Step 1 (Task 1)**: "Purge blue from globals.css" → لم ينفذ. badge.tsx لا يزال لديه blue variant.
- **Step 2 (Task 1)**: "Fix badge.tsx — replace blue with gold" → لم ينفذ. `src/components/ui/badge.tsx:24`.
- **Step 6 (Task 1)**: "Verify zero blue remains" → يفشل الآن وجود `badge.tsx:24` و `Confetti.tsx:5`.
- **Task 2 Step 1**: "Delete ScrollStorytelling, Partners, Testimonials, Pricing" → تم حذف ScrollStorytelling و PartnersSection و PricingSection ولكن TestimonialsSection لم يُحذف.
- **Task 2 Step 2**: "Rewrite HomePage.tsx with 7 sections" → لم ينفذ. HomePage.tsx لا يزال بالشكل القديم مع 9 أقسام (بما في ذلك stats في منتصف الصفحة).
- **Task 3**: "Rebuild Hero — Typographic, No Phone" → لم ينفذ. HeroSection.tsx لا يزال يحتوي على Phone mockup (السطور 81-100).
- **Task 4**: "Create Phone Showcase — Standalone Full-Viewport Section" → لم ينفذ.
- **Task 5**: "Uniform Visual Rhythm — Consistent Section Templates" → لم ينفذ. لا يوجد `StatsSection.tsx` أو `DisplayCards.tsx`.
- **Task 6**: "Motion System — Cinematic Timing" → لم ينفذ. الحركات لا تزال بنفس التوقيت (springGentle, springDefault).
- **Task 7**: "QA + Playwright" → لم ينفذ (حسب الملفات الموجودة).
- **Task 8**: "Deploy to Vercel" → لم ينفذ.

### 6.4 جوهر التعارض

- **الخطة تتحدث عن "gold" والكود يستخدم "orange"**. لا يوجد `--gold` في globals.css. نظام الألوان الحالي هو `orange (oklch 0.55 0.19 45)` وليس ذهبياً.
- **الخطة تتحدث عن 7 أقسام في HomePage، الواقع 9 أقسام**.
- **الخطة تتحدث عن هيرو طباعي بدون هاتف، الواقع هيرو مع هاتف**.
- **الخطورة**: **Critical** — الخطة كاملة لم تنفذ أو نُفذت بشكل جزئي جداً.

---

## 7. ملخص الخطورة

| الخطورة | العدد | التفاصيل |
|---------|-------|----------|
| **Critical** | 2 | events.ts مفقود (البنية الأساسية لـ SSE موثقة خطأ)؛ خطة التطوير بأكملها لم تنفذ |
| **High** | 3 | FloatingWhatsApp double render؛ LivePaymentToast و StarRating مفقودان رغم ذكرهما؛ |
| **Medium** | 5 | Testimonials/ClientsSection تكرار؛ useMe ميت؛ badge.tsx blue لم يُصلح؛ Confetti blue؛ plan steps غير منفذة |
| **Low** | 5 | `src/actions/` غير موجود؛ video/ توصيف خاطئ؛ radius sm>md غير اعتيادي؛ FeaturesSection neutral-950؛ font families كثيرة |

---

## 8. خلاصة

1. **PROJECT_ARCHITECTURE.md غير دقيق**: يذكر ملفات غير موجودة (events.ts, LivePaymentToast.tsx, StarRating.tsx, actions/) ويخطئ في أعداد المستهلكين (FloatingWhatsApp).

2. **خطة التطوير (Visual Overhaul) لم تُنفذ بالكامل**: من 8 مهام رئيسية، تقريباً 7 لم تنفذ. بعض الملفات المحذوفة حسب الخطة لا تزال موجودة، والمطلوب إنشاؤها لم يُنشأ.

3. **تكرار وظيفي**: TestimonialsSection + ClientsSection نفس الهدف بأسلوبين مختلفين. FloatingWhatsApp يُستدعى مرتين.

4. **كود ميت**: useMe hook (820 بايت) بدون أي مستهلك.

5. **نظام التصميم مُتّسق (orange/OKLCH) لكنه يختلف مع الخطة (gold)**. هذا تعارض يحتاج توضيحاً — هل orange هو المعتمد أم gold؟
