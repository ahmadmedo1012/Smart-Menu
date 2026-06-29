# Smart Menu — Complete System Redesign

**Date:** 2026-06-29
**Status:** Approved
**Audience:** Engineering

---

## 1. Repository Sanitization & Vercel Secrets Migration

### Problem
Live credentials on disk: `.env`, `.env.local`, `.env.development`, `.env.prod` contain plaintext `DATABASE_URL` (Neon) and `VERCEL_OIDC_TOKEN` (live JWT). Gitignored but on disk = credential leak risk.

### Actions
1. **Purge `.env`, `.env.local`, `.env.development`, `.env.prod` of real values** — replace with error-if-missing stubs
2. **Vercel env coverage check** — ensure all vars used by the app exist in Vercel
3. **`.env.example` expansion** — document every env var with description, type, example
4. **Zod env validation** — `src/lib/env.ts` validates `process.env` on server start, throws on missing critical vars
5. **No git history rewrite** — `.env*` files already in `.gitignore`; no past leaks in blob list

### Env Var Inventory

| Variable | Critical | Vercel | Notes |
|----------|----------|--------|-------|
| `DATABASE_URL` | ✅ | ✅ | Neon PostgreSQL |
| `JWT_SECRET` | ✅ | ❌ | Missing from Vercel |
| `NEXT_PUBLIC_DOMAIN` | ✅ | ✅ | |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ⚠️ | ❌ | Missing from Vercel |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | ❌ | Missing from Vercel |
| `TELEGRAM_CHAT_ID` | ⚠️ | ❌ | Missing from Vercel |
| `AUTH_SECRET` | ✅ | ✅ | |
| `DATABASE_SCHEMA` | ⚠️ | ✅ | |

---

## 2. Dynamic Configuration Engine

### Schema — `SystemConfig` model

```prisma
model SystemConfig {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       Json
  category    String   @default("general")   // general, features, limits, payments, notifications
  isSecret    Boolean  @default(false)        // masked in UI
  description String   @default("")
  updatedAt   DateTime @updatedAt
  updatedBy   Int?
}
```

### Initial Seeds

| Key | Category | Type | Default |
|-----|----------|------|---------|
| `max_free_restaurants` | limits | number | 5 |
| `max_menu_items_free` | limits | number | 50 |
| `max_menu_items_paid` | limits | number | 999 |
| `order_polling_interval` | general | number | 30000 |
| `maintenance_mode` | features | boolean | false |
| `whatsapp_disabled` | features | boolean | false |
| `new_signups_enabled` | features | boolean | true |
| `commission_percent` | payments | number | 0 |
| `min_order_amount` | limits | number | 0 |
| `loyalty_points_per_lyd` | general | number | 10 |

### Admin UI
- **Route:** `src/app/admin/settings/page.tsx` — overhaul from static page to config editor
- **Features:**
  - Grouped by category (tabs or accordion)
  - Inline editing with type-appropriate inputs
  - Secret values masked by default (eye toggle)
  - Validation per type (string/number/boolean/json via Zod)
  - Save triggers `revalidateTag("system-config")` for instant propagation
  - Audit log entries on change

### API
- `GET /api/admin/config` — list all (secrets masked)
- `PUT /api/admin/config` — upsert a key (admin-only, Zod-validated)
- `DELETE /api/admin/config` — delete a key (admin-only)
- `GET /api/config?key=xyz` — public read of non-secret config values

### Server-side access
```typescript
// lib/config.ts — cached config reader
export async function getConfig(key: string): Promise<unknown>
export async function getConfigOrThrow<T>(key: string): Promise<T>
```

---

## 3. Admin Dashboard Overhaul

### Extended API — `GET /api/admin/stats` additions

| Field | Description |
|-------|-------------|
| `revenueTrend` | Daily revenue for last 30 days `[{date, revenue}[]]` |
| `orderVolumeTrend` | Daily order count for last 30 days |
| `topItems` | Top 15 most-ordered items across all restaurants |
| `userGrowthPct` | MoM user growth % |
| `restaurantGrowthPct` | MoM restaurant growth % |
| `revenueGrowthPct` | MoM revenue growth % |
| `avgOrderValue` | Average order value (30d) |
| `avgOrderValuePrev` | Previous period AOV for comparison |

### Chart Components (pure SVG + Framer Motion, no lib)

1. **`AreaChart.tsx`** — filled area under a path, gradient fill, animated on mount
2. **`HorizontalBar.tsx`** — sorted horizontal bars for ranking (top items)
3. **`MiniSparkline.tsx`** — tiny inline sparkline for KPI cards

### KPI Card Upgrades
- Add `MiniSparkline` under each main KPI
- Add growth indicator badge (↑12.3% / ↓2.1%) with color
- Hover: ambient glow effect, slight elevation

### New Dashboard Sections
- **Revenue Area Chart** (top-left, 2-col span)
- **Order Volume Area Chart** (top-right, 2-col span)  
- **Top Items** ranked horizontal bar (left, 2-col)
- **Quick Stats Grid** — AOV, growth rates, conversion stats (right, 2-col)

---

## 4. Merchant/Owner Dashboard Overhaul

### New API — `GET /api/stats/advanced?restaurantId=X`

| Field | Description |
|-------|-------------|
| `revenue7d` | Daily revenue for last 7 days `[{date, revenue}[]]` |
| `orders7d` | Daily orders for last 7 days |
| `topItems` | Top items with `totalSold` and `growth` vs prev period |
| `hourlyDistribution` | Orders by hour `[{hour, count}[]]` |
| `avgOrderValueTrend` | AOV per day last 7 days |
| `growthPct` | Period-over-period growth (orders) |

### Dashboard Additions
- **Revenue sparkline card** with 7d trend + growth %
- **Hourly activity bar** — distribution of orders by hour
- **Top items** with change indicators (↑↓)
- **AOV trend** small area chart

---

## 5. Implementation Sequence

```
Phase 1: Env Security
  ├── Create lib/env.ts with Zod validation
  ├── Sanitize .env* files
  ├── Expand .env.example
  └── Push missing vars to Vercel

Phase 2: Config Engine
  ├── Prisma schema + migration
  ├── lib/config.ts (cached reader)
  ├── API routes (GET/PUT/DELETE)
  ├── Admin settings UI overhaul
  └── Seed default config values

Phase 3: Admin Dashboard
  ├── SVG chart components (Area, HorizontalBar, MiniSparkline)
  ├── Extended stats API
  ├── KPI card upgrades (sparklines, growth badges)
  └── New chart sections

Phase 4: Merchant Dashboard
  ├── Advanced stats API
  ├── Chart components (reuse from shared)
  ├── Revenue sparkline + hourly chart
  └── KPI upgrades

Phase 5: Verification
  ├── npm run lint
  ├── npm run build
  └── Fix any issues
```

---

## 6. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chart library | Pure SVG + Framer Motion | Zero deps; already have Framer Motion; dashboards are low-series-count |
| Config storage | Prisma/Postgres | Already using Prisma; no separate Redis needed; revalidation via tag |
| Config encryption | AES-256-GCM at rest | For `isSecret` values; encrypt on write, decrypt on read for authorized users |
| API pattern | Route handlers + Zod | Already have this pattern in codebase |
| Styling | Tailwind CSS 4 + shadcn/ui | Aligns with existing design system |
| Growth calc | SQL window functions | Use `LAG()` in raw SQL via Prisma `$queryRaw` for period-over-period |
