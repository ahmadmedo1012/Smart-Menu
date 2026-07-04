"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { csrfFetch } from "@/lib/csrf-client";
import { premiumToast } from "@/lib/premium-toast";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { motion } from "framer-motion";

type UserInfo = {
  id: number;
  username: string;
  role: string;
  subscriptionStatus: string;
};

type Plan = {
  id: number;
  name: string;
  nameAr: string;
  price: number;
  periodDays: number;
  features: string[];
  maxMenus: number;
  maxItems: number;
  maxOrders: number;
  sortOrder: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejected, setRejected] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");

  // Payment form state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [provider, setProvider] = useState<"libyana" | "madar">("libyana");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [tempRestaurantName, setTempRestaurantName] = useState("");
  const [tempRestaurantSlug, setTempRestaurantSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Fetch user + plans on mount
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (!json.success || !json.data) {
          router.push("/login?redirect=/checkout");
          return;
        }
        const userData = json.data;
        setUser(userData);

        // Already PAID → redirect to owner dashboard
        if (userData.subscriptionStatus === "PAID") {
          router.push("/owner");
          return;
        }

        // Show rejection state
        if (userData.subscriptionStatus === "REJECTED") {
          setRejected(true);
          setRejectionMessage(
            "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني."
          );
        }

        // Load plans
        const plansRes = await fetch("/api/plans");
        const plansJson = await plansRes.json();
        if (plansJson.success) {
          const active = (plansJson.data ?? []).filter((p: Plan) => p.sortOrder >= 0);
          setPlans(active);
          if (active.length > 0) {
            setSelectedPlan(active[0]);
            setAmount(Number(active[0].price));
          }
        }
      } catch {
        premiumToast("error", "فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // SSE listener for real-time rejection updates
  useEffect(() => {
    if (loading) return;
    esRef.current?.close();
    const es = new EventSource("/api/user/events/stream");
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "subscription_rejected") {
          setRejected(true);
          setRejectionMessage(
            data.message ||
              "عذراً، تم رفض طلب تفعيل الحساب. يرجى مراجعة تفاصيل الدفع أو التواصل مع الدعم الفني."
          );
          setSubmitted(false);
          setSubmitting(false); // force unlock form + button
          premiumToast("error", "تم رفض طلب التفعيل");
        }
      } catch {}
    };

    return () => {
      es.close();
    };
  }, [loading]);

  const handleSubmit = useCallback(async () => {
    if (!selectedPlan || !phone.trim() || !tempRestaurantName.trim() || !tempRestaurantSlug.trim()) {
      premiumToast("error", "يرجى ملء جميع الحقول");
      return;
    }
    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/payments/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          phone: phone.trim(),
          provider,
          amount,
          tempRestaurantName: tempRestaurantName.trim(),
          tempRestaurantSlug: tempRestaurantSlug.trim().toLowerCase(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل إرسال الطلب");
      setSubmitted(true);
      premiumToast("success", "تم إرسال طلب الدفع", "بانتظار تأكيد الإدارة");
    } catch (e: any) {
      premiumToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  }, [selectedPlan, phone, provider, amount, tempRestaurantName, tempRestaurantSlug]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-orange" />
        </div>
      </>
    );
  }

  // Already PAID & redirected — this renders only while redirect triggers
  if (!user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:pt-16">
        {/* Rejection banner */}
        {rejected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-8 rounded-xl border-2 border-destructive/30",
              "bg-gradient-to-r from-destructive/10 to-red-500/5",
              "p-5 backdrop-blur-sm"
            )}
            role="alert"
          >
            <div className="flex items-start gap-3 rtl:flex-row-reverse">
              <div className="size-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <p className="font-bold text-sm text-destructive">تم رفض طلب التفعيل</p>
                <p className="text-xs text-muted-foreground mt-1">{rejectionMessage}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-2">
                  يمكنك تعديل بيانات الدفع أدناه وإعادة المحاولة
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success state */}
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="size-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="size-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">تم إرسال طلب الدفع</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
              سيتم تفعيل حسابك بعد تأكيد الإدارة للدفع. سنقوم بإشعارك فور الموافقة.
            </p>
            <Button variant="outline" onClick={() => router.refresh()}>
              تحديث الصفحة
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold">تفعيل الحساب</h1>
              <p className="text-muted-foreground mt-2">
                اختر الباقة وأكمل بيانات الدفع لتفعيل حسابك
              </p>
            </div>

            {/* Plan selection */}
            {plans.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4">اختر الباقة</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setAmount(Number(plan.price));
                      }}
                      className={cn(
                        "rounded-xl border-2 p-4 text-right transition-all",
                        "hover:border-orange/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50",
                        selectedPlan?.id === plan.id
                          ? "border-orange bg-orange-muted/20 shadow-sm"
                          : "border-border/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{plan.nameAr}</span>
                        {selectedPlan?.id === plan.id && (
                          <Check className="size-4 text-orange" />
                        )}
                      </div>
                      <p className="text-2xl font-bold text-orange">
                        {plan.price} <span className="text-sm font-normal">د.ل</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {plan.maxItems} عنصر · {plan.maxOrders} طلب
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Payment form */}
            {selectedPlan && (
              <section className="space-y-5 rounded-2xl border border-border/30 bg-card/50 p-6">
                <h2 className="text-lg font-semibold">بيانات الدفع</h2>

                {/* Provider */}
                <div>
                  <Label>طريقة الدفع</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(["libyana", "madar"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProvider(p)}
                        className={cn(
                          "h-11 rounded-xl border-2 text-sm font-medium transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50",
                          provider === p
                            ? "border-orange bg-orange-muted/40 shadow-sm"
                            : "border-border/30 hover:border-orange/30 text-muted-foreground"
                        )}
                      >
                        {p === "libyana" ? "ليبيانا" : "مدار"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Label>رقم هاتفك للتواصل</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0910089975"
                    className="h-11 rounded-xl mt-1.5 text-left font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Amount */}
                <div>
                  <Label>المبلغ (د.ل)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="h-11 rounded-xl mt-1.5"
                    min={1}
                    max={99}
                  />
                </div>

                {/* Restaurant name + slug */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>اسم المطعم</Label>
                    <Input
                      value={tempRestaurantName}
                      onChange={(e) => setTempRestaurantName(e.target.value)}
                      placeholder="مطعمي"
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
                    <p className="text-[10px] text-muted-foreground mt-1">
                      أحرف إنكليزية وأرقام فقط
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !phone.trim() ||
                    !tempRestaurantName.trim() ||
                    !tempRestaurantSlug.trim()
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin ml-2" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4 ml-2" />
                      إرسال طلب الدفع
                    </>
                  )}
                </Button>
              </section>
            )}

            <p className="text-xs text-center text-muted-foreground mt-6">
              بعد إرسال الطلب، ستقوم الإدارة بمراجعته وتأكيده خلال 24 ساعة
            </p>
          </>
        )}
      </main>
    </>
  );
}
