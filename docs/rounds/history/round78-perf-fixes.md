# Round 78 — Performance + Lint Fixes

**تاريخ:** 10 أغسطس 2026

## التغييرات

### 1. إيراد اليوم — aggregate في DB بدل جلب كل الصفوف
- **الملف:** `src/app/api/stats/route.ts`
- **قبل:** `order.findMany({ where: { restaurantId, createdAt: { gte: today } }, select: { total: true } })` ثم reduce في JS — يسحب كل طلبات اليوم للمخدم (آلاف الصفوف عند المطاعم المزدحمة)
- **بعد:** `order.aggregate({ where: {...}, _sum: { total: true } })` — الحساب داخل PostgreSQL، يُرجع رقماً واحداً
- **الأثر:** نقل سطر واحد، يلغي نقل N صف + معالجة JS

### 2. صفحة المنيو — تضييق select لـ category
- **الملف:** `src/app/menu/[slug]/page.tsx` (أعلى صفحات حركة مرور)
- **قبل:** `include: { category: true }` — جلب كل حقول category لكل صنف
- **بعد:** select للحقول المستخدمة في التسلسل فقط (id/name/nameAr/icon/sortOrder/isActive/restaurantId/createdAt/updatedAt)
- **الأثر:** تقليل حمولة الاستعلام لكل صنف في قائمة المطعم

### 3. إصلاح lint — displayName
- **الملف:** `src/components/ui/animated-icon.tsx`
- `withHoverAnimation` كانت تُرجع forwardRef بلا displayName ← خطأ `react/display-name`
- إضافة `Wrapped.displayName = AnimatedIcon(name)` + إزالة تكرار `"use client"`

## التحقق
- `npm run typecheck` — 0 أخطاء
- `npm run lint` — 0 أخطاء (24 warnings سابقة غير حرجة)
- `next build` — ✓ Compiled (82/82 صفحات)

## فحص أمني شامل (لا تغييرات مطلوبة)
تمت مراجعة: upload (magic bytes + rate limit + auth), admin (requirePermission), loyalty redeem (transaction atomic + ملكية), referral (hash للـ IP), orders (إعادة حساب الأسعار server-side), reviews (حماية PII). **البنية الأمنية سليمة بعد الجولات السابقة — لا ثغرات جديدة.**
