# Smart Menu — Architecture Blueprint
> Single source of truth. Auto-generated 2026-07-06.

## 1. Ecosystem Overview

**Smart Menu** is a multi-tenant restaurant SaaS platform. Arabic-first RTL architecture. Digital menu display via QR code. WhatsApp-ordering pipeline. Loyalty program with referral system. Telegram ChatOps for admin operations and payment approvals. Owner dashboard for restaurant management. Super-admin panel for platform oversight and subscription control.

### Core Domains
- **Public Menu**: QR-scannable digital menus per restaurant (`/menu/[slug]`). Customers browse items, add to cart, order via WhatsApp.
- **Owner Dashboard**: Restaurant-scoped CRUD for menu items, categories, orders, QR codes, loyalty settings, reviews.
- **Admin Super-Panel**: Multi-restaurant oversight, subscription management, Telegram bot configuration, user management, RBAC-admin CRUD, system events, audit logs.
- **Subscriptions & Payments**: Tiered subscription plans (free/paid). Pre-flight username+slug validation. Admin-verified payment approval via Telegram inline keyboards. SSE real-time payment status.
- **Telegram Bot**: Interactive bot for payment approval (Approve/Reject), broadcast messaging, diagnostics, config management.
- **Loyalty & Referrals**: Points-based loyalty cards tracked by customer phone. Referral codes with discount/reward percentages. Reward transactions on order completion.
- **Real-time (SSE)**: Server-Sent Events for order notifications, subscription payment status, admin system events. In-memory EventEmitter (known limitation: per-instance, not cross-region).

### Key Design Decisions
- **RTL-first**: `dir="rtl"` at HTML root, `lang="ar"`, Arabic fonts preloaded. CSS logical properties (`ms-`/`me-`) instead of physical (`ml-`/`mr-`).
- **Orange brand**: Primary action color `#f66d0f` (oklch(0.55 0.19 45)). No blue themes, no gradient text.
- **One theme per page**: Dark mode default, light via `.light` override. No mixed light/dark sections on same page.
- **Session-based auth (primary)**: Session model + `smart-menu-session` httpOnly cookie (24h expiry). Fallback cookie-based auth (`smart-menu-auth`, `smart-menu-role`) exists but returns empty permissions.
- **CSRF defense**: Defense-in-depth via `csrf-token` header validation against `csrf` cookie. Actual protection is `SameSite=Lax` on session cookies.
- **WhatsApp-only ordering**: Cart → WhatsApp deep link with pre-filled Arabic message. No in-app payment processing.

---

## 2. Technical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2.9 | App Router, Turbopack, RSC, RTL |
| Runtime | React 19 | Server Components + Client Components |
| Database | PostgreSQL (Neon) | Serverless Postgres via Prisma |
| ORM | Prisma 7.8 | Schema-first with migrations |
| Auth | JWT httpOnly cookies | Session model with 24h tokens |
| UI | Tailwind CSS 4 + shadcn/ui base-nova | Utility-first + component primitives |
| Animation | Framer Motion | Page transitions, micro-interactions |
| Icons | lucide-react | Icon set used across dashboard |
| State | Zustand | Client-side cart state only |
| Real-time | SSE (EventEmitter) | Per-instance, not cross-region |
| PWA | service worker + manifest | Offline-capable menu display |
| Analytics | Vercel Analytics + Speed Insights | Platform built-in |
| Deployment | Vercel Fluid Compute | Node.js runtime, 300s timeout |
| Payments | WhatsApp redirect | No in-app payment processing |

### Key Node Dependencies
- `@prisma/client` — database access
- `next` — framework
- `react`/`react-dom` — UI runtime
- `zustand` — cart state
- `framer-motion` — animations
- `lucide-react` — icons
- `tailwind-merge` + `clsx` — class merging
- `class-variance-authority` — component variants
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT signing
- `sharp` — image compression (upload)
- `zod` — schema validation

---

## 3. Directory Architecture

### `src/app/` — Next.js App Router (file-based routing)

```
src/app/
├── page.tsx                  /              Landing page (HeroSection, FeaturesSection, etc.)
├── layout.tsx                /layout        Root layout: RTL html, fonts, metadata
├── globals.css               /globals       Tailwind base + custom CSS variables
├── error.tsx                 /error         Global error boundary
├── not-found.tsx             /not-found     404 page
├── login/page.tsx            /login         Admin/Owner login form
├── subscribe/page.tsx        /subscribe     Subscription plan selection + checkou t flow
├── pricing/page.tsx          /pricing       Public pricing page
├── cart/page.tsx             /cart          Customer cart: items list, pickup type, WhatsApp redirect
├── order-confirmed/page.tsx  /order-confirmed  Post-order confirmation page
├── privacy/page.tsx          /privacy       Privacy policy page
├── terms/page.tsx            /terms         Terms of service page
│
├── menu/                     /menu/*        Public-facing restaurant menu (customer-facing)
│   ├── layout.tsx            /menu          Menu layout wrapper
│   └── [slug]/page.tsx       /menu/[slug]   Restaurant menu by slug — items, categories, cart
│
├── admin/                    /admin/*       Super-admin / sub-admin panel (RBAC gated)
│   ├── layout.tsx            /admin         Admin layout: sidebar, theme, session check
│   ├── page.tsx              /admin         Dashboard: KPIs, charts, stats
│   ├── admins/page.tsx       /admin/admins  Sub-admin CRUD (super_admin only)
│   ├── audit-logs/page.tsx   /admin/audit-logs  Audit trail viewer
│   ├── menu/page.tsx         /admin/menu    Multi-restaurant menu viewer
│   ├── orders/page.tsx       /admin/orders  Cross-restaurant order feed
│   ├── orders/[id]/page.tsx  /admin/orders/[id]  Single order detail
│   ├── qr/page.tsx           /admin/qr      QR code generator for any restaurant
│   ├── restaurants/page.tsx  /admin/restaurants  Restaurant CRUD (super/sub admin)
│   ├── settings/page.tsx     /admin/settings  Platform config (SystemConfig editor)
│   ├── subscriptions/page.tsx  /admin/subscriptions  Manage subscription payments
│   ├── system-events/page.tsx  /admin/system-events  Event log viewer
│   ├── telegram/page.tsx     /admin/telegram  Telegram bot config + broadcast targets
│   └── users/page.tsx        /admin/users   User management
│
├── owner/                    /owner/*       Restaurant-owner panel (session-gated)
│   ├── layout.tsx            /owner         Owner layout: header, plan badge
│   ├── page.tsx              /owner         Dashboard: orders, stats, quick actions
│   ├── loyalty/page.tsx      /owner/loyalty  Loyalty program settings
│   ├── menu/page.tsx         /owner/menu    Menu item + category CRUD
│   ├── orders/page.tsx       /owner/orders  Order queue with status management
│   ├── orders/[id]/page.tsx  /owner/orders/[id]  Single order detail with status updates
│   ├── qr/page.tsx           /owner/qr      QR code for restaurant menu
│   ├── reviews/page.tsx      /owner/reviews  Customer reviews list
│   └── settings/page.tsx     /owner/settings  Restaurant profile, WhatsApp number, hours
│
└── api/                      /api/*         API route handlers (see Section 7)
```

### `src/components/` — React component tree

```
src/components/
├── ui/                        shadcn/ui primitives + custom UI components
│   ├── button.tsx             Button (68 consumers — most-used component)
│   ├── input.tsx              Input (14)
│   ├── dialog.tsx             Dialog modal (12)
│   ├── badge.tsx              Badge (13)
│   ├── OptimizedImage.tsx     Image with lazy loading + blur (11)
│   ├── select.tsx             Select dropdown (4)
│   ├── sheet.tsx              Slide-over panel (3)
│   ├── card.tsx               Card container (2)
│   ├── table.tsx              Table (1)
│   ├── search-input.tsx       Debounced search (7)
│   ├── skeleton.tsx           Loading skeleton (2)
│   └── ...                    Other primitives
│
├── shared/                    Cross-cutting shared components
│   ├── ThemeToggle.tsx        Dark/light mode toggle (5 consumers)
│   ├── NavLink.tsx            Active-aware navigation link (3)
│   ├── BackButton.tsx         Navigation back button (3)
│   ├── FloatingWhatsApp.tsx   Floating WhatsApp button (2)
│   ├── PaymentDialog.tsx      Subscription payment dialog (1)
│   ├── PageFade.tsx           Framer Motion page transition wrapper (2)
│   ├── Confetti.tsx           Confetti animation (1)
│   ├── ScrollToTop.tsx        Scroll-to-top on route change (1)
│   ├── ShareButton.tsx        Web Share API button (1)
│   └── ...                    MotionProvider, LottieAnimation, ServiceWorkerInit
│
├── layout/                    Layout components
│   ├── Header.tsx             Site header (12 consumers)
│   ├── Footer.tsx             Site footer (6)
│   ├── LayoutHeader.tsx       Admin/owner dashboard header (2)
│   ├── AdminSidebar.tsx       Admin panel sidebar (1)
│   └── OrderNotifier.tsx      SSE-based order notification hook (1)
│
├── landing/                   Landing page components
│   ├── HomePage.tsx           Main landing page assembly
│   ├── HeroSection.tsx
│   ├── PhoneVideo.tsx
│   ├── landing-data.ts        Landing page content data
│   └── sections/
│       ├── FeaturesSection.tsx
│       ├── HowItWorksSection.tsx
│       ├── ClientsSection.tsx
│       ├── ShowcaseSection.tsx
│       ├── TestimonialsSection.tsx
│       └── FinalCTASection.tsx
│
├── menu/                      Public-facing menu components
│   ├── MenuClientSection.tsx   Menu page client wrapper
│   ├── MenuItemCard.tsx       Item card with add-to-cart (2)
│   ├── MenuPageClient.tsx     Menu page client logic
│   ├── OrderDialog.tsx        Item detail + quantity dialog (1)
│   ├── CartFloatingButton.tsx Floating cart button (1)
│   ├── StickyMenuHeader.tsx   Sticky category header (1)
│   ├── GalleryCarousel.tsx    Restaurant image gallery (1)
│   ├── ReviewSheet.tsx        Item review form (1)
│   └── StarRating.tsx         Star rating display (0 consumers — unused)
│
├── admin/                     Admin panel components
│   ├── KpiCard.tsx            KPI metric card (2)
│   ├── AdminEventNotifier.tsx SSE admin event listener (1)
│   ├── ConfigEditor.tsx       SystemConfig key-value editor (1)
│   └── ...                    LivePaymentToast (0 consumers — dead component)
│
├── owner/                     Owner panel components
│   ├── ItemDialog.tsx         Menu item create/edit dialog (1)
│   ├── PlanUsageBadge.tsx     Subscription plan usage indicator (1)
│   └── UserBannerNotifier.tsx SSE user event banner (1)
│
└── loyalty/                   Loyalty program components
    ├── LoyaltyWidget.tsx      Customer loyalty card widget
    ├── LoyaltySettings.tsx    Owner loyalty configuration
    ├── ReferralCard.tsx       Referral code display
    └── ShareAfterOrder.tsx    Post-order share prompt
```

### `src/lib/` — Shared utilities and server logic

| Module | Export | Consumers |
|--------|--------|-----------|
| `utils.ts` | `cn()` | 67 |
| `db.ts` | `prisma`, `withRetry`, `getUserById`, `dbHealth` | 66 |
| `api-helpers.ts` | `success`, `error`, `handleError`, `paginated`, `notFound`, `validationError` | 56 |
| `auth.ts` | `requireAuth`, `requireAdmin`, `requirePermission` | 49 |
| `logger.ts` | `log`, `debug`, `info`, `warn`, `error` | 32 |
| `premium-toast.tsx` | `premiumToast` | 32 |
| `format.ts` | `toArabicNumber`, `formatDate` | 29 |
| `csrf.ts` | `generateToken`, `validateToken` | 25 |
| `csrf-client.ts` | `csrfFetch` | 22 |
| `motion.ts` | `springGentle`, `springDefault`, `pageVariants` | 10 |
| `audit.ts` | `logAudit` | 10 |
| `telegram.ts` | `sendTelegramNotification`, `notifyEvent` | 8 |
| `rate-limit.ts` | `createRateLimiter` | 8 |
| `session.ts` | `createSession`, `destroySession`, `validateSession` | 5 |
| `hash.ts` | `hashPassword`, `verifyHash` | 5 |
| `telegram-api.ts` | `sendMessageWithKeyboard`, `editMessageReplyMarkup` | 3 |
| `telegram-admin.ts` | `getAdminTelegramIds` | 3 |
| `telegram-broadcast.ts` | `broadcastToAll`, `sendToChat` | 2 |
| `subscription-decisions.ts` | `resolveSubscriptionPayment` | 2 |
| `receipt.ts` | `buildReceiptMessage` | 2 |
| `env.ts` | `validateEnv` | 1 |
| `config.ts` | `getConfig`, `getConfigOrThrow`, `getAllConfigs` | 1 |
| `events.ts` | (re-exports EventEmitter) | 0 |

### `src/hooks/` — Custom React hooks
- `useConfig.ts` — fetches platform configuration (1 consumer)
- `useMe.ts` — fetches current user data (0 consumers — likely dead)

### `src/store/` — Zustand state management
- Cart state: items, quantities, totals
- Pickup type selection
- No Redux. No React Query. No server state library.

### `src/generated/` — Auto-generated Prisma types
- Prisma client types generated from schema

### `src/actions/` — Server Actions (if any)
- Reserved for future Next.js Server Actions pattern

### `src/video/` — Video-related assets
- Promotional/demo video files

---

## 4. Database Schema

### 4.1 Enums

```
SubscriptionStatus: UNPAID | PAID | REJECTED
EventSeverity:       info | warning | error | critical
Role:                super_admin | sub_admin | admin | owner | USER
Permission:          APPROVE_ORDERS | MANAGE_SUBSCRIPTIONS | EDIT_SETTINGS
                     | VIEW_ANALYTICS | MANAGE_RESTAURANTS | MANAGE_USERS
ItemStatus:          available | unavailable
OrderStatus:         new | preparing | ready | completed | cancelled
PickupType:          inside | takeaway | delivery
LoyaltyTier:         bronze | silver | gold | platinum
ReferralStatus:      pending | converted | expired
RewardType:          earn | redeem
AuditAction:         login | create | update | delete | export | other
```

### 4.2 Complete Model Reference

#### User
```
id                  Int           @id @default(autoincrement())
username            String        @unique
password            String        (bcrypt hash)
subscriptionStatus  SubscriptionStatus @default(UNPAID)
name                String
email               String        @default('')
phone               String        @default('')
restaurantId        Int?
planId              Int?
createdAt           DateTime      @default(now())
updatedAt           DateTime      @updatedAt
role                Role          @default(owner)
permissions         Permission[]  @default([])
lastLoginAt         DateTime?
telegramChatId      String?
telegramUsername    String?
telegramLinkedAt    DateTime?
telegramNotifyOrders    Boolean   @default(true)
telegramNotifyPayments  Boolean   @default(true)
telegramNotifySettings  Boolean   @default(false)
notificationPrefs   Json          @default('{}')

Relations: auditLogs[], sessions[], telegramApprovers[], subscriptionPayments[],
           plan -> SubscriptionPlan, restaurant -> Restaurant
Indexes: username (unique), restaurantId
```

#### SubscriptionPlan
```
id          Int           @id @default(autoincrement())
name        String        @unique
nameAr      String
price       Decimal       @default(0) @db.Decimal(10,2)
periodDays  Int           @default(30)
maxMenus    Int           @default(1)
maxItems    Int           @default(50)
maxOrders   Int           @default(500)
sortOrder   Int           @default(0)
isActive    Boolean       @default(true)
createdAt   DateTime      @default(now())
updatedAt   DateTime      @updatedAt
features    Json          @default('[]')

Relations: restaurants[], users[]
Indexes: name (unique), sortOrder
```

#### Restaurant
```
id            Int        @id @default(autoincrement())
name          String
slug          String     @unique
description   String     @default('')
logo          String     @default('')
phone         String     @default('')
whatsapp      String     @default('')
email         String     @default('')
address       String     @default('')
workingHours  String     @default('')
themeColor    String     @default('amber')
currency      String     @default('LYD')
isActive      Boolean    @default(true)
planId        Int?
planStart     DateTime?
planEnd       DateTime?
createdAt     DateTime   @default(now())
updatedAt     DateTime   @updatedAt
gallery       String[]   @default([])
maxItems      Int        @default(50)
maxOrders     Int        @default(500)
pickupTypes   String     @default('inside,takeaway,delivery')

Relations: loyaltyCards[], categories[], orders[], referrals[], plan -> SubscriptionPlan,
           rewardTransactions[], settings[], users[], whatsappTemplates[]
Indexes: slug (unique), planId
```

#### MenuCategory
```
id            Int        @id @default(autoincrement())
name          String
nameAr        String?
icon          String     @default('')
sortOrder     Int        @default(0)
isActive      Boolean    @default(true)
restaurantId  Int
createdAt     DateTime   @default(now())
updatedAt     DateTime   @updatedAt

Relations: restaurant -> Restaurant (onDelete: Cascade), items[]
Indexes: restaurantId
```

#### MenuItem
```
id              Int           @id @default(autoincrement())
name            String
nameAr          String?
description     String        @default('')
descriptionAr   String        @default('')
price           Decimal       @db.Decimal(10,2)
discountedPrice Decimal?      @db.Decimal(10,2)
image           String        @default('')
sortOrder       Int           @default(0)
categoryId      Int
createdAt       DateTime      @default(now())
updatedAt       DateTime      @updatedAt
status          ItemStatus    @default(available)
avgRating       Decimal?      @db.Decimal(3,2)
ratingCount     Int           @default(0)

Relations: category -> MenuCategory (onDelete: Cascade), orderItems[], reviews[]
Indexes: categoryId, status
```

#### Order
```
id              Int          @id @default(autoincrement())
orderNo         String       @unique
customerName    String       @default('')
customerPhone   String       @default('')
notes           String       @default('')
subtotal        Decimal      @db.Decimal(10,2)
discount        Decimal      @default(0) @db.Decimal(10,2)
total           Decimal      @db.Decimal(10,2)
whatsappSent    Boolean      @default(false)
restaurantId    Int
createdAt       DateTime     @default(now())
updatedAt       DateTime     @updatedAt
pickupType      PickupType   @default(inside)
status          OrderStatus  @default(new)

Relations: restaurant -> Restaurant, items[], referrals[], rewardTransactions[]
Indexes: orderNo (unique), restaurantId, createdAt, status
```

#### OrderItem
```
id          Int        @id @default(autoincrement())
quantity    Int        @default(1)
notes       String     @default('')
price       Decimal    @db.Decimal(10,2)
orderId     Int
itemId      Int

Relations: item -> MenuItem (onDelete: Restrict), order -> Order (onDelete: Cascade)
Indexes: orderId, itemId
```

#### Setting
```
id              Int        @id @default(autoincrement())
key             String
value           String     @default('')
restaurantId    Int
createdAt       DateTime   @default(now())
updatedAt       DateTime   @updatedAt

Relations: restaurant -> Restaurant (onDelete: Cascade)
Indexes: (key, restaurantId)
```

#### TelegramConfig
```
id          Int        @id @default(autoincrement())
botToken    String     @default('')
chatId      String     @default('')
events      Json       @default('[]')
isActive    Boolean    @default(false)
createdAt   DateTime   @default(now())
updatedAt   DateTime   @updatedAt

Relations: (standalone — no FK relations)
```

#### TelegramBroadcastTarget
```
id          Int        @id @default(autoincrement())
label       String     @default('')
chatId      String
isActive    Boolean    @default(true)
createdAt   DateTime   @default(now())
updatedAt   DateTime   @updatedAt

Relations: (standalone — no FK relations)
```

#### TelegramApprover
```
id          Int        @id @default(autoincrement())
telegramId  BigInt
label       String     @default('')
addedById   Int?
createdAt   DateTime   @default(now())

Relations: addedBy -> User
Indexes: telegramId
```

#### WhatsappTemplate
```
id              Int        @id @default(autoincrement())
name            String
template        String     @default('')
isActive        Boolean    @default(true)
restaurantId    Int
createdAt       DateTime   @default(now())
updatedAt       DateTime   @updatedAt

Relations: restaurant -> Restaurant (onDelete: Cascade)
Indexes: restaurantId
```

#### LoyaltyCard
```
id              Int           @id @default(autoincrement())
customerPhone   String
customerName    String        @default('')
totalOrders     Int           @default(1)
totalSpent      Decimal       @default(0) @db.Decimal(10,2)
points          Int           @default(0)
referralCode    String        @unique
restaurantId    Int
createdAt       DateTime      @default(now())
updatedAt       DateTime      @updatedAt
tier            LoyaltyTier   @default(bronze)

Relations: restaurant -> Restaurant (onDelete: Cascade), referrals[], rewardTransactions[]
Indexes: referralCode (unique), customerPhone, restaurantId
```

#### Referral
```
id                Int             @id @default(autoincrement())
referralCode      String
referrerId        Int
referredPhone     String          @default('')
referredName      String          @default('')
discountPercent   Int             @default(10)
referrerRewardPct Int             @default(10)
orderId           Int?
createdAt         DateTime        @default(now())
convertedAt       DateTime?
restaurantId      Int
status            ReferralStatus  @default(pending)

Relations: order -> Order, referrer -> LoyaltyCard (onDelete: Cascade),
           restaurant -> Restaurant (onDelete: Cascade)
Indexes: referralCode, referrerId, restaurantId
```

#### RewardTransaction
```
id              Int           @id @default(autoincrement())
cardId          Int
points          Int
description     String        @default('')
orderId         Int?
restaurantId    Int
createdAt       DateTime      @default(now())
type            RewardType    @default(earn)

Relations: card -> LoyaltyCard (onDelete: Cascade), order -> Order,
           restaurant -> Restaurant (onDelete: Cascade)
Indexes: cardId, restaurantId, orderId
```

#### AuditLog
```
id          Int          @id @default(autoincrement())
action      AuditAction  @default(other)
actorId     Int?
targetType  String       @default('')
targetId    Int?
metadata    Json         @default('{}')
ip          String       @default('')
createdAt   DateTime     @default(now())

Relations: actor -> User
Indexes: actorId, action, createdAt
```

#### Session
```
id          String    @id @default(cuid())
userId      Int
token       String    @unique
expiresAt   DateTime
createdAt   DateTime  @default(now())

Relations: user -> User (onDelete: Cascade)
Indexes: token (unique), userId, expiresAt
```

#### SubscriptionPayment
```
id          Int        @id @default(autoincrement())
userId      Int?
phone       String
amount      Decimal    @db.Decimal(10,2)
provider    String     @default('libyana')
planId      Int
planName    String     @default('')
status      String     @default('pending')
metadata    Json       @default('{}')
createdAt   DateTime   @default(now())

Relations: user -> User
Indexes: userId, status, createdAt
```

#### SystemConfig
```
id          Int        @id @default(autoincrement())
key         String     @unique
value       Json
category    String     @default('general')
isSecret    Boolean    @default(false)
description String     @default('')
updatedAt   DateTime   @updatedAt
updatedBy   Int?

Relations: (standalone — no FK relations)
Indexes: key (unique), category
```

#### Review
```
id              Int        @id @default(autoincrement())
rating          Int
comment         String     @default('')
customerName    String     @default('')
customerPhone   String     @default('')
menuItemId      Int
createdAt       DateTime   @default(now())

Relations: menuItem -> MenuItem (onDelete: Restrict)
Indexes: menuItemId
```

#### SystemEvent
```
id          Int            @id @default(autoincrement())
eventType   String
title       String
message     String         @default('')
severity    EventSeverity  @default(info)
metadata    Json           @default('{}')
read        Boolean        @default(false)
createdAt   DateTime       @default(now())

Relations: (standalone — no FK relations)
Indexes: eventType, severity, read, createdAt
```

### 4.3 Key FK Chains

```
User.restaurantId -> Restaurant.id
Restaurant -> SubscriptionPlan.planId

Restaurant -> MenuCategory.restaurantId (Cascade)
MenuCategory -> MenuItem.categoryId (Cascade)
MenuItem -> OrderItem.itemId (Restrict)
OrderItem -> Order.orderId (Cascade)
Order -> Restaurant.restaurantId

User -> Session.userId (Cascade)
User -> AuditLog.actorId

Restaurant -> LoyaltyCard.restaurantId (Cascade)
LoyaltyCard -> Referral.referrerId (Cascade)
LoyaltyCard -> RewardTransaction.cardId (Cascade)

User -> SubscriptionPayment.userId
SubscriptionPayment -> SubscriptionPlan.planId
```

### 4.4 Tenant Isolation

Every restaurant-scoped model carries `restaurantId`:
- `MenuItem`, `MenuCategory`, `Order`, `Setting`, `LoyaltyCard`, `Referral`, `RewardTransaction`, `WhatsappTemplate`
- Owners `WHERE restaurantId = ?` enforced at query level.
- Admins bypass restaurant scope.
- `User.restaurantId` links owner to their restaurant.

---

## 5. Core Workflows

### 5.1 Onboarding & Subscription

```
1. User visits /subscribe
2. Selects plan (free or paid)
3. Fills form: restaurant name, slug, username, password
4. Free plan (price=0):
   → POST /api/auth/register creates user as USER/UNPAID
   → Immediately promotes to owner, creates restaurant
   → No payment dialog, no admin approval
5. Paid plan:
   → POST /api/subscriptions/validate checks uniqueness (username, slug, pending payments)
   → POST /api/auth/register creates user as USER/UNPAID, session established
   → PaymentDialog opens: user enters phone + provider info
   → POST /api/subscriptions creates SubscriptionPayment (status=pending)
   → Metadata stores tempUsername, tempRestaurantSlug
   → Telegram sendMessageWithKeyboard to TELEGRAM_ADMIN_IDS + DB TelegramApprovers
   → User sees waiting dialog: 30s countdown + SSE listener (/api/user/events/stream)
6. Admin taps Approve:
   → POST /api/telegram/webhook handles callback_query
   → resolveSubscriptionPayment(paymentId, 'verified')
   → Atomic $transaction:
     - payment.status = 'verified'
     - user.role = 'owner', subscriptionStatus = 'PAID'
     - Creates Restaurant with temp slug + name
   → SSE pushes to admin and user streams
   → User redirected to /owner
7. Admin taps Reject:
   → resolveSubscriptionPayment(paymentId, 'cancelled')
   → payment.status = 'cancelled'
   → user.subscriptionStatus = 'REJECTED'
   → SSE pushes subscription_rejected to user stream
   → Dialog closes, error toast, form unlocked
8. Session cookie `smart-menu-session` tracks user throughout
```

#### Pre-flight Validation (POST /api/subscriptions/validate)
- Checks username uniqueness in `User` table
- Checks slug uniqueness in `Restaurant` table
- Checks for pending payments with same username/slug in `SubscriptionPayment.metadata`
- Returns validation result before payment dialog opens
- Prevents ghost pending payments from blocking re-subscription

#### Upgrade Flow (free → paid)
```
1. Owner on free plan sees upgrade button
2. GET /api/auth/me detects role=owner, restaurant planId=null
3. /subscribe page enters upgradeMode: plan selector only
4. Owner selects plan → POST /api/subscriptions/upgrade
   { planId, phone, amount, provider, upgradeRestaurantId }
5. Server validates: restaurant exists, user owns it, no current plan, no pending upgrade
6. SubscriptionPayment created with metadata.upgradeRestaurantId
7. Same Telegram approval chain as new subscription
8. handleVerified: updates restaurant.planId/planStart/planEnd (no new restaurant created)
```

### 5.2 Telegram ChatOps & SSE

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  User/Admin  │     │  Telegram Bot    │     │  Smart Menu  │
│  (Client)    │     │  (telegr.am)     │     │  (Server)    │
└──────┬───────┘     └────────┬─────────┘     └──────┬───────┘
       │                      │                      │
       │   Subscribe SSE      │                      │
       │◄─────────────────────│──────────────────────│
       │                      │                      │
       │                      │  callback_query      │
       │                      │◄─────────────────────│
       │                      │                      │
       │                      │  200 OK              │
       │                      │─────────────────────►│
       │                      │                      │
       │                      │                      │ Process
       │                      │                      │ payment
       │                      │                      │
       │   SSE event          │                      │
       │◄─────────────────────│──────────────────────│
       │                      │                      │
       │   Update UI          │                      │
       │   (redirect/toast)   │                      │
```

**SSE Event Streams:**
| Stream URL | Auth | Events | Listener Pages |
|-----------|------|--------|----------------|
| `/api/orders/stream` | Owner session | `new_order` | /owner/orders |
| `/api/admin/events/stream` | Admin session | `new_payment`, `new_order`, notification | /admin/* |
| `/api/user/events/stream` | Session | `subscription_rejected` | /subscribe, /checkout |

**EventEmitter Limitation:** SSE uses a global Node.js EventEmitter (`src/lib/events.ts`). On Vercel's serverless architecture, each invocation gets a fresh instance. An SSE connection on instance A registers a listener on A's EventEmitter. A payment approval on instance B emits on B's EventEmitter. The event is invisible to instance A — SSE notifications can be silently lost. Fix requires Redis pub/sub or a shared event bus.

**Telegram Webhook:**
- `POST /api/telegram/webhook` receives callback queries and `/start` commands
- Validates `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET` env var
- Admin identity verified via `TELEGRAM_ADMIN_IDS` env var + `TelegramApprover` DB table
- Payment decisions: callback_data `sub_app:{paymentId}` or `sub_rej:{paymentId}`
- Shared handler `resolveSubscriptionPayment()` used by both Telegram webhook and admin panel

### 5.3 Order Flow

```
1. Customer scans QR code or opens /menu/[slug]
2. Browses categories + items (images, prices, descriptions, ratings)
3. Adds items to cart via MenuItemCard → OrderDialog (quantity, notes)
4. Cart state managed in client-side Zustand store
5. Customer views cart at /cart:
   - Item list with quantities and prices
   - Subtotal, discount, total calculation
   - Pickup type selection: inside / takeaway / delivery
6. Clicks WhatsApp order button
   → Builds WhatsApp deep link: https://wa.me/{restaurant_whatsapp}?text={encoded_order_message}
   → Message pre-filled in Arabic with order details
   → If no restaurant WhatsApp, falls back to NEXT_PUBLIC_WHATSAPP_NUMBER
7. Customer completes order manually in WhatsApp
8. POST /api/orders creates Order record (status=new)
   - Rate-limited (public endpoint)
   - Records customer name, phone, notes, items, totals
9. Telegram notification sent to admin allowlist about new order
10. Owner dashboard: SSE stream pushes new_order event
11. Owner updates order status: new → preparing → ready → completed
12. On completion: loyalty points recorded
    - LoyaltyCard lookup by customer phone
    - RewardTransaction created (type=earn)
```

### 5.4 Auth & RBAC

```
┌────────────────────────────────────────┐
│            middleware.ts                │
│  Checks smart-menu-session cookie       │
│  Protects /owner/* and /admin/*         │
│  UNPAID users → redirect to /subscribe  │
└──────────────┬─────────────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│         requireAuth() (auth.ts)         │
│  Reads session from DB by cookie token  │
│  Returns { user, permissions[], role }  │
│  24h session expiry                     │
└──────────────┬─────────────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│     Role Hierarchy + Permission Check   │
│                                         │
│  super_admin ──── bypasses ALL checks   │
│  sub_admin  ──── checked vs Permission[]│
│  admin      ──── (legacy, maps to       │
│                   sub_admin in code)     │
│  owner      ──── sees own restaurant    │
│  USER       ──── unapproved, no access  │
│                                         │
│  requirePermission('EDIT_SETTINGS')     │
│  valid for: super_admin + sub_admin     │
│  with EDIT_SETTINGS in permissions[]    │
└────────────────────────────────────────┘
```

**Session vs Fallback Cookies:**
- Primary: `smart-menu-session` (httpOnly, SameSite=Lax, 24h) → database Session model
- Fallback: `smart-menu-auth` (user ID), `smart-menu-role` (role string) → returns empty permissions, role degradation
- Logout: destroys both session and fallback cookies

**Admin Permission Matrix (6 permissions):**
| Permission | super_admin | sub_admin | Effect |
|-----------|-------------|-----------|--------|
| APPROVE_ORDERS | auto | checked | Approve order status changes |
| MANAGE_SUBSCRIPTIONS | auto | checked | Approve/reject payments |
| EDIT_SETTINGS | auto | checked | Update platform config |
| VIEW_ANALYTICS | auto | checked | View admin dashboard stats |
| MANAGE_RESTAURANTS | auto | checked | CRUD restaurants |
| MANAGE_USERS | auto | checked | Manage user accounts |

---

## 6. Auth & Authorization Architecture

### Session-Based Auth (Primary)
- `POST /api/auth/login` — validate credentials, create Session record, set cookies
- `Session` model: `id (cuid)`, `userId`, `token (unique)`, `expiresAt`, `createdAt`
- Cookie: `smart-menu-session` — httpOnly, SameSite=Lax, Secure (prod), Path=/, 24h maxAge
- `requireAuth()` reads token from cookie → queries Session table → checks expiry → returns user
- `validateSession()` in `src/lib/session.ts` — primary session validation function

### Fallback Cookie Auth
- `smart-menu-auth` cookie stores user ID (not a token — replayable)
- `smart-menu-role` cookie stores role string
- Used as degradation path when session cookies expire
- Returns empty permissions array — role degradation means restricted access

### Middleware Protection
- `middleware.ts` checks `smart-menu-session` cookie existence
- `/owner/*` routes: redirects to `/login` if no session or UNPAID
- `/admin/*` routes: redirects to `/login` if no session or UNPAID
- UNPAID users redirected to `/subscribe`
- CSRF middleware validates `csrf-token` header vs `csrf` cookie
- Rate limiter in middleware for auth endpoints

### RBAC Implementation
- `requireAdmin()` — checks for `super_admin` or `sub_admin` role
- `requirePermission(permission)` — checks permissions array for sub_admin, auto-pass for super_admin
- Owner isolation: queries scoped to `req.user.restaurantId`
- `super_admin` bypasses all permission checks unconditionally

### Known Vulnerabilities
- **IDOR in upgrade route**: `/api/subscriptions/upgrade` had its ownership check removed in commit `0440c408`. This was later re-added — line 59-61 now verifies `auth.restaurantId === upgradeRestaurantId` for non-admin users. The fix is live but the git history still shows the vulnerable window.
- **Rate limiter is in-memory**: `createRateLimiter()` uses in-process Map. On Vercel serverless, each invocation gets fresh Map. Rate limits are bypassed across instances.
- **CSRF is defense-in-depth**: Real protection is SameSite=Lax. CSRF middleware validates header against cookie. Would not stop same-site scripting.

---

## 7. API Reference

### Auth (`/api/auth/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/login` | POST | None | Authenticate user, set session + fallback cookies |
| `/api/auth/logout` | POST | Session | Clear session, destroy cookies |
| `/api/auth/me` | GET | Session | Return current authenticated user data |
| `/api/auth/register` | POST | Rate-limited | Register new user as USER/UNPAID, create session |

### Orders (`/api/orders/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/orders` | GET | Owner/Admin | List orders (restaurant-scoped for owner) |
| `/api/orders` | POST | Rate-limited | Create order (public — customer submits) |
| `/api/orders/[id]` | GET | Owner session | Get order details |
| `/api/orders/[id]` | PUT | Owner session | Update order status (completed/cancelled) |
| `/api/orders/stream` | GET | Owner session | SSE stream for real-time order notifications |

### Subscription (`/api/subscriptions/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/subscriptions` | GET | None | List subscription plans |
| `/api/subscriptions` | POST | Session | Create pending subscription payment with Telegram notification |
| `/api/subscriptions/validate` | POST | Rate-limited | Pre-flight: check username + slug uniqueness |
| `/api/subscriptions/upgrade` | POST | Session + rate-limited | Create upgrade payment for existing free-plan owner |
| `/api/subscriptions/status` | GET | Session | Poll payment status by paymentId |

### Restaurants (`/api/restaurants/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/restaurants` | GET | None | List all restaurants (public menu discovery) |
| `/api/restaurants` | POST | Varies | Create restaurant (legacy free-plan path) |
| `/api/restaurants/[id]` | GET | Owner/Admin | Single restaurant detail |
| `/api/restaurants/[id]` | PUT | Owner/Admin | Update restaurant |
| `/api/restaurants/[id]` | DELETE | Admin | Delete restaurant |

### Items (`/api/items/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/items` | GET | None | List items (public — by restaurant context) |
| `/api/items` | POST | Owner session | Create menu item |
| `/api/items/[id]` | GET | None | Single item detail |
| `/api/items/[id]` | PUT | Owner session | Update item |
| `/api/items/[id]` | PATCH | Owner session | Partial update item |
| `/api/items/[id]` | DELETE | Owner session | Delete item |
| `/api/items/[id]/reviews` | GET | None | List reviews for item |
| `/api/items/[id]/reviews` | POST | Rate-limited | Submit review |

### Categories (`/api/categories/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/categories` | GET | None | List categories (public — by restaurant) |
| `/api/categories` | POST | Owner session | Create category |
| `/api/categories/[id]` | PUT | Owner session | Update category |
| `/api/categories/[id]` | DELETE | Owner session | Delete category |

### Admin (`/api/admin/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/stats` | GET | VIEW_ANALYTICS or super_admin | Dashboard statistics (revenue, orders, users, growth) |
| `/api/admin/config` | GET | super_admin | List SystemConfig entries |
| `/api/admin/config` | PUT | EDIT_SETTINGS | Create/update config entry |
| `/api/admin/config` | DELETE | EDIT_SETTINGS | Delete config entry |
| `/api/admin/admins` | GET | super_admin | List sub-admins |
| `/api/admin/admins` | POST | super_admin | Create sub-admin with permissions |
| `/api/admin/admins/[id]` | PUT | super_admin | Update sub-admin |
| `/api/admin/admins/[id]` | DELETE | super_admin | Delete sub-admin |
| `/api/admin/create-owner` | POST | MANAGE_RESTAURANTS | Create restaurant owner account directly |
| `/api/admin/subscriptions` | POST | MANAGE_SUBSCRIPTIONS | Approve (verified) or reject (cancelled) payment |
| `/api/admin/audit-logs` | GET | super_admin | Query audit logs |
| `/api/admin/system-events` | GET | super_admin | Query system events |
| `/api/admin/reset-password` | POST | MANAGE_USERS | Reset another user's password |
| `/api/admin/profile` | GET | Admin | Get own profile |
| `/api/admin/profile` | PUT | Admin | Update own profile (name, password, prefs) |
| `/api/admin/notification-preferences` | GET | Admin | Get notification toggle settings |
| `/api/admin/notification-preferences` | PUT | Admin | Update notification toggles |
| `/api/admin/events/stream` | GET | Admin session | SSE stream: new_order, new_payment, notification |
| `/api/admin/events/trigger` | POST | Admin | Create test SystemEvent for SSE |
| `/api/admin/telegram/config` | GET | Admin | Get telegram bot config |
| `/api/admin/telegram/config` | POST | Admin | Update telegram bot config |
| `/api/admin/telegram/broadcast-targets` | GET | Admin | List broadcast targets |
| `/api/admin/telegram/broadcast-targets` | POST | Admin | Create broadcast target |
| `/api/admin/telegram/broadcast-targets/[id]` | PATCH | Admin | Update broadcast target |
| `/api/admin/telegram/broadcast-targets/[id]` | DELETE | Admin | Delete broadcast target |
| `/api/admin/telegram/link` | POST | Admin | Generate signed Telegram linking token |
| `/api/admin/telegram/verify` | POST | Token-based | Verify Telegram link, bind chatId to user |
| `/api/admin/telegram/diagnose` | GET | Admin | Telegram connection diagnostics |
| `/api/admin/telegram/test` | POST | Admin | Send test message to broadcast targets |

### Telegram (`/api/telegram/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/telegram/webhook` | POST | Telegram secret token | Bot webhook: /start, callback queries (Approve/Reject) |
| `/api/telegram/config` | GET | Admin | Get bot config (telegram-specific endpoint) |
| `/api/telegram/broadcast-targets` | GET | Admin | List broadcast targets |
| `/api/telegram/broadcast-targets` | POST | Admin | Create broadcast target |
| `/api/telegram/broadcast-targets/[id]` | PATCH | Admin | Update broadcast target |
| `/api/telegram/broadcast-targets/[id]` | DELETE | Admin | Delete broadcast target |
| `/api/telegram/test` | POST | Admin | Send test message |
| `/api/telegram/diagnose` | GET | Admin | Connection diagnostics |

### User (`/api/user/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/user/events/stream` | GET | Session | SSE stream for subscription_rejected events |

### Upload (`/api/upload`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/upload` | POST | Owner session | Image upload with Sharp compression (max 5MB, JPEG Q=0.7) |

### Stats (`/api/stats/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/stats` | GET | Owner session | Owner restaurant statistics |
| `/api/stats/advanced` | GET | Owner session | Advanced analytics for owner |
| `/api/public/stats` | GET | None | Public landing page totals (users, restaurants) |

### Loyalty (`/api/loyalty/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/loyalty` | GET | Rate-limited | Loyalty card lookup by phone |
| `/api/loyalty` | POST | Rate-limited | Create loyalty transaction |
| `/api/loyalty/stats` | GET | Owner session | Loyalty program stats for owner's restaurant |
| `/api/loyalty/referral` | GET | Rate-limited | Referral code lookup |
| `/api/loyalty/referral` | POST | Rate-limited | Create referral |

### System (`/api/*`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/health` | GET | None | Health check — version + environment |
| `/api/seed` | POST | Development | Seed database with admin + demo data |
| `/api/demo` | GET | None | Create al-waha-cafe restaurant + auto-login session |
| `/api/plans` | GET | None | List all active subscription plans |
| `/api/settings` | GET | Owner session | Get restaurant settings |
| `/api/settings` | POST | Owner session | Update restaurant settings |
| `/api/config` | GET | None | Get public platform configuration |
| `/api/users` | GET | Admin | List all users |
| `/api/users/[id]` | DELETE | MANAGE_USERS | Delete user |
| `/api/whatsapp/generate` | GET | None | Generate WhatsApp deep link for restaurant |
| `/api/owner/reviews` | GET | Owner session | List reviews for owner's restaurant |

---

## 8. Deployment & Infrastructure

### Vercel Configuration
- **Runtime**: Node.js (Fluid Compute)
- **Timeout**: 300 seconds (max for paid plans)
- **Pricing**: Active CPU pricing (request duration × CPU activity)
- **Regions**: Automatic (Neon DB regional affinity recommended)
- **Environment**: `production` (main branch) and `preview` (PR branches)

### Database
- **Provider**: Neon (serverless PostgreSQL)
- **ORM**: Prisma 7.8 with migrations
- **Connection**: Pooled via PrismaPg adapter with `DATABASE_SCHEMA` config
- **SSL**: Required (enforced by Neon)
- **Schema**: Default `public`, configurable via `DATABASE_SCHEMA` env var

### Analytics & Monitoring
- Vercel Analytics — page views, visitor metrics
- Vercel Speed Insights — Core Web Vitals (LCP, INP, CLS)
- Audit logging via `AuditLog` model (actions: login, create, update, delete, export)
- System events via `SystemEvent` model (severity: info, warning, error, critical)

### PWA
- Service worker registered at client init
- Manifest configured for offline-capable menu display
- `/menu/[slug]` pages potentially service-worker-cached

### Real-Time Infrastructure
- SSE streams with 30s heartbeat to keep proxy connections alive
- Poll-based SSE uses DB queries every 10s (for fallback paths)
- **Known limitation**: In-memory EventEmitter is per-Vercel-instance. Cross-region or multi-instance SSE notifications are silently lost. Fix requires Redis pub/sub.

### Environment Segregation
- `.env` — development defaults
- `.env.local` — local overrides (gitignored)
- Vercel project env vars — production values
- `NODE_ENV` controls: secure cookie setting, DB schema validation, logger config

---

## 9. State Management

### Client-Side State (Zustand)
- **Store**: Cart state only
  - Items added to cart (MenuItem + quantity + notes)
  - Pickup type selection (inside/takeaway/delivery)
  - Cart total calculation (subtotal, discount, total)
- **Persistence**: None (cart resets on page refresh)
- **Location**: `src/store/`

### Server State
- **No server state library**: No React Query, no SWR, no RTK Query
- **Pattern**: Direct fetch calls with `csrfFetch()` for authenticated requests
- **Auth state**: Session cookie parsed server-side in middleware + `requireAuth()`
- **Config state**: `useConfig()` hook fetches from `/api/config` on mount

### Real-Time State
- **SSE EventEmitter**: Global EventEmitter in `src/lib/events.ts`
- **Stream types**:
  - Order notifications (owner dashboard)
  - Subscription payment status (subscribe page)
  - Admin system events (admin panel)
- **Consumer hooks**:
  - `OrderNotifier` — connects to `/api/orders/stream`
  - `AdminEventNotifier` — connects to `/api/admin/events/stream`
  - `UserBannerNotifier` — connects to `/api/user/events/stream`

### Cart Data Flow
```
MenuItemCard → addToCart({item, quantity, notes})
         ↓
   Zustand Store (cart state)
         ↓
Cart page → read cart → display items + totals
         ↓
WhatsApp deep link → [restaurantWhatsapp]?text={orderSummary}
         ↓
POST /api/orders → create Order record
         ↓
clearCart()
```

---

## 10. Environment Variables Catalog

### Required in Production

| Variable | Purpose | Dev | Prod | Example |
|----------|---------|-----|------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | Required | Required | `postgresql://user:pass@ep-xxx.neon.tech/smart-menu` |
| `JWT_SECRET` | Session token signing, Telegram HMAC | Required | Required | `your-secret-key-min-32-chars` |
| `AUTH_SECRET` | Fallback for JWT_SECRET | Optional | Optional | `fallback-secret` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token | Required | Required | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook origin validation header | Required | Required | `random-secret-string` |
| `ADMIN_PASSWORD` | Seed admin user password | Required | Required | `secure-admin-password` |
| `NEXT_PUBLIC_DOMAIN` | Canonical domain for sitemap/metadata | Required | Required | `https://smartmenu.app` |
| `TELEGRAM_ADMIN_IDS` | Comma-separated admin Telegram IDs | Required | Required | `123456789,987654321` |

### Required Conditionally

| Variable | Purpose | When Required |
|----------|---------|---------------|
| `TELEGRAM_CHAT_ID` | Fallback broadcast chat ID | When no DB broadcast targets configured (deprecated) |
| `TELEGRAM_GROUP_IDS` | Additional broadcast groups | When fallback path used |
| `TELEGRAM_BOT_USERNAME` | Bot @username for link URLs | For Telegram linking flow |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Default WhatsApp fallback | When restaurant has no WhatsApp number |

### Automatic / Unused

| Variable | Source | Purpose |
|----------|--------|---------|
| `VERCEL` | Vercel runtime | Autoset — not read by app code |
| `VERCEL_ENV` | Vercel runtime | Autoset — not read |
| `VERCEL_URL` | Vercel runtime | Autoset — not read |
| `VERCEL_OIDC_TOKEN` | Vercel runtime | Leaked in env dumps — not used |
| `NODE_ENV` | Runtime | Used for secure cookies, logger config |
| `DATABASE_SCHEMA` | Config | Prisma schema override (default `public`) |
| Various `TURBO_*` | Turborepo | Build caching config — not runtime-relevant |
| Various `NX_*` | Nx | Unused (not Nx project) |
| Various `VERCEL_GIT_*` | Vercel runtime | Autoset — not read |

### Security Issues (Env Audit)
- **11 `.env*` files leaked to git history** (including plaintext DB passwords, JWT secrets, Vercel OIDC tokens). Now git-rm-cached and `.gitignore`-protected.
- **`VERCEL_OIDC_TOKEN`** found in multiple backup env files (live JWT capable of authenticating as the Vercel project).
- **Missing from `.env.example`**: `TELEGRAM_GROUP_IDS`, `TELEGRAM_BOT_USERNAME`, `ADMIN_PASSWORD`, `BOT_TOKEN`, `CHAT_ID`.

---

## 11. Conventions & Roadmap

### File Naming
- **Routes**: kebab-case (`/api/auth/login`, `/admin/subscriptions`), `page.tsx` and `route.ts` suffixes
- **Components**: PascalCase (`MenuItemCard.tsx`, `AdminSidebar.tsx`)
- **Utilities**: camelCase (`utils.ts`, `api-helpers.ts`)
- **Hooks**: camelCase with `use` prefix (`useConfig.ts`, `useMe.ts`)

### Code Conventions
- **Error handling**: `success()`, `error()`, `handleError()`, `validationError()` from `api-helpers.ts`
- **Auth**: `requireAuth()`, then `requirePermission('PERM')` for RBAC
- **API responses**: Always `{ success: boolean, data?: T, error?: string }` format
- **CSRF**: `csrfFetch()` for all client-side mutations; `generateToken()`/`validateToken()` server-side
- **Zod**: Schema validation at input boundaries
- **RTL**: `dir="rtl"` on `<html>`, CSS logical properties (`ms-` for margin-inline-start, `me-` for margin-inline-end)
- **Theme**: Dark mode default, `.light` class overrides. One theme per page.
- **TypeScript**: Strict mode. Prisma-generated types from `src/generated/`
- **Logging**: Structured JSON logs with `logger.ts` (level: debug/info/warn/error)

### Database Conventions
- All models use `@default(autoincrement())` integer IDs (except `Session.id` uses `cuid()`)
- Restaurant-scoped models carry `restaurantId` with cascade delete
- Audit trail via `AuditLog` model for admin actions
- Soft deletes: not used (hard deletes with cascade)
- Timestamps: `createdAt` + `updatedAt` on all primary entities

### Ponytail Notes (Deliberate Simplifications)

| Ceiling | Current | Upgrade Path |
|---------|---------|--------------|
| SSE EventEmitter | In-memory per-instance | Redis pub/sub for cross-instance delivery |
| Rate limiter | In-process Map | DB-backed or Redis rate limiter |
| CSRF | Header + SameSite cookie check | Proper CSRF token rotation, double-submit |
| Cart state | Zustand, in-memory only | localStorage persistence for cart survival |
| Image storage | Direct upload + Sharp compression | Cloud storage (S3/Cloudinary R2) |
| WhatsApp ordering | Deep-link redirect | In-app payment processing (Moyasar/Tabby) |
| Session storage | Database Session model | Redis session cache for reduced DB queries |
| Search | SQL LIKE queries | Full-text search (PostgreSQL tsvector) |
| Multi-region | Single Neon region | Multi-region Neon with read replicas |

### Roadmap Items (Known Needed)
1. **Cross-instance SSE**: Replace EventEmitter with Redis pub/sub to fix silent notification loss in serverless
2. **DB-backed rate limiter**: Fix rate limit bypass across Vercel instances
3. **Proper CSRF**: Implement token rotation + double-submit cookie pattern
4. **Rotate leaked secrets**: All env files leaked credentials — rotate `DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `VERCEL_OIDC_TOKEN`
5. **Add missing env.example vars**: `TELEGRAM_GROUP_IDS`, `TELEGRAM_BOT_USERNAME`, `ADMIN_PASSWORD`
6. **Server state library**: Consider React Query to replace manual fetch + error handling patterns
7. **Image CDN**: Add Cloudinary or similar for image optimization, transformation, and caching
