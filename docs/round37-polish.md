# تقرير الجولة 37 — التحسين العام (بلا ميزات جديدة)

**التاريخ**: 2026-08-03

---

## ✅ منفذ (commit 7f2320a3)

### 1. توستات الولاء عربية
- 'Loyalty settings saved' → 'تم حفظ إعدادات الولاء'
- 'Failed to load settings' → 'فشل تحميل الإعدادات'
- أخطاء داخلية بلا إنجليزية ظاهرة

### 2. transition-all → محدد (8 ملفات)
- input, badge, switch, card, search-input, ItemDialog, MenuPageClient
- أداء أفضل (لا تحريك خصائص layout)

## ✅ فُحص وسليم (لا إصلاح)
- **Console sweep 9 صفحات**: 7 نظيفة + 2 (login/subscribe) 401 من `/api/auth/me` للزائر = **سلوك متوقع** (لا يمكن منعه — سلوك متصفح، لا أثر على المستخدم)
- **LCP/CLS**: main21.png له أبعاد 1536×1024 (Next.js يضبط) — لا CLS
- **Placeholders الإنجليزية** ('Cappuccino'/'Hot Drinks') = مقصودة (أسماء أصناف لاتينية dir=ltr)
- aria-label 'Area chart' تقني (لا يُرى)

## الخلاصة
جولة تحسين نظيفة: توطين + أداء. لا ميزات جديدة (التزاماً بطلبك). النظام مستقر ونظيف.