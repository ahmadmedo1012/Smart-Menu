# Telegram Interactive Engine — Diagnostic Report

**Date**: 2026-07-04
**Commit**: `7ee42b1` (HEAD)
**Status**: ✅ Code-complete, zero lint/errors, pending env config + webhook registration

---

## Root Cause Analysis

### Why the inline Approve/Reject keyboard did not appear

The feature was conceptually built via two workstreams across commits `16eb710`, `3457949`, `cc73818`, and `7ee42b1` — **the code was structurally complete but operationally gated by missing environment configuration.**

The keyboard-sending code path (`src/app/api/payments/claim/route.ts`) silently no-ops when:

1. **`TELEGRAM_ADMIN_IDS` env var is unset** → `getAdminTelegramIds()` returns `[]` → the original code wrapped all keyboard logic inside `if (adminIds.length > 0)`. No admin IDs, no keyboard.
2. **No active `TelegramBroadcastTarget` rows in DB** → Even with admin IDs, the original code resolved IDs via `User.telegramChatId` lookup only, failing for admins who hadn't linked their Telegram account.
3. **`TelegramConfig` row missing or inactive** → `config?.botToken` is null, fallback `process.env.TELEGRAM_BOT_TOKEN` may also be unset.
4. **No webhook registered** → Even when keyboard appears, button taps go nowhere because the Telegram Bot API has no webhook URL pointing to the deployment.

### Secondary issues found

| Issue | Severity | Status |
|-------|----------|--------|
| `TELEGRAM_WEBHOOK_SECRET` was soft-fail (silently no-ops) | 🔴 | Fixed in §2.1 — now fail-closed with 500 |
| `notifyEvent("payment_claimed")` leaked payment data to all linked users | 🟠 | Fixed in §2.2 + §2.3 — removed or scoped to adminOnly |
| Admin-only chat resolution failed silently | 🟡 | Fixed — now also sends to `TelegramBroadcastTarget` |
| No webhook registration utility existed | 🟡 | Fixed — `scripts/register-webhook.mjs` + `npm run webhook:register` |
| Orphaned restaurant on anonymous payment approve | 🟢 | Fixed — skipped when `userId` is null |

---

## Architectural Lifecycle (end-to-end)

```
User checkout → POST /api/payments/claim
  ├── requireAuth() — must be logged in
  ├── SubscriptionPayment.create({ status: "pending", metadata: { telegramMessages: [] } })
  ├── sendMessageWithKeyboard(botToken, targets, msg, [
  │     [{ text: "🟢 موافقة على التفعيل", callback_data: "sub_app:{paymentId}" }],
  │     [{ text: "🔴 رفض الطلب",         callback_data: "sub_rej:{paymentId}" }],
  │   ])
  │     → targets = TELEGRAM_ADMIN_IDS (env) + TelegramBroadcastTarget rows (DB)
  │     → stores {chatId, messageId}[] back in payment.metadata for cleanup
  └── Returns 201 { id, status, createdAt }

Admin taps button → Telegram → POST /api/telegram/webhook (callback_query)
  ├── Gate 0: X-Telegram-Bot-Api-Secret-Token matches TELEGRAM_WEBHOOK_SECRET?
  │   └── No → 500/Forbidden
  ├── Gate 1: callback_query.from.id ∈ getAdminTelegramIds()?
  │   └── No → answerCallbackQuery("لا تمتلك الصلاحية", alert: true)
  ├── Parse callback_data → action (sub_app|sub_rej), paymentId
  ├── resolveSubscriptionPayment(paymentId, decision)
  │   ├── Atomic $transaction
  │   │   ├── SubscriptionPayment.update → status (verified|cancelled)
  │   │   ├── [verified+userId] Restaurant.create + User.update→owner
  │   │   └── [cancelled+userId] User.updateMany→REJECTED
  │   ├── sendTelegramNotification() — broadcast confirm
  │   └── eventEmitter.emit("admin-event"/"user-event") — SSE
  ├── editMessageReplyMarkup({ inline_keyboard: [] }) — strip buttons
  ├── editMessageText() — append Arabic status line
  ├── answerCallbackQuery() — green/red toast
  └── Best-effort cleanup: strip keyboards in all other chats with same paymentId
```

---

## Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `middleware.ts` | Modify | Added `/api/telegram/webhook` to CSRF exemption (`publicPrefixes`) |
| `src/lib/telegram-admin.ts` | Create | `getAdminTelegramIds()` — parse `TELEGRAM_ADMIN_IDS` from env |
| `src/lib/telegram-api.ts` | Create | Bot API client: `sendMessageWithKeyboard`, `editMessageReplyMarkup`, `editMessageText`, `answerCallbackQuery` |
| `src/lib/subscription-decisions.ts` | Create | Shared `resolveSubscriptionPayment()` — single atomic logic for both web UI + Telegram paths |
| `src/lib/telegram.ts` | Modify | Thread `adminOnly` option through `notifyEvent` |
| `src/lib/telegram-broadcast.ts` | Modify | Add `adminOnly` filter to `gatherTargets()` |
| `src/app/api/admin/subscriptions/route.ts` | Modify | Delegate POST handler → `resolveSubscriptionPayment()` |
| `src/app/api/payments/claim/route.ts` | Modify | Send inline keyboard to admin allowlist + broadcast targets; store message refs in metadata |
| `src/app/api/telegram/webhook/route.ts` | Modify | Secret‑token gate → callback_query handler → resolve → strip → toast |
| `src/app/api/auth/login/route.ts` | Modify | Mark `notifyEvent("user_login")` as `adminOnly: true` |
| `src/app/api/auth/register/route.ts` | Modify | Mark `notifyEvent("user_registered")` as `adminOnly: true` |
| `src/app/api/restaurants/route.ts` | Modify | Mark `notifyEvent("restaurant_created")` as `adminOnly: true` |
| `scripts/register-webhook.mjs` | Create | Webhook registration + verification utility |
| `docs/RUNBOOK.md` | Create | Operational documentation |
| `.env.example` | Modify | Added `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_IDS` |
| `.githooks/pre-commit` | Create | Block `.env*` files from tracking |
| `package.json` | Modify | Added `test`, `test:e2e`, `setup:hooks`, `webhook:register` scripts |
| `.github/workflows/ci.yml` | Create | CI: lint → build → .env check → tests |

---

## Operational Blueprint Validation

### Prerequisites (must be set in deployment environment)

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ Yes | Random string; webhook rejects requests without it (fail-closed) |
| `TELEGRAM_ADMIN_IDS` | ✅ Yes | Comma-separated Telegram user IDs who may approve/reject payments |

### Webhook registration

```bash
TELEGRAM_BOT_TOKEN="123456:ABC-DEF..." \
TELEGRAM_WEBHOOK_SECRET="your-secret" \
npm run webhook:register -- https://your-project-url.vercel.app
```

### Admin onboarding

Every Telegram user ID in `TELEGRAM_ADMIN_IDS` must have pressed **Start** on the bot at least once. See `docs/RUNBOOK.md` for details.

---

## Build Verification

```
$ npm run lint
ESLint: No issues found

$ npm run build
✓ Build completed — 0 errors, 0 warnings

$ npm test
✅ Type contract (BroadcastResult) valid
✅ sendToChat normalization — both group and user chat paths work
✅ Broadcast engine integration tests passed.
✅ All 15 review validation tests passed.
```
