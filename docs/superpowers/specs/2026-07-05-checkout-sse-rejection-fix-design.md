# Checkout SSE Rejection & Validation Audit — Design Doc

## Status: Approved

## Motivation

Audit of registration, payment claim, and checkout flows found that shift-left
validation (pre-payment uniqueness checks) is already in place. The gap is
that checkout relies solely on 3s polling of `/api/auth/me` to detect admin
rejections, causing up to 3 seconds of stuck loading state.

## Findings

| Area | Status | Detail |
|------|--------|--------|
| Registration `/api/auth/register` | ✅ OK | Checks username uniqueness before user creation (line 36-38) + Prisma constraint fallback (line 79-81) |
| Payment Claim `/api/payments/claim` | ✅ OK | Checks Restaurant.slug + pending payment metadata slug BEFORE creating payment record (lines 48-53) |
| Transaction verify handler | ✅ OK | Double-checks slug inside Prisma transaction (subscription-decisions.ts:49-52) |
| Rejection event write | ✅ OK | `handleCancelled` writes `subscription_rejected` SystemEvent with userId (subscription-decisions.ts:183-192) |
| User SSE stream `/api/user/events/stream` | ✅ OK | Filters SystemEvent by metadata.userId, polls every 5s |
| Checkout page SSE consumer | ❌ MISSING | Only polls `/api/auth/me` every 3s — no EventSource connection to user stream |
| Rejection handler in checkout | ✅ OK | When polling detects REJECTED, sets `rejected=true`, drops `submitted`, unlocks inputs (lines 119-126) |

## Design

### Change: Add SSE consumer to checkout page

Connect to `/api/user/events/stream` via EventSource. When
`subscription_rejected` event arrives, call the exact same rejection handler
that polling uses — no duplicated logic.

```
┌─────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│ Admin clicks │      │ subscription-decisions│      │  SystemEvent    │
│ sub_rej      │─────▶│ .ts: handleCancelled  │─────▶│  table row      │
└─────────────┘      └──────────────────────┘      └─────────────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────────┐
                                              │  /api/user/events/   │
                                              │  stream (polls DB)   │
                                              └──────────────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              ▼                 ▼
                                      ┌────────────┐   ┌────────────┐
                                      │ SSE push   │   │ Polling    │
                                      │ < 5s       │   │ every 3s   │
                                      └────────────┘   └────────────┘
                                              │                 │
                                              └──────┬──────────┘
                                                     ▼
                                          ┌────────────────────┐
                                          │  Checkout: reject  │
                                          │  handler (shared)  │
                                          └────────────────────┘
```

### SSE consumer spec

```
EventSource → /api/user/events/stream
  on event.type === "subscription_rejected":
    clearInterval(polling)
    setRejected(true)
    setRejectionMessage(event.message)
    setSubmitted(false)
    setSubmitting(false)
```

### Polling kept as-is (backup)

Existing 3s polling unchanged. SSE and polling both call same rejection
state setters. First one to fire wins.

### Files touched

1. `src/app/checkout/page.tsx` — add SSE useEffect, ~15 lines

### What is NOT changing

- Registration route — already correct
- Payment claim route — already correct
- `subscription-decisions.ts` — already writes events correctly
- SSE stream routes — already correct
- Prisma schema — no changes needed
- Dependencies — none added

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| SSE disconnects | Polling fallback catches any missed events (3s) |
| Multiple rejection signals | Idempotent state setters — double-fire is harmless |
| Port conflicts in Vercel serverless | SSE is polling-based (DB poll every 5s), no persistent connections |
