# SMART-MENU — ROUND 85 MASTER PLAN
## جولة عالمية أعمق وأوسع: أمان + أداء + جودة كود + اختبارات + توثيق

**التاريخ:** 2026-09-06 · **القاعدة:** b0c5ca16 (جولة 84 مغلقة، كل البوابات خضراء)
**المنهجية:** تشخيص حقيقي عبر 4 وكلاء تدقيق متخصصين (جودة الكود / الأمان / الأداء / الاختبارات والتوثيق) + فحوصات محلية (tsc 0 / eslint 0 / vitest 447/447) + فحص إنتاج (200/200). لا تخمين — كل بند أدناه موثّق بـ file:line.

---

## المرحلة A — تحصين الأمان (7 مهام) 🔒

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| A1 | `GET /api/items` ثغرة دور USER | items/route.ts:50-64 — فحص الملكية لـ owner فقط | رفض USER أو فرض `status:'available'` لغير الموظفين |
| A2 | `GET /api/loyalty` بلا حد معدل (تعداد أرقام) + تسريب referrerName | loyalty/route.ts:88-122, referral/route.ts:96-100 | حد معدل DB + حذف referrerName من الرد العام |
| A3 | PBKDF2 100k تكرار (OWASP: 600k) | lib/hash.ts:3-9 | رفع لـ 600k مع توافق عكسي (verify بمعاملات الهاش المخزّن + إعادة تهجئة عند الدخول) |
| A4 | مقارنة CRON_SECRET غير ثابتة الزمن | cron/*/route.ts:13,15 | timingSafeEqual (نفس أسلوب webhook) |
| A5 | settings PUT بلا حد طول value + slug بلا regex | settings/route.ts:8-28,127-139 | `z.string().max(1000)` + slug regex |
| A6 | `BLOB_READ_WRITE_TOKEN` غائب عن .env.example | .env.example vs upload/route.ts:18 | إضافته |
| A7 | حراسة CI: كل route.ts يجب أن يستدعي requireAuth/requirePermission أو يكون في قائمة عامة معلنة | proxy.ts API غير محجوب | سكربت فحص + خطوة CI |

## المرحلة B — الأداء (11 مهمة) ⚡

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| B1 | Lotties ديكورية على صفحة المنيو = ~360KB على المسار الحرج | MenuClientSection.tsx:27-65 | استبدال بفن SVG/CSS خفيف بنفس الهوية البصرية |
| B2 | الصفحة الرئيسية: 1.08MB JS + شلال fetch بعد hydrate | page.tsx:1-5, HomePage.tsx:37-65 | تمرير stats/featured من server component كـ props |
| B3 | useOrderNotifier يجلب صفوف كاملة كل 5 ثوان | OrderNotifier.tsx:42-56, orders GET:81-93 | endpoint عدد خفيف `/api/orders/count` |
| B4 | htmlLimitedBots = /.*/ يعطل الـ streaming للجميع | next.config.ts:8-13 | regex بوتات حقيقي (الميتاداتا تبقى للبوتات) |
| B5 | محدد المعدل = 3 رحلات DB لكل فحص | rate-limit.ts:59-94 | تقليل لرحلة واحدة (upsert ذري) + تنظيف احتمالي |
| B6 | requireAuth = استعلامان متتاليان | auth.ts:13-16, session.ts | دمج بـ include واحد |
| B7 | أصول بلا Cache-Control دائم (خطوط/فيديو/OG = 1.6MB) | next.config.ts:45-68 | immutable headers |
| B8 | استعلام featured غير محدد بالمطعم | menu/[slug]/page.tsx:108-159 | إضافة `AND restaurantId` |
| B9 | تعديلات المالك لا تُبطل ISR فوراً | لا revalidateTag إلا admin/config | revalidatePath(`/menu/${slug}`) عند تعديل items/categories/settings/restaurant |
| B10 | loyalty/stats يجلّب كل الصفوف لتسمية 5 | loyalty/stats/route.ts:44-81 | groupBy + take |
| B11 | proxy matcher لا يستثني woff2/mp4/lottie/svg | proxy.ts:181-185 | إضافة الاستثناءات |

## المرحلة C — جودة الكود وإزالة التكرار (9 مهام) 🧹

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| C1 | 34 error.tsx متطابقة (~1,340 سطر) وDefaultError ميت | كل error.tsx | مكوّن مشترك واحد بخصائص |
| C2 | 32 loading.tsx متطابقة (~350 سطر) | كل loading.tsx | مكوّن مشترك |
| C3 | owner/admin orders/[id] تطابق 65% (260 سطر) | الملفان | OrderDetail مشترك بفروع دور |
| C4 | 18× `catch (e:any)` يسرّب e.message | 6 منها في admin/telegram | مساعد getErrorMessage + توطين الرسائل |
| C5 | خرائط DIETARY مكررة | ItemDialog.tsx:59,72 + MenuItemCard.tsx:17,31 | lib/dietary.ts واحد |
| C6 | api/public/stats يكسر مغلّف api-helpers | public/stats/route.ts:13-21 | ترحيل لـ success/error |
| C7 | صادرات ميتة: motion(16)، config(4)، landing، order-status(3)، design-tokens، chart-geometry، constants، csrf | تدقيق الوكلاء | حذف مع تحقق تبعيات |
| C8 | `as any` في Prisma casts | admin/system-events:57,78 وغيرها | كتابة الأنواع |
| C9 | useActiveRestaurant بلا res.ok | useActiveRestaurant.ts:34-35 | معالجة الأخطاء |

## المرحلة D — الاختبارات وCI والتوثيق (9 مهام) 🧪

| # | المهمة | الدليل | الإجراء |
|---|--------|--------|---------|
| D1 | referral-claim.spec لا يعمل إطلاقاً (0 tests) | playwright projects | توصيله بمشروع + سيناريو مسار سعيد |
| D2 | CI بلا typecheck ولا artifacts | ci.yml | إضافة الخطوتين |
| D3 | بوابات coverage حمراء وميتة (20.5% مقابل 50%) | vitest thresholds | معايرة ratchet + كتابة اختبارات جديدة ترفعها فعلياً |
| D4 | مكتبات حرجة بلا اختبارات: loyalty-tiers, subscription-guard, receipt, whatsapp, format(8% فروع) | 0% coverage | اختبارات وحدة شاملة |
| D5 | CI e2e بلا بيانات منيو (يقبل 404) | ci-seed | دمج round83-seed في CI |
| D6 | PROJECT.md متقادم بـ 6 أسابيع (أوامر ميتة + بيانات خاطئة) | التدقيق §6 | إعادة كتابة كاملة |
| D7 | docs/ بلا فهرس (76 ملف) | التدقيق §6 | README فهرس + أرشيف |
| D8 | سكربتات ميتة: round79-h×5, axe-check, sse-test, memory/plan, astgrep dump | scripts/ | حذف |
| D9 | package.json: بلا engines، lint:fix ناقص النطاق، test:legacy زائد | package.json | engines + .nvmrc + تنظيف |

## المرحلة E — البوابات النهائية والنشر والتحقق 🚀

1. البوابات: tsc=0، eslint=0، vitest (بما فيها الجديد)، build standalone، E2E محلي 181+
2. فحص إنتاج كامل (16/16 + رؤوس + ISR)
3. Commits بالتوقيع الإلزامي `ahmadmedo1012 <220099349+ahmadmedo1012@users.noreply.github.com>`
4. Push → Vercel → تحقق مباشر من كل نقطة (خاصة B7 headers وB8 والصفحات)
5. تقرير `docs/round85-audit-report.md` + worklog

**معايير القبول العالمية:** صفر انحدارات (E2E بالكامل)، كل البوابات خضراء، كل الأدلة حية في الإنتاج.

---
