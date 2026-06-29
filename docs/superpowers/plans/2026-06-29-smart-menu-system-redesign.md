# Smart Menu System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure credentials, build dynamic config engine, overhaul admin & merchant dashboards with premium SVG charts

**Architecture:** Phase 1 adds Zod env validation at server boot. Phase 2 adds SystemConfig Prisma model + CRUD API + admin UI. Phase 3 adds SVG chart components (AreaChart, HorizontalBar, MiniSparkline) and extends admin stats endpoint. Phase 4 extends merchant stats endpoint and dashboard.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui base-nova, Prisma 7.8, Neon PostgreSQL, Framer Motion 12, Zod 4, lucide-react

## Global Constraints

- RTL-first Arabic UI — all new pages use `dir="rtl"`, Arabic labels
- All new components use Tailwind CSS 4 syntax (no `@apply` directives in CSS files)
- All new components under 500 lines
- No external charting library — pure SVG + Framer Motion
- Prisma models use `@id @default(autoincrement())` pattern matching existing schema
- Zod validation on all API inputs
- `revalidateTag()` for config cache invalidation
- All new API routes use existing `requireAdmin()` / `requireAuth()` guards from `src/lib/auth.ts`
- All new API routes use existing `success()`, `error()`, `handleError()` helpers from `src/lib/api-helpers.ts`

---

## File Structure

### Created Files

| Path | Responsibility |
|------|---------------|
| `src/lib/env.ts` | Zod schema for all env vars, validates at startup |
| `src/lib/config.ts` | Server-side cached config reader (`getConfig`, `getConfigOrThrow`) |
| `src/app/api/admin/config/route.ts` | CRUD for SystemConfig (admin-only) |
| `src/app/api/config/route.ts` | Public read of non-secret config values |
| `src/app/api/admin/stats/charts/route.ts` | Extended chart data endpoint |
| `src/app/api/stats/advanced/route.ts` | Extended merchant stats endpoint |
| `src/components/shared/AreaChart.tsx` | SVG filled-area chart with Framer Motion |
| `src/components/shared/HorizontalBar.tsx` | SVG horizontal bar chart for rankings |
| `src/components/shared/MiniSparkline.tsx` | Tiny inline SVG sparkline |
| `src/components/admin/ConfigEditor.tsx` | Config key-value editor component |
| `src/components/admin/KpiCard.tsx` | Reusable KPI card with sparkline + growth badge |

### Modified Files

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | Add `SystemConfig` model |
| `.env.example` | Add all env vars with descriptions |
| `.env` | Replace real values with blank stubs |
| `.env.local` | Replace real VERCEL_OIDC_TOKEN with blank |
| `.env.development` | Replace real VERCEL_OIDC_TOKEN with blank |
| `.env.prod` | Replace real VERCEL_OIDC_TOKEN with blank |
| `src/app/api/admin/stats/route.ts` | Add extended fields |
| `src/app/admin/page.tsx` | Add chart sections + KPI upgrades |
| `src/app/admin/settings/page.tsx` | Add config editor tab |
| `src/app/owner/page.tsx` | Add revenue chart + hourly chart + KPI upgrades |
| `src/lib/db.ts` | Import env validation at module top |

---

### Task 1: Zod Env Validation + Secret Sanitization

**Files:**
- Create: `src/lib/env.ts`
- Modify: `src/lib/db.ts` (add import)
- Modify: `.env.example` (expand)
- Modify: `.env`, `.env.local`, `.env.development`, `.env.prod` (sanitize)

- [ ] **Step 1: Create `src/lib/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  NEXT_PUBLIC_DOMAIN: z.string().url().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional().default(""),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_CHAT_ID: z.string().optional().default(""),
  AUTH_SECRET: z.string().optional().default(""),
  DATABASE_SCHEMA: z.string().optional().default("public"),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("Environment validation failed");
    }
    console.warn("⚠️ Using partial defaults in development");
    return envSchema.partial().parse(process.env);
  }
  return parsed.data;
}

export const env = envSchema.parse(process.env);
```

- [ ] **Step 2: Add env validation import to `src/lib/db.ts`**

Add at top (after imports, before `const globalForPrisma`):
```typescript
import { validateEnv } from "./env";
if (process.env.NODE_ENV === "production") validateEnv();
```

- [ ] **Step 3: Expand `.env.example`**

```
# ── Required ──────────────────────────────────
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="your-random-secret-at-least-32-chars"
NEXT_PUBLIC_DOMAIN="https://your-app.vercel.app"

# ── Optional (but recommended) ────────────────
NEXT_PUBLIC_WHATSAPP_NUMBER="+218000000000"
TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
TELEGRAM_CHAT_ID="-1001234567890"
AUTH_SECRET="another-random-secret"
DATABASE_SCHEMA="public"
```

- [ ] **Step 4: Sanitize `.env` — replace real credentials**

Replace `.env` contents:
```
# Paste your real credentials here (never commit this file)
# Copy from Vercel: vercel env pull
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

- [ ] **Step 5: Sanitize `.env.local`, `.env.development`, `.env.prod`**

Replace VERCEL_OIDC_TOKEN values with `""` in each. Keep `.env.local` only with `VERCEL_OIDC_TOKEN=""`.

- [ ] **Step 6: Push missing env vars to Vercel**

Run:
```bash
vercel env add JWT_SECRET
vercel env add NEXT_PUBLIC_WHATSAPP_NUMBER
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.ts src/lib/db.ts .env.example .env .env.local .env.development .env.prod
git commit -m "feat: add Zod env validation, sanitize credentials"
```

---

### Task 2: SystemConfig Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/..._add_system_config/`

- [ ] **Step 1: Add SystemConfig model to `prisma/schema.prisma`**

Append before `model Review` (line 362):
```prisma
model SystemConfig {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  value       Json
  category    String   @default("general")
  isSecret    Boolean  @default(false)
  description String   @default("")
  updatedAt   DateTime @updatedAt
  updatedBy   Int?
}
```

- [ ] **Step 2: Generate migration**

Run:
```bash
npx prisma migrate dev --name add_system_config
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add SystemConfig model for dynamic config engine"
```

---

### Task 3: Config Reader Library

**Files:**
- Create: `src/lib/config.ts`

- [ ] **Step 1: Create `src/lib/config.ts`**

```typescript
import { prisma } from "./db";
import { unstable_cache } from "next/cache";

export async function getConfig(key: string): Promise<unknown> {
  const cached = unstable_cache(
    async () => {
      const entry = await prisma.systemConfig.findUnique({ where: { key } });
      return entry?.value ?? null;
    },
    [`system-config-${key}`],
    { tags: ["system-config"], revalidate: 60 }
  );
  return cached();
}

export async function getConfigOrThrow<T>(key: string): Promise<T> {
  const value = await getConfig(key);
  if (value === null || value === undefined) {
    throw new Error(`Config key "${key}" not found`);
  }
  return value as T;
}

export async function getConfigByCategory(category: string) {
  return prisma.systemConfig.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });
}

export async function getAllConfigs() {
  return prisma.systemConfig.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

// Config encryption helpers for secret values
const encoder = new TextEncoder();

export async function encryptValue(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Buffer.from(combined).toString("base64");
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || "default-dev-key-1234567890";
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.padEnd(32, "x").slice(0, 32)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/config.ts
git commit -m "feat: add config reader library with caching and encryption"
```

---

### Task 4: Config API Routes

**Files:**
- Create: `src/app/api/admin/config/route.ts`
- Create: `src/app/api/config/route.ts`

- [ ] **Step 1: Create admin config CRUD API**

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  category: z.string().min(1).max(50).optional().default("general"),
  isSecret: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
});

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const configs = await prisma.systemConfig.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    const masked = configs.map((c) => ({
      ...c,
      value: c.isSecret ? "••••••••" : c.value,
    }));

    return success(masked);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const body = upsertSchema.parse(await request.json());

    const config = await prisma.systemConfig.upsert({
      where: { key: body.key },
      update: {
        value: body.value,
        category: body.category,
        isSecret: body.isSecret,
        description: body.description,
        updatedBy: auth.userId ?? undefined,
      },
      create: {
        key: body.key,
        value: body.value,
        category: body.category,
        isSecret: body.isSecret,
        description: body.description,
        updatedBy: auth.userId ?? undefined,
      },
    });

    revalidateTag("system-config");

    await logAudit({
      action: "update",
      actorId: auth.userId ?? undefined,
      targetType: "SystemConfig",
      targetId: config.id,
      metadata: { key: body.key, category: body.category },
    });

    return success(config);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) return error("key is required", 400);

    await prisma.systemConfig.delete({ where: { key } });
    revalidateTag("system-config");

    await logAudit({
      action: "delete",
      actorId: auth.userId ?? undefined,
      targetType: "SystemConfig",
      metadata: { key },
    });

    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Create public config read API**

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key) {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (!config || config.isSecret) return error("Not found", 404);
    return success({ key: config.key, value: config.value });
  }

  const configs = await prisma.systemConfig.findMany({
    where: { isSecret: false },
    select: { key: true, value: true, category: true },
  });

  return success(configs);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/config/route.ts src/app/api/config/route.ts
git commit -m "feat: add config CRUD API + public read endpoint"
```

---

### Task 5: Admin Config Editor UI

**Files:**
- Create: `src/components/admin/ConfigEditor.tsx`
- Modify: `src/app/admin/settings/page.tsx` (add config editor tab)

- [ ] **Step 1: Create ConfigEditor component**

```typescript
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Settings, Eye, EyeOff, Plus, Trash2, Save } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfigItem {
  id: number
  key: string
  value: unknown
  category: string
  isSecret: boolean
  description: string
  updatedAt: string
}

const CATEGORIES = ["general", "features", "limits", "payments", "notifications"]

const CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  features: "الميزات",
  limits: "الحدود",
  payments: "المدفوعات",
  notifications: "الإشعارات",
}

export default function ConfigEditor() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("general")
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Record<string, unknown>>({})

  const load = async () => {
    try {
      const res = await fetch("/api/admin/config")
      const json = await res.json()
      if (json.success) setConfigs(json.data)
    } catch {
      toast.error("فشل تحميل الإعدادات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = configs.filter((c) => c.category === activeCategory)

  const saveConfig = async (item: ConfigItem) => {
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: item.key,
          value: editing[item.key] ?? item.value,
          category: item.category,
          isSecret: item.isSecret,
          description: item.description,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error()
      toast.success("تم الحفظ")
      load()
    } catch {
      toast.error("فشل الحفظ")
    }
  }

  const deleteConfig = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/config?key=${encodeURIComponent(key)}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error()
      toast.success("تم الحذف")
      load()
    } catch {
      toast.error("فشل الحذف")
    }
  }

  if (loading) return <div className="h-32 rounded-md bg-muted/50 animate-breath" />

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "snap-start shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              activeCategory === cat
                ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange"
                : "border-border/30 hover:border-orange/20"
            )}
          >
            {CATEGORY_LABELS[cat] || cat}
            <Badge variant="outline" className="mr-2 text-[10px] px-1.5">
              {configs.filter((c) => c.category === cat).length}
            </Badge>
          </button>
        ))}
      </div>

      {/* Config items */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <Settings className="size-10 text-muted-foreground/50" />
          <p className="text-sm">لا توجد إعدادات في هذا القسم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-md bg-card/50 border border-border/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold">{item.key}</code>
                    {item.isSecret && (
                      <Badge variant="outline" className="text-[10px] px-1.5 text-orange border-orange/30">
                        سري
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => saveConfig(item)}>
                    <Save className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => deleteConfig(item.key)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <div className="relative">
                  <Input
                    type={item.isSecret && !showSecrets[item.key] ? "password" : "text"}
                    value={String(editing[item.key] ?? JSON.stringify(item.value) ?? "")}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [item.key]: e.target.value }))}
                    className={cn("h-10 rounded-xl font-mono text-sm", item.isSecret && "pl-10")}
                    dir="ltr"
                  />
                  {item.isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets[item.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add config tab to admin settings page**

In `src/app/admin/settings/page.tsx`, at the top of the `return` after the `<h2>`, add tab navigation:

```tsx
import ConfigEditor from "@/components/admin/ConfigEditor"
import { Settings as SettingsIcon } from "lucide-react"

// After imports, before component:
const SETTINGS_TABS = [
  { id: "restaurants", label: "المطاعم", icon: Store },
  { id: "telegram", label: "تليجرام", icon: Bot },
  { id: "config", label: "إعدادات النظام", icon: SettingsIcon },
]

// Add state:
const [activeTab, setActiveTab] = useState("restaurants")

// In return, after <h2>, add tab buttons:
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
  {SETTINGS_TABS.map((tab) => {
    const Icon = tab.icon
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          "snap-start shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center gap-2",
          activeTab === tab.id
            ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange"
            : "border-border/30 hover:border-orange/20"
        )}
      >
        <Icon className="size-4" />
        {tab.label}
      </button>
    )
  })}
</div>

// Then wrap existing sections in:
{activeTab === "restaurants" && ( /* existing restaurant section */ )}
{activeTab === "telegram" && ( /* existing telegram section */ )}
{activeTab === "config" && <ConfigEditor />}
```

- [ ] **Step 3: Seed default config values**

Add to `prisma/seed.ts`:
```typescript
const defaultConfigs = [
  { key: "max_free_restaurants", value: 5, category: "limits", description: "الحد الأقصى للمطاعم المجانية" },
  { key: "max_menu_items_free", value: 50, category: "limits", description: "الحد الأقصى للأصناف للخطة المجانية" },
  { key: "max_menu_items_paid", value: 999, category: "limits", description: "الحد الأقصى للأصناف للخطة المدفوعة" },
  { key: "order_polling_interval", value: 30000, category: "general", description: "فترة تحديث الطلبات (مللي)" },
  { key: "maintenance_mode", value: false, category: "features", description: "وضع الصيانة" },
  { key: "new_signups_enabled", value: true, category: "features", description: "السماح بالتسجيلات الجديدة" },
  { key: "commission_percent", value: 0, category: "payments", description: "نسبة العمولة" },
  { key: "min_order_amount", value: 0, category: "limits", description: "الحد الأدنى للطلب" },
  { key: "loyalty_points_per_lyd", value: 10, category: "general", description: "نقاط الولاء لكل دينار" },
];

for (const cfg of defaultConfigs) {
  await prisma.systemConfig.upsert({
    where: { key: cfg.key },
    update: {},
    create: cfg,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ConfigEditor.tsx src/app/admin/settings/page.tsx prisma/seed.ts
git commit -m "feat: add config editor UI to admin settings with tabs"
```

---

### Task 6: SVG Chart Components

**Files:**
- Create: `src/components/shared/AreaChart.tsx`
- Create: `src/components/shared/HorizontalBar.tsx`
- Create: `src/components/shared/MiniSparkline.tsx`
- Create: `src/components/admin/KpiCard.tsx`

- [ ] **Step 1: Create AreaChart**

```typescript
"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DataPoint {
  label: string
  value: number
}

interface AreaChartProps {
  data: DataPoint[]
  height?: number
  color?: string
  gradientId?: string
  className?: string
  showAxis?: boolean
}

export default function AreaChart({
  data,
  height = 200,
  color = "#f66d0f",
  gradientId = "area-gradient",
  className,
  showAxis = true,
}: AreaChartProps) {
  if (data.length === 0) return null

  const width = 600
  const padding = { top: 20, right: 10, bottom: showAxis ? 30 : 10, left: 10 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const minVal = Math.min(...data.map((d) => d.value), 0)
  const range = maxVal - minVal || 1

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showAxis && [0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + chartH * (1 - pct)
          return (
            <line
              key={pct}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="4 4"
            />
          )
        })}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {/* Dots */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color}
            stroke="white"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.03, duration: 0.3 }}
          />
        ))}

        {/* Labels */}
        {showAxis &&
          data.map((d, i) =>
            i % Math.max(1, Math.floor(data.length / 6)) === 0 ||
            i === data.length - 1 ? (
              <text
                key={i}
                x={points[i].x}
                y={height - 5}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {d.label}
              </text>
            ) : null
          )}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Create HorizontalBar**

```typescript
"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BarItem {
  label: string
  value: number
  color?: string
  subtitle?: string
}

interface HorizontalBarProps {
  data: BarItem[]
  maxItems?: number
  className?: string
  barHeight?: number
}

export default function HorizontalBar({
  data,
  maxItems = 10,
  className,
  barHeight = 28,
}: HorizontalBarProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems)
  const maxVal = Math.max(...sorted.map((d) => d.value), 1)

  if (sorted.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {sorted.map((item, i) => {
        const pct = (item.value / maxVal) * 100
        return (
          <div key={i} className="flex items-center gap-3">
            <span className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
              i === 0 ? "bg-orange text-white" :
              i < 3 ? "bg-orange-muted text-orange" :
              "bg-muted text-muted-foreground"
            )}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{item.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 mr-2">
                  {item.value}
                  {item.subtitle && <span className="text-[10px] mr-1">{item.subtitle}</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: item.color || "#f66d0f" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create MiniSparkline**

```typescript
"use client"

import { motion } from "framer-motion"

interface MiniSparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export default function MiniSparkline({
  data,
  width = 80,
  height = 28,
  color = "#f66d0f",
}: MiniSparklineProps) {
  if (data.length < 2) return null

  const maxVal = Math.max(...data, 1)
  const minVal = Math.min(...data, 0)
  const range = maxVal - minVal || 1
  const padding = 2
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * chartW,
    y: padding + chartH - ((v - minVal) / range) * chartH,
  }))

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  const isUp = data[data.length - 1] >= data[0]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area */}
      <motion.path
        d={`${path} L ${points[points.length - 1].x} ${padding + chartH} L ${points[0].x} ${padding + chartH} Z`}
        fill={`url(#spark-${color.replace("#", "")})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* Line */}
      <motion.path
        d={path}
        fill="none"
        stroke={isUp ? "#22c55e" : "#ef4444"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
    </svg>
  )
}
```

- [ ] **Step 4: Create KpiCard**

```typescript
"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { toArabicNumber } from "@/lib/format"
import MiniSparkline from "@/components/shared/MiniSparkline"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  label: string
  value: number
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  suffix?: string
  trend?: number
  sparklineData?: number[]
  onClick?: () => void
}

export default function KpiCard({
  label, value, icon: Icon, iconBg, iconColor, suffix = "",
  trend, sparklineData, onClick,
}: KpiCardProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden rounded-md bg-card/60 backdrop-blur-sm border border-border/30 p-5 shadow-sm transition-all duration-300",
        onClick && "cursor-pointer hover:border-orange/30 hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      {/* Ambient glow on hover */}
      <div className="absolute -inset-2 bg-gradient-radial from-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">
            {toArabicNumber(value)}{suffix}
          </p>
          <div className="flex items-center gap-2">
            {sparklineData && sparklineData.length > 1 && (
              <MiniSparkline data={sparklineData} />
            )}
            {trend !== undefined && (
              <span className={cn(
                "text-xs font-medium flex items-center gap-0.5",
                trend >= 0 ? "text-success" : "text-red-500"
              )}>
                {trend >= 0 ? "↑" : "↓"} {toArabicNumber(Math.abs(trend))}%
              </span>
            )}
          </div>
        </div>
        <div className={cn("rounded-xl p-3 shrink-0", iconBg || "bg-orange-muted")}>
          <Icon className={cn("size-5", iconColor || "text-orange")} />
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/AreaChart.tsx src/components/shared/HorizontalBar.tsx src/components/shared/MiniSparkline.tsx src/components/admin/KpiCard.tsx
git commit -m "feat: add SVG chart components - AreaChart, HorizontalBar, MiniSparkline, KpiCard"
```

---

### Task 7: Extended Admin Stats API

**Files:**
- Modify: `src/app/api/admin/stats/route.ts`

- [ ] **Step 1: Extend admin stats route**

Add after existing queries (before `const noPlanCount`):

```typescript
// Revenue trend (last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const revenueTrend = await prisma.$queryRaw<{ date: string; revenue: number }[]>`
  SELECT
    DATE(created_at) as date,
    COALESCE(SUM(total), 0) as revenue
  FROM "Order"
  WHERE created_at >= ${thirtyDaysAgo}
  GROUP BY DATE(created_at)
  ORDER BY date ASC
`;

// Order volume trend (last 30 days)
const orderVolumeTrend = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
  SELECT
    DATE(created_at) as date,
    COUNT(*) as count
  FROM "Order"
  WHERE created_at >= ${thirtyDaysAgo}
  GROUP BY DATE(created_at)
  ORDER BY date ASC
`;

// Top items across all restaurants
const topItems = await prisma.orderItem.groupBy({
  by: ["itemId"],
  _sum: { quantity: true },
  orderBy: { _sum: { quantity: "desc" } },
  take: 15,
});

const topItemIds = topItems.map((t) => t.itemId);
const topItemDetails = topItemIds.length > 0
  ? await prisma.menuItem.findMany({
      where: { id: { in: topItemIds } },
      select: { id: true, name: true, nameAr: true },
    })
  : [];
const topItemMap = new Map(topItemDetails.map((i) => [i.id, i.nameAr || i.name]));

const topItemsFormatted = topItems.map((t) => ({
  itemId: t.itemId,
  name: topItemMap.get(t.itemId) ?? "Unknown",
  totalSold: t._sum.quantity ?? 0,
}));

// Growth rates (MoM)
const thirtyDaysBefore = new Date();
thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 60);
const sixtyDaysBefore = new Date();
sixtyDaysBefore.setDate(sixtyDaysBefore.getDate() - 60);

const [currentMonthUsers, prevMonthUsers] = await Promise.all([
  prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  prisma.user.count({
    where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
  }),
]);

const [currentMonthRestaurants, prevMonthRestaurants] = await Promise.all([
  prisma.restaurant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  prisma.restaurant.count({
    where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
  }),
]);

// AOV
const aovData = await prisma.order.aggregate({
  _avg: { total: true },
  where: { createdAt: { gte: thirtyDaysAgo } },
});

const aovPrevData = await prisma.order.aggregate({
  _avg: { total: true },
  where: { createdAt: { gte: thirtyDaysBefore, lt: thirtyDaysAgo } },
});

const userGrowthPct = prevMonthUsers > 0
  ? Math.round(((currentMonthUsers - prevMonthUsers) / prevMonthUsers) * 100)
  : 0;

const restaurantGrowthPct = prevMonthRestaurants > 0
  ? Math.round(((currentMonthRestaurants - prevMonthRestaurants) / prevMonthRestaurants) * 100)
  : 0;
```

Add to returned object:
```typescript
revenueTrend: revenueTrend.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
orderVolumeTrend: orderVolumeTrend.map((r) => ({ date: r.date, count: Number(r.count) })),
topItems: topItemsFormatted,
userGrowthPct,
restaurantGrowthPct,
avgOrderValue: Number(aovData._avg.total ?? 0),
avgOrderValuePrev: Number(aovPrevData._avg.total ?? 0),
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/stats/route.ts
git commit -m "feat: extend admin stats with revenue trend, top items, growth rates"
```

---

### Task 8: Admin Dashboard Overhaul

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Replace dashboard with enhanced version**

_Exact edits to make — too large for inline; apply the following changes:_

**Change imports** — replace `CountUp` import with KpiCard:
```
// Remove: import CountUp from "@/components/landing/CountUp"
// Add:
import KpiCard from "@/components/admin/KpiCard"
import AreaChart from "@/components/shared/AreaChart"
import HorizontalBar from "@/components/shared/HorizontalBar"
```

**Extend StatsData interface** — add after `linkedRestaurants: number`:
```typescript
revenueTrend: { date: string; revenue: number }[]
orderVolumeTrend: { date: string; count: number }[]
topItems: { itemId: number; name: string; totalSold: number }[]
userGrowthPct: number
restaurantGrowthPct: number
avgOrderValue: number
avgOrderValuePrev: number
```

**Replace KPI card grid** (lines 159-183) with:
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <KpiCard
    label="إجمالي المطاعم"
    value={stats.totalRestaurants}
    icon={Store}
    iconBg="bg-orange-muted"
    iconColor="text-orange"
    trend={stats.restaurantGrowthPct}
  />
  <KpiCard
    label="إجمالي المستخدمين"
    value={stats.totalUsers}
    icon={Users}
    iconBg="bg-purple-50/80 dark:bg-purple-950/20"
    iconColor="text-purple-600 dark:text-purple-400"
    trend={stats.userGrowthPct}
  />
  <KpiCard
    label="الإيراد الشهري"
    value={stats.monthlyRevenue}
    icon={DollarSign}
    iconBg="bg-success/10"
    iconColor="text-success"
    suffix=" د.ل"
  />
  <KpiCard
    label="إجمالي الطلبات"
    value={stats.totalOrders}
    icon={ShoppingCart}
    iconBg="bg-orange-muted/80"
    iconColor="text-orange"
    sparklineData={stats.orderVolumeTrend.slice(-7).map((d) => d.count)}
  />
</div>
```

**Replace chart + alerts grid** (lines 211-277) with:
```tsx
<div className="grid gap-6 lg:grid-cols-2">
  {/* Revenue trend */}
  <div className="rounded-md bg-card/70 border border-border/30 p-6 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">اتجاه الإيرادات (30 يوم)</h3>
      </div>
    </div>
    {stats.revenueTrend.length > 0 ? (
      <AreaChart data={stats.revenueTrend.map(d => ({ label: d.date.slice(5), value: Number(d.revenue) }))} height={220} />
    ) : (
      <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-muted-foreground/50">
        <TrendingUp className="size-8" />
        <p className="text-sm">لا توجد بيانات</p>
      </div>
    )}
  </div>

  {/* Order volume trend */}
  <div className="rounded-md bg-card/70 border border-border/30 p-6 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">حجم الطلبات (30 يوم)</h3>
      </div>
    </div>
    {stats.orderVolumeTrend.length > 0 ? (
      <AreaChart
        data={stats.orderVolumeTrend.map(d => ({ label: d.date.slice(5), value: d.count }))}
        height={220}
        color="#22c55e"
        gradientId="order-gradient"
      />
    ) : (
      <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-muted-foreground/50">
        <ShoppingCart className="size-8" />
        <p className="text-sm">لا توجد بيانات</p>
      </div>
    )}
  </div>
</div>

<div className="grid gap-6 lg:grid-cols-2">
  {/* Top items */}
  <div className="rounded-md bg-card/70 border border-border/30 p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <BarChart3 className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">الأصناف الأكثر طلباً</h3>
    </div>
    {stats.topItems.length > 0 ? (
      <HorizontalBar data={stats.topItems.map(i => ({ label: i.name, value: i.totalSold }))} />
    ) : (
      <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-muted-foreground/50">
        <BarChart3 className="size-8" />
        <p className="text-sm">لا توجد بيانات</p>
      </div>
    )}
  </div>

  {/* Quick metrics */}
  <div className="rounded-md bg-card/70 border border-border/30 p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <Activity className="size-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">مؤشرات سريعة</h3>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-md bg-orange-muted/50 p-4">
        <p className="text-xs text-muted-foreground">معدل الطلب</p>
        <p className="text-2xl font-bold mt-1">{toArabicNumber(stats.avgOrderValue)} د.ل</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">متوسط قيمة الطلب</p>
      </div>
      <div className="rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
        <p className="text-xs text-success">مدفوع</p>
        <p className="text-2xl font-bold mt-1 text-success">{toArabicNumber(stats.paidPlanCount)}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">اشتراك مدفوع</p>
      </div>
      <div className="rounded-md bg-orange-muted/50 p-4">
        <p className="text-xs text-orange">مرتبط</p>
        <p className="text-2xl font-bold mt-1">{toArabicNumber(stats.linkedRestaurants)}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">مطعم مرتبط</p>
      </div>
      <div className="rounded-md bg-orange-muted/50 p-4">
        <p className="text-xs text-orange">طلبات اليوم</p>
        <p className="text-2xl font-bold mt-1">{toArabicNumber(stats.ordersToday.count)}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {toArabicNumber(Number(stats.ordersToday.revenue))} د.ل إيراد
        </p>
      </div>
    </div>
  </div>
</div>
```

Remove old sub-stats row (lines 186-209) and old chart + alerts grid (lines 211-277).

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: overhaul admin dashboard with revenue/order charts, top items, KpiCard"
```

---

### Task 9: Merchant Advanced Stats API

**Files:**
- Create: `src/app/api/stats/advanced/route.ts`

- [ ] **Step 1: Create advanced merchant stats endpoint**

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError, error } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    let restaurantId: number | undefined = Number(searchParams.get("restaurantId")) || undefined;

    if (auth.role === "owner") {
      if (!auth.restaurantId) return error("لا يوجد مطعم مرتبط", 400);
      restaurantId = auth.restaurantId;
    }
    if (!restaurantId) return error("معرف المطعم مطلوب", 400);

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Revenue last 7 days
    const revenue7d = await prisma.$queryRaw<{ date: string; revenue: number }[]>`
      SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue
      FROM "Order"
      WHERE restaurant_id = ${restaurantId} AND created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `;

    // Orders last 7 days
    const orders7d = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "Order"
      WHERE restaurant_id = ${restaurantId} AND created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `;

    // Top items with growth
    const topItemsCurrent = await prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      where: { order: { restaurantId, createdAt: { gte: sevenDaysAgo } } },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const topItemsPrev = await prisma.orderItem.groupBy({
      by: ["itemId"],
      _sum: { quantity: true },
      where: { order: { restaurantId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } },
      take: 10,
    });

    const topItemIds = topItemsCurrent.map((t) => t.itemId);
    const topItemDetails = topItemIds.length > 0
      ? await prisma.menuItem.findMany({ where: { id: { in: topItemIds } }, select: { id: true, name: true } })
      : [];
    const itemMap = new Map(topItemDetails.map((i) => [i.id, i.name]));
    const prevMap = new Map(topItemsPrev.map((t) => [t.itemId, t._sum.quantity ?? 0]));

    const topItems = topItemsCurrent.map((t) => {
      const prev = prevMap.get(t.itemId) ?? 0;
      const curr = t._sum.quantity ?? 0;
      return {
        itemId: t.itemId,
        name: itemMap.get(t.itemId) ?? "Unknown",
        totalSold: curr,
        growth: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100,
      };
    });

    // Hourly distribution
    const hourlyDistribution = await prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count
      FROM "Order"
      WHERE restaurant_id = ${restaurantId} AND created_at >= ${sevenDaysAgo}
      GROUP BY hour ORDER BY hour ASC
    `;

    // AOV trend
    const aovTrend = await prisma.$queryRaw<{ date: string; aov: number }[]>`
      SELECT DATE(created_at) as date, AVG(total)::decimal(10,2) as aov
      FROM "Order"
      WHERE restaurant_id = ${restaurantId} AND created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `;

    // Growth vs prev period
    const [currentCount, prevCount] = await Promise.all([
      prisma.order.count({ where: { restaurantId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
    ]);

    const growthPct = prevCount > 0
      ? Math.round(((currentCount - prevCount) / prevCount) * 100)
      : 0;

    return success({
      revenue7d: revenue7d.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
      orders7d: orders7d.map((r) => ({ date: r.date, count: Number(r.count) })),
      topItems,
      hourlyDistribution: hourlyDistribution.map((h) => ({ hour: h.hour, count: Number(h.count) })),
      aovTrend: aovTrend.map((a) => ({ date: a.date, aov: Number(a.aov) })),
      growthPct,
    });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/stats/advanced/route.ts
git commit -m "feat: add advanced merchant stats API with trends, hourly data"
```

---

### Task 10: Merchant Dashboard Overhaul

**Files:**
- Modify: `src/app/owner/page.tsx`

- [ ] **Step 1: Add advanced stats loading and chart sections**

**Add imports:**
```typescript
import AreaChart from "@/components/shared/AreaChart"
import HorizontalBar from "@/components/shared/HorizontalBar"
import MiniSparkline from "@/components/shared/MiniSparkline"
import KpiCard from "@/components/admin/KpiCard"
import { Activity, DollarSign, TrendingUp, BarChart3, Clock } from "lucide-react" // add if missing
```

**Extend StatsData interface:**
```typescript
advancedStats?: {
  revenue7d: { date: string; revenue: number }[]
  orders7d: { date: string; count: number }[]
  topItems: { itemId: number; name: string; totalSold: number; growth: number }[]
  hourlyDistribution: { hour: number; count: number }[]
  aovTrend: { date: string; aov: number }[]
  growthPct: number
}
```

**Add advanced stats loading** — after the `loyaltyRes` fetch in `load()`:
```typescript
const advancedRes = await fetch(`/api/stats/advanced?restaurantId=${rid}`);
if (advancedRes.ok) {
  const advData = await advancedRes.json();
  setStats(prev => prev ? { ...prev, advancedStats: advData.data } : prev);
}
```

**Add state:**
```typescript
const [tab, setTab] = useState<"overview" | "analytics">("overview")
```

**Add tab navigation** after the welcome banner (before "Restaurant header"):
```tsx
<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
  {[
    { id: "overview", label: "نظرة عامة", icon: Activity },
    { id: "analytics", label: "تحليلات", icon: BarChart3 },
  ].map((t) => {
    const TIcon = t.icon
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setTab(t.id as any)}
        className={cn(
          "snap-start shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2",
          tab === t.id
            ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange"
            : "border-border/30 hover:border-orange/20"
        )}
      >
        <TIcon className="size-4" />
        {t.label}
      </button>
    )
  })}
</div>
```

**Wrap existing stats grid + status + popular + recent in:** `{tab === "overview" && ( ... )}`

**Add analytics tab:** after the overview block and before the quick actions:
```tsx
{tab === "analytics" && stats?.advancedStats && (
  <div className="space-y-6 animate-fade-in">
    {/* KPI row */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="إيرادات 7 أيام"
        value={stats.advancedStats.revenue7d.reduce((s, r) => s + r.revenue, 0)}
        icon={DollarSign}
        iconBg="bg-success/10"
        iconColor="text-success"
        suffix=" د.ل"
        trend={stats.advancedStats.growthPct}
        sparklineData={stats.advancedStats.revenue7d.map(r => r.revenue)}
      />
      <KpiCard
        label="طلبات 7 أيام"
        value={stats.advancedStats.orders7d.reduce((s, o) => s + o.count, 0)}
        icon={ShoppingCart}
        iconBg="bg-orange-muted"
        iconColor="text-orange"
        sparklineData={stats.advancedStats.orders7d.map(o => o.count)}
      />
      <KpiCard
        label="متوسط قيمة الطلب"
        value={Math.round(stats.advancedStats.aovTrend.reduce((s, a) => s + a.aov, 0) / Math.max(stats.advancedStats.aovTrend.length, 1))}
        icon={TrendingUp}
        iconBg="bg-purple-50/80 dark:bg-purple-950/20"
        iconColor="text-purple-600"
        suffix=" د.ل"
      />
      <KpiCard
        label="النمو"
        value={stats.advancedStats.growthPct}
        icon={Activity}
        iconBg="bg-orange-muted/80"
        iconColor="text-orange"
        suffix="%"
      />
    </div>

    {/* Revenue chart */}
    <div className="rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-4">اتجاه الإيرادات (7 أيام)</h3>
      {stats.advancedStats.revenue7d.length > 0 ? (
        <AreaChart
          data={stats.advancedStats.revenue7d.map(d => ({ label: d.date.slice(5), value: d.revenue }))}
          height={200}
        />
      ) : (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground/50">
          <DollarSign className="size-8" />
        </div>
      )}
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      {/* Hourly distribution */}
      <div className="rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">توزيع الطلبات حسب الساعة</h3>
        </div>
        {stats.advancedStats.hourlyDistribution.length > 0 ? (
          <HorizontalBar
            data={stats.advancedStats.hourlyDistribution.map(h => ({
              label: `${h.hour}:00`,
              value: h.count,
            }))}
            barHeight={20}
          />
        ) : (
          <div className="flex items-center justify-center h-[150px] text-muted-foreground/50">
            <Clock className="size-8" />
          </div>
        )}
      </div>

      {/* Top items with growth */}
      <div className="rounded-md bg-card/50 border border-border/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">الأكثر طلباً (نمو)</h3>
        </div>
        {stats.advancedStats.topItems.length > 0 ? (
          <div className="space-y-2">
            {stats.advancedStats.topItems.slice(0, 8).map((item, idx) => (
              <div key={item.itemId} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                    idx === 0 ? "bg-orange text-white" :
                    idx < 3 ? "bg-orange-muted text-orange" :
                    "bg-muted text-muted-foreground"
                  )}>{toArabicNumber(idx + 1)}</span>
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{toArabicNumber(item.totalSold)}</span>
                  {item.growth !== 0 && (
                    <span className={cn(
                      "text-[11px] font-medium",
                      item.growth > 0 ? "text-success" : "text-red-500"
                    )}>
                      {item.growth > 0 ? "↑" : "↓"}{toArabicNumber(Math.abs(item.growth))}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[150px] text-muted-foreground/50">
            <BarChart3 className="size-8" />
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/owner/page.tsx
git commit -m "feat: overhaul merchant dashboard with analytics tab, revenue chart, hourly data"
```

---

### Task 11: Build Verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```
Expected: No errors (warnings OK)

- [ ] **Step 2: Fix any lint issues**

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: Compiled successfully, 0 errors

- [ ] **Step 4: Fix any build issues**

Common issues:
- Missing imports (AreaChart, HorizontalBar, KpiCard type mismatches)
- SQL raw query column name mismatches (Prisma uses snake_case for raw queries but camelCase in model)
- Zod v4 API changes

- [ ] **Step 5: Run Prisma generate after schema changes**

```bash
npx prisma generate
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: fix lint and build issues from dashboard overhaul"
```

---

## Self-Review

### Spec Coverage

| Spec Section | Task |
|-------------|------|
| Env validation | Task 1 |
| Sanitize credentials | Task 1 |
| .env.example expansion | Task 1 |
| Push missing Vercel envs | Task 1 |
| SystemConfig schema | Task 2 |
| Config reader lib | Task 3 |
| Config API | Task 4 |
| Config admin UI | Task 5 |
| Chart components (Area, Horizontal, Sparkline) | Task 6 |
| KpiCard component | Task 6 |
| Extended admin stats | Task 7 |
| Admin dashboard overhaul | Task 8 |
| Merchant advanced stats | Task 9 |
| Merchant dashboard overhaul | Task 10 |
| Build verification | Task 11 |

### Placeholder Check
- All steps have actual code, no TODOs
- All file paths are exact
- All commands are exact

### Type Consistency
- `getConfig(key)` → `unknown`, `getConfigOrThrow<T>(key)` → `T` — consistent across Task 3 and Task 4 usage
- `requireAdmin()` returns `{ authorized, userId, role }` — used correctly in Task 4
- `success(data)` wraps response — used consistently in all API routes
- Chart component props match usage in dashboard pages
- `KpiCard` receives `trend?: number` (growth percentage) — used in both admin and owner dashboards
