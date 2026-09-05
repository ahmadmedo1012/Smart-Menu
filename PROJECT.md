# Smart Menu — Project Reference

> آخر تحديث: 6 سبتمبر 2026 (جولة 85) | Stack: Next.js 16.2 (App Router) · React 19.2 · Tailwind CSS 4 · shadcn/ui base-nova · Prisma 7.8 + PostgreSQL/Neon (opaque DB sessions — لا JWT) · motion (framer) · Zustand · Sonner · Vercel Fluid Compute

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

**Arabic-first**: RTL بـ `<html dir="rtl" lang="ar">`، خطوط Cairo (next/font)، CSS logical properties (`ms-`/`me-`).

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
- `SubscriptionPayment` — مدفوعات الاشتراك
- `TelegramConfig`, `TelegramApprover`, `TelegramBroadcastTarget`
- `RateLimitEntry`, `SystemConfig`, `Setting`, `WhatsappTemplate`

**Tenant isolation**: كل نموذج مرتبط بالمطعم عنده `restaurantId`. أصحاب يطلعون بـ `WHERE restaurantId = ?`. الأدمن يشوف كل شي. `User.restaurantId` يربط المالك بمطعمه.

---

## Directory Structure (تكملة)

```
src/
├── app/
│   ├── layout.tsx          ← Root layout: Cairo font, ThemeProvider, Toaster, Motion, GridPattern
│   ├── page.tsx            ← Landing page → HomePage component
│   ├── globals.css         ← ~560 سطر: tokens, utilities, keyframes, glass, animations
│   ├── proxy.ts            ← Next16 middleware: cookie gate + CSP nonce + security headers + CSRF origin (round85: matcher يستثني الأصول الثابتة)
│   ├── instrumentation.ts
│   │
│   ├── (public pages)
│   │   ├── pricing/        ← 5 باقات مع ميزات وCTA
│   │   ├── login/          ← تسجيل دخول + إعادة توجيه حسب الدور
│   │   ├── subscribe/      ← اختيار باقة + نموذج تسجيل (اسم، slug، واتساب، يوزر)
│   │   ├── terms/          ← شروط الاستخدام
│   │   ├── privacy/        ← سياسة الخصوصية
│   │   ├── menu/[slug]/    ← المنيو العام مع تصنيفات، فرز، بحث، إضافة إلى السلة
│   │   ├── cart/           ← سلة التسوق (نوع الطلب، بيانات العميل، إرسال واتساب)
│   │   └── order-confirmed/ ← تأكيد الطلب مع تفاصيل
│   │
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
│   └── api/                ← 65 API route (RESTful) — حراسة check-api-auth.mjs تفحص تفويض كل مسار
│       ├── auth/           ← login, logout, me, register
│       ├── restaurants/    ← CRUD مطاعم
│       ├── categories/     ← CRUD تصنيفات
│       ├── items/          ← CRUD عناصر + تقييمات
│       ├── orders/         ← طلبات + modifiers
│       ├── subscriptions/  ← باقات، ترقية، تحقق، حالة
│       ├── loyalty/        ← ولاء + إحالة + إحصائيات
│       ├── admin/          ← أدمن (stats, system-events, Telegram, config)
│       ├── owner/          ← مالك (reviews, stats)
│       ├── user/           ← المستخدم + أحداث (polling)
│       └── whatsapp/       ← رابط واتساب المباشر
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
├── lib/                    ← ~43 ملف مكتبة (round85: +menu-cache، +secure-compare، +get-error-message، +dietary)
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
└── tests/                  ← 27 unit (520 case) + 28 e2e/security files
    ├── unit/               ← auth, core, csrf, rate-limit, loyalty-subscription, receipt-whatsapp-format (round85)...
    ├── e2e/                ← 7 journey matrix + referral-claim (round85: مربوط بمشروع api بعد أن كان يتيمًا)
    └── security/           ← webhook-security
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
| `next@16.2.12` | الإطار الرئيسي (App Router) |
| `react@19.2.4` | واجهة المستخدم |
| `prisma@7.8` | ORM مع PostgreSQL (pg adapter + pool tuned) |
| `zustand` | إدارة حالة السلة مع persist |
| `motion@12` | حركات CSS (enter/exit، scroll) |
| `sonner` | إشعارات toast |
| `next-themes` | الوضع المظلم/الفاتح |
| `lucide-react` | الأيقونات |
| `tailwindcss@4` | CSS utility-first |
| `sharp@0.35.3` | تحسين الصور |
| `zod@4.3.6` | التحقق من الإدخال |

## Tests (520 unit + 181 e2e في CI)

```
✓ unit/ (27 ملف، 520 حالة)  — auth, core, csrf, rate-limit, loyalty-subscription,
                              receipt-whatsapp-format (round85 الجديدة), regression...
✓ e2e (CI: 4 projects)     — security + api(+referral-claim) + ui + auth-verify
✓ qa-teams (production)    — 19 spec تعمل ضد الإنتاج (continue-on-error)
✓ coverage gate            — ratchet calibrated (round85-D3): 22/19/29/23
```

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
