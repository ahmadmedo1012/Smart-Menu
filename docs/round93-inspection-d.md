# تقرير تفتيش جودة الواجهة والوصولية — الجولة 93 (الوكيل 1-d)

**التاريخ:** بداية الجولة 93 · **النطاق:** الكود المحلي HEAD (ما بعد ترميم البيئة) · **المنهج:** فحص ملف:سطر يدوي عبر ripgrep/قراءة مباشرة + تشغيل `knip` (5.46.4) للتثبيت من الكود الميت. لا تعديلات على الكود.

---

## جدول الملخص

| # | الخطورة | الموقع | المشكلة | المقترح |
|---|---------|--------|---------|---------|
| 1 | **P2** | `globals.css:27` مقابل `globals.css:156` | تعريفان متضاربان لـ `--font-heading`: ‎@theme inline يضع Readex Pro أولًا، و`:root` (لاحقًا في الترتيب) يضع Cairo أولًا → h1-h5 (التي تقرأ `var(--font-heading)` عبر globals.css:715/721/728) ترسم بـ **Cairo** بينما أداة `font-heading` تتبع قيمة ‎@theme (Readex Pro) — انقسام خط العناوين + شروح r88-A2 في `(protected)/layout.tsx:98-104` صارت غير صحيحة | وحّد القيمة (اختر Readex Pro أولًا في الموضعين أو Cairo) واحذف النسخة الثانية |
| 2 | **P2** | `menu/[slug]/print/page.tsx:48-147` | صفحة الطباعة تعيد تصيير `<html><head><body>` كاملة **متداخلة داخل** الـ root layout للمجموعة (public) الذي يصيّر html/body أصلًا → DOM غير صالح (المتصفح يتجاهل الوسوم الداخلية بصمت) + رأس التطبيق كامل (preload الخطوط، manifest، boot script) يُشحن لصفحة لا تستفيد منه | أعِد الصفحة كـ `<div>` + احتفظ بـ `<style>` الطباعة، أو امنح print/ مساره الخاص (route group منفصل بلا layout) |
| 3 | **P2** | `NewOrdersBar.tsx:71` · `OwnerCharts.tsx:256,266` · `MenuPageClient.tsx:249` · `api/loyalty/redeem/route.ts:94` · `SubscribeForm.tsx:265` | قوالب جمع عربية مكسورة بعدد ديناميكي ثابت الشكل: «تم قبول ١ طلبات»، «٣ طلب»، «٢ صنف» — بينما المكتبة `arabic-plural.ts` جاهزة وتُستخدم في 5 مواضع فقط | مرّر هذه المواضع عبر `getArabicPlural` (نمط `cartCountPhrase` في CartSlideOver.tsx:25-36) |
| 4 | **P2** | `HeroSection.tsx:130` · `FinalCTASection.tsx:36` | `trustCount.toLocaleString("ar")` يُخرج أرقامًا هندية (١٢٣) وفاصلًا محليًا، بينما سياسة المنصة كلها أرقام غربية (`format.ts:1-13`) — يقاس الرقم أيضًا على السيرفر (initialStats تُمرر من `(public)/page.tsx:31`) ثم على العميل → خطر mismatch محتوب عبر ICU عند ≥1000 | استبدل بـ `toArabicNumber(trustCount)` (متوافق مع StatsSection.tsx:22) |
| 5 | **P2** | `globals.css:355` (`.light --orange`) + `PricingClient.tsx:132` · `ProviderPicker.tsx:53` · `MenuItemCard.tsx:276` · `ReviewSheet.tsx:317` | `--orange` في الوضع الفاتح = oklch(0.55 0.19 45) — قاست جولتهم نفسها 4.47:1 على خلفية كريمية (تعليق HeroSection.tsx:126-128) — يُستخدم لنصوص صغيرة (10-12px) وعلى خلفيات مصبوغة `bg-orange/5` يخفض التباين أكثر → دون AA (4.5:1) | اظلم `--orange` في `.light` إلى ~0.50 أو استبدل النصوص الصغيرة بـ `text-ember` (نمط إصلاح round84 نفسه) |
| 6 | **P3** | `ui/sheet.tsx:58` | اتجاه انزلاق الـ Sheet الأفقي معكوس في RTL: `data-[side=right]:end-0` يرص الحاوية على الحافة اليسرى بينما `translate-x-[2.5rem]` (فيزيائي) يزيحها إلى الداخل → سلة المشتريات تظهر fade + انجراف 40px بدل الانزلاق من الحافة (الـ opacity يخفي الجزء الأكبر من الخلل) | أضف متغيرات `rtl:` معكوسة للـ translate (كما فعل `NewOrdersBar.tsx:90`) |
| 7 | **P3** | `owner/ItemDialog.tsx` (982 سطرًا) | الوحش **لم يُفكك** — الخطة (موجات r92) لم تُنفذ: نموذج + رفع/ضغط صور + محرر مجموعات الخيارات + غذائية/مسببات + شارات في ملف واحد، مستورد من `owner/menu/page.tsx:19` | فكّك إلى ModifierGroupsEditor / DietaryFields / ShowcaseFields / ItemFormCore |
| 8 | **P3** | `ItemDialog.tsx:594,854,909,941` · `SubscribeForm.tsx:350,362` | معرفات بـ backticks حرفية داخل سلاسل: `id={"`${fId}-status`"}` و `id={"`w-w-desc`"}` — بقايا تحويل template-literal خاطئ (تعمل بالصدفة لأن الطرفين متطابقان، ومعرفات span في ItemDialog غير مستخدمة أصلًا) | انزع الـ backticks؛ واربط عناوين الأقسام (الحالة/الشارات) بمجموعاتها عبر role=group/aria-labelledby |
| 9 | **P3** | `ui/VideoWrapper.tsx` (113) · `ui/kinetic-text.tsx` (161) · `hooks/useScrollProgress.ts` · `loading-announcer.tsx:55-72` · `globals.css:1007-1010,1056-1060` | كود ميت مؤكد بـ knip + فحص الاستيرادات: مكونان + hook + تصدير `useLoadingAnnouncement` + `@keyframes marquee`/`.animate-marquee` بلا مستخدم واحد (r92-D2 حذف سابقاتها وبقيت هذه) + `import {} from 'lucide-react'` فارغ في `CartSlideOver.tsx:5` | احذفها (سكربتات الجولات في knip بقية متوقعة/advisory) |
| 10 | **P3** | `iphone-mockup.tsx:73` | `aria-label={`iPhone mockup (${model})`}` — سلسلة إنجليزية تُقرأ على قارئ الشاشة في موقع البطل | عرّبها («هاتف تجريبي») أو اجعل المكون `aria-hidden` (زخرفي) |
| 11 | **P3** | `iphone-mockup.tsx:102-114` · `HeroSection.tsx:147-154` | خلفية هاتف البطل عبر CSS `background-image` — بلا preload/fetchpriority، تُكتشف بعد الـ hydration → ظهور متأخر pop-in للعنصر البصري المركزي | `<link rel="preload" as="image" href="/hero-phone.webp">` في layout العام |
| 12 | **P3** | `ShowcaseSection.tsx:36-43` | `priority` على `main21.webp` (122KB) وهو **تحت الطية** → ينافس LCP البطل على النطاق | انزع priority وأبقِ lazy |
| 13 | **P3** | `ui/Eyebrow.tsx:7` + `globals.css:635` | شريحة البطل Eyebrow فوق الطية تستخدم `.font-naskh` (Noto Naskh) بلا preload → منيو الوجه الأول يتبدل خطه بعد التحميل | أضف preload رابعًا أو حوّل Eyebrow إلى Cairo |
| 14 | **P3** | `Header.tsx:203` · `not-found.tsx:33` · `(public)/layout.tsx:22` | ثلاث تسميات علامة في الواجهة: «الربط الذكي» / «Smart Menu» / «سمارت مينيو» | وحّد الاستراتيجية (عربي أساسي + لاتيني ثانوي) |
| 15 | **P3** | `ReferralCard.tsx:39` · `ShareAfterOrder.tsx:57` · `owner/loyalty/page.tsx:186` | `const origin = typeof window !== 'undefined' ? location.origin : ''` بمستوى التصيير: السيرفر يصيّر href فارغًا والعميل ممتلئًا → mismatch سمة href عند الـ hydration (يُرقَّع بصمت في prod) | نمط `mounted` (كما في ThemeToggle.tsx:21) أو setState داخل useEffect |

### نقاط إيجابية موثّقة (لا تحتاج إجراء)
- **RTL نظيف استثنائيًا:** `ml-/mr-/pl-/pr-` = **صفر** استخدامات؛ الخصائص المنطقية ms-×801, me-×36, ps-×10, pe-×11, start-×36, end-×61, border-s×24, text-start×20. `html dir="rtl" lang="ar"` في كلا الجذرين ((public)/layout.tsx:71, (protected)/layout.tsx:77) + manifest.json/offline.html.
- `text-left/right` (28 موقعًا) كلها تقريبًا مدخلات `dir="ltr"` مقصودة (هواتف/توكنز) — ممارسة صحيحة.
- h1 البطل SSR (r92-A7) حاضر ومُختبر (tests/unit/r92-hero-ssr.test.ts) + h1 المنيو = اسم المطعم (MenuHero.tsx:102).
- جمع السلة r92-A9 شغّال (CartSlideOver.tsx:25-36 + اختبار r92-cart-aria-plural.test.ts).
- a11y متين: skip-link عربي بتركيز مرئي (كلا الجذرين)، trap تركيز يدوي في درج الموبايل (StickyMenuHeader.tsx:30-63)، combobox ARIA بلوحة مفاتيح (MenuToolbar.tsx:136-163)، نمط toggle موثّق APG (CategoryTabs.tsx:103-108)، `MotionConfig reducedMotion="user"` + media queries (globals.css:677,1167) + 30+ useReducedMotion، 80+ aria-label عربية، LoadingAnnouncer في 20+ صفحة، أهداف لمس 44/48px، تعليقات إصلاحات تباين موثقة (trash icon round91، ember/saffron round84).
- Hydration آمن: Math.random داخل useEffect فقط (Confetti.tsx:42-71)، `useState(Date.now())` في admins/page.tsx:60 لا يُصيّر قبل جلب البيانات، `sevenDaysAgo()` صحيحة ISR (menu/[slug]/page.tsx:30-36)، كل صفحات التواريخ client-side بعد الجلب.
- CSP اليوم سليمة: style-src يتضمن unsafe-inline في الفروع الثلاثة (proxy.ts:116-117,163-164) → الـ 123 `style={{}}` (63 ملفًا، أغلبها قيم ثابتة للأيقونات) لا تكسر شيئًا الآن — عدّها مرجعًا لتأجيل r92-A8. dangerouslySetInnerHTML في 4 مواضع مشروعة (boot scripts + JSON-LD مهرّب).

---

## التفاصيل

### 1) RTL — الصحة العامة

**المصدران الجذريان** يضبطان `dir="rtl"` و`lang="ar"`:
- `src/app/(public)/layout.tsx:71` — `<html lang="ar" dir="rtl" suppressHydrationWarning>`
- `src/app/(protected)/layout.tsx:77` — نفس النمط (مشروع root-layouts متعدد: لا يوجد app/layout.tsx؛ not-found.tsx:24-27 يوثّق أنه خارج كلا الجذرين).

**العدّ (rg عبر src/، tsx فقط):**

| فئة | العدد | الحكم |
|---|---|---|
| `ml-` / `mr-` / `pl-` / `pr-` | 0 / 0 / 0 / 0 | ممتاز |
| `ms-` | 801 | ممتاز |
| `me-` / `ps-` / `pe-` | 36 / 10 / 11 | جيد |
| `start-` / `end-` | 36 / 61 | جيد |
| `border-s` / `border-e` | 24 / 3 | جيد |
| `text-start` / `text-end` | 20 / 11 | جيد |
| `text-left` / `text-right` | 28 | 24+ منها مدخلات `dir="ltr` مقصودة (إثبات: OrderDialog.tsx:383-385, TelegramConfigSection.tsx:63, admin/settings/page.tsx:251…) |

**الحالات الخاصة المفحوصة:**
- `left-1/2 -translate-x-1/2` (تمركز أفقي) — RTL-آمن في dialog.tsx:60, PricingClient.tsx:249, GalleryCarousel.tsx:205,296, FeaturedShowcase.tsx:324, FinalCTASection.tsx:24, HeroSection.tsx:52.
- سطور فاصلة ذا اتجاهين `bg-gradient-to-l` + `bg-gradient-to-r` (MenuHero.tsx:114-116) — تناظر زخرفي مقصود.
- HowItWorksSection.tsx:42 يعالج RTL صراحةً (`rtl:left-auto rtl:right-[...]`) ✓.
- الأسهم: FeaturedRestaurantsSection.tsx:232 (`rtl:rotate-180`) ✓، GalleryCarousel.tsx:174,185 (`rtl:-scale-x-100`) ✓.
- **الاستثناء الوحيد الجدير بالإصلاح:** sheet.tsx:58 (الجدول #6) — التحويلات الفيزيائية `translate-x-±[2.5rem]` لا تنعكس مع `end-0` المنطقي → انزلاق Drawer السلة (وReviewSheet) يتدهور إلى fade+انجراف. الحوارات المركزية غير متأثرة.
- `globals.css:703-711`: حارس `letter-spacing: 0 !important` على العربية بكل tracking — حماية ممتازة من كسر الوصلات.

### 2) العربية و i18n

**مكتبة الجمع** `src/lib/arabic-plural.ts` (مبنية على `Intl.PluralRules('ar')` حالات ست): مستوردة في 5 مواضع فقط — order-status.ts:24، CartSlideOver.tsx:14، plan-comparison.ts:7، PlanSelector.tsx:9، OwnerOrdersList.tsx:8. الاختبارات موجودة (arabic-plural.test.ts).

**الجمع المكسور المتبقي (قوالب ثابتة الشكل):**
| الموقع | القالب | الكسر عند |
|---|---|---|
| NewOrdersBar.tsx:71 | `تم قبول ${N} طلبات` | N=1 «١ طلبات»، N=11 «١١ طلبات» |
| OwnerCharts.tsx:256 و266 | `${N} طلب` | N=3-10 «٣ طلب» (يريد «طلبات») |
| MenuPageClient.tsx:249 | `تم العثور على ${N} صنف` | N=2-10 |
| api/loyalty/redeem/route.ts:94 | `رصيدك: ${N} طلبات` | N=11+ |
| SubscribeForm.tsx:265 | `${N} منيوهات` | N=1-2 |

المقترح: دالة وسيطة واحدة (نمط cartCountPhrase) تُصدَّر من arabic-plural.ts أو من مكان مشترك وتُستدعى في هذه المواضع.

**الأرقام والعملة:**
- `toArabicNumber` (format.ts:8-13) اسمه مضلل — هو no-op يُبقي الأرقام الغربية (0-9) وفق سياسة موثقة. متسق عبر formatPrice (` د.ل`) والتواريخ (شهور عربية + أرقام غربية).
- **الشذوذ الوحيد:** HeroSection.tsx:130 و FinalCTASection.tsx:36 بـ `toLocaleString("ar")` → أرقام هندية (١٢٣). بما أن `(public)/page.tsx:31` يمرر initialStats إلى HomePage (client component يُصيَّر SSR)، تُقرأ السلسلة على Node ثم على المتصفح — تطابقا icu هما اليوم، لكن ≥1000 يُدخل فاصل آلاف محليًا (U+066C) قد يختلف بين متصفح/Node → خطر hydration + خلط بصري مع StatsSection.tsx:22 الغربية في نفس الصفحة.
- العملة: `formatPrice` موحّد (format.ts:61-66)؛ قسيمة البطل `32.00 د.ل` مع `dir="ltr"` (HeroSection.tsx:180) ✓.

**الإنجليزي الظاهر للمستخدم (اجتثاث كامل):**
- Header.tsx:203 «Smart Menu» — علامة تجارية (مقبول).
- iphone-mockup.tsx:73 `iPhone mockup (15-pro)` — a11y إنجليزي (جدول #10).
- owner/restaurants/page.tsx:172 placeholder="al-jabal" — مدخل slug لاتيني بطبيعته (مقبول).
- not-found.tsx:33 «سمارت مينيو» — عربي لكن بvariant ثالث للعلامة (#14).
- الاستثناءات الأخرى (LoyaltySettings.tsx:106 'Save failed'…) سلاسل داخلية تُلتقط وتُعرض عربية عبر get-error-message — ليست user-facing.

### 3) الوصولية (a11y)

- **skip-link:** موجود في كلا الجذرين (`(public)/layout.tsx:119-124`، `(protected)/layout.tsx:112-117`) — «تخطى إلى المحتوى الرئيسي» مع focus:not-sr-only وأنماط تركيز كاملة، و`<main id="main-content">`.
- **الحوارات و trap التركيز:** dialog.tsx مبني على Base UI (`modal` في dialog.tsx:11 يفعّل trap/return-focus أصليًا)، `aria-modal="true"` (dialog.tsx:57)، زر إغلاق 48×48 + aria-label + sr-only (dialog.tsx:69-82). Sheet نفس المكتبة (sheet.tsx:53-55). الدرج اليدوي StickyMenuHeader.tsx:31-63 ينفذ trap يدويًا كاملًا (Tab/Shift+Tab/Escape + focus أول عنصر).
- **لوحة المفاتيح:** combobox البحث (MenuToolbar.tsx:139-163: Arrow/Enter/Escape + aria-activedescendant + scrollIntoView بلا سرقة تركيز)؛ CategoryTabs نمط group/aria-pressed موثّق بقرار APG (103-125)؛ أسهم المعرض focus-visible:opacity-100 (GalleryCarousel.tsx:163-186).
- **reduced-motion:** MotionProvider.tsx:15 `reducedMotion="user"` جذر التطبيق + globals.css:677-686 (تقييد 0.2s) و1167 (`animate-marquee: none`) + `motion-reduce:hidden` للكرات (MenuHero.tsx:47) + ~30 مكوّنًا بـ useReducedMotion. not-found.tsx:44-48 يعوّض غياب الجذر بمزوده الخاص (موثق round88-E8).
- **التباين:** الرصيد الحرج = `--orange` الفاتح (#P2 #5). الإصلاحات السابقة موثقة inline: ember/saffron للشارة (HeroSection.tsx:126-128)، trash /70 (CartSlideOver.tsx:180-188)، muted-foreground/95→كامل (StatsSection.tsx:54-57).
- **الثغرات الصغيرة:** معرفات span بلا ارتباط لمجموعات أزرار الحالة/الغذائية/مسببات في ItemDialog (594/854/909/941 — عناوين بصرية بلا Label/aria)؛ نقاط المعرض خارج اللايت بوكس بلا «من N» (GalleryCarousel.tsx:220 مقابل 128).

### 4) مخاطر Hydration

| الموقع | التقييم |
|---|---|
| Footer.tsx:109 `new Date().getFullYear()` | آمن عمليًا (سنة السيرفر/العميل متطابقة إلا عند منتصف الليل رأس السنة) — مقبول |
| Confetti.tsx:55-65 | Math.random داخل useEffect ✓ |
| admins/page.tsx:60 `useState(()=>Date.now())` | todayMs لا يُصيَّر قبل وصول البيانات (fetch في useEffect) ✓ |
| owner/menu/page.tsx:245 | Math.random داخل معالج حدث (اختيار أيقونة) ✓ |
| menu/[slug]/page.tsx:34-36 | `sevenDaysAgo()` داخل دالة التصيير — صحيح ISR (كل revalidation تُخبز cutoff جديدًا، موثق) ✓ |
| HeroSection.tsx:130 / FinalCTASection.tsx:36 | `toLocaleString("ar")` يُقرأ SSR+Client — **خطر متوسط** (P2 #4) |
| ReferralCard.tsx:39 / ShareAfterOrder.tsx:57 / owner/loyalty/page.tsx:186 | `window.location.origin` بمستوى التصيير بلا mounted-guard → href فارغ SSR مقابل ممتلئ client (P3 #15) |
| MenuToolbar.tsx:186-190 | `suppressHydrationWarning` للـ autofill — موثق ومقصود (round80) ✓ |
| window على مستوى الوحدة | لا وجود له ✓ (كل الاستخدامات داخل حراس/effects) |
| التواريخ في القوائم | كل الصفحات المعنية 'use client' تجلب بعد الـ mount → formatDate يعمل بمنطقة العميل فقط ✓ (لا timezone drift) |

### 5) CSP

- الفروع الثلاثة في proxy.ts تسمح `style-src/style-src-elem 'unsafe-inline'` → **لا كسر اليوم**.
- `style={{...}}`: **123** في 63 ملفًا — 45+ منها في ui/ (أيقونات SVG بقيم ثابتة). للتفعيل المستقبلي لـ nonce للأنماط (r92-A8 مؤجلة) هذه هي القاعدة المطلوب تقليصها: القيم الثابتة → Tailwind arbitrary props/CSS vars.
- `<style href="r92-hero-entrance" precedence="high">` (HeroSection.tsx:36-38): React 19 hoisted stylesheet — يُشحن في SSR (مختبر) ومسموح حاليًا؛ سيتطلب ترفيقًا عند تشديد style-src.
- سكربتات مضمنة: HIGH_CONTRAST_BOOT_SCRIPT بـ nonce في المحمي ((protected)/layout.tsx:109) وبلا nonce في العام — متوافق مع CSP الفرع العام (unsafe-inline) ✓. JSON-LD مهرّب `<` (menu/[slug]/page.tsx:322) ✓. لا سكربت خارج Next (Vercel Analytics مصرح به va.vercel-scripts.com) ✓.

### 6) LCP / الأداء البصري

- **h1 البطل (LCP نصي):** r92-A7 مطبق — plain h1 + keyframe CSS تبدأ مرئية (HeroSection.tsx:93-102)، مُثبَّت باختبار. entrance عبر `<style>` hoisted — بلا بوابة JS ✓.
- **شعار المنيو (LCP صفحة المنيو):** priority + fetchPriority="high" + sizes مضبوطة على الصندوق 112/128px (MenuHero.tsx:79-89) ✓ بلا CLS (aspect square).
- **هاتف البطل:** `background-image` عبر style (iphone-mockup.tsx:102-114) — بلا preload → **تأخر اكتشاف** (جدول #11). أبعاد ثابتة aspectRatio ✓ بلا CLS.
- **main21.webp:** width/height صريحة (1536×1024) ✓ لكن priority تحت الطية (#12) — 122KB تنافس البطل.
- **الخطوط:** cairo-arabic + readex-pro preload في الجذرين ✓؛ font-display: swap ✓؛ أوزان متغيرة بملف واحد لكل subset (fonts.css: `font-weight: 400 800` / `300 700`) — لا طلبات أوزان منفصلة. **رحلة الهبوط الأولى ≈ 4 ملفات woff2:** المسبقان + cairo-latin (الأرقام الغربية في نفس الصفحة، يُكتشف عبر CSS) + noto-naskh-arabic (Eyebrow فوق الطية، بلا preload → #13). تخزين رأس السنة immutable مفعّل (next.config.ts:121-131).
- CLS عام: OptimizedImage بعلب aspect-ratio + sizes لكل موقع (round88-A2) ✓.

### 7) الكود الميت / الوحوش

- **ItemDialog.tsx = 982 سطرًا** (المخطط r92 لتفكيكه **لم يُنفَّذ**) — لا يزال ملفًا واحدًا: نموذج + صور + مجموعات معدِّلات + غذائية/مسببات + شارات. مُستورد من owner/menu/page.tsx:19 وowner/menu/types.ts:16.
- **knip (تشغيل فعلي) — Unused files:** VideoWrapper.tsx (113 سطرًا)، kinetic-text.tsx (161)، useScrollProgress.ts + 21 سكربت جولات (متوقع/advisory).
- يدويًا: `useLoadingAnnouncement` (loading-announcer.tsx:55-72) بلا مستورد؛ `@keyframes marquee` + `.animate-marquee` (globals.css:1007-1010, 1056-1060, 1174) بلا استخدام؛ `import {} from 'lucide-react'` فارغ (CartSlideOver.tsx:5).
- r92-D2 (حذف 60 تصديرًا ميتًا في landing-data) مؤكد: الملف الآن 65 سطرًا يصدّر STEPS + fetchPublicStats فقط — كل ما تبقى له مستوردون ✓.
- admin/KpiCard.tsx ليس تكرارًا — re-export لـ shared/KpiCard (سطر 6) ✓.
- الملفات الكبيرة الأخرى: PaymentDialog.tsx 598، OrderDialog.tsx 585، globals.css 1218 — مقبولة.

### 8) اتساق التصميم

- **انقسام خط العناوين** (P2 #1) — أهم ثغرة اتساق: h1-h5 مقابل أداة font-heading (DialogTitle/SheetTitle تستعملان `font-heading` — dialog.tsx:131, sheet.tsx:111).
- أزرار: 155 زر خام مقابل 6 استخدامات buttonVariants — معظم الخام أزرار أيقونية زجاجية صغيرة متسقة العائلة (size-11/48px + glass)؛ نمط `h-11 rounded-xl mt-1.5` لإدخالات لوحة الإدارة يتكرر ~15× — مرشح تجريد `AdminInput`.
- أنماط زجاجية متكررة: `glass-card` ×17 و`min-h-11 rounded-full` ×6 — تحت السيطرة.
- dark mode: لا تعارضات منهجية — أزواج light/dark صريحة حيث يلزم (bg-white/70 dark:bg-card/70…).
- تسميات العلامة: 3 صيغ (#14).
- متناهية الصغر: `text-orange dark:text-orange` تكرار بلا أثر (CategoryTabs.tsx:193)؛ `${peak.count}` خام مقابل toArabicNumber في نفس الملف (OwnerCharts.tsx:256 مقابل 266).

---

## الإجراءات التالية المقترحة (مرتبة)

1. **P2 ×5:** إصلاح الجدول 1-5 (font-heading، DOM صفحة الطباعة، الجمع المكسور، toLocaleString، تباين --orange الفاتح).
2. **P3 مجموعة الكود الميت:** حذف VideoWrapper/kinetic-text/useScrollProgress/useLoadingAnnouncement/marquee + نزع backticks المعرفات + حذف الاستيراد الفارغ.
3. **P3 الأداء البصري:** preload لـ hero-phone + naskh، ونزع priority عن main21.
4. **P3 تفكيك ItemDialog** (يمكن جدولته كموجة مستقلة — الوحش الوحيد الباقي).
5. **P3 sheet RTL** + توحيد العلامة + mounted-guards للـ origin.
6. تشغيل knip كجزء دوري advisory (الكونفق جاهز) لالتقاط الميت مبكرًا.

**ملاحظة منهجية:** الحكم على انقسام `--font-heading` (البند 1) مبني على ترتيب cascade للتصريحين الموجودين في globals.css؛ التحقق القطعي يتطلب بناء production ثم فحص CSS المولَّد (لا يوجد .next مبني في البيئة الحالية) — أُدرج خطوة التحقق ضمن المقترح.
