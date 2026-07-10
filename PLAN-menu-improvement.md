# خطة تحسين صفحة المنيو العامة — Smart Menu

**الهدف:** تحسين مظهر وتجربة صفحة المنيو — فقط polish بصري وUX تحسينات بدون تعقيد الطلب.

**المبدأ:** ضغط → تفاصيل → طلب → واتساب. لا مقاسات، لا دايت، لا إضافات.

---

## Pre-phase: استخراج مكونات (Maintainability)
استخراج `CategoryTabs` + `MenuToolbar` من `MenuPageClient.tsx` (322 سطر).
MenuPageClient يصير orchestrator نحيف (~150 سطر).

---

## المراحل (4 مراحل)

### المرحلة 1: Cart Slide-Out Panel 🛒
**ملف جديد:** `CartSlideOver.tsx` — **حذف** `CartFloatingButton.tsx`
**التفاصيل:**
- Sheet condensed: items + total + WhatsApp فقط
- **ليس** نسخة من /cart — لا pickup type, لا address, لا notes
- استخدام Sheet الموجود (CSS transition، لا framer-motion)
- نفس Zustand store
**التأثير:** الزبون ما يغادرش الصفحة

### المرحلة 2: Popular Items Grid مميزة 🔥
**تعديل:** `MenuPageClient.tsx` + `MenuItemCard.tsx`
**التفاصيل:**
- `variant="featured"` prop على MenuItemCard (col-span-2)
- Popular items تظهر في grid علوي (ردف أول)
- تصفية popular من normal grid (لا تكرار)
- مخفي لو < 2 popular items
**التأثير:** لفت النظر للأصناف المفضلة

### المرحلة 3: Category Sticky Nav 📌
**ملف جديد:** `useCategoryScroll.ts` hook
**التفاصيل:**
- ديسكتوب فقط (md+). موبايل: tabs تتمرر عادي
- IntersectionObserver يكشف القسم المرئي
- smooth scroll عند click
- أقل من الـ StickyMenuHeader بـ z-index

### المرحلة 4: Search Suggestions 🔍 + Empty State +
**تعديل:** `MenuToolbar.tsx`
**التفاصيل:**
- قائمة results مقترحة (image + name + price)
- always-mounted (hidden/visible via CSS — لا mount/unmount)
- 300ms useDeferredValue (لا debounce — filter محلي)
- لا keyboard nav — tap فقط
- زر "إعادة تعيين" في empty state
- تطوير card hover + category switch spring

---

## ترتيب التنفيذ (من الأقل خطورة للأعلى)
1. **Pre-phase:** CategoryTabs + MenuToolbar extraction
2. **Phase 1:** Cart Slide-Out Panel (صفر مخاطرة — Sheet موجود)
3. **Phase 3:** Popular Grid (مستقل تماماً)
4. **Phase 2:** Category Sticky Nav (IO observers)
5. **Phase 4:** Search Suggestions + Empty State (الأعلى risk)
