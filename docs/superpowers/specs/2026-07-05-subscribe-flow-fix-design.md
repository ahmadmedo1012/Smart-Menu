# Subscribe Flow Fix — Pre-flight Validation, Rejection Handling, Session Fix

## Status: Draft

## Motivation

Subscribe flow (`/subscribe` → `PaymentDialog` → `createAccount()`) has no
pre-flight data validation before payment. Users pay, then fail on duplicate
username/slug. PaymentDialog ignores "cancelled" status (only checks "verified"),
shows fake success after 30s countdown. No rejection notification mechanism
exists in subscribe flow. Additionally, users cannot log in after approval
because the account is created post-payment, not before.

## Root Causes

| # | Problem | Location | Detail |
|---|---------|----------|--------|
| A | No pre-flight uniqueness check | `/subscribe/page.tsx` → `handleSubmit()` opens PaymentDialog without validation | User pays 30+ seconds before discovering duplicate data |
| B | `POST /api/subscriptions` no validation | `/api/subscriptions/route.ts` | No username/slug/pending checks unlike `/payments/claim` |
| C | PaymentDialog ignores cancelled | `PaymentDialog.tsx:135` | Only checks `verified`; countdown expiry sets fake `success` |
| D | No rejection notification in subscribe | `/subscribe/page.tsx` | No SSE consumer, user not authenticated at payment time → no `userId` in events |
| E | User created post-payment | `handlePaymentSuccess()` → `createAccount()` | User cannot log in until admin approves; no session exists during payment |

## Design

### Change 1: Pre-submit validation API

**`POST /api/subscriptions/validate`**

Request: `{ username: string, slug: string }`

Response:
```json
{ "valid": true }
// or
{ "valid": false, "errors": { "username": "اسم المستخدم مستخدم بالفعل", "slug": "الرابط محجوز" } }
```

Logic:
- Check `User.findUnique({ where: { username } })` → conflict if exists
- Check `Restaurant.findUnique({ where: { slug } })` → conflict if exists
- Check `SubscriptionPayment.findFirst({ where: { status: "pending", metadata: { path: ["tempRestaurantSlug"], equals: slug } })` → conflict if pending

### Change 2: Create user before payment (paid plans)

**Flow change for paid plans:**

1. User fills form
2. Pre-flight validation (username + slug) — inline errors
3. Create user + auto-login (before payment):
   - `POST /api/auth/quick-register` or inline in subscribe flow
   - User created with `role: "USER"`, `subscriptionStatus: "UNPAID"`, no restaurant
   - Session cookies set → user is authenticated
4. Open PaymentDialog — payment is now linked to `userId` via auth
5. Payment record stores `tempUsername, tempRestaurantName, tempRestaurantSlug` in metadata
6. On admin approval: `handleVerified` promotes user to `owner`, creates restaurant, links them
7. On admin rejection: `handleCancelled` writes `subscription_rejected` with `userId` → SSE delivers to user

**Free plans:** unchanged (create user + restaurant immediately)

### Change 3: `/api/subscriptions` POST — store metadata + pre-flight guard

Add to request schema:
```ts
tempUsername: z.string().min(3).optional(),
tempRestaurantName: z.string().min(1).optional(),
tempRestaurantSlug: z.string().min(3).optional(),
```

Pre-flight uniqueness checks before creating payment record:
- Username uniqueness
- Slug uniqueness
- No pending payment for this user

Store metadata:
```ts
metadata: { tempUsername, tempRestaurantName, tempRestaurantSlug }
```

### Change 4: PaymentDialog — handle "cancelled" status

Add to polling interval (`PaymentDialog.tsx`):
```ts
if (json.data?.status === "cancelled") {
  clearInterval(tick);
  cleanup();
  handleOpenChange(false); // close dialog
  premiumToast("error", "تم رفض طلب الدفع");
}
```

### Change 5: Subscribe page — SSE consumer

Add EventSource to `/api/user/events/stream` on mount.
When `subscription_rejected` received:
- Close PaymentDialog (`setPaymentOpen(false)`)
- `setSubmitted(false)`, `setSubmitting(false)`
- `premiumToast("error", data.message)`

This works because user is now authenticated before payment (Change 2).

### Change 6: subscription-decisions.ts — use metadata for restaurant creation

`handleVerified` reads metadata for restaurant details (name, slug). User
already exists (created pre-payment per Change 2) — only role promotion
and restaurant creation needed.

Type-safe metadata cast:
```ts
const meta = payment.metadata as {
  tempUsername?: string;
  tempRestaurantName?: string;
  tempRestaurantSlug?: string;
};
```

### Files Changed

1. **Create:** `src/app/api/subscriptions/validate/route.ts` — new validation endpoint
2. **Modify:** `src/app/api/subscriptions/route.ts` — add pre-flight checks + metadata
3. **Modify:** `src/app/subscribe/page.tsx` — pre-flight validation before dialog + SSE consumer
4. **Modify:** `src/components/shared/PaymentDialog.tsx` — handle "cancelled" status
5. **Modify:** `src/lib/subscription-decisions.ts` — handle metadata from subscribe flow

### What Is NOT Changing

- `/checkout` flow — already correct
- `/api/payments/claim` — already correct
- `/api/auth/register` — already correct
- Prisma schema — no changes needed
- Dependencies — none added

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Creating user before payment creates "zombie" UNPAID users if payment never completed | Low impact — existing UNPAID users already exist from registration flow |
| Race condition: user submits same slug as concurrent request | Transaction-level check in API |
| Double notification (SSE + polling) | Idempotent state setters — safe to fire twice |
