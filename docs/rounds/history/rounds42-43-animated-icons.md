# تقرير تحويل الأيقونات المتحركة — الجولات 42-43

**الأدوات**: itshover.com (23 أيقونة animated SVG) + motion.dev/framer-motion (28 wrapper)
**النتيجة**: 51 أيقونة متحركة عبر ~70 ملفاً

---

## ✅ منجز

### 1. التثبيت (22 + 1)
- `npx shadcn add https://itshover.com/r/plug-connected-icon.json` (الأداة التي اكتشفها المستخدم)
- 22 أيقونة أخرى من كتالوج itshover (253 أيقونة متحقق منها — 404 للأسماء غير المتوفرة)
- `motion` 12.43 مثبت

### 2. الاستبدال (itshover — ~45 استخداماً)
- **Star** (تقييم المنيو — أهم تفاعل) ✓ مؤكد حياً (2/3 paths تتحرك)
- **X** (إغلاق 7 dialogs/overlays)
- **Sparkles** (CTA الإحالة)
- **ShoppingCart** (السلة العائمة/الفارغة/الإشعار)
- **Trash2** (حذف — 5 مواضع)
- **Copy/Upload/RefreshCw** (12 موضعاً)
- **Eye/EyeOff/Clock/MapPin/Send/ExternalLink/LogOut/Download/Save/DollarSign/UserCheck/QRCode** (38 استخداماً)

### 3. خطة B — motion wrappers (28 نوعاً)
- للأيقونات الغائبة من itshover: Plus/Check/Minush/Search/Phone/Store/Crown/Award/...
- `motion-icons.tsx` — useAnimate (نمط itshover المثبت)
- **MotionPlus** مطبق (زر إضافة) + **MotionCheck** (6 مواضع)

### 4. إصلاحات أثناء التنفيذ
- motion-icons: whileHover لا يعمل على nested SVG → useAnimate (السبب: whileHover لا يستقبل hover على الـ svg الداخلي)
- الحجم: outer svg 100% حتى يكون hover target حقيقياً

## ⚠️ ملاحظة تحقق
- الـ headless shell لا يطلق pointer events بشكل موثوق → الحركة تُتحقق على الأجهزة الحقيقية
- نمط useAnimate مطابق للـ itshover (المثبت حركته حياً)

## المتبقي (lucide ثابت — مقصود)
- icon-field usages (type=LucideIcon في arrays) — تتطلب تعديل الأنواع
- FloatingWhatsApp (شعار واتساب brand — لا استبدال)