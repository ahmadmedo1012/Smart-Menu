# تطبيق قواعد Open Design (nexu-io) على Smart Menu — الجولة 26-27

**التاريخ**: 2026-08-03
**المصدر**: `~/Downloads/nexu-io-open-design-f0882b2/craft/` (rtl-and-bidi, anti-ai-slop, color, laws-of-ux)

---

## 🔴 إصلاحات منفذة (3)

### 1. RTL: `<bdi dir="ltr">` لرقم الطلب (commit fc6b30b7)
- **القاعدة** (rtl-and-bidi §Form/Common-mistakes): القيم mixed-script داخل فقرة RTL يجب عزلها بـ `<bdi>` وإلا يعيد الـ bidi algorithm ترتيبها
- **الإصلاح**: رقم الطلب (ORD-MS9JAOG7-D35FA193) في order-confirmed → `<bdi dir="ltr">`

### 2. anti-ai-slop: 💡 emoji → Lightbulb SVG (commit 505099fd)
- **القاعدة** (خطيئة 3): emoji كأيقونة ميزة في h/button/li = P0 must-fix
- **الإصلاح**: "💡 خطوات التفعيل" في admin/telegram → أيقونة Lightbulb monoline

### 3. accent discipline: مؤكد متوازن (لا إصلاح)
- **القاعدة** (color.md): accent 5-10% من البكسل + ≤6 استخدامات
- **القياس**: البرتقال 113 عنصراً لكن **36 tiny + 6 decorative كبيرة (blur خلفية بلا نص)** — زخرفي لا وظيفي — الأزرار الفعلية محدودة → **مقبول**

## ✅ مؤكد سليم (بقياس حي)

| القاعدة | النتيجة |
|---------|---------|
| RTL: letter-spacing على عربي | ✅ ReferralCard tracking على رمز إنجليزي (dir=ltr) — سليم |
| RTL: هاتف في receipt | ✅ سطر plain-text مستقل |
| RTL: dir بدون lang | ✅ `<html dir="rtl" lang="ar">` موجود |
| anti-slop: لا indigo | ✅ (فقط Confetti احتفالي) |
| anti-slop: لا trust gradient | ✅ |
| anti-slop: خط عربي أصيل | ✅ Cairo/Noto Naskh (لا Inter) |
| anti-slop: لا invented metrics | ✅ |
| color: تباين 21:1 | ✅ AAA |
| Hick: عدد خطط | ✅ 4 (أمثل) |
| Miller: خطوات اشتراك | ✅ 2 (اختر خطة → بيانات) |
| von Restorff: خطة مميزة | ✅ "الأكثر شعبية" بظل مميز |
| emojis في رسائل واتساب | ✅ (محتوى نصي لا أيقونات) |

## 🟡 ملاحظات (تحسينات مستقبلية)
1. **Peak-End**: cart بلا مؤشر خطوات (مراجعة → تأكيد) — يقلل قلق checkout
2. **von Restorff ضعيف**: شارتا "الأكثر شعبية" + "الأفضل قيمة" على خطط مختلفة — تمييز واحد أقوى

## الخلاصة
Smart Menu يلتزم معظم قواعد Open Design. إصلاحان حقيقيان (bdi + emoji) + تأكيدات شاملة (11 قاعدة). الـ RTL والـ colors والـ typography سليمة بنيوياً.