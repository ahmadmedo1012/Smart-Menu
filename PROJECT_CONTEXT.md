# Smart Menu - Project Context

## Overview
**Smart Menu** - Digital menu platform for restaurants/cafes with WhatsApp ordering, loyalty program, and admin dashboard. Arabic RTL, Next.js 16, React 19, PostgreSQL/Prisma.

---

## Tech Stack
- **Framework**: Next.js 16.2.9 (App Router, RSC, RTL)
- **UI**: Tailwind CSS 4, shadcn/ui (base-nova), Framer Motion, lucide-react
- **Database**: PostgreSQL + Prisma ORM 7.8
- **Auth**: JWT cookies (login, me, logout, admin)
- **Payments**: WhatsApp ordering + subscription plans
- **Analytics**: Vercel Analytics + Speed Insights
- **Real-time**: Server-sent events (SSE) for orders
- **PWA**: Service worker, manifest, offline support

---

## Project Structure

```
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx              # Landing page (HomePage)
│   │   ├── menu/[slug]/page.tsx  # Public menu view (QR access)
│   │   ├── cart/page.tsx         # Cart + WhatsApp order
│   │   ├── order-confirmed/      # Order confirmation
│   │   ├── login/page.tsx        # Owner login
│   │   ├── subscribe/page.tsx    # Subscription plans
│   │   ├── pricing/page.tsx      # Pricing page
│   │   └── terms/privacy/        # Legal pages
│   ├── (owner)/
│   │   ├── page.tsx              # Owner dashboard
│   │   ├── menu/page.tsx         # Menu management (CRUD)
│   │   ├── qr/page.tsx           # QR code generator
│   │   ├── loyalty/page.tsx      # Loyalty settings
│   │   ├── orders/               # Order management
│   │   └── settings/page.tsx     # Restaurant settings
│   ├── (admin)/
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── menu/page.tsx         # All restaurants menu mgmt
│   │   ├── qr/page.tsx           # Admin QR management
│   │   ├── subscriptions/        # Subscription mgmt
│   │   ├── users/page.tsx        # User management
│   │   ├── restaurants/page.tsx  # Restaurant mgmt
│   │   ├── orders/               # All orders view
│   │   ├── audit-logs/           # Audit logs
│   │   ├── system-events/        # System events
│   │   └── settings/page.tsx     # Platform settings
│   └── api/
│       ├── auth/                 # login, me, logout
│       ├── restaurants/          # CRUD restaurants
│       ├── categories/           # Menu categories CRUD
│       ├── items/                # Menu items CRUD
│       ├── orders/               # Orders + SSE stream
│       ├── loyalty/              # Loyalty program + referrals
│       ├── subscriptions/        # Subscription plans
│       ├── admin/                # Admin-only endpoints
│       ├── telegram/             # Telegram bot config
│       ├── whatsapp/             # WhatsApp link generator
│       └── upload/               # Image upload (Sharp)
├── components/
│   ├── landing/                  # Landing page sections
│   ├── menu/                     # Menu page components
│   ├── owner/                    # Owner dashboard components
│   ├── layout/                   # Header, Footer, Sidebar
│   ├── loyalty/                  # Loyalty widgets
│   ├── shared/                   # ThemeToggle, WhatsApp, Charts, etc.
│   └── ui/                       # shadcn/ui components (base-nova)
├── lib/
│   ├── auth.ts                   # JWT auth utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── utils.ts                  # cn(), formatters
│   └── whatsapp.ts               # WhatsApp link generator
└── hooks/                        # Custom React hooks
```

---

## Database Schema (Key Models)
- **Restaurant** - Core entity, has owner, plan, settings, QR code
- **User** - Owner/Admin roles, linked to restaurant
- **Category/MenuItem** - Menu structure with images, pricing, availability
- **Order/OrderItem** - WhatsApp orders with status tracking
- **LoyaltySettings/Referral** - Points, tiers, referral rewards
- **Subscription/Plan** - SaaS billing (LYD)
- **SystemEvent/AuditLog** - Admin monitoring
- **TelegramConfig** - Bot notifications

---

## Key Features

| Feature | Route | Description |
|---------|-------|-------------|
| **Landing** | `/` | Hero, features, testimonials, FAQ, CTA |
| **Public Menu** | `/menu/[slug]` | QR-accessible menu, categories, cart |
| **WhatsApp Order** | `/cart` | Cart → WhatsApp deep link with order details |
| **Loyalty** | `/owner/loyalty` | Points, tiers, referrals, share-after-order |
| **Owner Dashboard** | `/owner/*` | Menu CRUD, QR, orders, settings, analytics |
| **Admin Panel** | `/admin/*` | Multi-tenant mgmt, subscriptions, audit logs |
| **Real-time Orders** | SSE `/api/orders/stream` | Live order notifications |
| **PWA** | `/manifest.json` | Installable, offline-capable |

---

## Environment Variables
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXT_PUBLIC_DOMAIN=https://...
NEXT_PUBLIC_WHATSAPP_NUMBER=+218...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## Commands
```bash
npm run dev          # Dev server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npx prisma studio    # DB GUI
npx prisma db push   # Push schema
npx tsx prisma/seed.ts  # Seed DB
npx playwright test  # E2E tests
```

---

## Deployment
- **Vercel** (recommended) - auto-detects Next.js
- **Docker** - `Dockerfile` + `docker-compose.yml`
- **PostgreSQL** - Neon, Supabase, or self-hosted
- **PWA** - Service worker auto-registers via `ServiceWorkerInit`

---

## Design System
- **Single source of truth**: `DESIGN.md` — brand identity, color tokens (OKLCH), typography, spacing, motion, components
- Based on PlanPOS spec: live at https://planpos.com/
- Tokens defined in `globals.css` (CSS custom properties)

## Architecture Notes
- **Multi-tenant**: Restaurant isolation via `restaurantId` on all models
- **Auth**: JWT in httpOnly cookies, middleware protects `/owner/*` and `/admin/*`
- **RTL-first**: `dir="rtl"`, `lang="ar"`, Arabic fonts preloaded
- **Real-time**: SSE endpoint `/api/orders/stream` for owner/admin order notifications
- **Images**: Sharp optimization, uploaded to `/public/uploads` (local) or S3-compatible
- **Telegram**: Bot sends new order notifications to configured chat
- **WhatsApp**: Deep links with pre-filled order message in Arabic
- **Claude Flow v3**: Agent teams, swarm coordination, AgentDB memory, hooks enabled

---

## Key Files to Know
- `prisma/schema.prisma` - Full DB schema
- `src/lib/auth.ts` - JWT helpers, role guards
- `src/lib/whatsapp.ts` - WhatsApp message builder
- `src/middleware.ts` - Auth protection (check if exists)
- `components.json` - shadcn/ui config (base-nova, RTL)
- `.claude/settings.json` - Claude Flow v3 config
---

## Product Overview

Smart Menu replaces printed restaurant menus with a complete digital ordering platform. Restaurant owners create QR-linked digital menus; customers scan, browse, and order from their phones — no app install needed. The platform handles the full order lifecycle: menu display, cart management, order submission, payment processing, and loyalty/referral system.

---

## QA Report (2026-06-26)

| Check | Status | Notes |
|-------|--------|-------|
| Design system rebuild | ✅ | Orange #f66d0f primary, dark #111013 background, PlanPOS spacing/radius |
| Gold references removed | ✅ | 0 remaining in `src/` |
| Fonts — AloaaxB/Aloaax | ✅ | Loaded from PlanPOS origin |
| Font fallback | ✅ | Readex Pro / Noto Sans Arabic chain |
| Header — dark nav, orange CTA | ✅ | Fixed glass, orange active links |
| Hero — dark bg, orange glow | ✅ | #111013 bg, orange radial glow, 92px headline |
| CTAs orange | ✅ | variant="orange" on all primary buttons |
| PhoneMockup orange | ✅ | All gold→orange in screen content |
| Footer dark | ✅ | #111013 bg, white/orange text |
| Buttons | ✅ | All orange (no blues/cyans) |
| Animations | ✅ | Framer Motion spring physics, no tween |

## Verification Report — Black/White/Gold Editorial Redesign

All gold references removed from 48 files, replaced with orange brand. Pricing page blues migrated to neutral gray. All component blues (ScrollToTop, PaymentDialog, NavLink, card, OrderNotifier, MenuItemCard, MenuPageClient, OrderDialog, LoyaltyWidget, ReferralCard) → orange. Header/Footer gold-muted → orange-muted. ThemeToggle gold glow → orange. Button gradients gold → orange.

## Recent Audit (Agent 3 — 2026-06-28)

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 0 | No data-loss or security-bypass bugs |
| WARNING  | 6 | Fallback cookie auth, plan/restaurant decoupling, SubscriptionPayment no FK, rate-limiter single-instance, loyalty default restaurantId=1, settings hardcoded fields |
| INFO | 12 | Schema indexed, client generated, CSRF covered, owner isolation correct |
