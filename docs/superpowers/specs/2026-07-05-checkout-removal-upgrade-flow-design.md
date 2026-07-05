# Checkout Removal & Upgrade Flow Redesign

## Status: Draft

## Motivation

1. **/checkout page is redundant** — duplicates /subscribe logic with a different UI. User feels disconnected from the site.
2. **No upgrade path** — free-plan owners have no way to upgrade. The "ترقية" button on `PlanUsageBadge` links to `/pricing` (marketing page only).
3. **PaymentDialog's `onSuccess` redirects to `/login`** — user must log in again, bad UX when they just registered.

## Flow Design

### Two User Types

| Step | New User (subscribe) | Existing Free Owner (upgrade) |
|------|---------------------|------------------------------|
| 1 | `/subscribe` → pick plan | `/subscribe?plan=2` from upgrade button |
| 2 | Fill restaurant + user form | ✗ — data exists, show plan selector only |
| 3 | `POST /api/auth/register` → create session | ✗ — already has session |
| 4 | `PaymentDialog` → pay | `PaymentDialog` → pay |
| 5 | Admin approves → `handleVerified` creates restaurant + user + links | Admin approves → `handleVerified` upgrades restaurant plan |
| 6 | `router.push("/owner")` | `router.push("/owner")` |

### Upgrade Detection

`SubscribeContent` calls `/api/auth/me` on mount:
- No session → new user flow (unchanged)
- `authenticated=true`, `role=owner`, `subscriptionStatus=PAID`, `planId=null` (free plan) → upgrade mode
  - Hides form (restaurant data, username/password)
  - Shows plan selector only → PaymentDialog
  - `PaymentDialog` gets new optional prop: `upgradeRestaurantId`

### PaymentDialog Changes

- New optional prop: `upgradeRestaurantId?: number`
- In `handleSent`: if `upgradeRestaurantId` set, POST to `/api/subscriptions/upgrade` instead of `/api/subscriptions`
- `onSuccess`: both user types → `router.push("/owner")` (user already has session)

### New API: `POST /api/subscriptions/upgrade`

Input: `{ planId, phone, amount, provider, upgradeRestaurantId, currentPlanId }`

Creates `SubscriptionPayment` with:
- `userId` = current user
- `status: "pending"`
- `metadata: { upgradeRestaurantId, currentPlanId }`

### HandleVerified Upgrade Branch

`handleVerified` checks `metadata.upgradeRestaurantId`:
- If present → update restaurant's `planId`, `planStart`, `planEnd`
  - Do NOT create a new restaurant
  - Do NOT change user role (already owner)
- If absent → existing logic (create restaurant + promote user)

### Deletions

- `src/app/checkout/page.tsx` — delete
- `src/app/api/payments/claim/route.ts` — already deleted
- `middleware.ts`: remove `/checkout` from `publicPrefixes`
- middleware: change UNPAID redirect from `/checkout` to `/subscribe`

## Files to Modify

| File | Change |
|------|--------|
| `src/app/subscribe/page.tsx` | Add upgrade mode detection, hide form for existing owners, pass `upgradeRestaurantId` to PaymentDialog, `onSuccess` → `/owner` |
| `src/components/shared/PaymentDialog.tsx` | Add `upgradeRestaurantId?` prop, conditional POST endpoint |
| **Create:** `src/app/api/subscriptions/upgrade/route.ts` | New subscription payment for existing owners |
| `src/lib/subscription-decisions.ts` | Add upgrade branch in `handleVerified` — update restaurant plan instead of creating |
| `middleware.ts` | Remove `/checkout`, change UNPAID redirect to `/subscribe` |
| `src/app/checkout/page.tsx` | Delete entire file |

## Error Handling

- **Upgrade submitted for PAID user with no free plan** → 400 "صاحب المطعم مشترك حالياً في خطة مدفوعة"
- **Upgrade with non-existent plan** → 400 "الباقة غير موجودة"
- **Rate limit** → 429 same as subscribe flow

## Spec Self-Review

- **Placeholders**: None.
- **Consistency**: Upgrade branch mirrors subscribe flow — same PaymentDialog, same admin approval, same Telegram notifications.
- **Scope**: Focused. Only touches the upgrade path and checkout removal. No changes to order SSE, Telegram config, or unrelated admin features.
- **Ambiguity**: `upgradeRestaurantId` makes it explicit that an upgrade modifies an existing restaurant vs creating new.
