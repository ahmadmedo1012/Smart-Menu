# لقطات الشاشة — Smart-Menu · Screenshots

> أصول مُوثّقة تحت إدارة الإصدارات (دكت 8 r132 W3-3) — مأخوذة من
> `download/shots-r130/` (دفعة r130) بقصّ أعلى 1440×900 وحفظها webp أقل من
> 300KB لكل ملف. المسارات هنا نسبية من جذر المستودع.
> Versioned assets (r132 W3-3), cropped from the r130 capture batch at
> 1440×900 and exported as webp under 300KB each. Paths are relative to the repo root.

| الملف | المقاس | الحجم | التعليق |
|---|---|---|---|
| [`hero-light.webp`](hero-light.webp) | 1440×900 | 11KB | الصفحة الرئيسية بالوضع النهاري (cream/copper) — العنوان «منيو رقمي لمطعمك والطلبات تصلك على واتساب»، زر «ابدأ مجاناً»، وشريط الترحيب · Landing in light mode |
| [`hero-dark.webp`](hero-dark.webp) | 1440×900 | 11KB | الصفحة الرئيسية بالوضع الليلي (night/gold ‎`#070B16`/`#E9B44C`‎) — نفس الترتيب بالعكس · Landing in dark mode |
| [`login.webp`](login.webp) | 1440×900 | 14KB | صفحة دخول صاحب المطعم بالوضع الليلي — نموذج الدخول مع إطار بيانات الدخول التجريبية (ديمو «واحة») · Owner login (dark) with the demo-credentials box |

## المصدر · Source

- القص: أعلى إطار العرض (0–900px) من `smart-menu-landing-{light,dark}.png`
  و`smart-menu-inner.png` (خطوة `inner` في دفعة r130 = صفحة `/login`).
- صور أطباق المنيو التجريبي (28 صورة webp) تعيش في [`public/demo/`](../../public/demo/)
  وتُستخدم مباشرة من المعرض في `README.md` — لا نسخ مكررة.

## الاستخدام · Usage

```markdown
![الصفحة الرئيسية بالوضع النهاري](docs/screenshots/hero-light.webp)
```
