# Telegram Broadcast Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-user Telegram alert delivery with broadcast routing to dynamically targeted individual admin chat IDs + private channels/groups, with async concurrency guards.

**Architecture:** New `TelegramBroadcastTarget` model replaces sole `chatId` dependency. New `lib/telegram-broadcast.ts` engine gathers all targets (broadcast + linked admins), deduplicates, sends via `Promise.allSettled`. Callers unchanged — `sendTelegramNotification`/`notifyEvent` internally call broadcast engine.

**Tech Stack:** Next.js 16.2.9, Prisma ORM 7.8, Telegram Bot API, TypeScript

## Global Constraints

- All API routes admin-protected via `requireAdmin()`
- Arabic UI text for admin-facing components
- Backward compat: existing `TelegramConfig.chatId` field kept (deprecated), existing env vars kept (deprecated)
- Broadcast engine never throws — returns `{ sent, failed }` result
- No new npm dependencies

---

## File Structure

**Modified:**
- `prisma/schema.prisma` — add `TelegramBroadcastTarget` model
- `src/lib/telegram.ts` — rewrite to use broadcast engine
- `src/app/api/telegram/test/route.ts` — test all targets
- `src/app/api/telegram/diagnose/route.ts` — add per-target diagnostics
- `src/app/admin/telegram/page.tsx` — add broadcast targets UI section
- `src/app/api/restaurants/route.ts` — remove `.catch(() => {})`

**Created:**
- `src/lib/telegram-broadcast.ts` — broadcast engine
- `prisma/migrations/` — auto-generated migration
- `src/app/api/telegram/broadcast-targets/route.ts` — list/create
- `src/app/api/telegram/broadcast-targets/[id]/route.ts` — update/delete

---

### Task 1: Prisma schema — Add TelegramBroadcastTarget model

**Files:**
- Modify: `prisma/schema.prisma` — add model after TelegramConfig (line ~198)

**Interfaces:**
- Produces: `prisma.telegramBroadcastTarget` queries available

- [ ] **Step 1: Add model to schema.prisma**

```prisma
model TelegramBroadcastTarget {
  id        Int      @id @default(autoincrement())
  label     String   @default("")
  chatId    String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Insert after `TelegramConfig` model (before `WhatsappTemplate`).

- [ ] **Step 2: Run migration**

```bash
cd /home/ahmed/Downloads/smart-menu
npx prisma migrate dev --name add_telegram_broadcast_target
```

Expected: Migration created + applied. `TelegramBroadcastTarget` table exists.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: Generated client includes `telegramBroadcastTarget` queries.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add TelegramBroadcastTarget model"
```

---

### Task 2: Broadcast engine — lib/telegram-broadcast.ts

**Files:**
- Create: `src/lib/telegram-broadcast.ts`

**Interfaces:**
- Consumes: `prisma.telegramConfig`, `prisma.telegramBroadcastTarget`, `prisma.user`
- Produces: `broadcastToAll(message, opts?) => Promise<{ sent: number, failed: Array<{ chatId: string, reason: string }> }>`

- [ ] **Step 1: Create broadcast engine file**

```typescript
import { prisma } from "@/lib/db";

interface BroadcastResult {
  sent: number;
  failed: { chatId: string; reason: string }[];
}

interface BroadcastOpts {
  parseMode?: "Markdown" | "HTML";
}

async function sendToChat(
  botToken: string,
  chatId: string,
  message: string,
  opts?: BroadcastOpts,
): Promise<void> {
  const body: Record<string, string | number> = {
    chat_id: chatId.startsWith("-") ? Number(chatId) : chatId,
    text: message,
  };
  if (opts?.parseMode) body.parse_mode = opts.parseMode;
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API ${res.status}: ${err.slice(0, 300)}`);
  }
}

async function gatherTargets(): Promise<Set<string>> {
  const targets = new Set<string>();

  // Active broadcast targets
  const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
    where: { isActive: true },
    select: { chatId: true },
  });
  for (const t of broadcastTargets) targets.add(t.chatId);

  // Linked admin users
  const linkedUsers = await prisma.user.findMany({
    where: { telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  for (const u of linkedUsers) {
    if (u.telegramChatId) targets.add(u.telegramChatId);
  }

  return targets;
}

export async function broadcastToAll(
  message: string,
  opts?: BroadcastOpts,
): Promise<BroadcastResult> {
  const config = await prisma.telegramConfig.findFirst();
  if (!config || !config.isActive || !config.botToken) {
    return { sent: 0, failed: [] };
  }

  const targetIds = await gatherTargets();
  if (targetIds.size === 0) return { sent: 0, failed: [] };

  const results = await Promise.allSettled(
    Array.from(targetIds).map((chatId) =>
      sendToChat(config.botToken, chatId, message, opts),
    ),
  );

  const failed: BroadcastResult["failed"] = [];
  let sent = 0;

  const chatIds = Array.from(targetIds);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      sent++;
    } else {
      console.error("[Telegram Broadcast] Failed:", chatIds[i], r.reason);
      failed.push({ chatId: chatIds[i], reason: r.reason?.message ?? "Unknown" });
    }
  }

  return { sent, failed };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/telegram-broadcast.ts
git commit -m "feat: add broadcast engine with Promise.allSettled"
```

---

### Task 3: Rewrite lib/telegram.ts to use broadcast engine

**Files:**
- Modify: `src/lib/telegram.ts`

**Interfaces:**
- Produces: `sendTelegramNotification(msg, opts?) => Promise<{ sent: number, failed: Array<{chatId, reason}> }>`, `notifyEvent(type, data) => Promise<{ sent, failed }>`, `sendTelegramMessage` kept as alias of `sendTelegramNotification`

- [ ] **Step 1: Rewrite lib/telegram.ts**

```typescript
import { prisma } from "@/lib/db";
import { broadcastToAll } from "@/lib/telegram-broadcast";

type BroadcastResult = { sent: number; failed: { chatId: string; reason: string }[] };

export async function sendTelegramNotification(
  message: string,
  opts?: { parseMode?: "Markdown" | "HTML" }
): Promise<BroadcastResult> {
  return broadcastToAll(message, opts);
}

export async function notifyEvent(
  eventType: string,
  data: Record<string, unknown>
): Promise<BroadcastResult> {
  const config = await prisma.telegramConfig.findFirst();
  if (!config || !config.isActive) return { sent: 0, failed: [] };
  const activeEvents = (config.events as string[]) ?? [];
  if (activeEvents.length > 0 && !activeEvents.includes(eventType)) {
    return { sent: 0, failed: [] };
  }
  const lines = [`*${eventType}*`];
  for (const [k, v] of Object.entries(data)) {
    lines.push(`• ${k}: ${v}`);
  }
  return broadcastToAll(lines.join("\n"), { parseMode: "Markdown" });
}

/** Alias for backward compatibility */
export const sendTelegramMessage = sendTelegramNotification;
```

- [ ] **Step 2: Verify callers still compile**

```bash
cd /home/ahmed/Downloads/smart-menu
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: Zero type errors. Callers used `sendTelegramNotification(msg)` which still exists, just now returns object not boolean.

- [ ] **Step 3: Update restaurant route — remove fire-and-forget `.catch()`**

In `src/app/api/restaurants/route.ts`, change:
```typescript
notifyEvent("restaurant_created", { ... }).catch(() => {});
```
to:
```typescript
notifyEvent("restaurant_created", { ... });
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/telegram.ts src/app/api/restaurants/route.ts
git commit -m "feat: rewrite telegram lib to use broadcast engine"
```

---

### Task 4: Broadcast targets CRUD API routes

**Files:**
- Create: `src/app/api/telegram/broadcast-targets/route.ts`
- Create: `src/app/api/telegram/broadcast-targets/[id]/route.ts`

**Interfaces:**
- Consumes: `prisma.telegramBroadcastTarget`
- Produces: REST endpoints for managing broadcast targets

- [ ] **Step 1: Create list/create route**

`src/app/api/telegram/broadcast-targets/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().default(""),
  chatId: z.string().min(1, "Chat ID is required"),
});

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const targets = await prisma.telegramBroadcastTarget.findMany({
      orderBy: { createdAt: "desc" },
    });
    return success(targets);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const body = createSchema.parse(await request.json());
    const target = await prisma.telegramBroadcastTarget.create({
      data: { label: body.label, chatId: body.chatId },
    });
    return success(target);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Create PATCH/DELETE route**

`src/app/api/telegram/broadcast-targets/[id]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().optional(),
  chatId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const target = await prisma.telegramBroadcastTarget.update({
      where: { id: Number(id) },
      data: body,
    });
    return success(target);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const { id } = await params;
    await prisma.telegramBroadcastTarget.delete({
      where: { id: Number(id) },
    });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telegram/broadcast-targets/
git commit -m "feat: add broadcast targets CRUD API routes"
```

---

### Task 5: Update test and diagnose routes for broadcast

**Files:**
- Modify: `src/app/api/telegram/test/route.ts`
- Modify: `src/app/api/telegram/diagnose/route.ts`

- [ ] **Step 1: Update test route to broadcast to all targets**

```typescript
import type { NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { broadcastToAll } from "@/lib/telegram-broadcast";

export async function POST(_: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);
    const result = await broadcastToAll(
      "🔔 *Test Notification*\n\nSmart Menu Telegram integration is working correctly!",
      { parseMode: "Markdown" },
    );
    return success(result);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Update diagnose route — add per-target status check**

Replace the whole file. New `src/app/api/telegram/diagnose/route.ts`:

```typescript
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

async function testChatId(
  botToken: string,
  chatId: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const parsed = chatId.match(/^-?\d+$/) ? Number(chatId) : chatId;
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: parsed,
          text: "🔍 Diagnostic Test — if you see this, the target works.",
          parse_mode: "Markdown",
        }),
      },
    );
    if (res.ok) return { ok: true, error: null };
    const err = await res.text();
    return { ok: false, error: err.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function GET(_: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const config = await prisma.telegramConfig.findFirst();

    if (!config) {
      return success({
        configExists: false,
        isActive: false,
        botTokenPreview: null,
        events: [],
        broadcastTargets: [],
        linkedAdmins: 0,
      });
    }

    // Test each broadcast target
    const broadcastTargets = await prisma.telegramBroadcastTarget.findMany();
    const targetResults = await Promise.allSettled(
      broadcastTargets.map(async (t) => {
        const test = config.botToken && config.isActive
          ? await testChatId(config.botToken, t.chatId)
          : { ok: false, error: "Bot inactive" };
        return { id: t.id, label: t.label || t.chatId, chatId: t.chatId, isActive: t.isActive, ...test };
      }),
    );

    const linkedAdmins = await prisma.user.count({
      where: { telegramChatId: { not: null } },
    });

    return success({
      configExists: true,
      isActive: config.isActive,
      botTokenPreview: config.botToken ? config.botToken.slice(0, 4) + "..." : null,
      events: (config.events as string[]) ?? [],
      broadcastTargets: targetResults.map((r) => (r.status === "fulfilled" ? r.value : { error: "Test failed" })),
      linkedAdmins,
    });
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telegram/test/route.ts src/app/api/telegram/diagnose/route.ts
git commit -m "feat: update test/diagnose routes for broadcast"
```

---

### Task 6: Admin UI — add broadcast targets section

**Files:**
- Modify: `src/app/admin/telegram/page.tsx`

- [ ] **Step 1: Update AdminTelegramPage with broadcast targets section**

Replace the file with the updated version. Key additions:
- Broadcast targets list state + fetch on mount
- Add target form (label + chatId)
- Targets table with toggle/delete
- Linked admins readout
- Updated diagnose display showing per-target results
- Inline Arabic guide for channel/group setup

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/telegram/page.tsx
git commit -m "feat: add broadcast targets section to admin UI"
```

---

### Task 7: Seed migration — migrate existing chatId to broadcast target

**Files:**
- Create: `prisma/seed-telegram-broadcast.ts`

- [ ] **Step 1: Create seed migration script**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingTargets = await prisma.telegramBroadcastTarget.count();
  if (existingTargets > 0) {
    console.log("Broadcast targets already exist, skipping seed.");
    return;
  }

  const config = await prisma.telegramConfig.findFirst();
  if (config && config.chatId) {
    await prisma.telegramBroadcastTarget.create({
      data: {
        label: "الإعدادات القديمة (مُهاجر)",
        chatId: config.chatId,
        isActive: config.isActive,
      },
    });
    console.log(`Migrated existing chatId "${config.chatId}" as first broadcast target.`);
  } else {
    console.log("No existing chatId to migrate.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add to package.json seed file or run manually**

This is a one-time bootstrapper. Run:

```bash
cd /home/ahmed/Downloads/smart-menu
npx tsx prisma/seed-telegram-broadcast.ts
```

Expected: Existing `TelegramConfig.chatId` now exists as `TelegramBroadcastTarget` row.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed-telegram-broadcast.ts
git commit -m "feat: add seed migration for existing chatId to broadcast target"
```

---

### Task 8: Build verification

**Files:** None.

- [ ] **Step 1: TypeScript compile check**

```bash
cd /home/ahmed/Downloads/smart-menu
npx tsc --noEmit --pretty 2>&1
```

Expected: Zero errors.

- [ ] **Step 2: Lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: Zero warnings/errors.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Zero errors, successful build.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: broadcast routing build verification"
```
