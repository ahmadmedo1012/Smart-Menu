# Smart Menu — Project Reference

> آخر تحديث: 28 يوليو 2026 | Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui base-nova · Prisma 7.8 + PostgreSQL/Neon · JWT httpOnly cookies · Framer Motion · Zustand · Sonner · Vercel Fluid Compute

**Arabic-first**: RTL بـ `<html dir="rtl" lang="ar">`، خطوط Cairo (next/font)، CSS logical properties (`ms-`/`me-`).

**اللون البرتقالي**: `#f66d0f` (oklch(0.55 0.19 45)). الوضع المظلم افتراضي، `.light` override.

---

## Quick Start

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
# → http://localhost:3000
```

### Seed Accounts

| User | Password | Role | Restaurant |
|------|----------|------|------------|
| `admin` | `admin123` | super_admin | — |
| `waha` | `waha123` | owner | al-waha-cafe |
| `aseel` | `aseel123` | owner | aseel-restaurant |
| `roma` | `roma123` | owner | roma-pizza |

---

## Architecture

Multi-tenant restaurant SaaS. QR-scannable digital menus, WhatsApp ordering, modifiers system, loyalty program, Telegram ChatOps for payment approvals, owner dashboard with advanced analytics, super-admin panel.

### Core Domains

| المجال | المسار | الوصف |
|--------|--------|-------|
| **Public Menu** | `/menu/[slug]` | منيو رقمي مع تصنيفات، فرز، بحث، طلب عبر واتساب مع modifiers |
| **Owner Dashboard** | `/owner` | صفحة رئيسية بـ KPIs متحركة، تحليلات متقدمة (إيرادات 7 أيام، أعلى الأصناف، توزيع ساعي)، إدارة الطلبات مع SSE، QR، برنامج الولاء، التقارير والمراجعات |
| **Admin Panel** | `/admin` | إدارة متعددة للمطاعم، المستخدمين، الباقات، الاشتراكات، أحداث النظام لحظياً، تيليغرام، صلاحيات الأدمن، سجل التدقيق |
| **Cart** | `/cart` | سلة تسوق (Zustand + persistence)، اختيار نوع الطلب (داخلي/توصيل/استلام)، إرسال عبر واتساب |
| **Subscriptions** | `/subscribe` | باقات متدرجة (Free/Basic/Premium/Pro/Enterprise)، تحقق مسبق من username + slug، مدفوعات عبر Telegram inline keyboards، SSE实时 |
| **Telegram Bot** | — | موافقات الدفع (أعتمد/ارفض)، رسائل جماعية، تشخيص |
| **Loyalty & Referrals** | `/owner/loyalty` | مستويات (برونز/فضي/ذهبي/بلاتيني)، بطاقة ولاء برصيد النقاط، كود إحالة مع خصم/مكافأة |
| **Real-time (SSE)** | `/api/*/events/stream` | 30s heartbeat streams للطلبات، المدفوعات، أحداث الأدمن. ReadableStream (multi-instance) |

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
│   ├── middleware.ts       ← Auth gate + CSP nonce + security headers
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
│   ├── owner/              ← لوحة المالك (11 صفحة)
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
│   ├── admin/              ← لوحة الأدمن (12 صفحة)
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
│   └── api/                ← 60 API route (RESTful)
│       ├── auth/           ← login, logout, me, register
│       ├── restaurants/    ← CRUD مطاعم
│       ├── categories/     ← CRUD تصنيفات
│       ├── items/          ← CRUD عناصر + تقييمات
│       ├── orders/         ← طلبات + modifiers
│       ├── subscriptions/  ← باقات، ترقية، تحقق، حالة
│       ├── loyalty/        ← ولاء + إحالة + إحصائيات
│       ├── admin/          ← أدمن (stats, system-events, Telegram, config)
│       ├── owner/          ← مالك (reviews, stats)
│       ├── user/           ← المستخدم + أحداث SSE
│       └── whatsapp/       ← رابط واتساب المباشر
│
├── components/
│   ├── landing/            ← HomePage + 8 sections (Showcase, Features, Stats, FAQ, Clients, CTA...)
│   │   └── sections/       ← ClientsSection, FaqSection, FeaturedRestaurantsSection, ...
│   ├── menu/               ← MenuPageClient, MenuItemCard, OrderDialog, CartSlideOver, CategoryTabs...
│   ├── owner/              ← ItemDialog, PlanUsageBadge
│   ├── admin/              ← KpiCard, ConfigEditor, AdminEventNotifier
│   ├── shared/             ← 16 مكون: ErrorBoundary, AreaChart, HorizontalBar, PaymentDialog...
│   ├── layout/             ← Header, Footer, AdminSidebar, OrderNotifier (SSE)، ThemeToggle
│   ├── loyalty/            ← LoyaltyWidget, LoyaltySettings, ReferralCard, ShareAfterOrder
│   └── ui/                 ← shadcn/ui base-nova: button, card, dialog, sheet, select, table...
│
├── lib/                    ← 25 ملف مكتبة
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
└── tests/                  ← 18 ملف اختبار (298 case)
    ├── unit/               ← auth, core, csrf, lib, rate-limit, regression
    ├── e2e/                ← api-smoke, auth-fix, ui-sweep
    └── security/           ← webhook-security
```

---

## Auth & Role System

### المصادقة
- **Primary**: `Session` model + `smart-menu-session` httpOnly cookie (24h, SameSite=Lax, Secure)
- **Middleware**: يحمي `/owner/*` و `/admin/*` — غير المدفوع → `/subscribe`
- **CSRF**: `x-csrf-token` header + SameSite=Lax
- **CSP**: per-request nonce للـ scripts عبر middleware (`middleware.ts`)

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
- **OrderNotifier (SSE)**: إشعارات لحظية للطلبات الجديدة
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

### Real-time (SSE)
- `ReadableStream` لكل اتصال (يعمل مع multi-instance)
- 30s heartbeat
- مسارات: `/api/orders/stream`، `/api/user/events/stream`، `/api/admin/events/stream`

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
| `react@19.2.8` | واجهة المستخدم |
| `@prisma/client@7.9` | ORM مع PostgreSQL |
| `zustand` | إدارة حالة السلة مع persist |
| `framer-motion` | حركات CSS (enter/exit، scroll) |
| `sonner` | إشعارات toast |
| `next-themes` | الوضع المظلم/الفاتح |
| `lucide-react` | الأيقونات |
| `tailwindcss@4` | CSS utility-first |
| `sharp@0.35.3` | تحسين الصور |
| `zod@4.3.6` | التحقق من الإدخال |

## Tests (298 حالة)

```
✓ unit/auth.test.ts        — تسجيل الدخول، session، roles
✓ unit/core.test.ts        — المنطق الأساسي
✓ unit/csrf.test.ts        — حماية CSRF
✓ unit/lib.test.ts         — المكتبات
✓ unit/rate-limit.test.ts  — تحديد السرعة
✓ unit/regression*.ts      — اختبارات الانحدار
✓ e2e/*.spec.ts            — اختبارات المتصفح
✓ security/*.test.ts       — الأمان
```

## Environment Variables

| المتغير | مطلوب؟ | الوصف |
|---------|--------|-------|
| `DATABASE_URL` | ✅ مطلوب | اتصال PostgreSQL |
| `NEXT_PUBLIC_DOMAIN` | ✅ مطلوب | نطاق الموقع |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✅ مطلوب | رقم واتساب الافتراضي |
| `TELEGRAM_BOT_TOKEN` | للتيليغرام | توكن بوت التيليغرام (مشفر) |
| `SKIP_ENV_CHECK` | اختياري | `true` لتجاوز فحص البيئة في التطوير المحلي |

## Coding Standards

- **المكونات**: named exports دائمًا (بدون `export default`)
- **ErrorBoundary**: لعزل أخطاء المكونات (`ErrorBoundary.tsx`)
- **التخزين المؤقت**: `useConfig` مع module-level cache (TTL 60s) + dedup
- **التعامل مع الأخطاء**: `try/catch` في كل API route + `withRetry` للـ DB
- **التصميم**: Prettier + EditorConfig، CSS مجمع بـ @utility
- **الثبات**: لا تحوير — always create new objects
