# خطة الإصلاح الشاملة — Smart Menu Repair Plan
**تاريخ:** 13 يوليو 2026  
**المصدر:** `AUDIT_REPORT.md` (19 حرجة، 44 عالية، 47 متوسطة، 25 منخفضة)  
**مراجعة:** claude-council (Codex) — تم دمج الملاحظات

---

## استراتيجية التنفيذ

6 مراحل (Sprints) مرتبة حسب الأولوية + مسارات متوازية بعد S0.
بعد Sprint 0، يمكن تشغيل 3 مسارات بالتوازي (Backend/Security، CI/Tests، Frontend)،
لكن النشر يبقى مرحلياً: لا ينشر UI/Performance قبل إغلاق الـ Abuse/Security الأساسية.

---

## Sprint 0 — أمني عاجل (يوم 1، لا يُنشر بدونه)

| # | المشكلة | الملف | الإجراء | الأولوية |
|---|---------|-------|---------|----------|
| S0.1 | مفاتيح إنتاج حية في `.env` | `.env` | تدوير JWT_SECRET، AUTH_SECRET، TELEGRAM_BOT_TOKEN، TELEGRAM_WEBHOOK_SECRET، كلمة مرور DB. إزالة `.env` من القرص. | Critical |
| S0.2 | Secrets في تاريخ git | git history | `git-filter-repo` لتنظيف 3 Commits (2f40b35d, c9b54552, 6696ac6b). | Critical |
| S0.3 | JWT_SECRET == AUTH_SECRET | `.env` | توليد قيمتين مستقلتين 64 حرفاً. → **إضافة للخطة بعد الـ Council** | Critical |
| S0.4 | كود التفاف أمان Webhook | `webhook/route.ts:127` | إزالة `TELEGRAM_WEBHOOK_ALLOW_UNVERIFIED` بالكامل. | Critical |
| S0.5 | CSP مكرر + غير آمن | `next.config.ts:43` + `middleware.ts` | إزالة CSP من next.config.ts، الإبقاء على middleware فقط. إزالة `'unsafe-inline'` بحذر واختبار Playwright قبل enforcement. | Critical |
| S0.6 | CI يختبر ضد الإنتاج | `.github/workflows/ci.yml` | تغيير BASE_URL لـ localhost، تشغيل dev server في CI. | Critical |

**الاعتماديات:** صلاحيات Vercel + GitHub، الوصول إلى لوحة تحكم Telegram.
**خطر:** إزالة `'unsafe-inline'` قد يكسر Next/Vercel Analytics — اختبر بـ `Report-Only` أولاً.
**مخرجات:** Commit منفصل `fix: rotate all secrets, remove ALLOW_UNVERIFIED, fix CSP, CI localhost`.

---

## Sprint 1 — Abuse & Data Integrity (أيام 2-3)

**Sprint 1: Backend/Security + CI (مساران متوازيان)**

| # | المشكلة | الملف | الإجراء |
|---|---------|-------|---------|
| S1.1 | Rate Limiter في الذاكرة لا يعمل | `rate-limit.ts` + 8 route handlers | استبدال `createRateLimiter` بـ `createDbRateLimiter`: orders، reviews، loyalty، referral. |
| S1.2 | **→ جديد:** Webhook تلغرام بلا Rate Limiting | `api/telegram/webhook/route.ts` | إضافة `createDbRateLimiter` على POST webhook (60 req/min). |
| S1.3 | **→ منقول من S2:** Idempotency الطلبات | `api/orders/route.ts:118` | التحقق من وجود orderNo قبل الإنشاء، إرجاع 200 للموجود. |
| S1.4 | **→ جديد:** createDbRateLimiter يبتلع الأخطاء | `rate-limit.ts:93` | إزالة `.catch(() => {})` من deleteMany/create/count. Log + فشل مغلق. |
| S1.5 | **→ جديد:** IP extraction عبر x-forwarded-for | `api/auth/login/route.ts:24` | استخدام `x-real-ip` بدلاً من `x-forwarded-for`. |
| S1.6 | CSP آمن + اختبر Playwright | كما في S0.5 | تشغيل CSP في `Report-Only`، اختبر على login/menu/admin، ثم فعّل. |

**مسار موازي (CI/Tests):**
| S1.7 | إصلاح glob الاختبارات | `package.json:10` | تغيير إلى `tests/unit/**/*.test.ts`. |
| S1.8 | مشروع ui يلتقط اختبارات API | `playwright.config.ts` | إضافة project 'api' منفصل. |
| S1.9 | api-smoke يعيد تعريف BASE_URL | `tests/e2e/api-smoke.test.ts` | استخدام baseURL من Playwright. |

**الاعتماديات:** S0 كامل.
**مخرجات:** Commit `fix: rate limiting, idempotency, webhook hardening, CI improvements`.

---

## Sprint 2 — Security Hardening + API (أيام 4-6)

| # | المشكلة | الملف | الإجراء |
|---|---------|-------|---------|
| S2.1 | decryptValue() + HKDF | `lib/config.ts` | إضافة `decryptValue()` + HKDF لاشتقاق مفتاح AES-GCM. |
| S2.2 | Telegram API calls بلا Timeout | `lib/telegram-api.ts` | إضافة AbortSignal 10s لجميع fetch(). |
| S2.3 | Session rotation يسجل خروج الكل | `lib/session.ts:8` | حذف فقط المنتهية أو الأقدم من N يوم. |
| S2.4 | SubscriptionPayment.status ليس Enum | `prisma/schema.prisma:376` | تعريف `SubscriptionPaymentStatus` enum. |
| S2.5 | **→ جديد:** CSRF decision | `middleware.ts:55` + `csrf.ts` | قرار: تفعيل CSRF validation على POST/PUT/DELETE أو إزالة البنية غير المستخدمة. |
| S2.6 | **→ جديد:** Modifiers pricing | `api/orders/route.ts` | احتساب modifier priceDelta في subtotal. |
| S2.7 | **→ جديد:** HMAC token replay | `api/telegram/webhook/route.ts:177` | تخزين spent token hashes في cache/DB. |
| S2.8 | التحقق من slug في التحديث | `api/restaurants/[id]/route.ts:10` | إضافة `.regex(/^[a-z0-9-]+$/)` لـ slug. |
| S2.9 | env.ts يسمح ببدء ناقص في dev | `lib/env.ts:29` | الإبقاء على hard fail للمتغيرات الحرجة. |
| S2.10 | console.log في 30+ موقع | متعدد | استبدال بـ `logger.error/info/debug`. |

**الاعتماديات:** S1.
**مخرجات:** Commit `fix: security hardening, CSRF, modifiers, logging`.

---

## Sprint 3 — UI + Performance + DevOps (أيام 7-10)

**مسار UI:**
| # | المشكلة | الملف | الإجراء |
|---|---------|-------|---------|
| S3.1 | Service Worker لا يخبؤ API | `public/sw.js` | إضافة cache-first لـ menu API routes. |
| S3.2 | OrderDialog يستخدم window.location | `components/menu/OrderDialog.tsx:97` | استبدال بـ `router.push('/cart')`. |
| S3.3 | 3 Scroll Listeners غير مقيدة | `layout/Header.tsx:160` + LayoutHeader + ScrollToTop | دمج في `useScrollPosition` واحد. |
| S3.4 | CartSlideOver و MenuToolbar يستخدمان bare `<img>` | متعدد | استبدال بـ `<Image>` من next/image. |
| S3.5 | أيقونات غذائية Emoji | `components/menu/MenuItemCard.tsx:164` | استبدال بـ SVG icons مع `aria-hidden`. |
| S3.6 | A11y: aria-live + role=alert | `layout/OrderNotifier.tsx` + `menu/ReviewSheet.tsx` | إضافة مناطق الإتاحة. |
| S3.7 | Sonner Toaster inline style | `app/layout.tsx:121` | نقل Animation إلى className. |
| S3.8 | AvatarInitials حرف واحد فقط | `components/ui/AvatarInitials.tsx:29` | إرجاع أول حرفين. |

**مسار Backend:**
| S3.9 | **→ جديد:** Stats admin N+1 | `api/admin/stats/route.ts:109` | استخدام SQL query مع JOIN. |
| S3.10 | **→ جديد:** إحصاءات landing.ts الصحيحة | `lib/landing.ts:70` | إزالة Math.max. |
| S3.11 | **→ جديد:** تكرار landing.ts/featured route | `lib/landing.ts` + `api/public/featured/route.ts` | توحيد المصدر. |
| S3.12 | **→ جديد:** stats route لا يستخدم success() | `api/public/stats/route.ts` | استبدال بـ `success()`. |
| S3.13 | ترحيل رفع الصور من Data URL | `api/upload/route.ts` | رفع إلى Vercel Blob/S3. |
| S3.14 | PWA manifest background_color | `public/manifest.json:7` | تغيير إلى `#000000`. |
| S3.15 | `tsconfig` target ES2017 → ES2022 | `tsconfig.json` | تحديث target. |
| S3.16 | تثبيت target في tsconfig | `tsconfig.json` | إصلاح `include` path المكرر. |

**مسار DevOps:**
| S3.17 | حزمة Remotion ميتة (~100MB) | `package.json` | `npm uninstall remotion @remotion/*`. |
| S3.18 | إزالة تكرار CSP بين الملفين | `next.config.ts` | إزالة CSP من next.config.ts. |

**ملاحظة:** Remotion هنا وليس S1 لأنها ليست إصلاحاً أمنياً أو مانع نشر. الـ Council يؤكد هذا التقييم.

**الاعتماديات:** S2.
**مخرجات:** Commit `feat: PWA caching, a11y, image optimization, backend fixes, remove remotion`.

---

## Sprint 4 — اختبارات + بنية (أيام 11-14)

| # | المشكلة | الملف | الإجراء |
|---|---------|-------|---------|
| S4.1 | إضافة Vitest + تقارير تغطية | `package.json` + CI | Vitest بدلاً من الاختبارات اليدوية، `--coverage`. |
| S4.2 | إصلاح اختبارات env (try/finally) | `tests/unit/lib.test.ts:224` | لف في try/finally. |
| S4.3 | إصلاح حساسية الأحرف في handleError | `lib/api-helpers.ts` | استخدام `.toLowerCase()` لجميع المقارنات. |
| S4.4 | Extract subscription-decisions.ts (283 سطر) | `lib/subscription-decisions.ts` | فصل new-user + upgrade + cancel. |
| S4.5 | CircularTestimonials (272 سطر) | `components/ui/` | استخراج Hook + Utility. |
| S4.6 | ActionSearchBar (255 سطر) | `components/ui/` | استخراج Keyboard nav + Variants. |
| S4.7 | إضافة Dockerfile | `Dockerfile` جديد | اختياري — فقط إذا كان self-host ضرورياً. |

**الاعتماديات:** S3.
**مخرجات:** Commit `test: vitest, coverage, regression fixes, decomposition`.

---

## Sprint 5+ — تحسينات استراتيجية (طويلة المدى)

| # | المشكلة | الإجراء |
|---|---------|---------|
| S5.1 | SSE EventEmitter في الذاكرة | Redis pub/sub للتوسع عبر مثيلات متعددة. |
| S5.2 | البحث بـ SQL LIKE | PostgreSQL tsvector. |
| S5.3 | Session في DB | Redis cache للجلسات. |
| S5.4 | تحسين Core Web Vitals | إضافة profiling دوري، تحسين LCP/INP/CLS. |

---

## ملخص التغييرات بعد Council Review

| البند | قبل | بعد | السبب |
|-------|-----|-----|-------|
| Idempotency (S2.6) | Sprint 2 | **Sprint 1** | Critical — تمنع طلبات مكررة وأخطار للمستخدم |
| Remotion (S1.7) | Sprint 1 | **Sprint 3** | ليست أمنية ولا تمنع النشر |
| Webhook Rate Limit | غير موجود | **Sprint 1** | High في التقرير ، Council يؤكد |
| CSRF Decision | غير موجود | **Sprint 2** | يحتاج قرار معماري |
| Modifiers Pricing | غير موجود | **Sprint 2** | خطأ في حساب سعر الطلب |
| HMAC Token Replay | غير موجود | **Sprint 2** | ثغرة إعادة استخدام |
| Stats Admin N+1 | غير موجود | **Sprint 3** | Performance |
| Dockerfile | Sprint 4 (إلزامي) | **بعد S5 (اختياري)** | غير ضروري مع Vercel |
| createDbRateLimiter catch | غير موجود | **Sprint 1** | catch صامت = bypass |

---

## هيكل الاعتماديات

```
Sprint 0 (أمن)
   │
   ├──► Sprint 1 (Abuse + Data Integrity) ─── 3 مسارات متوازية
   │       ├── مسار Backend/Security
   │       └── مسار CI/Tests
   │
   └──► Sprint 2 (Security Hardening + API)
          │
          └──► Sprint 3 (UI + Performance + DevOps) ─── 3 مسارات متوازية
                  ├── مسار UI
                  ├── مسار Backend
                  └── مسار DevOps
                    │
                    └──► Sprint 4 (اختبارات + بنية)
                           │
                           └──► Sprint 5+ (استراتيجي)
```

---

## مؤشرات النجاح

1. ✅ `git ls-files '.env*'` → 0 results
2. ✅ Rate limiter DB-backed على جميع مسارات التحوير العامة (بما فيها Webhook)
3. ✅ CSP بلا `unsafe-inline` مع `worker-src 'self'` — يمر اختبار Playwright
4. ✅ Idempotency مفعّلة للطلبات
5. ✅ `npm run build` يمر بدون أخطاء
6. ✅ `npm test` يمر بجميع الاختبارات
7. ✅ 0 مشاكل حرجة في إعادة التدقيق
8. ✅ CI يعمل ضد localhost
9. ✅ CSRF: إما مفعّل أو البنية غير المستخدمة مُزالة

> **تمت مراجعة هذه الخطة من قبل claude-council (Codex) في 13 يوليو 2026.**  
> Council output: [council-1783901255.md](../.claude/council-cache/council-1783901255.md)
