# Graph Report - .  (2026-06-22)

## Corpus Check
- 184 files · ~74,650 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 758 nodes · 1626 edges · 88 communities (57 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_NPM Package Dependencies|NPM Package Dependencies]]
- [[_COMMUNITY_API Auth & Route Handlers|API Auth & Route Handlers]]
- [[_COMMUNITY_Menu Cart & Order Flow|Menu Cart & Order Flow]]
- [[_COMMUNITY_Login Page & UI|Login Page & UI]]
- [[_COMMUNITY_Admin Layout & Sidebar|Admin Layout & Sidebar]]
- [[_COMMUNITY_Admin Pages & Utilities|Admin Pages & Utilities]]
- [[_COMMUNITY_Owner QR & Settings Pages|Owner QR & Settings Pages]]
- [[_COMMUNITY_Cart & Order Dialog|Cart & Order Dialog]]
- [[_COMMUNITY_User Account Creation|User Account Creation]]
- [[_COMMUNITY_Component Library Setup|Component Library Setup]]
- [[_COMMUNITY_Landing Page & Home|Landing Page & Home]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Audit & Settings API|Audit & Settings API]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_Landing UI Components|Landing UI Components]]
- [[_COMMUNITY_Shadcn Dropdown Menu|Shadcn Dropdown Menu]]
- [[_COMMUNITY_Error Boundaries|Error Boundaries]]
- [[_COMMUNITY_Admin Dashboard & Stats|Admin Dashboard & Stats]]
- [[_COMMUNITY_System Routes & Demo|System Routes & Demo]]
- [[_COMMUNITY_Remotion TS Config|Remotion TS Config]]
- [[_COMMUNITY_Order Detail Pages|Order Detail Pages]]
- [[_COMMUNITY_Public API Endpoints|Public API Endpoints]]
- [[_COMMUNITY_Currency & Context|Currency & Context]]
- [[_COMMUNITY_Loyalty Widget & Referral|Loyalty Widget & Referral]]
- [[_COMMUNITY_Menu Categories & Items API|Menu Categories & Items API]]
- [[_COMMUNITY_Owner Dashboard & Notifier|Owner Dashboard & Notifier]]
- [[_COMMUNITY_CSRF Protection & Middleware|CSRF Protection & Middleware]]
- [[_COMMUNITY_CSRF Client & Restaurants UI|CSRF Client & Restaurants UI]]
- [[_COMMUNITY_Remotion Video Package|Remotion Video Package]]
- [[_COMMUNITY_App Layout & Service Worker|App Layout & Service Worker]]
- [[_COMMUNITY_Logger Library|Logger Library]]
- [[_COMMUNITY_Rate Limiter & Orders|Rate Limiter & Orders]]
- [[_COMMUNITY_Loyalty API|Loyalty API]]
- [[_COMMUNITY_Pricing Page|Pricing Page]]
- [[_COMMUNITY_Owner Orders Page|Owner Orders Page]]
- [[_COMMUNITY_Receipt Library|Receipt Library]]
- [[_COMMUNITY_Remotion Root|Remotion Root]]
- [[_COMMUNITY_E2E Tests (Full)|E2E Tests (Full)]]
- [[_COMMUNITY_E2E Tests (Local)|E2E Tests (Local)]]
- [[_COMMUNITY_404 Not Found|404 Not Found]]
- [[_COMMUNITY_Service Worker Cache|Service Worker Cache]]
- [[_COMMUNITY_Admin Role Fix Script|Admin Role Fix Script]]
- [[_COMMUNITY_Prod Verify Tests|Prod Verify Tests]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 131 edges
2. `handleError()` - 72 edges
3. `success()` - 69 edges
4. `toArabicNumber()` - 56 edges
5. `error()` - 55 edges
6. `requireAuth()` - 42 edges
7. `Button()` - 38 edges
8. `requireAdmin()` - 22 edges
9. `compilerOptions` - 16 edges
10. `Input()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `hashPassword()`  [EXTRACTED]
  prisma/seed.ts → src/lib/hash.ts
- `OwnerOrdersPage()` --calls--> `toArabicNumber()`  [INFERRED]
  src/app/owner/orders/page.tsx → src/lib/format.ts
- `setCsrfCookie()` --calls--> `generateToken()`  [EXTRACTED]
  middleware.ts → src/lib/csrf.ts
- `middleware()` --calls--> `validateToken()`  [EXTRACTED]
  middleware.ts → src/lib/csrf.ts
- `AdminAuditLogsPage()` --calls--> `toArabicNumber()`  [EXTRACTED]
  src/app/admin/audit-logs/page.tsx → src/lib/format.ts

## Import Cycles
- None detected.

## Communities (88 total, 31 thin omitted)

### Community 0 - "NPM Package Dependencies"
Cohesion: 0.05
Nodes (43): dependencies, @base-ui/react, class-variance-authority, clsx, lottie-react, lucide-react, next, next-themes (+35 more)

### Community 1 - "API Auth & Route Handlers"
Cohesion: 0.12
Nodes (27): adminUpdateSchema, PATCH(), updateUserSchema, handleError(), requireAuth(), GET(), DELETE(), PUT() (+19 more)

### Community 2 - "Menu Cart & Order Flow"
Cohesion: 0.07
Nodes (26): CartPage(), ShareAfterOrderProps, CartFloatingButton(), BGS, COLORS, FOOD_EMOJI_MAP, getFoodEmoji(), MenuItemCard (+18 more)

### Community 3 - "Login Page & UI"
Cohesion: 0.08
Nodes (21): foodIcons, DEFAULTS, LoyaltySettingsData, Props, AnimatedCount(), ConversionRate(), LoyaltySettings, ReferralRow (+13 more)

### Community 4 - "Admin Layout & Sidebar"
Cohesion: 0.10
Nodes (19): AdminSidebar(), NavItem, navItems, Header(), HeaderProps, NavLink, navLinks, navItems (+11 more)

### Community 5 - "Admin Pages & Utilities"
Cohesion: 0.15
Nodes (25): ACTION_OPTIONS, ACTION_STYLES, AdminAuditLogsPage(), AuditLogEntry, TARGET_TYPE_OPTIONS, cn(), StickyMenuHeader(), SelectContent() (+17 more)

### Community 6 - "Owner QR & Settings Pages"
Cohesion: 0.12
Nodes (18): Restaurant, EVENT_OPTIONS, OwnerSettingsPage(), Plan, Restaurant, RestaurantData, TelegramConfig, Category (+10 more)

### Community 7 - "Cart & Order Dialog"
Cohesion: 0.13
Nodes (18): PICKUP_LABELS, PICKUP_OPTIONS, OrderDialog(), OrderDialogProps, QUICK_NOTES, CATEGORY_ICONS, initForm(), Item (+10 more)

### Community 8 - "User Account Creation"
Cohesion: 0.13
Nodes (18): POST(), schema, logAudit(), hashPassword(), verifyHash(), notifyEvent(), sendTelegramNotification(), loginLimiter (+10 more)

### Community 9 - "Component Library Setup"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 10 - "Landing Page & Home"
Cohesion: 0.13
Nodes (14): Benefit, BENEFITS, Partner, PARTNERS, PRICING_PLANS, PricingPlan, Showcase, SHOWCASES (+6 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Audit & Settings API"
Cohesion: 0.25
Nodes (14): GET(), GET(), POST(), upsertSchema, error(), notFound(), requireAdmin(), sendTelegramMessage (+6 more)

### Community 13 - "PWA Manifest"
Cohesion: 0.11
Nodes (17): background_color, categories, description, dir, display, icons, lang, name (+9 more)

### Community 14 - "Landing UI Components"
Cohesion: 0.12
Nodes (8): MobileNav(), Reveal(), Footer(), FooterProps, ARABIC_MONTHS, PlanUsageBadge(), BarChart(), BarItem

### Community 15 - "Shadcn Dropdown Menu"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 16 - "Error Boundaries"
Cohesion: 0.19
Nodes (4): Restaurant, QR_SIZES, Button(), buttonVariants

### Community 17 - "Admin Dashboard & Stats"
Cohesion: 0.18
Nodes (12): AdminDashboard(), BarChart, SEVERITY_STYLES, StatsData, CountUp(), toArabicNumber(), AdminMenuPage(), AdminOrdersPage() (+4 more)

### Community 18 - "System Routes & Demo"
Cohesion: 0.13
Nodes (3): generateSchema, POST(), globalForPrisma

### Community 19 - "Remotion TS Config"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, noUnusedLocals (+6 more)

### Community 20 - "Order Detail Pages"
Cohesion: 0.21
Nodes (11): AdminOrderDetail(), OwnerOrderDetail(), formatDate(), OrderDetail, STATUS_CONFIG, STATUS_FLOW, OrderDetail, STATUS_CONFIG (+3 more)

### Community 21 - "Public API Endpoints"
Cohesion: 0.21
Nodes (10): success(), POST(), GET(), GET(), POST(), referralSchema, batchSchema, GET() (+2 more)

### Community 22 - "Currency & Context"
Cohesion: 0.23
Nodes (10): CURRENCY_MAP, formatPrice(), formatPriceShort(), getCurrencyConfig(), RestaurantContext, RestaurantContextValue, RestaurantData, useCurrency() (+2 more)

### Community 23 - "Loyalty Widget & Referral"
Cohesion: 0.17
Nodes (6): LoyaltyWidget(), LoyaltyWidgetProps, TIER_CONFIG, ReferralCardProps, ShareButton(), GalleryCarousel

### Community 24 - "Menu Categories & Items API"
Cohesion: 0.23
Nodes (9): createSchema, GET(), POST(), createSchema, GET(), POST(), paginated(), validationError() (+1 more)

### Community 25 - "Owner Dashboard & Notifier"
Cohesion: 0.20
Nodes (9): useOrderNotifier(), AnimatedCounter(), LoyaltyStats, OrderRow(), OwnerDashboard(), RestaurantData, StatCard(), StatsData (+1 more)

### Community 26 - "CSRF Protection & Middleware"
Cohesion: 0.27
Nodes (10): generateToken(), validateToken(), config, isRateLimited(), middleware(), publicPrefixes, rateLimit, SAFE_METHODS (+2 more)

### Community 27 - "CSRF Client & Restaurants UI"
Cohesion: 0.21
Nodes (9): csrfFetch(), getToken(), Plan, PLAN_COLORS, PLAN_ICONS, Restaurant, Order, STATUS_CONFIG (+1 more)

### Community 28 - "Remotion Video Package"
Cohesion: 0.17
Nodes (11): dependencies, react, react-dom, remotion, @remotion/cli, description, name, scripts (+3 more)

### Community 29 - "App Layout & Service Worker"
Cohesion: 0.24
Nodes (5): metadata, useServiceWorker(), ProgressBar(), ScrollButton(), ServiceWorkerInit()

### Community 30 - "Logger Library"
Cohesion: 0.33
Nodes (9): colors, debug(), error(), info(), log(), LogLevel, requestId(), timestamp() (+1 more)

### Community 31 - "Rate Limiter & Orders"
Cohesion: 0.22
Nodes (8): createRateLimiter(), RateLimiter, RateLimiterConfig, RateLimitResult, createSchema, orderItemSchema, orderRateLimiter, POST()

### Community 32 - "Loyalty API"
Cohesion: 0.31
Nodes (7): createSchema, generateReferralCode(), GET(), getNextTierInfo(), POST(), TIER_ORDER, TIER_THRESHOLDS

### Community 33 - "Pricing Page"
Cohesion: 0.22
Nodes (8): Plan, PLAN_BADGE_COLORS, PLAN_BADGES, PLAN_GLOWS, PLAN_GRADIENTS, PLAN_ICONS, PlanCard(), PricingPage()

### Community 34 - "Owner Orders Page"
Cohesion: 0.33
Nodes (5): OwnerOrdersPage(), STATUS_FLOW, Order, STATUS_CONFIG, TABS

### Community 35 - "Receipt Library"
Cohesion: 0.50
Nodes (4): AR_MONTHS, buildReceiptMessage(), ReceiptItem, ts()

### Community 37 - "E2E Tests (Full)"
Cohesion: 0.50
Nodes (3): RESULTS, run(), test()

### Community 38 - "E2E Tests (Local)"
Cohesion: 0.50
Nodes (3): RESULTS, run(), test()

## Knowledge Gaps
- **271 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Admin Pages & Utilities` to `Pricing Page`, `Menu Cart & Order Flow`, `Login Page & UI`, `Admin Layout & Sidebar`, `Owner Orders Page`, `Owner QR & Settings Pages`, `Cart & Order Dialog`, `Landing Page & Home`, `Landing UI Components`, `Shadcn Dropdown Menu`, `Error Boundaries`, `Admin Dashboard & Stats`, `Order Detail Pages`, `Loyalty Widget & Referral`, `Owner Dashboard & Notifier`, `CSRF Client & Restaurants UI`, `App Layout & Service Worker`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `toArabicNumber()` connect `Admin Dashboard & Stats` to `Pricing Page`, `Menu Cart & Order Flow`, `Login Page & UI`, `Owner Orders Page`, `Admin Pages & Utilities`, `Owner QR & Settings Pages`, `Cart & Order Dialog`, `Landing UI Components`, `Order Detail Pages`, `Currency & Context`, `Loyalty Widget & Referral`, `Owner Dashboard & Notifier`, `CSRF Client & Restaurants UI`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Button()` connect `Error Boundaries` to `Pricing Page`, `Menu Cart & Order Flow`, `Login Page & UI`, `Admin Layout & Sidebar`, `Admin Pages & Utilities`, `Owner QR & Settings Pages`, `Cart & Order Dialog`, `404 Not Found`, `Owner Orders Page`, `Landing Page & Home`, `Admin Dashboard & Stats`, `Order Detail Pages`, `Owner Dashboard & Notifier`, `CSRF Client & Restaurants UI`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `cn()` (e.g. with `AdminOrderDetail()` and `OwnerOrderDetail()`) actually correct?**
  _`cn()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `handleError()` (e.g. with `PATCH()` and `GET()`) actually correct?**
  _`handleError()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `success()` (e.g. with `PATCH()` and `GET()`) actually correct?**
  _`success()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `toArabicNumber()` (e.g. with `AdminOrderDetail()` and `OwnerOrderDetail()`) actually correct?**
  _`toArabicNumber()` has 6 INFERRED edges - model-reasoned connections that need verification._