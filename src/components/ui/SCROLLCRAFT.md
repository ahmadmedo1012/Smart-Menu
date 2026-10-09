# ScrollCraft Integration — دليل المكونات

## نظرة عامة

هذا المجلد يحتوي على مكونات React متخصصة مدمجة من [scroll-craft](https://github.com/nateherkai/scroll-craft) لمحاكاة تأثيرات scroll-driven animations.

## المكونات المُدمجة

<!-- r93-W2a (U4): حُذف useScrollProgress و KineticText (كود ميت بلا مستورد واحد —
     تأكيد knip وفحص rg) فأُزيلت قسماهما من هذا الدليل. -->
<!-- r121-F-2: حُذف StaggeredReveal كذلك (صفر مواضع استخدام؛ الفحص المزدوج
     للجولتين 93 و121) — نمط التتابع لكل طفل يُكتب اليوم داخل مستهلكه. -->
<!-- r132 (A3 §2): حُذف ScrollParallax و ClipPathReveal كذلك (صفر مواضع استخدام
     حية — الفحص المزدوج للجولتين 121 و132)؛ بقيت ScrollReveal وحدها من الحزمة. -->

### 1. `ScrollReveal`
Reveal animation يعمل مرة واحدة عند دخول العنصر للـ viewport.

```tsx
import { ScrollReveal } from "@/components/ui/scroll-reveal"

<ScrollReveal y={24} delay={100}>
  <h2>عنوان يُظهر تدريجياً</h2>
</ScrollReveal>
```

## القيود والتحسينات

### Mobile / Performance
- جميع المكونات تستخدم `requestAnimationFrame` للأداء الأفضل.

### Accessibility
- جميع المكونات تحترم `prefers-reduced-motion`.
- استخدام `will-change` مع `transform` و `opacity` فقط للأداء.

## أمثلة من scroll-craft الأصلية

| scroll-craft device | المكون المُدمج |
|---|---|
| `data-sc-in` (fire-once reveal) | `<ScrollReveal>` |
| `data-sc-stagger` | (محذوف r121 — يُكتب داخل المستهلك) |
| `data-sc-parallax` | (محذوف r132 — صفر استخدام) |
| `data-sc-reveal` | (محذوف r132 — صفر استخدام) |
| `data-sc-cue` | مدمج في `ScrollReveal` |

## التوافق

- ✅ RTL (Arabic)
- ✅ Reduced Motion
- ✅ Mobile (auto-disable parallax)
- ✅ Next.js 15 (App Router)
- ✅ Framer Motion
- ✅ Tailwind CSS 4
