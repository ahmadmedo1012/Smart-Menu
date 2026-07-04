# Telegram Interactive Subscription Approval Engine — v2 (Hardened)

**Date**: 2026-07-04
**Status**: Draft v2 — supersedes `2026-07-04-telegram-interactive-engine-design.md`
**Reason for revision**: Repo audit against `github.com/ahmadmedo1012/Smart-Menu` (main) found one blocking infrastructure issue, two exploitable auth gaps, and three design mismatches with the existing codebase. All are fixed below. Diffs from v1 are marked `⚠ CHANGED`.

---

## 0. Pre-flight blockers (must land before anything else works)

These are not part of the feature — they are broken/missing pieces of infrastructure that will silently swallow every Telegram callback if not fixed first. Ship as a separate, first commit and verify in isolation.

### 0.1 CSRF middleware blocks the webhook entirely ⚠ BLOCKING

`middleware.ts` requires a valid CSRF cookie+header pair on every non-GET `/api/*` request unless the path is in `publicPrefixes`. `/api/telegram/webhook` is **not** in that list. Telegram never sends the app's CSRF cookie, so `validateToken()` returns `false` and the middleware returns `403 Forbidden` before the route handler ever runs.

**This means the existing `/start verify_...` account-linking flow is also currently non-functional in production.**

**Fix** — add the webhook path to the exemption list:

```ts
// middleware.ts
const publicPrefixes = [
  "/_next", "/favicon.png",
  "/uploads", "/fonts", "/sw.js", "/manifest.json",
  "/brand-icon.png", "/icon-192.png", "/icon-512.png",
  "/api/auth", "/api/loyalty", "/api/subscriptions", "/api/plans", "/api/restaurants",
  "/api/telegram/webhook", // ⚠ ADDED — Telegram servers can't present a CSRF token
  "/login", "/menu", "/cart", "/order-confirmed",
  "/pricing", "/subscribe", "/demo", "/checkout",
];
```

**Verify**: `curl -X POST https://<domain>/api/telegram/webhook -d '{}'` returns `200 OK`, not `403`.

### 0.2 Telegram `secret_token` verification (new requirement)

Nothing currently proves an incoming webhook POST actually came from Telegram. `callback_query.from.id` is attacker-controlled in a forged request. Telegram's own mitigation is the `secret_token` mechanism on `setWebhook`.

**Fix**:

1. Generate a random secret, store as `TELEGRAM_WEBHOOK_SECRET` env var.
2. When (re-)registering the webhook, pass `secret_token: process.env.TELEGRAM_WEBHOOK_SECRET`.
3. In the webhook handler, reject any request where the header doesn't match:

```ts
const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
if (incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
  return new Response("Forbidden", { status: 403 });
}
```

This must be checked **before** the admin-ID gate, not instead of it — it authenticates "this request is really Telegram," the admin-ID check authorizes "this specific Telegram user may approve payments." Both are required.

### 0.3 Admin ID storage: env var, not `SystemConfig` ⚠ CHANGED from v1

v1 proposed storing `telegram_admin_ids` in `SystemConfig` (`category: "telegram"`, default `isSecret: false`). Two independent problems make this unsafe as specified:

- `src/app/api/config/route.ts` is a **public, unauthenticated** endpoint that returns any `SystemConfig` row with `isSecret: false`. Storing admin IDs there leaks them to anyone who requests `GET /api/config?key=telegram_admin_ids`. Combined with 0.2 being skipped, that's a direct path to forging approvals.
- Setting `isSecret: true` doesn't fix it safely either: `src/lib/config.ts` has `encryptValue()` but **no corresponding `decryptValue()`** anywhere in the codebase. A secret-flagged config value can be written but never read back as plaintext — the admin-ID gate would just compare against ciphertext and always fail.

**Fix**: store the allowlist as an environment variable, consistent with the existing `TELEGRAM_BOT_TOKEN` pattern in `.env.example`:

```
TELEGRAM_ADMIN_IDS="123456789,987654321"
```

```ts
// src/lib/telegram-admin.ts
export function getAdminTelegramIds(): number[] {
  return (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}
```

No DB round-trip, no public-endpoint exposure, no encryption trap. Trade-off: changing the admin list requires a redeploy/restart, which is acceptable for a short, rarely-changed trust list — and arguably safer, since it can't be altered through an application-layer bug.

---

## 1. Overview (unchanged from v1)

Transform Telegram from a passive notification channel into an interactive ChatOps engine. When a new subscription payment is created, dispatch a message with inline Approve/Reject buttons. Admin taps a button → Telegram `callback_query` hits webhook → verify secret token → gate on admin ID allowlist → atomic Prisma transaction (shared with the existing admin-panel logic) → buttons stripped, status updated, SSE events fired.

## 2. Objectives

1. Inline keyboards in payment notifications, sent only to allowlisted admin chats.
2. Secure webhook `callback_query` handler: Telegram-origin proof (0.2) + admin-ID authorization gate (0.3).
3. Atomic Prisma state mutations via a **single shared implementation**, not a duplicate — reused by both the web admin panel and the Telegram path.
4. Self-healing button erasure post-action + `answerCallbackQuery` toast.
5. Zero schema migrations. Admin IDs live in env config (0.3); no new tables or columns.
6. Explicit, documented scope decision on the anonymous `/api/subscriptions` payment path (see §5).

## 3. Architecture

### 3.1 Data flow

```
[Authenticated checkout → POST /api/payments/claim]
    │
    ├── SubscriptionPayment.create({ status: "pending" })   id = <paymentId>
    │
    ├── sendAdminApprovalMessage(paymentId)                  ⚠ CHANGED: admin-only send, not broadcastToAll
    │       └── for each chatId in getAdminTelegramIds()-resolved chats:
    │             sendMessageWithKeyboard(botToken, chatId, message, [
    │               [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${paymentId}` }],  ⚠ CHANGED: paymentId, not userId
    │               [{ text: "🔴 رفض الطلب",         callbackData: `sub_rej:${paymentId}` }],
    │             ])
    │             → store { chatId, messageId } for later cleanup
    │
    ▼
[Admin taps a button in Telegram]
    │
    ├── POST /api/telegram/webhook ← { callback_query: { ... } }
    │
    ├── GATE 0: X-Telegram-Bot-Api-Secret-Token matches TELEGRAM_WEBHOOK_SECRET?
    │   └── NO → 403, log, return (no DB access at all)
    │
    ├── GATE 1: callback_query.from.id ∈ getAdminTelegramIds()?
    │   └── NO → answerCallbackQuery(alert: "لا تمتلك الصلاحية") → return 200
    │
    ├── Parse callback_data → action, paymentId (Number)          ⚠ CHANGED: direct primary-key lookup
    │
    ├── resolveSubscriptionPayment(paymentId, action)              ⚠ NEW: shared lib, see §4.3
    │   ├── SubscriptionPayment.findUnique({ id: paymentId })
    │   ├── if not found → answerCallbackQuery("الطلب غير موجود") → return
    │   ├── if status !== "pending" → answerCallbackQuery("تمت معالجته مسبقاً") → return
    │   ├── $transaction: same logic as admin/subscriptions/route.ts today
    │   │   ├── SubscriptionPayment.update → status
    │   │   ├── [approve] Restaurant.create (from metadata) — only if existing.userId is not null
    │   │   ├── [approve] User.update → role: owner, subscriptionStatus: PAID
    │   │   └── [reject]  User.updateMany → subscriptionStatus: REJECTED
    │   ├── sendTelegramNotification(...) — same confirmation broadcast as today
    │   └── eventEmitter.emit("admin-event" / "user-event", ...) — same SSE as today
    │
    ├── editMessageReplyMarkup({ inline_keyboard: [] }) on the tapped chat/message
    ├── best-effort: strip keyboard on any other stored {chatId, messageId} for this paymentId
    ├── editMessageText → append Arabic status line
    └── answerCallbackQuery → green/red toast
```

### 3.2 Why `paymentId` instead of `userId` ⚠ CHANGED, hard requirement

`src/app/api/admin/subscriptions/route.ts` already keys all mutations off `SubscriptionPayment.id`, not `userId`. More importantly: `src/app/api/subscriptions/route.ts` is a second, **unauthenticated** payment-creation path that stores `SubscriptionPayment` with `userId: null` (no user account exists at that point). A `userId`-keyed callback cannot address these rows at all, and a naive "latest pending payment for this user" lookup is ambiguous once a user resubmits after a rejection. `paymentId` is unambiguous, always resolvable, and requires no extra query.

`callback_data` size check: `sub_app:2147483647` = 19 bytes, well under Telegram's 64-byte limit — same margin as v1, just a different number in the same slot.

## 4. Implementation Plan

### 4.1 `src/lib/telegram-admin.ts` (new)

```ts
export function getAdminTelegramIds(): number[] { /* see §0.3 */ }
```

### 4.2 `src/lib/telegram-api.ts` (new, unchanged from v1)

Low-level Bot API client, reusing the `fetch()`-to-`api.telegram.org` pattern already established in `telegram-broadcast.ts`:

- `sendMessageWithKeyboard(botToken, chatId, text, buttons, opts?)`
- `editMessageReplyMarkup(botToken, chatId, messageId, replyMarkup?)`
- `editMessageText(botToken, chatId, messageId, text, opts?)`
- `answerCallbackQuery(botToken, callbackQueryId, text?, showAlert?)`

### 4.3 `src/lib/subscription-decisions.ts` (new) ⚠ NEW — dedup with admin panel

Extract the `$transaction` + Telegram notification + SSE emission block currently inline in `src/app/api/admin/subscriptions/route.ts` (POST handler, lines ~55-179) into a single exported function:

```ts
export async function resolveSubscriptionPayment(
  paymentId: number,
  decision: "verified" | "cancelled"
): Promise<{ ok: true; result: ... } | { ok: false; reason: string }>
```

- `src/app/api/admin/subscriptions/route.ts` POST handler becomes a thin wrapper: `requirePermission` check → call `resolveSubscriptionPayment` → return its result.
- The new webhook handler calls the same function after its own auth gates.
- This guarantees the web-UI approval path and the Telegram-button approval path can never drift apart, and that SSE events / confirmation broadcasts fire identically regardless of which channel triggered the decision.
- Add the `existing.userId` null-guard here (see §5) so both callers inherit the fix.

### 4.4 `src/app/api/payments/claim/route.ts` (modify)

After `SubscriptionPayment.create` succeeds, send the interactive message directly to the admin allowlist instead of through `broadcastToAll`:

```ts
const botToken = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
if (botToken) {
  const adminChats = await resolveAdminChatIds(); // maps TELEGRAM_ADMIN_IDS → linked telegramChatId, or falls back to using the ID itself as chatId for private chats
  for (const chatId of adminChats) {
    const sent = await sendMessageWithKeyboard(botToken, chatId, message, [
      [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${payment.id}` }],
      [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
    ]);
    // store { paymentId: payment.id, chatId, messageId: sent.message_id } for later cleanup
  }
}
```

Keep the existing `broadcastToAll` / general notification call for non-admin targets (unchanged, plain text, no buttons) — this preserves current behavior for any ops channels that shouldn't have approval power.

**Storage for `{paymentId, chatId, messageId}`**: use `SubscriptionPayment.metadata` (already a `Json` field) to append a `telegramMessages: [{chatId, messageId}]` array on create/update — avoids a new table while still enabling best-effort multi-chat button cleanup after resolution.

### 4.5 `src/app/api/telegram/webhook/route.ts` (modify)

```ts
interface TelegramUpdate {
  message?: { text?: string; chat?: { id: number; username?: string } };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

export async function POST(request: NextRequest) {
  const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (incomingSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const update: TelegramUpdate = await request.json();

  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query); // new function, see §3.1
  }

  // ... existing /start verify_ message handling, unchanged
}
```

### 4.6 Verify build

```bash
npm run lint && npm run build
```

Add a unit test for `resolveSubscriptionPayment` covering: normal approve, normal reject, already-processed (idempotency), and `userId: null` approve (must not throw — see §5).

## 5. Open decision: does `/api/subscriptions` (anonymous flow) get buttons too?

`src/app/api/subscriptions/route.ts` is public, unauthenticated, and creates `SubscriptionPayment` rows with `userId: null`. The existing admin approve logic unconditionally does `tx.user.update({ where: { id: existing.userId! } })` — this already throws today if an admin approves one of these from the web panel; it's a pre-existing latent bug, not something introduced here.

Two options — pick one explicitly before implementation:

- **A (recommended, smaller scope)**: Interactive buttons apply only to payments with a non-null `userId` (the `payments/claim` flow). Payments from `/api/subscriptions` keep their current plain-text notification and must still be resolved via the web admin panel, where `resolveSubscriptionPayment` should also gain a guard: if `decision === "verified"` and `userId` is `null`, skip the `User.update` step (there's no account to promote) and just mark the payment `verified` for manual bookkeeping. This closes the existing crash risk as a side effect.
- **B (larger scope)**: Extend `/api/subscriptions` to also require/create a user record before payment creation, so every `SubscriptionPayment` has a `userId` and the approval flow is uniform. This is a bigger, unrelated change to that endpoint's contract and should be its own ticket, not bundled into this feature.

This plan assumes **Option A** unless told otherwise.

## 6. Constraints

- `callback_data` ≤ 64 bytes → `sub_app:{paymentId}` / `sub_rej:{paymentId}` safe.
- Always return 200 to Telegram after the secret-token and admin-ID gates pass (avoid retry storms); return 403 only for the secret-token check itself, which Telegram doesn't retry on.
- Error handling: try/catch all, `console.error`, never throw from the webhook.
- Bot token: DB `TelegramConfig` → fallback `process.env.TELEGRAM_BOT_TOKEN` (unchanged).
- Admin IDs: `process.env.TELEGRAM_ADMIN_IDS` only — never `SystemConfig` (§0.3).
- Race protection: `$transaction` + `status !== "pending"` guard, keyed on `paymentId` (unchanged principle, corrected key).

## 7. Files Changed

| File | Action | Notes |
|---|---|---|
| `middleware.ts` | Modify | Add `/api/telegram/webhook` to `publicPrefixes` — §0.1 |
| `src/lib/telegram-admin.ts` | Create | Admin ID allowlist from env — §0.3 |
| `src/lib/telegram-api.ts` | Create | Bot API client — §4.2 |
| `src/lib/subscription-decisions.ts` | Create | Shared approve/reject logic — §4.3 |
| `src/app/api/admin/subscriptions/route.ts` | Modify | Delegate to `resolveSubscriptionPayment` |
| `src/app/api/payments/claim/route.ts` | Modify | Send admin-only keyboard message, store message refs |
| `src/app/api/telegram/webhook/route.ts` | Modify | Secret-token check + `callback_query` handling |
| `.env.example` | Modify | Document `TELEGRAM_ADMIN_IDS`, `TELEGRAM_WEBHOOK_SECRET` |

## 8. Security

| Concern | Mitigation |
|---|---|
| Forged webhook requests (no proof of Telegram origin) | `secret_token` header check — §0.2 |
| Admin ID leak via public `/api/config` | IDs stored in env var, never in `SystemConfig` — §0.3 |
| Broken encrypt-without-decrypt trap | Avoided entirely by not using `SystemConfig.isSecret` for this — §0.3 |
| CSRF middleware silently blocking all webhook traffic | Path added to `publicPrefixes` — §0.1 |
| Unauthorized button taps (valid Telegram request, wrong user) | Admin ID allowlist gate, checked after origin proof |
| Double-tap collision | `$transaction` + `status !== "pending"` guard, keyed on `paymentId` |
| Stale/ambiguous target row | `paymentId` in `callback_data`, not `userId` — §3.2 |
| Anonymous payments crashing on approve | `userId` null-guard in `resolveSubscriptionPayment` — §5 |
| Approval-logic drift between web UI and Telegram | Single shared `resolveSubscriptionPayment` — §4.3 |
| Bot token exposure | Stored in DB `TelegramConfig`, fallback env var (unchanged) |
| Admin PII exposure to non-admin broadcast targets | Interactive message sent only to admin allowlist, not `broadcastToAll` — §4.4 |

## 9. Rollout checklist

1. Deploy §0.1–0.3 alone first. Confirm `/start verify_...` linking works again (proves the CSRF fix).
2. Set `TELEGRAM_WEBHOOK_SECRET` and re-register the webhook with `secret_token`.
3. Set `TELEGRAM_ADMIN_IDS`.
4. Deploy `subscription-decisions.ts` refactor; confirm existing web-panel approve/reject still passes lint/build and manual smoke test.
5. Deploy the keyboard-sending + `callback_query` handling changes.
6. End-to-end test: create a real pending payment via `payments/claim`, approve via Telegram button, confirm restaurant created + SSE fired + button stripped in Telegram.
7. Test the reject path the same way.
8. Test double-tap (tap approve twice fast) → second tap must show "already processed" toast, not a duplicate restaurant.
9. Test a non-admin Telegram account tapping a button (if reachable) → must get the alert, no state change.
