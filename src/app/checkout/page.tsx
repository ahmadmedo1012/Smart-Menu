"use client";

import { useEffect, useState } from "react";
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
import { premiumToast } from "@/lib/premium-toast";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { motion } from "framer-motion";
import PaymentDialog from "@/components/shared/PaymentDialog";

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

  // Checkout state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [tempRestaurantName, setTempRestaurantName] = useState("");
  const [tempRestaurantSlug, setTempRestaurantSlug] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

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

  // Poll subscription status as fallback for SSE (EventEmitter doesn't cross serverless instances)
  useEffect(() => {
    if (loading || !submitted) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (!json.success || !json.data) return;
        const status = json.data.subscriptionStatus;
        if (status === "PAID") {
          clearInterval(t);
          premiumToast("success", "تم تفعيل حسابك! جاري التحويل...");
          router.push("/owner");
        } else if (status === "REJECTED") {
          clearInterval(t);
          setRejected(true);
          setRejectionMessage("عذراً، تم رفض طلب تفعيل الحساب.");
          setSubmitted(false);
          premiumToast("error", "تم رفض طلب التفعيل");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [loading, submitted, router]);

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
        }
      } catch { /* parse error */ }
    };
    es.onerror = () => { /* SSE will auto-reconnect — no action needed */ };
    return () => es.close();
  }, []);

  const handlePaymentSuccess = () => {
    setSubmitted(true);
    premiumToast("success", "تم إرسال طلب الدفع", "بانتظار تأكيد الإدارة");
  };

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
                <h2 className="text-lg font-semibold">بيانات المطعم</h2>

                {/* Restaurant name + slug */}
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
                    <p className="text-[10px] text-muted-foreground mt-1">
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
                onSuccess={handlePaymentSuccess}
              />
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
