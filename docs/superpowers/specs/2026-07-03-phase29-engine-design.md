# Phase 29 — Telegram Linking, Notification Preferences & Admin SSE

> **Status:** Draft  
> **Date:** 2026-07-03  
> **Depends on:** RBAC & Dynamic Settings Overhaul (Phase 28)

---

## 1. Overview

Per-admin Telegram integration: each super_admin/sub_admin links their personal Telegram account (no more shared `TelegramConfig` global bot), chooses which notifications they receive via SSE, and gets live payment/order toasts in the admin panel.

Three concerns layered on the same SSE connection:
1. **Telegram linking** — per-user binding via signed verification token
2. **Notification preferences** — per-user toggle matrix stored on `User`
3. **Admin event stream** — SSE endpoint broadcasting `new_order`, `new_payment`, and `new_admin_event` to connected admin UIs

---

## 2. Prisma Schema Changes

### User Model — New Fields (added, not replaced)

```prisma
model User {
  // ... existing fields ...
  telegramChatId         String?
  telegramUsername       String?
  telegramLinkedAt       DateTime?
  telegramNotifyOrders   Boolean   @default(true)
  telegramNotifyPayments Boolean   @default(true)
  telegramNotifySettings Boolean   @default(false)
}
```

All on `User` — no new models, no `TelegramConfig` duplication.

### No Changes to Existing Models

`TelegramConfig` stays as-is (global bot token storage). `SystemConfig` stays as-is.

---

## 3. API Endpoints

### 3.1 `GET /api/admin/profile`

Return current admin's profile data (id, name, username, role, permissions, telegramChatId, telegramUsername, telegramLinkedAt, createdAt). Does NOT return password hash.

- **Auth:** `requireAuth` with role super_admin or sub_admin
- **Response:** `{ success: true, data: { id, name, username, role, permissions, telegramChatId, telegramUsername, telegramLinkedAt, createdAt } }`

### 3.2 `PUT /api/admin/profile`

Update name and/or password. Also accepts `telegramNotifyOrders`, `telegramNotifyPayments`, `telegramNotifySettings` directly as a convenience (can also be set via the notification-preferences endpoint).

- **Auth:** `requireAuth` with role super_admin or sub_admin
- **Body:** `{ name?: string, currentPassword?: string, newPassword?: string, telegramNotifyOrders?: boolean, telegramNotifyPayments?: boolean, telegramNotifySettings?: boolean }`
- `currentPassword` required if `newPassword` provided
- Use existing `hashPassword` / `verifyHash` from `src/lib/hash.ts`
- **Response:** `{ success: true, data: { id, name, username, role, permissions } }`

### 3.3 `POST /api/admin/telegram/link`

Generate a signed verification token and return the bot URL the admin opens in Telegram.

- **Auth:** `requireAuth` with role super_admin or sub_admin
- No body needed — token is signed server-side using `JWT_SECRET` with the admin's userId and a 10-minute expiry
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "botUrl": "https://t.me/smartmenu_bot?start=verify_<signed_token>",
      "tokenExpiresAt": "2026-07-03T12:00:00Z"
    }
  }
  ```
- Token format: `{ userId, nonce, exp: Date.now() + 600_000 }` signed with `HMAC-SHA256` using `JWT_SECRET`
- Pseudo:
  ```ts
  const payload = { userId: auth.userId, nonce: crypto.randomUUID(), exp: Date.now() + 600_000 };
  const signature = createHmac("sha256", JWT_SECRET).update(JSON.stringify(payload)).digest("hex");
  const token = Buffer.from(JSON.stringify({ ...payload, signature })).toString("base64url");
  ```

### 3.4 `POST /api/admin/telegram/verify`

The Telegram bot webhook calls this (or the admin pastes the deep-link code). Verifies the signed token and binds `telegramChatId` and `telegramUsername` on the User record.

- **Auth:** Not session-authenticated (called from Telegram webhook or after user sends `/start verify_<token>` to the bot) — the token itself is the auth
- **Body:** `{ token: string, chatId: string, username?: string }`
- Validation:
  1. Decode base64url token
  2. Verify HMAC signature matches
  3. Check `exp` not expired
  4. Look up user by `payload.userId`
  5. Update user: `telegramChatId`, `telegramUsername`, `telegramLinkedAt`
- **Response:** `{ success: true, data: { linked: true } }`
- On failure: `{ success: false, error: "الرمز غير صالح أو منتهي الصلاحية" }` (403)
- Logs audit event `AuditAction.update` with targetType "User", metadata `{ action: "telegram_link" }`

### 3.5 `GET /api/admin/notification-preferences`

Return the current admin's notification toggles.

- **Auth:** `requireAuth` super_admin or sub_admin
- **Response:** `{ success: true, data: { notifyOrders: boolean, notifyPayments: boolean, notifySettings: boolean } }`

### 3.6 `PUT /api/admin/notification-preferences`

Update one or more notification toggles.

- **Auth:** `requireAuth` super_admin or sub_admin
- **Body:** `{ notifyOrders?: boolean, notifyPayments?: boolean, notifySettings?: boolean }`
- **Response:** `{ success: true, data: { ...updated } }`

### 3.7 `GET /api/admin/events/stream` — SSE Endpoint

Long-lived SSE connection that pushes live events to the admin's UI.

- **Auth:** Session cookie validated (`validateSession`) — returns 401 if invalid
- **Events pushed:**
  - `new_order` — `{ orderNo, restaurantName, total, customerName, createdAt, actionUrl }`
  - `new_payment` — `{ phone, amount, planName, status }`  
  - `notification` — `{ title, message, severity }` (from SystemEvent)
  - `heartbeat` — `{ time }` every 30s
  - `error` — `{ message }` on polling failure
- **Mechanism:** Poll `Order` and `SystemEvent` tables every 10s — same pattern as existing `/api/orders/stream` at `src/app/api/orders/stream/route.ts`. No WebSocket, no external pub/sub.
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`
- Start tracking: `lastCheck = Date.now()` at connection open. On each poll, query `WHERE createdAt > lastCheck`. Update `lastCheck` after each successful poll.

### 3.8 `POST /api/admin/events/trigger` — For Testing

Create a test event visible to all SSE-connected admins.

- **Auth:** `requireAuth` super_admin or sub_admin
- **Body:** `{ eventType: "test", title?: string, message?: string, severity?: "info" | "warning" | "error" }`
- Creates a `SystemEvent` record (reuses existing table)
- No SSE push logic in this endpoint itself — the SSE stream picks it up on next poll
- **Response:** `{ success: true, data: { id, ... } }`

---

## 4. Data Flow

### 4.1 Telegram Link Flow

```
Admin clicks "ربط تليجرام" in settings UI
  → POST /api/admin/telegram/link
  → Server signs token with userId + 10min expiry
  → Returns bot URL: https://t.me/smartmenu_bot?start=verify_<token>
  → UI opens the URL / copies it for admin

Admin sends /start verify_<token> to the bot
  → Bot webhook receives /start with payload
  → Bot backend calls POST /api/admin/telegram/verify
  → Server validates token signature + expiry
  → Updates User.telegramChatId, telegramUsername, telegramLinkedAt
  → Bot replies "✅ تم ربط حسابك مع لوحة التحكم"

Admin sees confirmation in UI (poll or SSE push)
```

### 4.2 SSE Connection Flow

```
Admin visits /admin/dashboard (or any admin page)
  → Client component opens EventSource to /api/admin/events/stream
  → Server validates session, starts polling loop:
      every 10s:
        fetch new Orders where createdAt > lastCheck
        fetch new SystemEvents where createdAt > lastCheck
        if any, push as SSE events
        push heartbeat every 30s
  → On new_order event: show toast + play audio beep
  → On new_payment event: show toast + update KPI card
  → On notification event: show toast with severity color
  → On page unload: EventSource closes automatically, server detects abort
```

### 4.3 Notification Dispatch Flow

```
New Order created (POST /api/orders)
  → Order handler creates Order record
  → (Optional: push to SSE is poll-based, so no explicit push needed)
  → On next SSE poll, stream picks it up

The SSE endpoint itself queries:
  prisma.order.findMany({ where: { createdAt: { gt: lastCheck } }, include: { restaurant: { select: { name: true } } } })
  prisma.systemEvent.findMany({ where: { createdAt: { gt: lastCheck } } })

For Telegram:
  New order handler calls sendTelegramNotification() per-admin:
    → Query User where role IN (super_admin, sub_admin) AND telegramChatId IS NOT NULL AND telegramNotifyOrders = true
    → For each, send message via Telegram bot API
```

---

## 5. UI Pages

### 5.1 `/admin/settings` — Profile Tab

New tab added to existing tab set: `"profile"` with icon `User`.

- **Name field** — editable text input, pre-filled with current name
- **Username field** — read-only display (changing username is a separate feature)
- **Change password section:**
  - Current password input
  - New password input (with show/hide toggle)
  - Confirm new password
  - Submit button with client-side validation (new passwords match, min 6 chars)
- Save button calls `PUT /api/admin/profile`
- Validation: require current password when changing password, require new password confirmation to match

### 5.2 `/admin/settings` — Telegram Tab

New tab: `"telegram"` with icon `Bot`.

State machine:
- **Unlinked state** (`telegramChatId` is null):
  - "ربط حساب تليجرام" heading
  - Button "إنشاء رمز الربط" → calls POST /api/admin/telegram/link
  - Shows the bot URL + instruction: "افتح الرابط في تليجرام وأرسل /start"
  - "انسخ الرابط" button copies to clipboard
  - Status indicator: "في انتظار التحقق..." with spinning icon
  - Polls `GET /api/admin/profile` every 3s until `telegramLinkedAt` is set
- **Linked state** (`telegramChatId` is set):
  - Shows: @username if available, else `telegramChatId`
  - Shows: linked at date (formatted)
  - **"إلغاء الربط"** button → calls POST /api/admin/profile with telegramChatId: null (and clears linkedAt)
  - Confirmation dialog before unlinking: "هل أنت متأكد من إلغاء ربط تليجرام؟"
- **Error state:**
  - If token generation fails: error toast + retry button
  - If verification timeout (admin never sends /start): token expires in 10min, UI shows expired state, "إنشاء رمز جديد" button

### 5.3 `/admin/settings` — Notifications Tab

New tab: `"notifications"` with icon `Bell`.

Notification preference matrix:

| الإشعار | الأحداث في لوحة التحكم (SSE) | تليجرام |
|---------|------------------------------|---------|
| طلبات جديدة | toggle (always on for SSE, this controls toast visibility) | toggle bound to `telegramNotifyOrders` |
| مدفوعات جديدة | toggle | toggle bound to `telegramNotifyPayments` |
| إعدادات النظام | toggle | toggle bound to `telegramNotifySettings` |

- Each cell is a `Switch` component
- Column headers: "إشعارات فورية (SSE)", "إشعارات تليجرام"
- Changes auto-save: on toggle, calls `PUT /api/admin/notification-preferences`
- Debounced 500ms to avoid rapid saves
- Shows saving indicator (small spinner or checkmark)
- SSE column toggles affect whether the SSE client shows a toast for that event type (client-side filtering)
- Telegram column toggles are stored in DB and used by server-side notification dispatch

### 5.4 Payment Toast Component (SSE-Connected)

**Component name:** `LiveEventToast`

Props: none (self-contained, connects to SSE internally).

- Connects to `/api/admin/events/stream` on mount
- **Audio beep**: Plays a short notification sound on `new_order` and `new_payment` events (uses `AudioContext` / `<audio>` element with a small base64-encoded beep — no external sound files)
- **New order toast:**
  - "🛵 طلب جديد #1234 — مطعم البرج — 45 د.ل"
  - Click opens `/admin/orders/[id]`
  - Duration: 8 seconds, auto-dismiss
  - Queue: if multiple orders arrive in quick succession, show stacked
- **New payment toast:**
  - "💳 دفعة جديدة — 200 د.ل — خطة بريميوم"
  - Duration: 8 seconds
- **Error state:**
  - SSE disconnection: show subtle "تم قطع الاتصال، جاري إعادة المحاولة..." banner, auto-reconnect
  - Reconnect attempts: exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **Accessibility:**
  - Toasts have `role="status"` and `aria-live="polite"`
  - Audio beep has a user toggle (mute button in toast area)
  - Respects `prefers-reduced-motion`: no slide-in animation, just appear

### 5.5 Activity Feed in `/admin/audit-logs`

**No structural changes to the existing audit-log page.** The SSE stream powers a live-update banner:

- On mount, connect to SSE
- On `notification` event, prepend a live event chip to the top of the audit-log table:
  - Severity-colored dot + title
  - Auto-fade after 15 seconds
  - Click to scroll to the corresponding row in the table (if already loaded)
- If user is on the first page of audit logs, auto-append matching events that arrive via SSE
- If user has scrolled/filtered, show a "n new events" pill instead

---

## 6. Error Handling Matrix

| Scenario | HTTP Status | Client Handling |
|----------|-------------|-----------------|
| Profile GET: no session | 401 | Redirect to login |
| Profile PUT: currentPassword wrong | 403 | "كلمة المرور الحالية غير صحيحة" toast |
| Profile PUT: newPassword too short | 422 | "كلمة المرور يجب أن تكون 6 أحرف على الأقل" |
| Link token generation | 500 | "حدث خطأ في إنشاء رمز الربط" toast + retry |
| Verify: token expired | 403 | "انتهت صلاحية الرمز، أنشئ رمزاً جديداً" |
| Verify: token tampered | 403 | "الرمز غير صالح" |
| Verify: user not found | 404 | "المستخدم غير موجود" |
| SSE: session invalid | 401 | SSE closes, client shows "يرجى تسجيل الدخول" |
| SSE: poll fails | event: error | Client shows "حدث خطأ في الاتصال" toast, SSE continues |
| SSE: connection lost | — | Auto-reconnect with backoff |
| Notification prefs: unauthorized | 403 | "لا تملك الصلاحية" toast |
| Trigger event: unauthorized | 403 | "لا تملك الصلاحية" toast |

---

## 7. Architecture Decisions

### 7.1 No WebSocket, No External Pub/Sub

The SSE endpoint polls PostgreSQL every 10s using the same `setInterval` pattern already proven in `/api/orders/stream`. This is sufficient for admin panel latency requirements. If polling overhead becomes measurable (>5ms per query on the order table), add a `lastCheckedAt` index on `Order.createdAt` and `SystemEvent.createdAt`.

### 7.2 Token Format: HMAC-SHA256, not JWT Library

A simple HMAC-signed JSON blob avoids adding a new dependency. The token is short-lived (10 min), used once, and never refreshed. Using `crypto.createHmac` from Node.js built-ins, same `JWT_SECRET` used for existing auth.

### 7.3 Per-Admin Telegram Dispatch

When a new order comes in:
1. Query `User` where `role IN (super_admin, sub_admin)`, `telegramChatId IS NOT NULL`, and `telegramNotifyOrders = true`
2. For each matching user, call the Telegram bot API
3. This replaces the single `TelegramConfig.chatId` flow for admin notifications

The global `TelegramConfig` model remains for restaurant-level notifications (owner scope).

### 7.4 SSE Poll Interval: 10s

Chosen to balance freshness and query load. Heartbeat every 30s to keep proxies alive.

### 7.5 Audio Beep: Base64-Encoded

No external sound files. A 200ms 440Hz sine wave generated via `AudioContext` at runtime. Silent when tab is backgrounded (`document.hidden` check).

---

## 8. Pseudo/Implementation Notes

### Profile Route Pattern

```ts
// src/app/api/admin/profile/route.ts
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return error("غير مصرح", 401);
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, username: true, role: true, permissions: true,
              telegramChatId: true, telegramUsername: true, telegramLinkedAt: true, createdAt: true }
  });
  return success(user);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return error(auth.error, auth.status);
  const body = await req.json();
  // validate, verify password if changing, update, return
}
```

### SSE Pattern

```ts
// src/app/api/admin/events/stream/route.ts
export async function GET(req: NextRequest) {
  const session = await validateSession();
  if (!session.valid) return new Response("Unauthorized", { status: 401 });

  let lastCheck = new Date();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(async () => {
        try {
          const [newOrders, newEvents] = await Promise.all([
            prisma.order.findMany({
              where: { createdAt: { gt: lastCheck } },
              select: { id: true, orderNo: true, total: true, customerName: true,
                        restaurant: { select: { name: true } }, createdAt: true }
            }),
            prisma.systemEvent.findMany({
              where: { createdAt: { gt: lastCheck } }
            }),
          ]);

          lastCheck = new Date();

          for (const order of newOrders) {
            controller.enqueue(encoder.encode(
              `event: new_order\ndata: ${JSON.stringify(order)}\n\n`
            ));
          }
          for (const ev of newEvents) {
            controller.enqueue(encoder.encode(
              `event: notification\ndata: ${JSON.stringify(ev)}\n\n`
            ));
          }
        } catch (e) {
          controller.enqueue(encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: "خطأ في جلب الأحداث" })}\n\n`
          ));
        }
      }, 10_000);

      // Heartbeat every 30s
      const hb = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(hb);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

### SSE Client Hook (React)

```ts
// src/hooks/useAdminSSE.ts
"use client";
export function useAdminSSE(handlers: {
  onNewOrder?: (order: OrderData) => void;
  onNewPayment?: (payment: PaymentData) => void;
  onNotification?: (ev: NotificationData) => void;
}) {
  useEffect(() => {
    const es = new EventSource("/api/admin/events/stream");
    es.addEventListener("new_order", (e) => handlers.onNewOrder?.(JSON.parse(e.data)));
    es.addEventListener("new_payment", (e) => handlers.onNewPayment?.(JSON.parse(e.data)));
    es.addEventListener("notification", (e) => handlers.onNotification?.(JSON.parse(e.data)));
    es.onerror = () => { /* reconnect logic */ };
    return () => es.close();
  }, []);
}
```

---

## 9. Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/admin/profile/route.ts` | GET/PUT profile |
| `src/app/api/admin/telegram/link/route.ts` | POST generate link token |
| `src/app/api/admin/telegram/verify/route.ts` | POST verify token, bind chat |
| `src/app/api/admin/notification-preferences/route.ts` | GET/PUT notification toggles |
| `src/app/api/admin/events/stream/route.ts` | GET SSE stream |
| `src/app/api/admin/events/trigger/route.ts` | POST test event |
| `src/components/admin/LiveEventToast.tsx` | SSE-connected toast with audio beep |
| `src/hooks/useAdminSSE.ts` | React hook for SSE |
| `src/app/admin/settings/page.tsx` | Updated with profile/telegram/notifications tabs |

Files to modify:
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 6 fields to User model |
| `src/app/admin/settings/page.tsx` | Add 3 new tab panels |

---

## 10. Security Considerations

- **Token forgery:** HMAC-SHA256 signature prevents tampering; `nonce` prevents replay (single-use within 10min window)
- **SSE auth:** Session cookie validated before stream starts; no per-event re-auth
- **Profile password change:** Requires current password; rate-limited to 5 attempts per 15min per user (reuse existing `rate-limit.ts`)
- **Telegram unlink:** Clears `telegramChatId` and `telegramLinkedAt`, immediately stops notifications to that chat
- **No secrets WoT:** Bot token stays in `TelegramConfig` (existing model), not exposed via profile API
- **CSRF:** All mutating endpoints use existing CSRF token mechanism (`csrfFetch` on client, `csrf.ts` middleware on server)
