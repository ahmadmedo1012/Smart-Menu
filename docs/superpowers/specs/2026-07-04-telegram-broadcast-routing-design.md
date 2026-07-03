# Telegram Broadcast Routing Architecture

**Date:** 2026-07-04
**Status:** Draft

## Overview

Replace single-user Telegram alert delivery with a scalable Broadcast Routing Architecture.
Alerts target both linked individual admin Chat IDs and private Telegram Channels/Groups simultaneously.
Async concurrency guards protect transaction processing from Telegram API rate boundaries.

## Current State

- `TelegramConfig` singleton — one `botToken`, one `chatId`. All alerts go to exactly one chat.
- `sendTelegramNotification()` sends to ONE chat, blocks on DB every call.
- All callers use fire-and-forget with `.catch(() => {})` — no error isolation.
- `User.telegramChatId` exists (linking infra complete) but **never read** for sending.
- No broadcast, no multi-target, no Channel/Group ID support.

## Schema Changes

### New Model: `TelegramBroadcastTarget`

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

### `TelegramConfig` changes

- `chatId` field kept in schema (existing data preserved) but **deprecated** — no longer read by send logic. Removed in next major migration.

### Migration

Seed existing `TelegramConfig.chatId` as first `TelegramBroadcastTarget` entry if:
- `chatId` is non-empty
- No `TelegramBroadcastTarget` rows exist

## Broadcast Engine (`lib/telegram-broadcast.ts`)

### Core function: `broadcastToAll()`

```
broadcastToAll(message, opts?)
  ├─ 1. Read TelegramConfig (botToken, isActive, events filter)
  ├─ 2. Gather targets:
  │     ├─ TelegramBroadcastTarget.findMany({ where: { isActive: true } })
  │     └─ User.findMany({ where: { telegramChatId: { not: null } }, select: { telegramChatId: true } })
  ├─ 3. Deduplicate chatIds (same ID in both lists)
  ├─ 4. Promise.allSettled(targets.map(t => sendToChat(t.chatId, message, opts)))
  └─ 5. Return { sent: number, failed: Array<{ chatId: string, reason: string }> }
```

### `sendToChat()` — internal helper

Individual fetch wrapper. Returns `{ ok: true }` or throws on failure.
Each call is isolated — a single chat timeout never propagates.

### `notifyEvent()` migration

Stays in `lib/telegram.ts` as thin wrapper:
1. Reads config, checks `isActive`, filters by `events[]`
2. Builds markdown message
3. Calls `broadcastToAll()` instead of direct `sendTelegramNotification()`
4. Returns `{ sent, failed }` instead of bare boolean

### `sendTelegramNotification()` migration

Becomes alias for backward-compat callers that don't use event filtering:
1. Calls `broadcastToAll()` directly
2. Returns `{ sent: count, failed: [...] }`

### Error isolation

- `Promise.allSettled` ensures one failing target never blocks others
- Failed targets logged: `[Telegram Broadcast] Failed: <chatId>: <error>`
- Caller receives `failed` array for optional handling
- `broadcastToAll()` itself never throws

### Rate limiting

`ponytail: no rate limiter now (<20 targets expected). Add queue + 30msg/s throttle if count exceeds 50.`

## API Routes

### `GET /api/telegram/broadcast-targets`
List all broadcast targets. Admin-only.

### `POST /api/telegram/broadcast-targets`
Create new target. Body: `{ label, chatId }`. Admin-only.

### `PATCH /api/telegram/broadcast-targets/[id]`
Update label, chatId, or isActive. Admin-only.

### `DELETE /api/telegram/broadcast-targets/[id]`
Remove target. Admin-only.

### Existing routes updated
- `GET/POST /api/telegram/config` — keep existing shape (backward compat), `chatId` field no longer used by broadcast engine
- `GET /api/telegram/diagnose` — add per-target status test
- `POST /api/telegram/test` — now sends to ALL targets (not just chatId)

## Admin UI

### Broadcast targets section (below bot config on `/admin/telegram`)

**Add target form:**
- Label field (optional, human-friendly)
- Chat ID field (required, supports `-100xxxxxxxxxx` channels)
- [Add] button

**Targets list table:**
- Label | Chat ID (masked) | Status dot | Toggle | [Delete]
- Status indicator: green (tested OK) / red (last test failed) / gray (untested)

**Linked admin users readout:**
- "عدد المشرفين المرتبطين: N" with info icon
- No inline CRUD — admins link via Telegram `/start`

**Inline Arabic guide:**
```
💡 خطوات التفعيل:
1. قم بإضافة البوت الخاص بالمنصة كمشرف (Admin) داخل قناتك أو مجموعتك الخاصة.
2. تأكد من تفعيل صلاحية "نشر الرسائل" (Post Messages).
3. الصق معرف القناة (تبدأ بـ -100) هنا لحفظ الإعدادات.
```

**Test button:**
- [اختبار الإرسال الكلي] — sends test message to all targets
- Results displayed inline per-target (✅/❌)

## Environment

- `TELEGRAM_CHAT_ID` kept in env schema for backward compat but deprecated
- Broadcast engine reads broadcast targets from DB only

## Call Sites Affected

| File | Change |
|------|--------|
| `src/lib/telegram.ts` | Rewrite `sendTelegramNotification` + `notifyEvent` to use `broadcastToAll()` |
| `src/app/api/auth/login/route.ts` | No change — `notifyEvent` is internal path |
| `src/app/api/restaurants/route.ts` | No change — `.catch(() => {})` can be removed (fn never throws) |
| `src/app/api/subscriptions/route.ts` | No change |
| `src/app/api/admin/subscriptions/route.ts` | No change |
| `src/app/api/telegram/test/route.ts` | Update to test all targets |
| `src/app/api/telegram/diagnose/route.ts` | Add per-target diagnostics |
| `src/app/api/telegram/config/route.ts` | Keep backward compat |
| `src/app/admin/telegram/page.tsx` | Add broadcast targets UI |

## Migration Path

1. Add `TelegramBroadcastTarget` model + migration
2. Seed existing `TelegramConfig.chatId` as first target via migration script
3. Implement `lib/telegram-broadcast.ts`
4. Rewrite `lib/telegram.ts` to use broadcast engine
5. Add broadcast targets API routes
6. Update admin Telegram UI
7. Update diagnose + test routes
8. Remove `.catch(() => {})` from call sites
9. Run E2E verification sweep

## Verification

- Lint: `npm run lint` — zero warnings
- Build: `npm run build` — zero errors
- Test: mock broadcast to N targets, verify all recipients receive
- Failure isolation: inject bad chatId, verify remaining targets still receive
- Duplicate dedup: add same chatId as target + linked user, verify single send
