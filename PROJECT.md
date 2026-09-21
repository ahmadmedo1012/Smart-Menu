# Smart Menu — Project Reference

> آخر تحديث: الجولة 119 (B5-D: تحديث شامل بعد 22 جولة — إضافة تطبيق الجوال mobile/، نموذجا UserRestaurant + SubscriptionPlan، السكربتات 27، مسارات API 66، اختبارات 140 ملف/1995 حالة، سلسلة verify، CI رباعي المهام؛ سابقًا الجولة 97 — r97-X5: مزامنة الأرقام المقيسة + قائمة السكربتات الحية؛ سابقًا 9 سبتمبر 2026 جولة 96 — W5: سجل الجولات + تنظيم المستودع؛ سابقًا جولة 92 — الوكيل 4-a: بنية وتوثيق)

---

## Mandatory Execution Rules (STRICT)

These rules are enforced and non-negotiable. They override any default behavior and any simplification defaults (Ponytail, Caveman, or otherwise). Cost and time are never constraints.

### Rule 1: Mandatory Skill & Tool Auto-Invocation

- Before starting ANY task, inspect your installed Skills and MCP Tools inventory.
- If the task involves code, databases, tests, context analysis, or any domain with a relevant skill/tool — invoke the appropriate skill or tool IMMEDIATELY and AUTOMATICALLY.
- Waiting for user permission to invoke a relevant skill/tool is STRICTLY PROHIBITED. Never ask "should I use X?" — use it.
- Relevant project skills include (non-exhaustive): code-review, security-scan, test-coverage, full-project-tests, mega-ux-test, update-codemaps, update-docs, build-fix, plan.

### Rule 2: Mandatory Pre-Execution Planning Phase

- Directly editing files or writing code without a plan is PROHIBITED for any non-trivial request.
- BEFORE touching any file, present a concise, specific **Architecture & Execution Plan** covering:
  1. Target files (exact paths)
  2. Skills and tools that will be used
  3. Ordered execution steps
- The plan is the source of truth — code follows it. If the plan changes, update the plan FIRST.
- Exception: trivial single-line fixes (typos, mechanical renames) may proceed directly.

### Rule 3: Context & Architecture Enforcement

- Full compliance with this PROJECT.md AND the instructions at the top of `CLAUDE.md` (structure, architecture, API reference, conventions, env vars).
- Before finishing ANY task, run multi-perspective reviews (Code Review, Security, Performance) using the available agents/tools/skills.
- No task is complete until all reviews pass without CRITICAL or HIGH findings.

### Rule 4: Proactive Skill & Tool Discovery

- Before starting ANY analysis or implementation, do a full sweep and inspection of all available Skills and MCP Tools.
- Actively search for any skill that could raise the quality of the result (e.g., design skills, icon generation, code review, performance optimization) and use it IMMEDIATELY — without waiting for an explicit request.

### Rule 5: Extreme UI/UX Excellence Standards

When working on ANY component or page, apply professional, world-class design standards:

- **Perfect Arabic support (RTL-first)**: precise alignment, fonts, spacing, and direction handling — no visual distortion in RTL.
- **Optimal use of Tailwind CSS 4 and shadcn/ui** components for a modern, clean, consistent design.
- **Full responsive design, accessibility (a11y), and precise micro-interactions**.
- **UX considerations**: minimize action steps, clear loading states and input errors, provide visual feedback.

### Rule 6: Mandatory UI/UX Quality Assurance Loop

- It is PROHIBITED to finish ANY UI task before running a self-review (UI/UX Review) covering: visual consistency, responsiveness across screen sizes, and RTL support without any distortion.
- No UI task is complete until the UI/UX Review passes.

**Arabic-first**: RTL بـ `<html dir="rtl" lang="ar">`، خطوط **self-hosted** تُخدم من `/fonts/fonts.css` (روابط stylesheet في الـlayout + preload لأوزان cairo-arabic.woff2 وreadex-pro.woff2 العربية، font-display: swap) — **ليست next/font** ولا خطوط Google الخارجية (قرار موثّق: صفر جولة شبكة حاجبة للعرض)، CSS logical properties (`ms-`/`me-`).

**اللون البرتقالي**: `#f66d0f` (oklch(0.55 0.19 45)). الوضع المظلم افتراضي، `.light` override.

---

## Quick Start

```bash
pnpm install                 # المشروع pnpm فقط (pnpm-lock.yaml)
npx prisma generate
npx prisma migrate deploy    # نفس قناة الإنتاج — لا تستخدم db push
node scripts/ci-seed.mjs     # admin + باقات (idempotent)
node scripts/round83-seed.mjs # (اختياري محليًا) مطعم al-waha-cafe + 9 أصناف + featured
pnpm dev
# → http://localhost:3000
```

### Seed Accounts (ci-seed)

| User | Password | Role |
|------|----------|-----|
| `admin` | `admin123456` | admin |

> round83-seed يضيف (محليًا فقط): `waha_owner` / `waha123456` (owner, al-waha-cafe).
> لا يوجد `prisma db seed` في prisma.config.ts — الأمر غير موجود ولا يعمل.

---

## Architecture

Multi-tenant restaurant SaaS. QR-scannable digital menus, WhatsApp ordering, modifiers system, loyalty program, Telegram ChatOps for payment approvals, owner dashboard with advanced analytics, super-admin panel.

**تطبيق الجوال (mobile/)** — Expo SDK 53 · React Native 0.79.6 · React 19 · Hermes · NativeWind: منيو عام (نفس API الويب)، سلة→طلب→واتساب، لوحة مالك (طلبات لحظية 5s + QR + haptics)، دخول Bearer عبر SecureStore. **عربي فقط RTL من أول إطار** (with-force-rtl prebuild + I18nManager.forceRTL). التوازي الكامل مع الويب مثبَت r114 على محاكي API 25 ضد الإنتاج (طلب حقيقي + فاتورة واتساب). البوابات: `pnpm verify:mobile` من الجذر. التفاصيل: `mobile/README.md`.

### Core Domains

| المجال | المسار | الوصف |
|--------|--------|-------|
| **Public Menu** | `/menu/[slug]` | منيو رقمي مع تصنيفات، فرز، بحث، طلب عبر واتساب مع modifiers |
| **Owner Dashboard** | `/owner` | صفحة رئيسية بـ KPIs متحركة، تحليلات متقدمة (إيرادات 7 أيام، أعلى الأصناف، توزيع ساعي)، إدارة الطلبات (تنبيه polling كل 5 ثوان على endpoint العدد)، QR، برنامج الولاء، التقارير والمراجعات |
| **Admin Panel** | `/admin` | إدارة متعددة للمطاعم، المستخدمين، الباقات، الاشتراكات، أحداث النظام لحظياً، تيليغرام، صلاحيات الأدمن، سجل التدقيق |
| **Cart** | `/cart` | سلة تسوق (Zustand + persistence)، اختيار نوع الطلب (داخلي/توصيل/استلام)، إرسال عبر واتساب |
| **Subscriptions** | `/subscribe` | باقات متدرجة (Free/Basic/Premium/Pro/Enterprise)، تحقق مسبق من username + slug، مدفوعات عبر Telegram inline keyboards |
| **Telegram Bot** | — | موافقات الدفع (أعتمد/ارفض)، رسائل جماعية، تشخيص |
| **Loyalty & Referrals** | `/owner/loyalty` | مستويات (برونز/فضي/ذهبي/بلاتيني)، بطاقة ولاء برصيد النقاط، كود إحالة مع خصم/مكافأة |
| **Real-time (polling)** | notifier hooks | polling مع visibilitychange pause (round84: SSE أُزيل — Vercel يقتل الـ streams عند 300 ثانية). OrderNotifier 5s → `/api/orders/count` (round85)، الأحداث 15s |

---

## Data Model (25 models)

### Core
- `User` — مستخدم المنصة (admin/owner) مع صلاحيات RBAC (`Permission[]`)
- `UserRestaurant` — رابط مستخدم↔مطعم متعدد (multi-menu؛ r118: عزل المستأجر عبر `requireRestaurant` وروابط المالك متعدد المنيوهات)
- `Session` — جلسات المصادقة (httpOnly cookie 24h)
- `Restaurant` — بيانات المطعم (اسم، slug، واتساب، شعار، خطة)

### Menu
- `MenuCategory` — تصنيفات القائمة (`restaurantId`)
- `MenuItem` — عناصر القائمة (اسم، وصف، سعر، خصم، صورة، حالة)
- `ModifierGroup` — مجموعات الإضافات (اختياري/إجباري، حد أدنى/أقصى)
- `ModifierOption` — خيارات الإضافة (اسم، فرق السعر، التوفر)

### Orders
- `Order` — الطلب (رقم، حالة، نوع، إجمالي، عميل)
- `OrderItem` — عنصر الطلب (كمية، ملاحظات، سعر، `modifiersJson`)
- `Review` — تقييم العنصر (تقييم 1-5، تعليق، اسم العميل)

### Loyalty
- `LoyaltyCard` — بطاقة ولاء (نقاط، إجمالي الإنفاق، المستوى)
- `Referral` — كود إحالة (رمز الخصم، نسب الخصم/المكافأة)
- `RewardTransaction` — حركة نقاط (ربح/استهلاك)

### System
- `AuditLog` — سجل التدقيق
- `SystemEvent` — أحداث النظام (severity: info/warning/error/critical)
- `SubscriptionPlan` — كتالوج الباقات (Free/Basic/Premium/Pro/Enterprise) — أساس محرك الاشتراكات وحدود الخطة
- `SubscriptionPayment` — مدفوعات الاشتراك
- `TelegramConfig`, `TelegramApprover`, `TelegramBroadcastTarget`
- `RateLimitEntry`, `SystemConfig`, `Setting`, `WhatsappTemplate`

**Tenant isolation**: كل نموذج مرتبط بالمطعم عنده `restaurantId`. أصحاب يطلعون بـ `WHERE restaurantId = ?`. الأدمن يشوف كل شي. `User.restaurantId` يربط المالك بمطعمه.

---

## Directory Structure (تكملة)

```
src/
├── app/
│   ├── layout.tsx           ← الجذر الموحد (r119-B3: أصلح قوقع 404 العارية لـ Next16 — lang=ar dir=rtl + globals.css)
│   ├── (public)/layout.tsx    ← Public layout: self-hosted fonts (/fonts/fonts.css +
│   │                            preload links — NOT next/font), ThemeProvider, Toaster
│   ├── (protected)/layout.tsx ← Authenticated-area layout (owner/admin؛ fragments بعد r119-B3)
│   ├── (public)/page.tsx      ← Landing: server wrapper (ISR 60s) → HomePage component
│   ├── globals.css            ← tokens, utilities, keyframes, glass, animations
│   ├── proxy.ts            ← Next16 middleware: cookie gate + CSP nonce + security headers + CSRF origin (round85: matcher يستثني الأصول الثابتة)
│   ├── instrumentation.ts
│   │
│   ├── (public)/            ← الصفحات العامة: menu/[slug]، pricing، terms، privacy، landing، [...not-found]
│   ├── (protected)/         ← login، subscribe، cart، order-confirmed + owner/ + admin/
│   ├── owner/              ← لوحة المالك (10 صفحات)
│   │   ├── page.tsx        ← Dashboard: KPI grid متحرك، Orders list، Analytics tab متقدم
│   │   ├── OwnerCharts.tsx ← رسم بياني للإيرادات 7 أيام، أعلى الأصناف، توزيع ساعي
│   │   ├── OwnerKpiGrid.tsx ← 4 بطاقات KPIs مع عداد متحرك
│   │   ├── OwnerOrdersList.tsx ← ملخص الطلبات حسب الحالة، أشهر الأصناف، آخر الطلبات
│   │   ├── menu/           ← إدارة القائمة (CRUD تصنيفات + عناصر)
│   │   ├── orders/         ← إدارة الطلبات (حالة، بحث، تصدير CSV)
│   │   ├── qr/             ← كود QR مع تحميل وطباعة
│   │   ├── loyalty/        ← برنامج الولاء + المستويات + الإحالات
│   │   ├── reviews/        ← إدارة التقييمات
│   │   └── settings/       ← إعدادات المطعم
│   │
│   ├── admin/              ← لوحة الأدمن (13 صفحة)
│   │   ├── page.tsx        ← إحصائيات شاملة (161 مطعم، 320 مستخدم)
│   │   ├── restaurants/    ← إدارة المطاعم مع نموذج إضافة
│   │   ├── users/          ← إدارة المستخدمين
│   │   ├── subscriptions/  ← إدارة الباقات والاشتراكات
│   │   ├── admins/         ← إدارة الأدمن
│   │   ├── telegram/       ← إعدادات التيليغرام + التشخيص
│   │   ├── orders/         ← جميع الطلبات
│   │   ├── system-events/  ← أحداث النظام (SystemEventsClient)
│   │   ├── audit-logs/     ← سجل التدقيق
│   │   └── settings/       ← الإعدادات العامة
│   │
│   └── api/                ← 66 API route (RESTful) — حراسة check-api-auth.mjs تفحص تفويض كل معالج؛ الفهرس: docs/API.md
│       ├── auth/           ← login, logout, me, register
│       ├── restaurants/    ← CRUD مطاعم (+ owner/ نسخة المالك متعدد المنيوهات)
│       ├── categories/     ← CRUD تصنيفات
│       ├── items/          ← CRUD عناصر + تقييمات
│       ├── orders/         ← طلبات + modifiers + count (polling)
│       ├── subscriptions/  ← باقات، ترقية، تحقق، حالة
│       ├── loyalty/        ← ولاء + إحالة + إحصائيات
│       ├── admin/          ← أدمن (stats, system-events, telegram, config, users)
│       ├── telegram/       ← webhook + بث + تشخيص
│       ├── cron/           ← cleanup + subscription-expiry (CRON_SECRET)
│       ├── public/         ← menu/[slug], featured, stats (للجوال + الويب)
│       └── … (health, plans, upload, whatsapp, user, referrals, seed, config)
│
├── components/
│   ├── landing/            ← HomePage + 8 sections (Showcase, Features, Stats, FAQ, Clients, CTA...)
│   │   └── sections/       ← ClientsSection, FaqSection, FeaturedRestaurantsSection, ...
│   ├── menu/               ← MenuPageClient, MenuItemCard, OrderDialog, CartSlideOver, CategoryTabs...
│   ├── owner/              ← ItemDialog, PlanUsageBadge
│   ├── admin/              ← KpiCard, ConfigEditor, AdminEventNotifier
│   ├── shared/             ← 28 مكون: DefaultError/DefaultLoading (34+32 error/loading مدمجة — round85), AreaChart, PaymentDialog, KpiCard...
│   ├── layout/             ← Header, Footer, AdminSidebar, OrderNotifier (polling)، ThemeToggle
│   ├── loyalty/            ← LoyaltyWidget, LoyaltySettings, ReferralCard, ShareAfterOrder
│   └── ui/                 ← shadcn/ui base-nova: button, card, dialog, sheet, select, table...
│
├── lib/                    ← 61 ملف مكتبة (قياس r119؛ يشمل run-after-response (r119-B1)، menu-cache، modifier-schema، secure-compare، dietary)
│   ├── auth.ts             ← requireAuth, requireAdmin, requirePermission
│   ├── session.ts          ← التحقق من الجلسة
│   ├── db.ts               ← Prisma client + Decimal toNumber + withRetry (SQLSTATE codes)
│   ├── config.ts           ← إعدادات مشفرة + Telegram token regex
│   ├── csrf.ts             ← CSRF حماية
│   ├── rate-limit.ts       ← تحديد السرعة
│   ├── env.ts              ← التحقق من المتغيرات البيئية (SKIP_ENV_CHECK)
│   ├── hash.ts             ← تشفير كلمات المرور
│   ├── telegram.ts         ← إرسال إشعارات التيليغرام
│   ├── telegram-admin.ts   ← إدارة التيليغرام
│   ├── telegram-api.ts     ← API التيليغرام
│   ├── subscription-decisions.ts ← منطق الاشتراكات
│   ├── loyalty-tiers.ts    ← مستويات الولاء (برونز/فضي/ذهبي/بلاتيني)
│   └── logger.ts           ← التسجيل
│
├── store/
│   └── cart.ts             ← Zustand سلة التسوق (مع persist + SSR-safe)
│
├── hooks/
│   └── useConfig.ts        ← جلب الإعدادات مع module-level cache (TTL 60s)
│
├── public/
│   ├── sw.js               ← Service Worker (static: cache-first, API: network-first, nav: network-first)
│   ├── manifest.json       ← PWA manifest (standalone, RTL)
│   └── offline.html        ← صفحة offline مع إعادة محاولة
│
├── prisma/
│   └── schema.prisma       ← 25 models مع indexes + relations
│
└── tests/                  ← 140 unit (1995 حالة — قياس r119) + 43 e2e/security (فرق team1-11 · 484+ فحصًا)
    ├── unit/               ← auth, core, csrf, rate-limit, loyalty-subscription, receipt-whatsapp-format (round85)...
    ├── e2e/                ← رحلات matrix + referral-claim + teams/team11-modifiers
    └── security/           ← webhook-security, rbac-negative
```

### mobile/ (تطبيق الجوال — مستقل بنائياً)

```
mobile/
├── app.json               ← Expo: plugins (with-force-rtl, expo-build-properties minSdk 25، صلاحيات VIBRATE فقط)، App Links
├── eas.json               ← ملفات EAS: development / preview (APK) / production
├── plugins/with-force-rtl.js ← RTL وقت البناء (r119-B2M: manifest layoutDirection + iOS localizations)
├── src/
│   ├── app/               ← نقطة الدخول + تنقل React Navigation 7
│   ├── screens/           ← عام (منيو، سلة، تأكيد) + مالك (طلبات، QR، إعدادات) + دخول
│   ├── services/api/      ← عميل API (EXPO_PUBLIC_API_BASE_URL) + React Query
│   ├── store/             ← Zustand: سلة + مصادقة (SecureStore Bearer)
│   └── lib/               ← checkout-idempotency (r119-B2M)، عربية، ثوابت
├── package.json           ← pnpm@10.34.5 (الجذر pnpm@11.9.0 — تعمّد، يتبدل تلقائيًا داخل mobile/)
└── pnpm-lock.yaml         ← قفل مستقل + node-linker=hoisted (autolinking)
```

---

## Auth & Role System

### المصادقة
- **Primary**: `Session` model + `smart-menu-session` httpOnly cookie (24h sliding، SameSite=Lax, Secure). Token عشوائي SHA-256 hashed at rest — **لا JWT إطلاقًا**
- **كلمات المرور**: PBKDF2-SHA512 **600k تكرار** (round85-A3، كان 100k) + إعادة تهجئة شفافة عند الدخول للهاشات القديمة
- **requireAuth**: استعلام واحد (session + user join — round85-B6) + تجديد جلسة عند نصف العمر فقط
- **proxy.ts**: يحمي `/owner/*` و `/admin/*` (cookie presence — الفحص الفعلي داخل كل route)
- **CSRF**: double-submit `x-csrf-token` header + origin allowlist
- **CSP**: per-request nonce للـ scripts عبر `proxy.ts` (Next 16 middleware)
- **Rate limits**: DB-backed fail-closed (رحلة واحدة لكل فحص — round85-B5) على login/register/orders/loyalty/referrals/cron

### الأدوار
| Role | الوصول |
|------|--------|
| `super_admin` | كل شيئ (يتجاوز كل الصلاحيات) |
| `sub_admin` | حسب `permissions[]` الممنوحة |
| `owner` | مطعمه فقط (`restaurantId`) |
| `USER` | غير معتمد، لا وصول |

### دوال المصادقة
```typescript
requireAuth()              ← يقرأ الكوكي → يتحقق من Session → يُرجع { userId, role, restaurantId, permissions }
requireAdmin()             ← super_admin/sub_admin فقط
requirePermission('xxx')   ← super_admin يتجاوز، sub_admin يتحقق من permission
```

---

## Key Features

### Owner Dashboard
- **OwnerKpiGrid**: 4 بطاقات KPI مع عداد متحرك (إجمالي الطلبات، طلبات اليوم، الإيرادات، أصناف)
- **OwnerCharts (AnalyticsTab)**: رسم بياني للإيرادات 7 أيام (AreaChart)، طلبات 7 أيام، أعلى الأصناف مبيعاً (HorizontalBar مع نسبة النمو)، توزيع الطلبات حسب الساعة
- **OwnerOrdersList**: ملخص الطلبات حسب الحالة، أشهر الأصناف، آخر 5 طلبات، روابط سريعة
- **OrderNotifier**: تنبيه الطلبات الجديدة (polling 5s على /api/orders/count — استعلام COUNT واحد)
- **AdminEventNotifier**: أحداث النظام لحظياً للأدمن

### Menu System
- **CategoryTabs**: تصنيفات مع عداد العناصر
- **MenuToolbar**: بحث + فرز (السعر/الاسم)
- **MenuItemCard**: بطاقة صنف مع صورة، سعر، خصم، حالة متوفر/غير متوفر
- **OrderDialog**: نافذة اختيار الكمية + إضافات (modifiers) + ملاحظات سريعة + بيانات العميل
- **CartSlideOver**: سلة جانبية للموبايل
- **ReviewSheet**: تقييم الصنف بعد الطلب

### Modifiers System (جديد)
- `ModifierGroup` — مجموعة إضافات مع min/max select
- `ModifierOption` — خيار إضافة مع `priceDelta`
- `modifiersJson` — JSON في `OrderItem` لحفظ الإضافات المختارة
- `ModifierGroup` and `ModifierOption` cascade delete مع العنصر

### Subscription Plans
- **Free**: محدود (تصنيف واحد، 10 أصناف)
- **Basic**: تصنيفات غير محدودة، 50 صنف
- **Premium**: 200 صنف، تحليلات، QR
- **Pro**: 1000 صنف، ولاء، إحالات، CSV
- **Enterprise**: غير محدود، كل شيئ

### Telegram Integration
- موافقات الدفع عبر inline keyboard (معرف/ارفض)
- إشعارات الطلبات والمدفوعات فوراً
- بث رسائل جماعية
- تشخيص البوت
- `getDecryptedBotToken()` مع التحقق من صحة النمط `^\d+:[\w-]+$`

### PWA
- Service Worker مع 3 استراتيجيات: cache-first (assets)، network-first (API + navigations)
- Manifest كامل (standalone, RTL, icons 192/512)
- صفحة offline مع إعادة محاولة وروابط

### Real-time (polling — round84)
- SSE أُزيل بالكامل (Vercel يقطع الـ streams عند 300 ثانية — قرار موثق ponytail)
- OrderNotifier: 5s (count endpoint خفيف round85-B3) · UserBannerNotifier + AdminEventNotifier: 15s
- كلها توقف عند إخفاء التبويب (visibilitychange) — لا تسريبات مؤقتات

---

## Security

- **CSP**: `default-src 'self'` مع `'nonce-{random}'` للـ scripts (middleware)
- **HSTS**: `max-age=31536000; includeSubDomains`
- **X-Frame-Options**: `DENY`
- **X-Content-Type-Options**: `nosniff`
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=()`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Rate Limiting**: لكل endpoint مع `RETRY_CODES` (SQLSTATE)
- **withRetry**: كشف أخطاء PostgreSQL بالأكواد (`40001`, `40P01`, `57014`, `08000`, `P2034`)

## Key Libraries

| المكتبة | الاستخدام |
|---------|-----------|
| `next@16.3.4` | الإطار الرئيسي (App Router) |
| `react@19.2.8` | واجهة المستخدم |
| `prisma@7.8` | ORM مع PostgreSQL (pg adapter + pool tuned) |
| `zustand` | إدارة حالة السلة مع persist |
| `motion@12` | حركات CSS (enter/exit، scroll) |
| `sonner` | إشعارات toast |
| `next-themes` | الوضع المظلم/الفاتح |
| `lucide-react` | الأيقونات |
| `tailwindcss@4` | CSS utility-first |
| `sharp@0.35.4` | تحسين الصور |
| `zod@4.3.6` | التحقق من الإدخال |

## Tests (1995 unit + e2e متعددة المشاريع في CI)

```
✓ unit/ (140 ملف، 1995 حالة — قياس r119؛ ⚠ حالتان تفشلان بعد دفعة r119-B3:
                              premium-toast aria-live + r93-w2a تعليق التخطيط — مُعلَّمتان للدفعة القادمة)
✓ e2e (CI: 4 projects)     — security + api(+referral-claim) + ui + auth-verify
✓ qa-teams (production)    — prod-qa (team1/2/5/6/9) تعمل ضد الإنتاج (continue-on-error)
✓ coverage gate            — ratchet (round92-D-ratchet): 80/74/75/83 — تُرفع فقط ولا تُخفض
```

### سلسلة البوابات المحلية (r119-B5-D — package.json)

```
pnpm verify         # lint → typecheck → test → build (كاملة؛ build يلمس قاعدة التطوير عبر migrate-deploy)
pnpm verify:fast    # lint → typecheck → unit المتأثرة فقط (vitest --changed HEAD) — بوابة الدفعات اليومية
pnpm verify:mobile  # cd mobile → tsc --noEmit + eslint
```

> GitHub Actions محجوب الفوترة منذ 19 سبتمبر — هذه السلسلة هي البوابة الفعلية (ENGINEERING_STATE r117-r119).

## Live Scripts (أدوات `scripts/` الحية — 27 ملفًا، قياس r119)

> سكربتات الجولات لمرة واحدة تُنقل إلى `scripts/archive/` بعد إغلاق الجولة (قاعدة W5)؛
> ما يلي هو المخزون الحي فقط (الأغراض مأخوذة من تعليقات رأس كل سكربت):

| السكربت | الغرض (سطر واحد) | موصول عبر |
|---------|------------------|-----------|
| `ci-seed.mjs` | بذر CI/المحلي: admin + الخطط الافتراضية (idempotent، بلا حلقة مصادقة) | CI + `pnpm db:seed` |
| `ci-triage.mjs` | مصنّف دفعات CI: code مقابل docs-only عبر GitHub compare API (fail-open) | CI (triage job، r118-A8) |
| `migrate-deploy.mjs` | نشر هجرات الإنتاج بأمان قبل البناء (r98) | `pnpm build` |
| `round83-seed.mjs` | بذر التحقق المحلي: مطعم al-waha-cafe + 9 أصناف بصور حقيقية + featured | CI + docs |
| `qa-seed.mjs` | بذر QA للرحلات العميقة محليًا (testmulti1568 + مطاعم IDOR) | CI |
| `r93-sim-seed.mjs` | بذرة تكميلية لرحلات محاكاة الجولة 93 (r93_sim_root/sa...) | CI |
| `check-secrets.mjs` | ماسح تسريبات الأسرار قبل الـcommit (ghp_/sk_/روابط DB — يفشل فورًا) | CI (بوابة أولى) |
| `check-api-auth.mjs` | حرس تفويض API: كل معالج مُصدّر يستدعي requireAuth/... أو في PUBLIC_ALLOWLIST | CI |
| `db-unstick.mjs` | فك انغلاق P1002 لقاعدة الإنتاج قبل البناء | `pnpm build` |
| `register-webhook.mjs` | تسجيل/ضبط ويبهوك بوت تلقجرام مع secret_token | `pnpm webhook:register` |
| `pg-local-start.sh` | إقلاع PostgreSQL محلي (embedded-postgres — بلا root/docker) | يدوي (round92) |
| `r92-e2e-local.sh` | مسار e2e محلي بجلسة واحدة: خادم standalone + Playwright (درس r88) | يدوي |
| `r93-sim-hostile.sh` | نفس المسار للمحاكاة المعادية (بلا ترخيح rate-limit — ميزانيات حقيقية) | يدوي |
| `r94-db-reset.mjs` | إعادة ضبط حالة DB بين دفعات e2e المحلية (round94) | يدوي |
| `r97-db-check.mjs` | فحص سريع لحالة قاعدة المرآة المحلية: مطاعم/أصناف/أدمن/خطط | يدوي (r97) |
| `r97-admin-pass.mjs` | مواءمة كلمة مرور أدمن المرآة المحلية مع عقد المسح SEED_ADMIN_PASS (KDF القديم عمدًا) | يدوي (r97) |
| `r95-standalone-prepare.sh` | مزامنة أصول standalone (static/public) كي لا تُصدَر 404 (r95-D) | r92-e2e-local.sh |
| `bundle-report.mjs` | تقرير حجم حزم JS العميل (raw/gzip + مقارنة لقطات) — round88-A1 | يدوي |
| `image-health.mjs` | فاحص حيوية روابط صور المنيو/الشعار/الأغلفة + og — round91 F-C | يدوي |
| `qa-cleanup-check.mjs` | تحقق تنظيف الإنتاج من بقايا QA (مستخدمون/مطاعم اختبارية) | يدوي |
| `r92-compress-og.mjs` | ضغط og-default.png بلا فقد جودة ملحوظ (palette + q80) | يدوي (r92-D12) |
| `render-og.mjs` | توليد صورة OG عبر page.setContent بخطوط البراند (serverless) | يدوي |
| `og-template.html` | قالب HTML عربي RTL لبطاقة OG (يُغذّى لـ render-og.mjs) | render-og.mjs |
| `r96-generate-demo-images.sh` | توليد 28 صورة منيو الديمو الخام (idempotent) — **خط أنابيب أصول الديمو** | يدوي (r96-W2) |
| `r96-convert-demo-images.mjs` | تحويل صور الديمو الخام إلى webp مضغوط بمقاسات البطاقات — **خط أنابيب أصول الديمو** | يدوي (r96-W2) |
| `r96-test-migration.mjs` | اختبار محلي لهجرة منيو الديمو على PGlite + إثبات idempotency | يدوي (r96-W3) |
| `r96-test-migration-prod-sim.mjs` | محاكاة سيناريو الإنتاج لهجرة الديمو (مطعم قائم بـ 16 صنفًا) | يدوي (r96-W3b) |

> ملاحظة r97-X5: سكربتا `r96-generate-demo-images.sh` + `r96-convert-demo-images.mjs`
> بقيا حيين عمدًا (خط أنابيب إعادة توليد أصول الديمو). أُرشِف دليل الإثبات لمرة واحدة
> (`r96-screenshots.mjs` · `r96-prod-simulation.mjs` → `scripts/archive/`)، بينما بقيا
> `r96-test-migration.mjs` + `r96-test-migration-prod-sim.mjs` حيين لأن مساريهما مُدرجان
> حرفيًا في FILE_ALLOWLIST داخل `scripts/check-secrets.mjs` — نقلهما يُبطل مطابقة
> الإدخالين ويُحمِّر بوابة الأسرار في CI.

## Environment Variables

| المتغير | مطلوب؟ | الوصف |
|---------|--------|-------|
| `DATABASE_URL` | ✅ مطلوب | اتصال PostgreSQL (Neon pooler) |
| `AUTH_SECRET` | ✅ مطلوب | سر HKDF (جلسات/تشفير تيليغرام) |
| `JWT_SECRET` | ✅ (اسم تاريخي — لا JWT مستخدم) | master secret احتياطي |
| `NEXT_PUBLIC_DOMAIN` | ✅ مطلوب | نطاق الموقع |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✅ مطلوب | رقم واتساب الافتراضي |
| `TELEGRAM_BOT_TOKEN/CHAT_ID/ADMIN_IDS/WEBHOOK_SECRET` | للتيليغرام | البوت (المخزن AES-GCM في DB) |
| `CRON_SECRET` | ✅ cron | Bearer للـ /api/cron/* (timing-safe round85) |
| `BLOB_READ_WRITE_TOKEN` | ✅ upload | Vercel Blob (أُضيف للـ .env.example — round85-A6) |
| `RATE_LIMIT_RELAX` | dev فقط | 1 = حدود مرخية للاختبارات المحلية |

## Coding Standards

- **المكونات**: named exports دائمًا (بدون `export default`)
- **ErrorBoundary**: لعزل أخطاء المكونات (`ErrorBoundary.tsx`)
- **التخزين المؤقت**: `useConfig` مع module-level cache (TTL 60s) + dedup
- **التعامل مع الأخطاء**: `try/catch` في كل API route + `withRetry` للـ DB
- **التصميم**: Prettier + EditorConfig، CSS مجمع بـ @utility
- **الثبات**: لا تحوير — always create new objects

---

## سجل الجولات (موجز — أحدث أولًا)

### الجولة 119 (2026-09-21) — أسطول 12 وكيلًا: جذر انحشار النشر + دفعات إصلاح + توثيق
- **جذر انحشار Vercel (r119)**: كل ودفعات r118 كانت بتأليف بريد غير مرتبط بحساب GitHub (`agent@smart-menu.dev`) → الـintegration يرفض التعرّف على المؤلف ويحجب النشر. أُصلحت الهوية إلى بريد الحساب الأساسي — دفعة r118 كاملة وصلت الإنتاج أول مرة (`92611477`). **القاعدة: بريد تأليف الـcommit = بريد حساب GitHub دائمًا.**
- **دفعات r119**: B1 (انحدار soft-404 للمنيو + فاتورة واتساب بحقيقة الخادم + fail-open لحد معدل الويبهوك + سقف طلبات لكل مطعم)، B2-M (RTL وقت البناء + minSdk 25 + صلاحيات + idempotency)، B3 (root layout للـ404 + a11y)، B5-D (هذا التحديث: بوابات triage للـCI + سلسلة verify + الأرشيف docs/rounds/audits/).
- **CI محجوب الفوترة** منذ 19 سبتمبر — سياسة دقائق ≤1800/شهر موثقة في keep_alive.yml (S10: إرجاع الفوترة بلا ضوابط = إعادة الحجب خلال 6-9 أيام).

### الجولة 118 (2026-09-20) — أعمق جولات التدقيق: أسطول 9 وكلاء + 5 دفعات
- P1×6 · P2×19 · P3×44 · P4×74 خام + عشرات الفحوص النظيفة (مصفوفة IDOR لـ66 مسارًا = صفر ثغرات).
- **B1**: عقد مجموعات الإضافات على الخادم + snapshot للـmodifiersJson + تصنيف triage للـCI. **B2**: دورة حياة تراجع السلة + حرس حذف مطعم له طلبات (409). **B3**: Data Cache لحمولة المنيو العام (60s + تنقية بالوسوم) + terms/privacy → ISR. **B4**: اختبارات مسار بيانات الجوال. **B5**: كنس CSS ميت.
- عزل المستأجر متعدد المنيوهات عبر `UserRestaurant` (requireRestaurant).

### r100-r117 (موجز — التفاصيل في docs/ENGINEERING_STATE.md)
- **r114**: إثبات التوازي الكامل للجوال على محاكي API 25 ضد الإنتاج + حد TLS (24 يفشل → minSdk 25 لاحقًا r119). **r116**: حادثة موافقات الدفع التلقية (idempotent replays + تعارضات). **r117**: خفض keep-alive 96→19/يوم + قياسات الأداء الحية. **r110-r113**: EAS APK + أرقام أداء حقيقية + مصفوفة تفويض 66 مسارًا. **r104**: انهيار إقلاع الجوال على Android (Intl.PluralRules غير مدعوم في Hermes) — مُصلح بمصنّف CLDR خالص. **r100-r103**: جوال EAS-ready + API المنيو العام + تدقيق clone نظيف.

### الجولة 96 (2026-09-09) — منيو عرض واقعي + التوأمة الكاملة + تنظيم المستودع
- **منيو الديمو الواقعي**: هجرة بيانات idempotent `20260909_round96_demo_menu` (فئات/أصناف عربية واقعية + مجموعات خيارات + featured) + 28 صورة عرض webp في `public/demo/` (سكربتات `scripts/r96-*`)
- **«اعرف المزيد» حُذفت** نهائيًا من `FeaturesSection` (الموضع الوحيد الموثق)
- **أيقونات SVG**: أقراص dietary و CategoryTabs بـ lucide بدل الإيموجي + تأديم `owner/loyalty` الداكن (W4b)
- **استكمال التوأمة البصرية**: 53/53 رمزًا + keyframe `upload-fly` + توهج `background-radial` (W4a — وفق تدقيق r96-A1/A2)
- **تنظيم المستودع (W5)**: جذر نظيف (README/CLAUDE/PROJECT فقط) + `docs/rounds/{plans,closures,inspections,qa,design,history}` + `scripts/archive/` — قاعدة موثقة: «الأرشيف سجل قرارات — يُنقل ولا يُحذف»
- قياس الجودة r97: 1908 اختبارات وحدة / 131 ملفًا · 484 فحص e2e / 42 ملفًا · 24 هجرة قابلة لإعادة التشغيل
