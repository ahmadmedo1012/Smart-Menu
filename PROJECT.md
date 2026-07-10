# Smart Menu — Project Reference

**Stack**: Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui base-nova · Prisma 7.8 + PostgreSQL/Neon · JWT httpOnly cookies · Framer Motion · Zustand · Sonner · Vercel Fluid Compute

**Arabic-first**: RTL at `<html>` root, `lang="ar"`, Noto Naskh/Readex Pro fonts, CSS logical properties (`ms-`/`me-`).

**Orange brand**: Primary action `#f66d0f` (oklch(0.55 0.19 45)). No blue themes. Dark mode default, `.light` override.

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

| User | Password | Role |
|------|----------|------|
| `admin` | `admin123` | super_admin |
| `waha` | `waha123` | owner (al-waha-cafe) |
| `aseel` | `aseel123` | owner (aseel-restaurant) |
| `roma` | `roma123` | owner (roma-pizza) |

---

## Architecture

Multi-tenant restaurant SaaS. QR-scannable digital menus, WhatsApp ordering, loyalty program, Telegram ChatOps for payment approvals, owner dashboard, super-admin panel.

### Core Domains

- **Public Menu** (`/menu/[slug]`) — QR menus per restaurant. Browse, cart, WhatsApp order.
- **Owner Dashboard** (`/owner`) — CRUD items/categories/orders/QR/loyalty/reviews/settings.
- **Admin Panel** (`/admin`) — Multi-restaurant oversight, subscriptions, RBAC admins, Telegram config, audit logs, system events.
- **Subscriptions** — Tiered plans (free/paid). Pre-flight username+slug validation. Admin verifies payments via Telegram inline keyboards. SSE real-time status.
- **Telegram Bot** — Payment approval (Approve/Reject), broadcast messaging, diagnostics.
- **Loyalty & Referrals** — Points-based loyalty cards by customer phone. Referral codes with discount/reward percentages.
- **Real-time (SSE)** — 30s heartbeat streams for orders, subscription payments, admin events. In-memory EventEmitter (per-instance limitation).

### Data Model (13 models)

```
User — Sessions — AuditLogs — TelegramApprovers — SubscriptionPayments
  └─restaurantId→ Restaurant — Settings — WhatsappTemplates — LoyaltyCards
       └─planId→ SubscriptionPlan
       MenuCategory — MenuItem — OrderItems — Orders — Reviews
       LoyaltyCard — Referrals — RewardTransactions
  Standalone: TelegramConfig, TelegramBroadcastTarget, SystemConfig, SystemEvent
```

**Tenant isolation**: Every restaurant-scoped model has `restaurantId`. Owners query with `WHERE restaurantId = ?`. Admins bypass scope. `User.restaurantId` links owner.

### Auth & RBAC

- **Primary**: Session model + `smart-menu-session` httpOnly cookie (24h expiry, SameSite=Lax).
- **Fallback**: `smart-menu-auth` + `smart-menu-role` cookies (legacy degradation, empty permissions, role degraded).
- **`requireAuth()`** reads cookie → validates Session table → returns `{ user, permissions[], role }`.
- **Roles**: `super_admin` (bypasses all) > `sub_admin` (checked vs Permission[]) > `owner` (own restaurant) > `USER` (unapproved, no access).
- **Middleware**: Protects `/owner/*` and `/admin/*`. UNPAID → redirect `/subscribe`.
- **CSRF**: `csrf-token` header vs `csrf` cookie. Real protection is SameSite=Lax.

---

## Directory Structure

```
root/
├── CLAUDE.md              ← Agent instructions (short)
├── PROJECT.md             ← Full reference (this file)
├── .env                   ← Development env (gitignored)
├── .gitignore
├── components.json        ← shadcn/ui config
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
│
├── middleware.ts          ← Auth + CSRF + rate-limit middleware
├── instrumentation.ts     ← Next.js instrumentation hook
│
├── public/
│   ├── favicon.png       48×48
│   ├── icon-192.png      192×192
│   ├── icon-512.png      512×512
│   ├── brand-icon.png    160×160
│   ├── manifest.json     PWA manifest
│   ├── sw.js             Service worker
│   ├── offline.html      PWA offline fallback
│   ├── fonts/            Noto Naskh, Noto Sans Arabic, Readex Pro (woff2)
│   └── animations/       Lottie files (cooking, food-choice, restaurant-loading)
│
├── src/
│   ├── app/              Next.js App Router
│   │   ├── layout.tsx    Root layout (RTL html, fonts, metadata, theme provider)
│   │   ├── globals.css   Tailwind base + CSS variables
│   │   ├── page.tsx      Landing page
│   │   ├── error.tsx     Global error boundary
│   │   ├── not-found.tsx 404
│   │   ├── loading.tsx   Root loading
│   │   ├── robots.ts     SEO
│   │   ├── sitemap.ts    SEO
│   │   ├── favicon.ico   Legacy favicon
│   │   │
│   │   ├── login/         /login
│   │   ├── subscribe/     /subscribe (plan selection + checkout)
│   │   ├── pricing/       /pricing
│   │   ├── cart/          /cart (Zustand state, WhatsApp redirect)
│   │   ├── order-confirmed/  /order-confirmed
│   │   ├── privacy/       /privacy
│   │   ├── terms/         /terms
│   │   ├── menu/          /menu/* (public restaurant menus)
│   │   │   ├── [slug]/page.tsx
│   │   │   └── [slug]/print/page.tsx  Printable menu
│   │   ├── admin/         /admin/* (super-admin panel — RBAC gated)
│   │   └── owner/         /owner/* (owner dashboard — session gated)
│   │       ├── loyalty/   Loyalty config + referral tracking
│   │       ├── menu/      Items + categories CRUD
│   │       ├── orders/    Order queue + status management
│   │       ├── qr/        QR code generator
│   │       ├── reviews/   Customer reviews
│   │       └── settings/  Restaurant profile
│   │
│   ├── app/api/           Route handlers
│   │   ├── auth/          login, logout, me, register
│   │   ├── orders/        CRUD + SSE stream
│   │   ├── subscriptions/ validate, create, upgrade, status
│   │   ├── restaurants/   CRUD
│   │   ├── items/         CRUD + reviews
│   │   ├── categories/    CRUD
│   │   ├── admin/         stats, config, admins, subscriptions, audit-logs,
│   │   │                  system-events, telegram, events/stream, events/trigger,
│   │   │                  profile, notification-preferences, reset-password, create-owner
│   │   ├── telegram/      webhook, config, broadcast-targets, test, diagnose
│   │   ├── user/          events/stream (SSE — subscription_rejected)
│   │   ├── loyalty/       Card lookup, transactions, stats, referral
│   │   ├── stats/         Owner stats, advanced analytics, public stats
│   │   ├── upload/        Image upload (Sharp compression, max 5MB)
│   │   ├── settings/      Restaurant settings CRUD
│   │   ├── config/        Public platform config
│   │   ├── plans/         Subscription plans
│   │   ├── users/         User management (admin)
│   │   ├── whatsapp/      Generate WhatsApp deep link
│   │   ├── owner/         Owner reviews
│   │   ├── health/        Health check
│   │   ├── seed/          Database seeder (dev only)
│   │   ├── demo/          Create demo restaurant + auto-login
│   │   └── upload/        Image upload
│   │
│   ├── components/
│   │   ├── ui/            shadcn/ui primitives + custom (button, input, dialog, card, etc.)
│   │   ├── shared/        ThemeToggle, NavLink, FloatingWhatsApp, PaymentDialog, etc.
│   │   ├── layout/        Header, Footer, LayoutHeader, AdminSidebar, OrderNotifier
│   │   ├── landing/       HomePage, HeroSection, sections/
│   │   ├── menu/          MenuItemCard, OrderDialog, CartFloatingButton, etc.
│   │   ├── admin/         KpiCard, ConfigEditor, AdminEventNotifier
│   │   ├── owner/         ItemDialog, PlanUsageBadge, UserBannerNotifier
│   │   └── loyalty/       LoyaltyWidget, LoyaltySettings, ReferralCard, ShareAfterOrder
│   │
│   ├── lib/               Shared utilities
│   │   ├── db.ts          Prisma client + helpers (66 consumers)
│   │   ├── auth.ts        requireAuth, requireAdmin, requirePermission (49)
│   │   ├── api-helpers.ts success/error/paginated/notFound (56)
│   │   ├── csrf.ts        Token generate/validate (25)
│   │   ├── csrf-client.ts csrfFetch (22)
│   │   ├── session.ts     Session create/destroy/validate (5)
│   │   ├── hash.ts        Password hash/verify (5)
│   │   ├── logger.ts      Structured JSON logs (32)
│   │   ├── format.ts      Arabic number formatting, dates (29)
│   │   ├── audit.ts       Audit logging (10)
│   │   ├── rate-limit.ts  In-memory rate limiter (8)
│   │   ├── telegram.ts    Notifications (8)
│   │   ├── telegram-api.ts Keyboard messages (3)
│   │   ├── telegram-admin.ts Admin IDs (3)
│   │   ├── telegram-broadcast.ts Broadcast (2)
│   │   ├── subscription-decisions.ts Payment resolution (2)
│   │   ├── receipt.ts     WhatsApp receipt builder (2)
│   │   ├── env.ts         Env validation (1)
│   │   ├── config.ts      Platform config (1)
│   │   ├── motion.ts      Framer Motion presets (10)
│   │   ├── utils.ts       cn() (67)
│   │   ├── premium-toast.tsx Toast wrapper (32)
│   │   └── loyalty-tiers.ts
│   │
│   ├── hooks/             useConfig.ts
│   ├── store/             Zustand cart store
│   └── generated/prisma/  Auto-generated Prisma types (gitignored)
│
├── prisma/
│   ├── schema.prisma      13 models, 5 enums
│   └── migrations/       6 migration files (0_init → 5_add_telegram_approvers_bigint)
│
├── .github/workflows/     CI + keep_alive
├── .vscode/               Editor settings
└── .vercel/               Vercel project config
```

---

## API Reference (Key Endpoints)

### Auth
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | None | Login → session + cookies |
| POST | `/api/auth/logout` | Session | Destroy session |
| GET | `/api/auth/me` | Session | Current user |
| POST | `/api/auth/register` | Rate-limited | Register (USER/UNPAID) |

### Orders
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/orders` | Owner/Admin | List orders |
| POST | `/api/orders` | Rate-limited | Create order (public) |
| GET | `/api/orders/[id]` | Owner | Order detail |
| PUT | `/api/orders/[id]` | Owner | Update status |
| GET | `/api/orders/stream` | Owner | SSE new_order stream |

### Subscriptions
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/subscriptions` | None | List plans |
| POST | `/api/subscriptions` | Session | Create pending payment + Telegram notify |
| POST | `/api/subscriptions/validate` | Rate-limited | Pre-flight check (username + slug uniqueness) |
| POST | `/api/subscriptions/upgrade` | Session + rate-limit | Free→paid upgrade payment |
| GET | `/api/subscriptions/status` | Session | Poll payment status |

### Admin
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/stats` | VIEW_ANALYTICS | Dashboard stats |
| GET/PUT/DELETE | `/api/admin/config` | super_admin/EDIT_SETTINGS | SystemConfig CRUD |
| GET/POST | `/api/admin/admins` | super_admin | Sub-admin CRUD |
| POST | `/api/admin/subscriptions` | MANAGE_SUBSCRIPTIONS | Approve/reject payment |
| POST | `/api/admin/create-owner` | MANAGE_RESTAURANTS | Direct owner account creation |
| GET | `/api/admin/events/stream` | Admin | SSE events stream |

### Telegram
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/telegram/webhook` | Secret token | Bot webhook (/start, callback queries) |
| GET/POST | `/api/telegram/broadcast-targets` | Admin | Broadcast target CRUD |

### & more...
See full route map in `src/app/api/` — each route file documents its purpose.

---

## Environment Variables

### Required in Production
| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL (Neon) | `postgresql://u:p@ep-xxx.neon.tech/db` |
| `JWT_SECRET` | Session token signing | min 32 chars |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API | `123456:ABC-DEF1234ghIkl` |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook HMAC | random string |
| `ADMIN_PASSWORD` | Seed admin user | secure password |
| `NEXT_PUBLIC_DOMAIN` | Canonical domain | `https://example.com` |
| `TELEGRAM_ADMIN_IDS` | Comma-separated admin chat IDs | `123,456` |

### Conditional
| Variable | Purpose | When |
|----------|---------|------|
| `TELEGRAM_CHAT_ID` | Fallback broadcast chat | When no DB targets configured |
| `TELEGRAM_BOT_USERNAME` | Bot @username for link URLs | For Telegram linking |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Default WhatsApp fallback | When restaurant has none |

---

## Conventions

- **Naming**: Routes kebab-case, components PascalCase, utilities camelCase, hooks `use`-prefixed.
- **API responses**: Always `{ success: boolean, data?: T, error?: string }`.
- **CSRF**: `csrfFetch()` for client mutations; `generateToken()`/`validateToken()` server-side.
- **Error handling**: `success()`, `error()`, `handleError()`, `validationError()` from `api-helpers.ts`.
- **Zod**: Schema validation at input boundaries.
- **RTL**: `dir="rtl"` on `<html>`. Use CSS logical properties (`ms-` for margin-inline-start, `me-` for margin-inline-end). `mt-`/`mb-` are fine (physical).
- **Theme**: Dark mode default, `.light` class override. One theme per page.
- **TypeScript**: Strict mode. Prisma-generated types from `src/generated/` (gitignored).
- **Logging**: Structured JSON via `logger.ts` (debug/info/warn/error).
- **DB**: Integer autoincrement IDs (except Session `cuid()`). Hard deletes with cascade. `createdAt` + `updatedAt` on all primary entities.

---

## Known Limitations (Ponytail Notes)

| Ceiling | Current | Upgrade |
|---------|---------|---------|
| SSE EventEmitter | In-memory per-instance | Redis pub/sub |
| Rate limiter | In-process Map | DB/Redis backed |
| Cart state | Zustand, in-memory | localStorage persistence |
| Image storage | Direct upload + Sharp | S3/Cloudinary |
| Session storage | DB Session model | Redis cache |
| Search | SQL LIKE | PostgreSQL tsvector |

---

## PWA & Offline
- Service worker at `/sw.js` (registered in layout)
- Manifest at `/manifest.json` (standalone display, RTL, Arabic)
- `/offline.html` fallback
- `/menu/[slug]` pages cacheable by service worker
