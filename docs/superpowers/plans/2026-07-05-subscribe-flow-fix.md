# Subscribe Flow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent payment on duplicate data, handle rejection live, create user pre-payment for session tracking.

**Architecture:** New validation API + early user registration + metadata in payments + SSE consumer + PaymentDialog awareness of "cancelled".

**Tech Stack:** Next.js 16, React 19, Prisma, EventSource

## Global Constraints

- Zero new dependencies
- All Arabic error messages (existing pattern)
- `tempUsername`, `tempRestaurantName`, `tempRestaurantSlug` naming consistent everywhere
- User created before payment for paid plans (role: USER, subscriptionStatus: UNPAID, no restaurant)
- Free plans unchanged
- Metadata cast: `payment.metadata as { tempUsername?: string; tempRestaurantName?: string; tempRestaurantSlug?: string; }`

---

### Task 1: Create `POST /api/subscriptions/validate` endpoint

**Files:**
- Create: `src/app/api/subscriptions/validate/route.ts`

**Interfaces:**
- Consumes: `{ username: string, slug: string }` POST body
- Produces: `{ valid: true }` or `{ valid: false, errors: { username?: string, slug?: string } }`

- [ ] **Step 1: Create validate route**

```ts
// src/app/api/subscriptions/validate/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { z } from "zod";

const validateSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  slug: z.string().min(3, "الرابط يجب أن يكون 3 أحرف على الأقل").regex(/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط"),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = validateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ valid: false, errors: { _form: parsed.error.issues[0].message } }, { status: 400 });
    }
    const { username, slug } = parsed.data;

    const errors: { username?: string; slug?: string } = {};

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) errors.username = "اسم المستخدم مستخدم بالفعل";

    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) errors.slug = "الرابط محجوز مسبقاً";

    if (!errors.slug) {
      const slugPending = await prisma.subscriptionPayment.findFirst({
        where: { status: "pending", metadata: { path: ["tempRestaurantSlug"], equals: slug } },
      });
      if (slugPending) errors.slug = "الرابط محجوز بطلب دفع معلق";
    }

    if (Object.keys(errors).length > 0) {
      return success({ valid: false, errors }, 200);
    }

    return success({ valid: true }, 200);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build 2>&1 | tail -15
```
Expected: no errors, no warnings (CSS warning pre-existing)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/subscriptions/validate/route.ts
git commit -m "feat: add pre-flight subscription validation endpoint

POST /api/subscriptions/validate checks username + slug uniqueness
before user reaches payment dialog. Prevents payment on duplicate data.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create user before payment in subscribe page

**Files:**
- Modify: `src/app/subscribe/page.tsx`

**Interfaces:**
- Consumes: `POST /api/subscriptions/validate`, `POST /api/auth/register`
- Produces: authenticated user session before PaymentDialog opens

- [ ] **Step 1: Read current subscribe page**

```bash
cat -n src/app/subscribe/page.tsx | tail -n +97 | head -60
```

- [ ] **Step 2: Modify handleSubmit to validate + create user before payment for paid plans**

Replace the existing `handleSubmit` function (lines ~97-113) and `handlePaymentSuccess` (lines ~115-118):

```tsx
  const handleSubmit = async () => {
    setSubmitted(true);
    if (!selectedPlan ||
        form.name.trim().length < 2 ||
        form.slug.trim().length < 2 ||
        form.username.trim().length < 3 ||
        form.password.trim().length < 4) return;

    // Pre-flight validation
    try {
      const valRes = await fetch("/api/subscriptions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        }),
      });
      const valJson = await valRes.json();
      if (!valJson.success || !valJson.data?.valid) {
        const errs = valJson.data?.errors ?? {};
        if (errs.username) premiumToast("error", errs.username);
        if (errs.slug) premiumToast("error", errs.slug);
        if (!errs.username && !errs.slug) premiumToast("error", "البيانات غير صالحة");
        return;
      }
    } catch {
      premiumToast("error", "خطأ في التحقق من البيانات");
      return;
    }

    // Paid plan → create user first, then payment dialog
    if (currentPlan && Number(currentPlan.price) > 0) {
      // Create user (USER/UNPAID, no restaurant)
      setSubmitting(true);
      try {
        const regRes = await csrfFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username.trim(),
            password: form.password.trim(),
            name: form.name.trim(),
          }),
        });
        const regJson = await regRes.json();
        if (!regRes.ok) throw new Error(regJson.error ?? "فشل إنشاء الحساب");
        setPaymentOpen(true);
      } catch (e: any) {
        premiumToast("error", e.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Free plan → create account immediately (unchanged)
    await createAccount();
  };

  const handlePaymentSuccess = () => {
    // Paid plan: payment approved — subscription-decisions.ts promotes user
    // Nothing to do here; admin approval triggers handleVerified which upgrades the user
    router.push("/login");
  };
```

- [ ] **Step 3: Build to verify**

```bash
npm run build 2>&1 | tail -15
```
Expected: no errors, no warnings

- [ ] **Step 4: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "fix: create user before payment in subscribe flow

Validates username/slug via /api/subscriptions/validate before
proceeding. For paid plans, registers user as USER/UNPAID first,
then opens PaymentDialog linked to authenticated session.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Update `/api/subscriptions` POST — pre-flight guard + metadata

**Files:**
- Modify: `src/app/api/subscriptions/route.ts`
- Modify: `src/app/api/subscriptions/status/route.ts` (add userId to status response)

**Interfaces:**
- Consumes: `requireAuth` (user must be authenticated)
- Produces: payment record with `metadata: { tempUsername, tempRestaurantName, tempRestaurantSlug }`

- [ ] **Step 1: Read current subscriptions/route.ts**

- [ ] **Step 2: Modify POST handler**

Replace the full file content:

```ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";
import { z } from "zod";

const subscriptionLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const createPaymentSchema = z.object({
  phone: z.string().min(1),
  amount: z.number().positive(),
  provider: z.enum(["libyana", "madar"]),
  planId: z.number().int().positive(),
  tempUsername: z.string().min(3).optional(),
  tempRestaurantName: z.string().min(1).optional(),
  tempRestaurantSlug: z.string().min(3).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = subscriptionLimiter.check(`sub:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const parsed = createPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return error(parsed.error.issues[0].message, 400);
    const { phone, amount, provider, planId, tempUsername, tempRestaurantName, tempRestaurantSlug } = parsed.data;

    // Pre-flight uniqueness checks (defense in depth alongside client-side validation)
    if (tempUsername) {
      const existingUser = await prisma.user.findUnique({ where: { username: tempUsername } });
      if (existingUser) return error("اسم المستخدم مستخدم بالفعل", 409);
    }
    if (tempRestaurantSlug) {
      const existingSlug = await prisma.restaurant.findUnique({ where: { slug: tempRestaurantSlug } });
      if (existingSlug) return error("الرابط محجوز مسبقاً", 409);
      const slugPending = await prisma.subscriptionPayment.findFirst({
        where: { status: "pending", metadata: { path: ["tempRestaurantSlug"], equals: tempRestaurantSlug } },
      });
      if (slugPending) return error("الرابط محجوز بطلب دفع معلق", 409);
    }

    // Check no pending payment for this user
    const pendingPayment = await prisma.subscriptionPayment.findFirst({
      where: { userId: auth.userId, status: "pending" },
    });
    if (pendingPayment) return error("لديك طلب دفع معلق بالفعل", 400);

    // Fetch plan name
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { nameAr: true },
    });

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId: auth.userId,
        phone: String(phone),
        amount,
        provider: provider as "libyana" | "madar",
        planId,
        planName: plan?.nameAr ?? "",
        status: "pending",
        metadata: {
          tempUsername,
          tempRestaurantName,
          tempRestaurantSlug,
          telegramMessages: [],
        },
      },
    });

    // Send interactive keyboard to admins (same as existing pattern)
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN || (await prisma.telegramConfig.findFirst())?.botToken;
      if (botToken) {
        const adminIds = getAdminTelegramIds();
        const chatIds = new Set<string>();
        for (const id of adminIds) chatIds.add(String(id));
        const broadcastTargets = await prisma.telegramBroadcastTarget.findMany({
          where: { isActive: true },
          select: { chatId: true },
        });
        for (const t of broadcastTargets) chatIds.add(t.chatId);
        if (chatIds.size === 0) {
          const fallback = process.env.TELEGRAM_CHAT_ID;
          if (fallback) chatIds.add(fallback);
          const groupIds = (process.env.TELEGRAM_GROUP_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
          for (const gid of groupIds) chatIds.add(gid);
        }
        if (chatIds.size > 0) {
          const msg = `🔗 *طلب اشتراك جديد* #${payment.id}\n• المستخدم: #${auth.userId}\n• الباقة: ${plan?.nameAr ?? "غير معروف"}\n• الهاتف: ${String(phone)}\n• المبلغ: ${String(amount)} د.ل`;
          for (const chatId of chatIds) {
            try {
              await sendMessageWithKeyboard(botToken, chatId, msg, [
                [{ text: "🟢 موافقة على التفعيل", callbackData: `sub_app:${payment.id}` }],
                [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
              ], { parseMode: "Markdown" });
            } catch (singleErr) {
              console.error("[subscriptions] send to", chatId, "failed:", singleErr);
            }
          }
        }
      }
    } catch (keyboardErr) {
      console.error("[subscriptions] keyboard error:", keyboardErr);
    }

    return success({ id: payment.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 3: Build to verify**

```bash
npm run build 2>&1 | tail -15
```
Expected: no errors, no warnings

- [ ] **Step 4: Commit**

```bash
git add src/app/api/subscriptions/route.ts
git commit -m "fix: add pre-flight checks + metadata to subscriptions API

Added uniqueness checks for username, slug, and pending payments
before creating payment record. Stores tempUsername, tempRestaurantName,
tempRestaurantSlug in metadata for handleVerified use.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Patch PaymentDialog — handle "cancelled" status

**Files:**
- Modify: `src/components/shared/PaymentDialog.tsx`

**Interfaces:**
- Consumes: `paymentId` from created payment, polling `/api/subscriptions/status`
- Produces: on cancelled → close dialog, show error toast

- [ ] **Step 1: Read current PaymentDialog polling (lines ~127-148)**

- [ ] **Step 2: Add cancelled check to polling interval**

Edit the polling condition (`json.data?.status === "verified"`) to also handle cancelled:

```tsx
          if (json.data?.status === "verified") {
            clearInterval(tick);
            cleanup();
            finishFlow();
          }
          if (json.data?.status === "cancelled") {
            clearInterval(tick);
            cleanup();
            handleOpenChange(false);
            premiumToast("error", "تم رفض طلب الدفع");
          }
```

- [ ] **Step 3: Also add userId to the status query so the client can verify it owns the payment**

No change needed — `/api/subscriptions/status` already supports requireAuth.

- [ ] **Step 4: Build to verify**

```bash
npm run build 2>&1 | tail -15
```
Expected: no errors, no warnings

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/PaymentDialog.tsx
git commit -m "fix: handle cancelled subscription status in PaymentDialog

Adds polling check for 'cancelled' status. On rejection: close dialog,
reset step to form, show error toast. Removes fake-success on countdown
end for rejected payments.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Add SSE consumer to subscribe page + fix handleVerified for metadata

**Files:**
- Modify: `src/app/subscribe/page.tsx` (add SSE useEffect)
- Modify: `src/lib/subscription-decisions.ts` (read metadata for restaurant creation)

- [ ] **Step 1: Add SSE useEffect to subscribe page**

After the plans loading useEffect (around line 78), add:

```tsx
  // SSE stream for instant rejection notification (user authenticated via pre-payment registration)
  useEffect(() => {
    const es = new EventSource("/api/user/events/stream");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.eventType === "subscription_rejected") {
          setPaymentOpen(false);
          setSubmitted(false);
          setSubmitting(false);
          premiumToast("error", data.message || "عذراً، تم رفض طلب التفعيل");
        }
      } catch { /* parse error */ }
    };
    es.onerror = () => {};
    return () => es.close();
  }, []);
```

- [ ] **Step 2: Fix handleVerified in subscription-decisions.ts**

Read the existing `handleVerified` function and modify it to use metadata for restaurant name/slug when present.

The key change: when a payment has `tempRestaurantSlug` in metadata, use that instead of auto-generated slug. The user ALREADY exists (created by Task 2) so no user creation — only `role` promotion and restaurant linking.

Edit lines 41-138 of `subscription-decisions.ts`:

```ts
async function handleVerified(existing: Awaited<ReturnType<typeof prisma.subscriptionPayment.findUnique>>): Promise<ResolveResult> {
  const meta = existing!.metadata as {
    tempUsername?: string;
    tempRestaurantName?: string;
    tempRestaurantSlug?: string;
  } | null;
  const restaurantName = meta?.tempRestaurantName ?? `مطعم ${existing!.phone}`;
  const restaurantSlug = meta?.tempRestaurantSlug ?? `restaurant-${existing!.id}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Slug uniqueness check inside transaction (avoids race)
      if (existing!.userId) {
        const slugTaken = await tx.restaurant.findUnique({ where: { slug: restaurantSlug } });
        if (slugTaken) throw new Error("SLUG_TAKEN");
      }

      await tx.subscriptionPayment.update({
        where: { id: existing!.id, status: "pending" },
        data: { status: "verified" },
      });

      // Guard: skip restaurant+user creation if no userId (anonymous payment)
      let restaurant = null;
      let user = null;
      if (existing!.userId) {
        restaurant = await tx.restaurant.create({
          data: {
            name: restaurantName,
            slug: restaurantSlug,
            phone: existing!.phone,
            planId: existing!.planId,
            planStart: new Date(),
            planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });

        user = await tx.user.update({
          where: { id: existing!.userId },
          data: {
            role: "owner",
            subscriptionStatus: "PAID",
            planId: existing!.planId,
            restaurantId: restaurant.id,
          },
          select: { id: true, username: true, role: true, subscriptionStatus: true, restaurantId: true },
        });
      }

      return { restaurant, user };
    });

    // ... rest unchanged (notifications, SystemEvent records, return)
```

- [ ] **Step 3: Build to verify**

```bash
npm run build 2>&1 | tail -15
```
Expected: no errors, no warnings

- [ ] **Step 4: Commit**

```bash
git add src/app/subscribe/page.tsx src/lib/subscription-decisions.ts
git commit -m "fix: add SSE consumer to subscribe + use metadata in handleVerified

Subscribe page now listens for subscription_rejected events via SSE
(user is authenticated after pre-payment registration). handleVerified
reads tempRestaurantName/tempRestaurantSlug from payment metadata for
restaurant creation instead of auto-generated names.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Build, push, deploy

- [ ] **Step 1: Final full build**

```bash
npm run build 2>&1 | tail -30
```
Expected: compiled successfully, zero errors, zero warnings (CSS warning pre-existing)

- [ ] **Step 2: Push to origin**

```bash
git push origin main
```

- [ ] **Step 3: Confirm Vercel deploy**

```bash
npx vercel --prod 2>&1 | tail -20
```
Or confirm via Vercel dashboard.

- [ ] **Step 4: Run E2E browser tests**

```bash
npx playwright test tests/e2e/ 2>&1 | tail -30
```
Or manual test through browser.
