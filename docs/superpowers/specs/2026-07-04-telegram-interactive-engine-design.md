# Telegram Interactive Subscription Approval Engine

**Date**: 2026-07-04
**Status**: Draft

## Overview

Transform Telegram from a passive notification channel into an interactive ChatOps engine. When a new subscription payment is created, dispatch a message with inline Approve/Reject buttons. Admin taps a button → Telegram callback_query hits webhook → gate on Telegram admin IDs → atomic Prisma transaction → buttons stripped, status updated.

## Objectives

1. Inline keyboards in payment notifications (sub_app/sub_rej callback data)
2. Secure webhook callback_query handler with admin authorization gate
3. Atomic Prisma state mutations (reuse existing approval/rejection logic)
4. Self-healing button erasure post-action + answerCallbackQuery toast
5. Zero schema migrations — use SystemConfig for admin Telegram IDs

## Architecture

### Data Flow

```
[User completes checkout → POST /api/payments/claim]
    │
    ├── SubscriptionPayment.create({ status: "pending" })
    ├── sendTelegramNotification() ← with inline keyboard
    │       └── InlineKeyboardMarkup:
    │           [🟢 موافقة على التفعيل]  callback_data: sub_app:{userId}
    │           [🔴 رفض الطلب]           callback_data: sub_rej:{userId}
    │
    ▼
[Admin taps button in Telegram]
    │
    ├── POST /api/telegram/webhook ← { callback_query: { ... } }
    │
    ├── GATE: callback_query.from.id ∈ SystemConfig.telegram_admin_ids?
    │   └── NO → answerCallbackQuery(alert: "لا تمتلك الصلاحية") → return
    │
    ├── Parse callback_data:
    │   ├── "sub_app:{userId}" → APPROVE path
    │   └── "sub_rej:{userId}" → REJECT path
    │
    ├── Find user, validate subscription status ← still "pending"
    │
    ├── $transaction (atomic):
    │   ├── SubscriptionPayment.update → status: "verified" | "cancelled"
    │   ├── [if approve] Restaurant.create (from metadata)
    │   ├── [if approve] User.update → role: "owner", subscriptionStatus: "PAID"
    │   └── [if reject] User.updateMany → subscriptionStatus: "REJECTED"
    │
    ├── editMessageReplyMarkup({ inline_keyboard: [] }) → strip buttons
    ├── editMessageText → append Arabic status line
    └── answerCallbackQuery → green toast "✅ تم التفعيل"
```

### Authorized Admin Telegram IDs

Stored in `SystemConfig` under key `telegram_admin_ids`:

```json
{
  "id": "...",
  "key": "telegram_admin_ids",
  "value": [123456789, 987654321],
  "category": "telegram",
  "description": "Telegram user IDs authorized to approve/reject subscriptions via inline buttons"
}
```

Managed via existing `/api/admin/config` route — no new API endpoints.

## Implementation Plan

### 1. Create `src/lib/telegram-api.ts`

Low-level Telegram Bot API client. Three operations:

- **`sendMessageWithKeyboard(botToken, chatId, text, buttons, opts?)`** — sends text with inline keyboard. Buttons is `{ text: string, callbackData: string }[][]` (row-major). Builds `InlineKeyboardMarkup` payload.
- **`editMessageReplyMarkup(botToken, chatId, messageId, replyMarkup?)`** — replaces keyboard. Call with empty inline_keyboard to strip buttons.
- **`editMessageText(botToken, chatId, messageId, text, opts?)`** — updates message content.
- **`answerCallbackQuery(botToken, callbackQueryId, text?, showAlert?)`** — responds to callback_query.

Reuses `sendToChat()` pattern from `telegram-broadcast.ts` — direct `fetch()` to `api.telegram.org`.

### 2. Modify `src/app/api/payments/claim/route.ts`

After `SubscriptionPayment.create` succeeds, inject inline keyboard into the Telegram notification instead of plain text:

```typescript
const botToken = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
if (botToken) {
  await sendMessageWithKeyboard(botToken, TARGET_CHAT, message, [
    [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${auth.userId}` }],
    [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${auth.userId}` }],
  ]);
}
```

Also sends to `broadcastToAll` for SSE/other targets (unchanged).

**callback_data size**: `sub_app:2147483647` = 19 bytes ✓ (Telegram limit: 64 bytes)

### 3. Modify `src/app/api/telegram/webhook/route.ts`

Extend `POST` handler to process `callback_query` updates alongside existing `message` handler.

**Gatekeeper pattern**:

```typescript
if (update.callback_query) {
  const cq = update.callback_query;
  const adminIds = await getAdminTelegramIds();

  if (!adminIds.includes(cq.from.id)) {
    await answerCallbackQuery(botToken, cq.id, "عذراً، لا تمتلك الصلاحية لتنفيذ هذا الإجراء.", true);
    return new Response("OK", { status: 200 });
  }

  // Parse callback_data
  const [action, userIdStr] = (cq.data ?? "").split(":");
  const userId = Number(userIdStr);

  if (action === "sub_app") {
    // Replicate approve logic from admin/subscriptions/route.ts
    // $transaction with SubscriptionPayment + Restaurant.create + User.update
    // Post: editMessageReplyMarkup → strip, answerCallbackQuery → toast
  } else if (action === "sub_rej") {
    // Replicate reject logic
  }

  return new Response("OK", { status: 200 });
}
```

**Finding the payment**: Query `SubscriptionPayment` by `userId` where `status: "pending"`, order by `createdAt: "desc"`, take first.

### 4. Verify build

```bash
npm run lint && npm run build
```

## Constraints

- callback_data ≤ 64 bytes → `sub_app:{uid}` / `sub_rej:{uid}` safe (max ~19 bytes)
- Always return 200 to Telegram endpoints
- Error handling: try/catch all, console.error, never throw from webhook
- Bot token: prefer DB `TelegramConfig` → fallback `process.env.TELEGRAM_BOT_TOKEN`
- Race: double-tap protection via `status !== "pending"` check + `$transaction` isolation

## Files Changed

| File | Action | Est. LOC |
|---|---|---|
| `src/lib/telegram-api.ts` | Create | 90 |
| `src/app/api/payments/claim/route.ts` | Modify | +20 |
| `src/app/api/telegram/webhook/route.ts` | Modify | +150 |

## Security

| Concern | Mitigation |
|---|---|
| Unauthorized button taps | Telegram user ID gate via `SystemConfig.telegram_admin_ids` |
| Double-tap collision | `$transaction` + `status !== "pending"` guard |
| Stale payments | Only latest pending payment per user processed |
| Bot token exposure | Stored in DB `TelegramConfig` (not code) |
| Webhook URL leakage | Set server-side via Telegram API, not in code |
