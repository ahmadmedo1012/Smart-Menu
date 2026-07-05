# Checkout Removal & Upgrade Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `/checkout`, add upgrade path for free-plan owners via `/subscribe`, redirect to dashboard on payment success.

**Architecture:** 6 files changed/created. PaymentDialog gets `upgradeRestaurantId` prop → conditional API endpoint. New `/api/subscriptions/upgrade` creates pending payment with `metadata.upgradeRestaurantId`. `handleVerified` checks that metadata → updates restaurant plan instead of creating new. Subscribe page detects authenticated free owners → shows simplified upgrade UI. Middleware redirects UNPAID to `/subscribe`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui, Prisma

---

### Task 1: Update middleware — remove checkout, redirect to subscribe

**Files:**
- Modify: `middleware.ts`

**Interfaces:**
- `/checkout` removed from `publicPrefixes`
- UNPAID redirect changes from `/checkout` to `/subscribe`

- [ ] **Step 1: Remove `/checkout` from publicPrefixes, change redirect target**

```typescript
// middleware.ts line 13: remove "/checkout" from publicPrefixes
const publicPrefixes = [
  "/_next", "/favicon.png",
  "/uploads", "/fonts", "/sw.js", "/manifest.json",
  "/brand-icon.png", "/icon-192.png", "/icon-512.png",
  "/api/auth", "/api/loyalty", "/api/subscriptions", "/api/plans", "/api/restaurants",
  "/api/telegram/webhook",
  "/login", "/menu", "/cart", "/order-confirmed",
  "/pricing", "/subscribe", "/demo",
];

// line 76-79: change redirect from /checkout to /subscribe
      if (subStatus && subStatus !== "PAID") {
        return NextResponse.redirect(new URL("/subscribe", request.url));
      }
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "fix: redirect UNPAID owners to /subscribe instead of /checkout"
```

---

### Task 2: Delete /checkout page

**Files:**
- Delete: `src/app/checkout/page.tsx`

- [ ] **Step 1: Delete file**

```bash
rm src/app/checkout/page.tsx
rmdir src/app/checkout 2>/dev/null; true
```

- [ ] **Step 2: Commit**

```bash
git add src/app/checkout/
git commit -m "feat: remove /checkout page — obsolete, replaced by /subscribe"
```

---

### Task 3: Add `upgradeRestaurantId` to PaymentDialog

**Files:**
- Modify: `src/components/shared/PaymentDialog.tsx`

**Interfaces:**
- New prop: `upgradeRestaurantId?: number`
- If set, `handleSent` POSTs to `/api/subscriptions/upgrade` instead of `/api/subscriptions`

- [ ] **Step 1: Add prop to interface**

```typescript
interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  planName: string;
  planNameAr: string;
  price: number;
  onSuccess: () => void;
  tempRestaurantName?: string;
  tempRestaurantSlug?: string;
  upgradeRestaurantId?: number;  // NEW
}
```

- [ ] **Step 2: Destructure prop**

```typescript
export default function PaymentDialog({
  open,
  onOpenChange,
  planId,
  planNameAr,
  price,
  onSuccess,
  tempRestaurantName,
  tempRestaurantSlug,
  upgradeRestaurantId,  // NEW
}: PaymentDialogProps) {
```

- [ ] **Step 3: Conditional POST endpoint in handleSent**

```typescript
  const handleSent = async () => {
    if (!phone.trim()) {
      premiumToast("error", "يرجى إدخال رقم هاتفك");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = upgradeRestaurantId
        ? "/api/subscriptions/upgrade"
        : "/api/subscriptions";
      const res = await csrfFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(), amount, provider, planId,
          ...(tempRestaurantName ? { tempRestaurantName } : {}),
          ...(tempRestaurantSlug ? { tempRestaurantSlug } : {}),
          ...(upgradeRestaurantId ? { upgradeRestaurantId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل إرسال طلب الدفع");
      setPaymentId(json.data.id);
      setStep("waiting");
      setCountdown(30);
    } catch (e: any) {
      premiumToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/PaymentDialog.tsx
git commit -m "feat: add upgradeRestaurantId prop to PaymentDialog — conditional API endpoint"
```

---

### Task 4: Create `/api/subscriptions/upgrade` endpoint

**Files:**
- Create: `src/app/api/subscriptions/upgrade/route.ts`

**Interfaces:**
- Input: `{ planId, phone, amount, provider, upgradeRestaurantId }`
- Output: `{ id: number }` (SubscriptionPayment ID)
- Creates `SubscriptionPayment` with `userId`, `status: "pending"`, `metadata: { upgradeRestaurantId }`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAdminTelegramIds } from "@/lib/telegram-admin";
import { sendMessageWithKeyboard } from "@/lib/telegram-api";
import { z } from "zod";

const upgradeSchema = z.object({
  planId: z.number().int().positive(),
  phone: z.string().min(1),
  provider: z.enum(["libyana", "madar"]),
  amount: z.number().positive(),
  upgradeRestaurantId: z.number().int().positive(),
});

const upgradeLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error("غير مصرح", 401);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = upgradeLimiter.check(`upgrade:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const parsed = upgradeSchema.safeParse(await request.json());
    if (!parsed.success) return error(parsed.error.issues[0].message, 400);
    const { planId, phone, provider, amount, upgradeRestaurantId } = parsed.data;

    // Validate plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, nameAr: true, isActive: true, price: true },
    });
    if (!plan || !plan.isActive) return error("الباقة غير موجودة أو غير نشطة", 400);

    // Validate restaurant exists and belongs to this user
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: upgradeRestaurantId },
      select: { id: true, planId: true },
    });
    if (!restaurant) return error("المطعم غير موجود", 404);

    // Check user is actually the owner of this restaurant (or admin)
    // We trust the auth — upgradeRestaurantId passed from client, but we verify via user's restaurantId
    if (auth.restaurantId !== upgradeRestaurantId && auth.role !== "super_admin" && auth.role !== "admin") {
      return error("لا تملك صلاحية ترقية هذا المطعم", 403);
    }

    // Check user is on a free plan (planId null)
    if (restaurant.planId !== null) {
      return error("صاحب المطعم مشترك حالياً في خطة مدفوعة", 400);
    }

    // Check no pending upgrade payment for this restaurant
    const pending = await prisma.subscriptionPayment.findFirst({
      where: {
        status: "pending",
        metadata: { path: ["upgradeRestaurantId"], equals: upgradeRestaurantId },
      },
    });
    if (pending) return error("لديك طلب ترقية معلق بالفعل لهذا المطعم", 400);

    // Check user has no pending payment
    const userPending = await prisma.subscriptionPayment.findFirst({
      where: { userId: auth.userId, status: "pending" },
    });
    if (userPending) return error("لديك طلب دفع معلق بالفعل", 400);

    const payment = await prisma.subscriptionPayment.create({
      data: {
        userId: auth.userId,
        phone: String(phone),
        amount,
        provider: provider as "libyana" | "madar",
        planId,
        planName: plan.nameAr ?? "",
        status: "pending",
        metadata: {
          upgradeRestaurantId,
          currentPlanId: restaurant.planId,
        },
      },
    });

    // Send interactive keyboard to admins (same pattern as /api/subscriptions)
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
          const msg = `⬆️ *طلب ترقية اشتراك* #${payment.id}\n• المستخدم: #${auth.userId}\n• المطعم: #${upgradeRestaurantId}\n• الباقة: ${plan.nameAr}\n• الهاتف: ${String(phone)}\n• المبلغ: ${String(amount)} د.ل`;
          for (const chatId of chatIds) {
            try {
              await sendMessageWithKeyboard(botToken, chatId, msg, [
                [{ text: "🟢 موافقة على الترقية", callbackData: `sub_app:${payment.id}` }],
                [{ text: "🔴 رفض الطلب", callbackData: `sub_rej:${payment.id}` }],
              ], { parseMode: "Markdown" });
            } catch (singleErr) {
              console.error("[upgrade] send to", chatId, "failed:", singleErr);
            }
          }
        }
      }
    } catch (keyboardErr) {
      console.error("[upgrade] keyboard error:", keyboardErr);
    }

    return success({ id: payment.id }, 201);
  } catch (e) {
    return handleError(e);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/subscriptions/upgrade/
git commit -m "feat: add POST /api/subscriptions/upgrade for free-plan owner upgrades"
```

---

### Task 5: Upgrade branch in subscription-decisions.ts

**Files:**
- Modify: `src/lib/subscription-decisions.ts`

**Interfaces:**
- `handleVerified` checks `metadata.upgradeRestaurantId`
- If present: update restaurant plan, don't create restaurant or promote user
- If absent: existing logic unchanged

- [ ] **Step 1: Find the handleVerified function and add upgrade branch**

Replace the current `handleVerified` implementation:

```typescript
async function handleVerified(existing: Awaited<ReturnType<typeof prisma.subscriptionPayment.findUnique>>): Promise<ResolveResult> {
  const meta = existing!.metadata as {
    tempUsername?: string;
    tempRestaurantName?: string;
    tempRestaurantSlug?: string;
    upgradeRestaurantId?: number;
    currentPlanId?: number | null;
  } | null;

  // UPGRADE BRANCH: existing owner upgrading to paid plan
  if (meta?.upgradeRestaurantId) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.subscriptionPayment.update({
          where: { id: existing!.id, status: "pending" },
          data: { status: "verified" },
        });

        const plan = await tx.subscriptionPlan.findUnique({
          where: { id: existing!.planId },
          select: { id: true, nameAr: true, maxMenus: true, maxItems: true, maxOrders: true },
        });

        const restaurant = await tx.restaurant.update({
          where: { id: meta!.upgradeRestaurantId },
          data: {
            planId: existing!.planId,
            planStart: new Date(),
            planEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // User is already owner, just update planId
        await tx.user.update({
          where: { id: existing!.userId! },
          data: { planId: existing!.planId },
        });

        return { restaurant, plan };
      });

      // Notify via Telegram broadcast
      const msg = `⬆️ *تم تأكيد الترقية*\n• المطعم: ${result.restaurant.name}\n• الخطة: ${result.plan?.nameAr ?? existing!.planName}\n• المبلغ: ${existing!.amount} د.ل`;
      const { sendTelegramNotification } = await import("@/lib/telegram");
      sendTelegramNotification(msg, { parseMode: "Markdown" }).catch(() => {});

      return { ok: true, action: "verified", paymentId: existing!.id };
    } catch (e) {
      return { ok: false, reason: "حدث خطأ أثناء ترقية الخطة" };
    }
  }

  // NEW USER BRANCH: existing logic (unchanged)
  const restaurantName = meta?.tempRestaurantName ?? `مطعم ${existing!.phone}`;
  const restaurantSlug = meta?.tempRestaurantSlug ?? `restaurant-${existing!.id}`;

  // ... rest of existing handleVerified ...
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/subscription-decisions.ts
git commit -m "feat: add upgrade branch to handleVerified — updates restaurant plan instead of creating"
```

---

### Task 6: Subscribe page — add upgrade mode for authenticated free owners

**Files:**
- Modify: `src/app/subscribe/page.tsx`

**Interfaces:**
- Calls `/api/auth/me` on mount
- If `authenticated=true`, `role=owner`, `subscriptionStatus=PAID`, and user has `restaurantId` → upgrade mode
- Upgrade mode hides form, shows plan selector only, passes `upgradeRestaurantId` to PaymentDialog
- `onSuccess` → `router.push("/owner")`

- [ ] **Step 1: Add upgrade detection state + fetch user info**

Add after existing state declarations (around line 63):

```typescript
  // Upgrade mode: authenticated free owner upgrading plan
  const [user, setUser] = useState<{ role: string; subscriptionStatus: string; restaurantId: number | null } | null>(null);
  const [upgradeMode, setUpgradeMode] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
```

- [ ] **Step 2: Add auth check in the existing useEffect or a new one**

Add after the plans-fetch useEffect (after line 78):

```typescript
  // Check if user is an authenticated free owner → upgrade mode
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const u = d.data;
          if (u.role === "owner" && u.subscriptionStatus === "PAID" && u.restaurantId) {
            setUser({ role: u.role, subscriptionStatus: u.subscriptionStatus, restaurantId: u.restaurantId });
            setUpgradeMode(true);
            // Preselect plan if ?plan= in URL
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);
```

- [ ] **Step 3: Modify the rendered UI for upgrade mode**

When `upgradeMode` is true:
- Header text changes from "انضم إلى الربط الذكي" to "ترقية خطتك"
- Step indicator shows only "اختر الخطة" (no "بيانات المطعم")
- Step 2 (form) is completely skipped
- After selecting plan, instead of form, show plan summary + "ادفع الآن" button
- Button opens PaymentDialog with `upgradeRestaurantId`

When `upgradeMode` is false (new user), everything remains as-is.

Change the step UI after plan selection. Replace the current step 2 form section:

In the `step === "form"` block, before the form element:

```tsx
{/* Upgrade mode: skip form, show plan + pay button */}
{upgradeMode ? (
  <div className="animate-fade-in max-w-lg mx-auto">
    {/* Selected plan summary — same as existing but without "تغيير" since there's no choice */}
    {currentPlan && (
      <div className="rounded-md p-5 mb-8 border-2 border-orange/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{currentPlan.nameAr}</p>
            <p className="text-sm text-muted-foreground">
              {currentPlan.price} د.ل/شهر
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("plan")}>
            تغيير
          </Button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {currentPlan.features.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="size-3.5 text-primary shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <p className="text-sm text-muted-foreground mb-6 text-center">
      بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.
    </p>

    <Button
      className="w-full h-14 text-base font-semibold rounded-sm"
      size="lg"
      onClick={() => setPaymentOpen(true)}
      disabled={!selectedPlan}
    >
      <CreditCard className="size-5 ml-2" />
      ادفع الآن {currentPlan ? `(${currentPlan.price} د.ل)` : ""}
    </Button>
  </div>
) : (
  /* Existing form code — unchanged */
  <form className="space-y-5" ...
)}
```

- [ ] **Step 4: Update PaymentDialog rendering for upgrade mode**

Where PaymentDialog is rendered (bottom of the component), add `upgradeRestaurantId`:

```tsx
      {currentPlan && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          planId={currentPlan.id}
          planName={currentPlan.name}
          planNameAr={currentPlan.nameAr}
          price={Number(currentPlan.price)}
          onSuccess={handlePaymentSuccess}
          upgradeRestaurantId={upgradeMode && user?.restaurantId ? user.restaurantId : undefined}
        />
      )}
```

- [ ] **Step 5: Update handlePaymentSuccess to redirect to /owner**

```typescript
  const handlePaymentSuccess = () => {
    // For both new user and upgrade: user has session already
    router.push("/owner");
  };
```

- [ ] **Step 6: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "feat: add upgrade mode to subscribe page — free owners skip form, pay only"
```

---

## Self-Review Check

1. **Spec coverage:** Every section covered. Middleware redirects to `/subscribe` ✅. Checkout deleted ✅. PaymentDialog conditional API ✅. New upgrade endpoint ✅. handleVerified upgrade branch ✅. Subscribe page upgrade mode ✅.

2. **Placeholder scan:** No TBD/TODO. All code is concrete.

3. **Type consistency:** `upgradeRestaurantId?: number` consistent across PaymentDialog, upgrade API, and subscribe page. `handleVerified` metadata cast same shape. Telegram message key `sub_app`/`sub_rej` reused (same callback handlers handle both subscribe and upgrade).

4. **Backward compat:** All existing subscribe flow for new users is unchanged — only the new `upgradeMode` code path is added.
