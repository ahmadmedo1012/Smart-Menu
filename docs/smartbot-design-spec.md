# مواصفة تصميم SmartBot — المصدر المرجعي للجولة 95
> تاريخ الاستخراج: 2026-09-08 · المصدر: https://bot.smart-link.ly (تحليل HTML/CSS مباشر + لقطات VLM)
> الغرض: مطابقة شبه كلية لمظهر Smart Menu مع SmartBot. هذه المواصفة هي **مصدر الحقيقة الوحيد** — لا تحتاج الوكلاء لزيارة الموقع.
> لقطات مرجعية: `/home/z/my-project/download/r95-smartbot-ref/sb-*.png` (home/hero, features, steps, stats, faq-cta, pricing, login)

## 0. المبادئ الحاكمة
1. **داكن دائماً** (SmartBot بلا نمط فاتح إطلاقاً — `color-scheme: dark`).
2. **لهب برتقالي محترق** `#bc4700` كلون أساسي — ليس الكهرمان الفاتح.
3. **أسود أعمق من الحالي**: الخلفية `#010000` والبطاقات `#070503`.
4. **برتقالي نصّي أسطع** للـ accent النصي: `#df5a00` (مختلف عن primary!).
5. كل الألوان عبر **رموز CSS فقط** — يُمنع hardcode قيم في المكونات.
6. حركة هادئة راقية (dur 300-700ms، `--ease-smooth`, `--ease-out-quart`).

## 1. رموز الألوان الداكنة (الأصل من SmartBot حرفياً)
```css
:root {
  color-scheme: dark;
  --background: #010000;
  --background-radial: radial-gradient(ellipse 80% 50% at 50% -10%, #f3680f14, transparent 70%);
  --foreground: #ebe7e2;
  --card: #070503;
  --card-foreground: #ebe7e2;
  --popover: #060403;
  --popover-foreground: #ebe7e2;
  --primary: #bc4700;          /* اللهب — أزرار رئيسية، نقاط، شرائط */
  --primary-foreground: #f8f8f8;
  --ring: #bc4700;
  --accent: #bc470026;         /* 15% شفافية */
  --accent-foreground: #df5a00; /* برتقالي نصّي أسطع — أيقونات ونصوص مميزة */
  --secondary: #0c0806;
  --secondary-foreground: #a9a49e;
  --muted: #0c0806;
  --muted-foreground: #8c857d;
  --placeholder-text: #a59d95;
  --destructive: #e62b34;
  --border: #211c18;
  --input: #625c58;
  --success: #23a136;  --success-foreground: #f8f8f8;
  --warning: #ce9200;  --info: #348dcf;
  --success-soft: #23a13624;  --warning-soft: #ce920024;
  --info-soft: #348dcf24;     --destructive-soft: #e62b3424;
  --overlay: #0000008c;
  /* لوحة الطبخ الدافئة (مطابقة لأسماء Smart Menu الحالية) */
  --c-ember: #863800;   --c-flame: #bc4700;   --c-ash: #b3ada6;
  --c-ash-dim: #4b4743; --c-ash-pale: #15110d; --c-night: #140b06;
  --c-basil: #40a35c;   --c-saffron: #f0a646; --c-espresso: #1a130b;
  --c-bloom: #cf284b;
  /* شبكة + أسطح + زجاج */
  --grid-line: #bc47001f;
  --surface-sunken: #020101;
  --glass-bg: #06040285;        --glass-bg-strong: #0d0805ad;
  --glass-border: #bc47001a;    --glass-border-strong: #bc470038;
  --glass-shadow: 0 10px 40px #0000007a, inset 0 1px 0 #ffffff0f;
  --glass-shadow-lg: 0 16px 56px #00000085, inset 0 1px 0 #ffffff14;
  --shadow-sm: 0 1px 3px #0000004d, 0 1px 2px #00000038;
  --shadow-md: 0 4px 16px #00000059, 0 2px 4px #00000040;
  --shadow-lg: 0 12px 40px #0000006, 0 4px 8px #0000004d;
  --shadow-xl: 0 24px 60px #00000073, 0 8px 16px #00000059;
  /* حركات */
  --ease-out-quart: cubic-bezier(.165, .84, .44, 1);
  --ease-smooth: cubic-bezier(.16, 1, .2, 1);
}
```
**ملاحظة توافقية**: Smart Menu يستخدم `--orange`/`--accent-foreground` كأدوات Tailwind. بعد التبديل: `--orange` ≈ `#bc4700` (كأساس أزرار) والنصّي البرتقالي `text-orange`/`text-accent-foreground` يجب أن يظهر بأسطع `#df5a00` بحيث يحقق تباين AA على البطاقات الداكنة. **بوابة AA إلزامية** (انظر §7).

## 2. نظام الخطوط (متطابق أصلاً — تأكيد فقط)
- Cairo 400-800 (UI) · Readex Pro 300-700 (عناوين `--font-heading`) · Noto Naskh 400-700 (`.font-naskh` للـ Eyebrow).
- **إصلاح P1 من SmartBot** (يُنقل حرفياً): إضافة `:root{--font-cairo:"Cairo"}` داخل `public/fonts/fonts.css` — متغير بدون fallback يحل إلى undefined يجعل قاعدة font-family كلها invalid-at-computed-value-time فيسقط النص إلى Times New Roman.

## 3. مقياس الطباعة
| العنصر | المواصفة الحرفية |
|---|---|
| **h1 البطل** | `text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold leading-[1.15] tracking-tighter font-heading text-balance` (68px وزن 800!) |
| h2 قسم | `text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold leading-[1.25] tracking-tight text-balance` |
| h3 بطاقة بطل | `text-xl sm:text-2xl font-bold` |
| h3 بطاقة عادية | `text-base sm:text-lg font-bold` |
| p بطل | `text-lg md:text-xl leading-relaxed max-w-xl text-muted-foreground text-balance` |
| Eyebrow | `font-naskh text-2xs font-medium uppercase tracking-[0.18em] text-accent-foreground/90` + نقطة نابضة `size-1 bg-primary animate-pulse-dot` |
| أرقام إحصائية | `text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-bold leading-none` + لواحق (+/٪//7) بحجم `text-[1rem]` بلون accent |
| شارة صغيرة | `text-3xs font-bold px-2.5 py-1 rounded-full bg-primary text-white` |
| نص بطاقة | `text-sm sm:text-base text-muted-foreground leading-relaxed` |
| "اعرف المزيد" | `text-xs font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-accent-foreground` + سهم `lucide-arrow-up-right size-3 rtl:-scale-x-100` |

## 4. إيقاع التخطيط
- **الحاوية**: `max-w-[1220px] mx-auto px-4 sm:px-6` (الهيدر يضيف `lg:px-10`).
- **الأقسام**: `relative scroll-mt-20 py-16 sm:py-24 lg:py-28 overflow-hidden`.
- **رأس القسم**: `mb-14 sm:mb-20 text-center` + فاصل متدرج `mx-auto mt-6 w-16 h-[2px] rounded-full bg-gradient-to-r from-accent-foreground/0 via-accent-foreground to-accent-foreground/0`.
- **فواصل الهيدر العمودية**: `w-px h-5 bg-border`.

## 5. أنماط المكونات (كلاسات حرفية من SmartBot)
### 5.1 بطاقة عامة
```
rounded-2xl bg-card border border-border/50 p-5 sm:p-6
transition-[border-color,background-color,box-shadow] duration-500
hover:shadow-lg hover:shadow-accent-foreground/10 hover:border-accent-foreground/30
```
### 5.2 بطاقة bento بطل (بحد 2×2)
```
lg:col-span-2 lg:row-span-2 rounded-2xl bg-card border border-accent-foreground/30 p-5 sm:p-6
bg-gradient-to-br from-accent-foreground/[0.04] via-card to-card
```
+ شارة زاوية: `absolute -top-20 -end-20 size-48 rounded-full bg-accent-foreground/10 blur-3xl` (توهج خلفي)
+ شارة "الأكثر طلباً": `absolute top-4 end-4 text-3xs font-bold px-2.5 py-1 rounded-full bg-primary text-white flex items-center gap-1` + أيقونة `lucide-zap size-2.5 fill-white`
+ أسفل البطاقة: `mt-5 pt-4 border-t border-accent-foreground/10 grid grid-cols-3 gap-2` (3 إحصائيات مصغرة)
### 5.3 شبكة bento
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-3 sm:gap-4
```
### 5.4 شريحة أيقونة
```
size-10 sm:size-11 rounded-xl flex items-center justify-center mb-4
bg-accent-foreground/10 group-hover:bg-accent-foreground/15 group-hover:scale-110
transition-all duration-300  + أيقونة size-5 text-accent-foreground
```
(لا ring — أنظف من الحالي)
### 5.5 دائرة خطوة (How-it-works)
```
توهج: absolute inset-0 size-16 rounded-full bg-accent-foreground/20 blur-xl
     group-hover:blur-2xl group-hover:bg-accent-foreground/30 transition-all duration-700
الجسم: relative size-16 rounded-full bg-gradient-to-b from-accent-foreground/25 to-accent-foreground/10
     border border-accent-foreground/30 group-hover:border-accent-foreground/50
     group-hover:scale-105 transition-all duration-500 shadow-lg shadow-accent-foreground/10
الرقم: absolute -top-2 -end-2 size-6 rounded-full bg-primary text-white flex
     items-center justify-center shadow-md + span text-3xs font-bold
```
+ خط واصل بين الخطوات: `hidden lg:block absolute top-16 start-[calc(16.67%+2rem)] end-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-accent-foreground/30 to-transparent`
### 5.6 شريط تنقل سطح المكتب (داخل هيدر)
```
حاوية حبّة: relative flex items-center rounded-full bg-card/40 backdrop-blur-sm
           border border-border/40 p-1 shadow-sm
رابط: relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-200
      rounded-full text-foreground/70 hover:text-foreground
فاصل: w-px h-5 bg-border بين الروابط
```
### 5.7 تبديل شهري/سنوي (التسعير)
```
inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur
```
+ تبديل السعر بأنيميشن `price-swap-in` عند تغيير الفترة.
### 5.8 زر رئيسي
```
group/btn relative inline-flex shrink-0 items-center justify-center rounded-lg border
font-sans font-bold ...  (حافظ على بنية زر Smart-Menu الحالية بقيم اللهب الجديدة)
```
### 5.9 كشف التمرير (Reveal)
SmartBot يستخدم خصائص مخصصة `--rv-x, --rv-y, --rv-delay, --rv-dur` + كلاسات `.reveal`/`.reveal-scale` بملاحظة IntersectionObserver — Smart Menu لديه `ScrollReveal` مكافئ: **حافظ عليه** وحاذ قيم y=16/24/32px وdelay 0-350ms.

## 6. الحركات (keyframes من SmartBot)
`breath` (تنفس توهج) · `pulse-dot` (موجود) · `price-swap-in` (تبديل سعر) · `wipe-up` · `slide-up` · `fade-in` (+150ms متدرج) · `scale-in` · `float` · `shimmer` · `message-draw` · `copy-wiggle` · `upload-fly`
أضف الناقص فقط — لا تكرر الموجود.

## 7. بوابة الوصولية (إلزامية — درجات الجولة موجودة)
- كل نص برتقالي على بطاقة داكنة (#070503) يجب ≥ 4.5:1 (AA). `#df5a00` على `#070503` ≈ 5.6:1 ✓ — احسب قبل أي تعديل.
- `--muted-foreground: #8c857d` على `#070503` ≈ 5.7:1 ✓
- `--primary: #bc4700` مع نص أبيض ≈ 4.9:1 ✓ (أزرار)
- إن أخفق أي تقرير axe: عدّل الإضاءة (lightness) بأدنى هامش يحفظ درجة اللون (hue 35-45).

## 8. ما يجب عدم تغييره (خط أحمر)
- المحتوى النصي والوظائف والـ APIs وقاعدة البيانات والاختبارات المنطقية.
- بنية النمط الفاتح `.light` وقارئ التباين العالي (يبقيان يعملان — لكن الداكن هو الافتراضي الجديد).
- بنية ملفات الاختبارات — أي فشل يجب إصلاحه لا تجاهله.
- الشعار والأيقونات والصور الحالية للمطاعم.
- عزل ISR/الكاش/الأمان — كل التغييرات عرضية فقط (CSS/JSX).

## 9. قرار الثيم الافتراضي
`defaultTheme="dark"` بدل `"system"` في ThemeProvider العام — **أول تغيير وأكثره تأثيراً** (المستخدم حالياً يرى الكريمي الفاتح). المبدأ: أول ما يفتح الزائر الموقع يرى نفس انطباع SmartBot الداكن.
