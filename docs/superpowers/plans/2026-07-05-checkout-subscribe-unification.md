# Checkout & Subscribe Unification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make checkout use same PaymentDialog as subscribe, clear all pre-filled form defaults.

**Architecture:** 4-file change. Subscribe: empty defaults → user enters their own data; Checkout: strip inline payment form → reuse PaymentDialog; PaymentDialog: pass restaurant metadata to API; payments/claim API: delete (duplicate of subscriptions API).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui

---

### Task 1: Subscribe — clear pre-filled form defaults

**Files:**
- Modify: `src/app/subscribe/page.tsx:55-63`

**Interfaces:**
- No external interface change — only initial state values change

- [ ] **Step 1: Clear default values**

Change the `form` useState initial values — all fields start empty. Placeholders already show example text; user sees clean form with hints.

Current:
```tsx
const [form, setForm] = useState({
  name: "مقهى الواحة",
  slug: "al-waha-cafe",
  description: "مقهى ومطعم يقدم أشهى المشروبات",
  phone: "0910089975",
  whatsapp: "0910089975",
  username: "admin",
  password: "",
});
```

Change to:
```tsx
const [form, setForm] = useState({
  name: "",
  slug: "",
  description: "",
  phone: "",
  whatsapp: "",
  username: "",
  password: "",
});
```

- [ ] **Step 2: Verify placeholders still render**

Placeholders already in JSX: `placeholder="مقهى الواحة"`, `placeholder="al-waha-cafe"`, etc. No change needed. On empty `value`, browsers show placeholder text. Visually the form now shows empty inputs with faded hint text.

- [ ] **Step 3: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "fix: clear pre-filled form defaults in subscribe — fields start empty, placeholders remain"
```

---

### Task 2: PaymentDialog — accept restaurant metadata props

**Files:**
- Modify: `src/components/shared/PaymentDialog.tsx`

**Interfaces:**
- New optional props: `tempRestaurantName?: string`, `tempRestaurantSlug?: string`
- POST body includes them when present

- [ ] **Step 1: Add props to interface**

```tsx
interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  planName: string;
  planNameAr: string;
  price: number;
  onSuccess: () => void;
  tempRestaurantName?: string;  // NEW
  tempRestaurantSlug?: string;  // NEW
}
```

- [ ] **Step 2: Destructure new props**

```tsx
export default function PaymentDialog({
  open,
  onOpenChange,
  planId,
  planName,
  planNameAr,
  price,
  onSuccess,
  tempRestaurantName,   // NEW
  tempRestaurantSlug,   // NEW
}: PaymentDialogProps) {
```

- [ ] **Step 3: Include metadata in API call**

In `handleSent` function, find `POST /api/subscriptions` body. Add metadata fields when present:

```tsx
body: JSON.stringify({
  phone: phone.trim(),
  amount,
  provider,
  planId,
  ...(tempRestaurantName ? { tempRestaurantName } : {}),
  ...(tempRestaurantSlug ? { tempRestaurantSlug } : {}),
}),
```

`/api/subscriptions/route.ts` already accepts `tempRestaurantName` and `tempRestaurantSlug` in its Zod schema — no API changes needed.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/PaymentDialog.tsx
git commit -m "feat: add tempRestaurantName/tempRestaurantSlug to PaymentDialog props"
```

---

### Task 3: Checkout — use PaymentDialog, strip inline payment form

**Files:**
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Removes: provider, phone, amount states (handled by PaymentDialog)
- Removes: `handleSubmit` (replaced by PaymentDialog flow)
- Adds: `paymentOpen` state, `import PaymentDialog`
- Keeps: plan selection, tempRestaurantName/tempRestaurantSlug, SSE, polling, rejection banner

- [ ] **Step 1: Add PaymentDialog import**

```tsx
import PaymentDialog from "@/components/shared/PaymentDialog";
import { CreditCard } from "lucide-react"; // remove unused imports too
```

- [ ] **Step 2: Remove payment-specific state**

Remove these state declarations:
```tsx
const [provider, setProvider] = useState<"libyana" | "madar">("libyana");
const [phone, setPhone] = useState("");
const [amount, setAmount] = useState(0);
```

Keep:
```tsx
const [tempRestaurantName, setTempRestaurantName] = useState("");
const [tempRestaurantSlug, setTempRestaurantSlug] = useState("");
```

Add:
```tsx
const [paymentOpen, setPaymentOpen] = useState(false);
```

- [ ] **Step 3: Remove `handleSubmit` entirely**

Remove `handleSubmit` (lines 150-178). The payment flow is now inside PaymentDialog.

- [ ] **Step 4: Replace inline payment form with PaymentDialog trigger**

Current form section (lines 293-395) shows payment fields inline. Replace with a summary + trigger button:

```tsx
{selectedPlan && (
  <section className="space-y-5 rounded-2xl border border-border/30 bg-card/50 p-6">
    <h2 className="text-lg font-semibold">بيانات المطعم</h2>

    {/* Restaurant name + slug — UNCHANGED */}
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>اسم المطعم</Label>
        <Input
          value={tempRestaurantName}
          onChange={(e) => setTempRestaurantName(e.target.value)}
          placeholder="اسم مطعمك"
          className="h-11 rounded-xl mt-1.5"
        />
      </div>
      <div>
        <Label>الرابط (slug)</Label>
        <Input
          value={tempRestaurantSlug}
          onChange={(e) =>
            setTempRestaurantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          placeholder="mat3ami"
          className="h-11 rounded-xl mt-1.5 text-left font-mono"
          dir="ltr"
        />
        <p className="text-[10px] text-muted-foreground mt-1 rtl:text-right">
          أحرف إنكليزية وأرقام فقط
        </p>
      </div>
    </div>

    {/* Plan summary */}
    <div className="rounded-xl bg-orange-muted/30 dark:bg-orange-muted/10 border border-orange/15 p-4">
      <div className="flex justify-between items-center">
        <span className="font-bold">{selectedPlan.nameAr}</span>
        <span className="text-lg font-bold text-orange">{selectedPlan.price} د.ل</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">اشتراك شهري</p>
    </div>

    <Button
      className="w-full h-12 text-base font-semibold rounded-xl"
      onClick={() => setPaymentOpen(true)}
      disabled={!tempRestaurantName.trim() || !tempRestaurantSlug.trim()}
    >
      <CreditCard className="size-4 ml-2" />
      متابعة للدفع
    </Button>
  </section>
)}

{/* PaymentDialog */}
{selectedPlan && (
  <PaymentDialog
    open={paymentOpen}
    onOpenChange={setPaymentOpen}
    planId={selectedPlan.id}
    planName={selectedPlan.name}
    planNameAr={selectedPlan.nameAr}
    price={Number(selectedPlan.price)}
    tempRestaurantName={tempRestaurantName.trim()}
    tempRestaurantSlug={tempRestaurantSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")}
    onSuccess={() => {
      setSubmitted(true);
      premiumToast("success", "تم إرسال طلب الدفع", "بانتظار تأكيد الإدارة");
    }}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/checkout/page.tsx
git commit -m "feat: checkout uses PaymentDialog like subscribe — removes inline payment form"
```

---

### Task 4: (Optional) Remove duplicate payments/claim API

**Files:**
- Delete: `src/app/api/payments/claim/route.ts`

- [ ] **Step 1: Verify no callers remain**

```bash
grep -r "payments/claim" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".next"
```

Only the deleted `src/app/api/payments/claim/route.ts` or docs.

- [ ] **Step 2: Delete the file**

```bash
rm src/app/api/payments/claim/route.ts
rmdir src/app/api/payments/claim 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/payments/claim/
git commit -m "chore: remove duplicate payments/claim API — subscriptions API covers all cases"
```

---

## Self-Review Check

1. **Spec coverage:** Every requirement covered. Subscribe defaults cleared ✅. Checkout uses PaymentDialog ✅. PaymentDialog passes metadata ✅.

2. **Placeholder scan:** No TBD/TODO. All steps have exact code.

3. **Type consistency:** `tempRestaurantName`/`tempRestaurantSlug` same type (`string`) across all files. `PaymentDialogProps` interface matches callers.

4. **Backward compat:** PaymentDialog props are optional — subscribe page callers unchanged.
