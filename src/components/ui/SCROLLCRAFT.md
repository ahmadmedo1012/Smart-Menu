# ScrollCraft Integration — دليل المكونات

## نظرة عامة

هذا المجلد يحتوي على مكونات React متخصصة مدمجة من [scroll-craft](https://github.com/nateherkai/scroll-craft) لمحاكاة تأثيرات scroll-driven animations.

## المكونات المُدمجة

<!-- r93-W2a (U4): حُذف useScrollProgress و KineticText (كود ميت بلا مستورد واحد —
     تأكيد knip وفحص rg) فأُزيلت قسماهما من هذا الدليل. -->

### 1. `ScrollReveal`
Reveal animation يعمل مرة واحدة عند دخول العنصر للـ viewport.

```tsx
import { ScrollReveal } from "@/components/ui/scroll-reveal"

<ScrollReveal y={24} delay={100}>
  <h2>عنوان يُظهر تدريجياً</h2>
</ScrollReveal>
```

### 2. `StaggeredReveal`
Staggered reveal للأطفال.

```tsx
import { StaggeredReveal } from "@/components/ui/scroll-reveal"

<StaggeredReveal stagger={60}>
  {items.map(item => <Card key={item.id} />)}
</StaggeredReveal>
```

### 3. `ScrollParallax`
تأثير عمق بطبقات متحركة بسرعات مختلفة.

```tsx
import { ScrollParallax } from "@/components/ui/scroll-parallax"

<ScrollParallax rate={-0.3} maxTravel={40}>
  <img src="background.webp" alt="" />
</ScrollParallax>
```

- `rate` = -2 إلى 2 (سالب: يتراجع للأعلى، موجب: يتباطأ عن scroll)
- `maxTravel` = الحد الأقصى للحركة بالبكسل (افتراضي: 80)
- معطل تلقائياً على الموبايل و prefers-reduced-motion

### 4. `ClipPathReveal`
Wipe effect بـ clip-path (up, down, left, right, iris).

```tsx
import { ClipPathReveal } from "@/components/ui/clip-path-reveal"

<ClipPathReveal direction="up" duration={700}>
  <img src="hero.webp" alt="" />
</ClipPathReveal>
```

## القيود والتحسينات

### Mobile / Performance
- `ScrollParallax` معطل على الموبايل لتجنب frame drops (شاشة لمس).
- جميع المكونات تستخدم `requestAnimationFrame` للأداء الأفضل.

### RTL Support
- `ClipPathReveal` يعمل بشكل صحيح في RTL.
- `ScrollParallax` يستخدم `translate3d(0, y, 0)` — محايد لاتجاه الكتابة.

### Accessibility
- جميع المكونات تحترم `prefers-reduced-motion`.
- استخدام `will-change` مع `transform` و `opacity` فقط للأداء.

## أمثلة من scroll-craft الأصلية

| scroll-craft device | المكون المُدمج |
|---|---|
| `data-sc-in` (fire-once reveal) | `<ScrollReveal>` |
| `data-sc-stagger` | `<StaggeredReveal>` |
| `data-sc-parallax` | `<ScrollParallax>` |
| `data-sc-reveal` | `<ClipPathReveal>` |
| `data-sc-cue` | مدمج في `ScrollReveal` |

## التوافق

- ✅ RTL (Arabic)
- ✅ Reduced Motion
- ✅ Mobile (auto-disable parallax)
- ✅ Next.js 15 (App Router)
- ✅ Framer Motion
- ✅ Tailwind CSS 4
