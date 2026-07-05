# Checkout SSE Rejection Consumer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SSE consumer to checkout page so admin rejection events trigger instant UI response (<5s) instead of waiting for 3s polling.

**Architecture:** Single `useEffect` in checkout/page.tsx opens EventSource to `/api/user/events/stream`. On `subscription_rejected` event, call same state setters polling uses. Dual source (SSE + polling), first-one-wins.

**Tech Stack:** Next.js 16, React 19, EventSource (browser native)

## Global Constraints

- Zero new dependencies
- Follow existing patterns (OrderNotifier.tsx uses EventSource same way)
- Reuse existing rejection state setters — no new state variables
- Polling interval unchanged (3s) — kept as fallback

---

### Task 1: Add SSE consumer to checkout page

**Files:**
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `/api/user/events/stream` SSE endpoint (existing, returns SystemEvent JSON per `data:` line)
- Produces: event.type === `"subscription_rejected"` calls `setRejected(true)`, `setRejectionMessage(...)`, `setSubmitted(false)`, `setSubmitting(false)`

- [ ] **Step 1: Add rejection SSE useEffect**

Add this after the existing polling `useEffect` (line 130 — before the closing brace of the last useEffect):

```tsx
  // SSE stream for instant rejection detection (complements polling fallback)
  useEffect(() => {
    const es = new EventSource("/api/user/events/stream");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.eventType === "subscription_rejected") {
          setRejected(true);
          setRejectionMessage(data.message || "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني.");
          setSubmitted(false);
          setSubmitting(false);
        }
      } catch { /* parse error */ }
    };
    es.onerror = () => { /* SSE will auto-reconnect — no action needed */ };
    return () => es.close();
  }, []);
```

- [ ] **Step 2: Build to verify no errors**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` — zero errors, zero warnings.

- [ ] **Step 3: Review diff**

Verify only checkout/page.tsx changed, only the new useEffect added.

- [ ] **Step 4: Commit**

```bash
git add src/app/checkout/page.tsx
git commit -m "fix: add SSE consumer for instant rejection detection in checkout

Checkout relied solely on 3s polling to detect admin rejections,
causing up to 3s of stuck loading state. Added EventSource to
/api/user/events/stream that triggers rejection UI <5s after event.

The stream route and rejection event writes already exist —
this is the missing consumer side.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
