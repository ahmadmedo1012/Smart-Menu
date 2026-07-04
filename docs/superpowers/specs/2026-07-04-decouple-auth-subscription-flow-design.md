# Decouple Auth & Subscription Flow — Design Spec

**Date:** 2026-07-04
**Status:** Draft

## Overview

Separate account registration from payment. 3-stage pipeline: (1) register → USER/UNPAID, (2) gated access → payment claim, (3) Super-Admin approval → OWNER/PAID + restaurant creation. Rejection halts at stage 2 with real-time notification push.

## Schema Changes

### User model
```
role: "USER"              # NEW — default after register (was always "owner")
role: "owner"             # now only set on admin approval
subscriptionStatus: "UNPAID" | "PAID" | "REJECTED"  # NEW
planId? → SubscriptionPlan  # EXISTING — set on approval
restaurantId? → Restaurant   # EXISTING — set on approval
```

### SubscriptionPayment model
```
userId → User              # NEW FK — replaces phone-only lookup
metadata Json              # NEW — tempRestaurantName, tempRestaurantSlug
status: "pending" | "verified" | "cancelled"  # existing (add "rejected" alias)
```

### Role enum
```
super_admin, sub_admin, admin, owner, USER  # NEW
```

## Flow Detail

### Stage 1: Registration (`POST /api/auth/register`)
- Zod: `{ username, password, name, email? }`
- Hash password (PBKDF2 as existing `src/lib/auth.ts:login`)
- `prisma.user.create({ data: { username, password: hashed, role: "USER", subscriptionStatus: "UNPAID" } })`
- `createSession(userId)` — same as login
- Set auth cookies
- Return `{ user: { id, username, role: "USER", subscriptionStatus: "UNPAID" } }`
- Rate limit: 5/60s per IP

### Stage 2: Payment Claim (`POST /api/payments/claim`)
- Auth required (session)
- Zod: `{ planId, phone, provider, amount, tempRestaurantName, tempRestaurantSlug }`
- Validate plan exists + isActive
- `prisma.subscriptionPayment.create({ data: { userId, planId, planName, phone, provider, amount, status: "pending", metadata: { tempRestaurantName, tempRestaurantSlug } } })`
- Rate limit: 5/60s per userId
- Telegram broadcast: `notifyEvent("payment_claimed", { userId, plan, tempRestaurantName })`

### Stage 3a: Admin Approve (`POST /api/admin/subscriptions — verified`)
- Existing guard: `requirePermission("MANAGE_SUBSCRIPTIONS")`
- Atomic transaction:
```
prisma.$transaction(async (tx) => {
  const payment = await tx.subscriptionPayment.update({ where: { id }, data: { status: "verified" } })
  const meta = payment.metadata as { tempRestaurantName: string; tempRestaurantSlug: string }
  const restaurant = await tx.restaurant.create({
    data: { name: meta.tempRestaurantName, slug: meta.tempRestaurantSlug, planId: payment.planId, isActive: true }
  })
  await tx.user.update({
    where: { id: payment.userId },
    data: { role: "owner", subscriptionStatus: "PAID", planId: payment.planId, restaurantId: restaurant.id }
  })
  return { payment, restaurant }
})
```
- Telegram: notify admin who approved + user if Telegram linked
- SSE: emit `admin-event { type: "payment_verified", userId, restaurantId }`

### Stage 3b: Admin Reject (`POST /api/admin/subscriptions — cancelled`)
- Existing guard
```
const payment = await prisma.subscriptionPayment.update({ where: { id }, data: { status: "cancelled" } })
await prisma.user.update({ where: { id: payment.userId }, data: { subscriptionStatus: "REJECTED" } })
```
- **SSE push**: `eventEmitter.emit("user-event", { userId: payment.userId, type: "subscription_rejected", message: "..." })`
- Telegram: broadcast notification

## Middleware Guards

### `middleware.ts`
```
// Protected routes matcher unchanged
// Add check inside owner route guard:
if (pathname.startsWith('/owner') && (role === 'USER' || subscriptionStatus !== 'PAID')) {
  return NextResponse.redirect(new URL('/checkout', request.url))
}
```

**Implementation note:** Cookies currently store `role` and `restaurantId`. Add `subscriptionStatus` cookie on login/register. Middleware reads it directly — no DB hit on every request.

## SSE — User Event Stream

### `GET /api/user/events/stream`
- Auth required (session)
- `ReadableStream` listening on `eventEmitter.on("user-event", ...)`
- Filters events by `payload.userId === currentUserId`
- Heartbeat 30s
- Cleanup on abort
- **No polling** — pure EventEmitter push

No new SSE endpoint for orders reuse — user events are a distinct channel. Admin already has `/api/admin/events/stream`; this mirrors that pattern for the user.

## Client-Side Changes

### New: `/checkout` page
- If `subscriptionStatus === "PAID"` → redirect `/owner`
- If `subscriptionStatus === "UNPAID"` → show plan selection + payment form (fields: phone, provider, receipt, tempRestaurantName, tempRestaurantSlug)
- If `subscriptionStatus === "REJECTED"` → show rejection banner (Arabic: "عذراً، تم رفض طلب التفعيل…") + form unlocked for re-submit
- SSE listener: `new EventSource("/api/user/events/stream")` → on `subscription_rejected`, show banner + unlock form reactively

### Owner dashboard banner
- SSE listener in `src/app/(owner)/layout.tsx` or new `UserEventNotifier` component
- On `subscription_rejected`: show permanent banner at top of dashboard (cannot dismiss)
- On `payment_verified`: nothing — redirect already handled

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/auth/register/route.ts` | New registration endpoint |
| `src/app/api/payments/claim/route.ts` | Payment claim with metadata |
| `src/app/api/payments/status/route.ts` | Payment status poll (existing, may be reused) |
| `src/app/api/user/events/stream/route.ts` | User-scoped SSE stream |
| `src/app/checkout/page.tsx` | Checkout gating page with SSE listener |
| `src/components/owner/UserBannerNotifier.tsx` | SSE banner component for dashboard |

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `USER` role, `subscriptionStatus`, `userId` FK on SubscriptionPayment |
| `src/middleware.ts` | Add subscriptionStatus cookie write, UNPAID→/checkout redirect |
| `src/lib/auth.ts` | `requireAuth()` return `subscriptionStatus` |
| `src/app/api/auth/login/route.ts` | Set `subscriptionStatus` cookie on login |
| `src/app/api/admin/subscriptions/route.ts` | Atomic transaction on verify + reject → user-event SSE |
| `src/app/(admin)/subscriptions/page.tsx` | Show `tempRestaurantName` in subscription table |
| `src/app/(owner)/layout.tsx` | Mount `UserBannerNotifier` |
| `src/app/(public)/subscribe/page.tsx` | Adapt to redirect to `/checkout` for paid plans (or deprecate) |
| `src/app/api/restaurants/route.ts` | Public registration: only create if role=OWNER (existing free plan users still work via this path — keep for backward compat) |

## Error Handling

- **Register**: username taken → 409. Validation fail → 400. Rate limit → 429 with Retry-After.
- **Payment claim**: no session → 401. Invalid plan → 400. Rate limit → 429.
- **SSE streams**: auth fail → 401. Connection abort → cleanup listener (existing pattern).
- **Admin approval**: no permission → 403. Payment already processed → 400 "already verified/cancelled". Transaction rollback on restaurant slug clash → 409.

## Testing Criteria

1. User registers → logged in at `/checkout` (not `/owner`), role=USER, status=UNPAID
2. User visits `/owner` → redirected to `/checkout`
3. User submits payment claim → payment pending
4. Admin approves → user becomes OWNER/PAID, restaurant created, can access `/owner`
5. Admin rejects → user sees rejection banner in real-time, form unlocked for re-submit
6. Re-registration: existing `/api/restaurants` free-plan flow still works (no breakage)

## Spec Self-Review

- **Placeholders**: None. All sections concrete.
- **Consistency**: Schema changes align with existing patterns. SSE mirrors admin event stream. Middleware guard uses same cookie-based approach as current role checks.
- **Scope**: Focused — decouples only the register → pay → approve pipeline. Not touching order SSE, Telegram config, loyalty, or unrelated admin features.
- **Ambiguity resolution**: subscriptionStatus lives on User only (per user decision). Metadata stored in SubscriptionPayment.metadata Json field (existing pattern). User SSE uses EventEmitter + filter (same as admin SSE), not polling.
