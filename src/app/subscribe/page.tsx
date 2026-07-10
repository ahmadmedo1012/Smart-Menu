"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/csrf-client";
import { premiumToast } from "@/lib/premium-toast";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { PlanSelector } from "./PlanSelector";
import { SubscribeForm } from "./SubscribeForm";
import { UpgradePlanSummary, PaymentDialogWrapper } from "./PaymentSection";

type Plan = {
  id: number; name: string; nameAr: string; price: number;
  periodDays: number; features: string[]; maxMenus: number;
  maxItems: number; maxOrders: number; sortOrder: number;
};

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get("plan");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const [step, setStep] = useState<"plan" | "form">(preselectedPlan ? "form" : "plan");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [user, setUser] = useState<{ role: string; subscriptionStatus: string; restaurantId: number | null } | null>(null);
  const [upgradeMode, setUpgradeMode] = useState(false);

  const [form, setForm] = useState({
    name: "", slug: "", description: "", phone: "", whatsapp: "", username: "", password: "",
  });

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        const p = d.data ?? d ?? [];
        setPlans(p);
        if (preselectedPlan) {
          const found = p.find((pl: Plan) => pl.id === Number(preselectedPlan));
          if (found) setSelectedPlan(found.id);
        }
      })
      .catch(() => premiumToast("error", "فشل تحميل الخطط"))
      .finally(() => setLoading(false));
  }, [preselectedPlan]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const u = d.data;
          if (u.role === "owner" && u.restaurantId) {
            if (u.subscriptionStatus === "PAID") { router.push("/owner"); return; }
            setUser({ role: u.role, subscriptionStatus: u.subscriptionStatus, restaurantId: u.restaurantId });
            setUpgradeMode(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  // SSE for instant rejection/approval
  useEffect(() => {
    const es = new EventSource("/api/user/events/stream");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.eventType === "subscription_rejected") {
          setPaymentOpen(false); submittedRef.current = false; setSubmitting(false);
          premiumToast("error", data.message || "عذراً، تم رفض طلب التفعيل");
        }
        if (data.eventType === "subscription_approved") {
          setPaymentOpen(false);
          premiumToast("success", "تم تفعيل حسابك بنجاح! جارِ نقلك إلى لوحة التحكم...");
          setTimeout(() => window.location.replace("/owner"), 500);
        }
      } catch { /* parse error */ }
    };
    es.onerror = () => {};
    return () => es.close();
  }, []);

  const currentPlan = plans.find((p) => p.id === selectedPlan);
  const isFormValid =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.username.trim().length >= 3 &&
    form.password.trim().length >= 4;

  const handleSubmit = async () => {
    submittedRef.current = true;
    if (!selectedPlan || !isFormValid) return;

    // Pre-flight
    try {
      const valRes = await fetch("/api/subscriptions/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.trim(), slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") }),
      });
      const valJson = await valRes.json();
      if (!valJson.success || !valJson.data?.valid) {
        const errs = valJson.data?.errors ?? {};
        if (errs.username) premiumToast("error", errs.username);
        if (errs.slug) premiumToast("error", errs.slug);
        if (!errs.username && !errs.slug) premiumToast("error", "البيانات غير صالحة");
        return;
      }
    } catch { premiumToast("error", "خطأ في التحقق من البيانات"); return; }

    // Paid plan → register then payment dialog
    if (currentPlan && Number(currentPlan.price) > 0) {
      setSubmitting(true);
      try {
        const regRes = await csrfFetch("/api/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username.trim(), password: form.password.trim(), name: form.name.trim() }),
        });
        const regJson = await regRes.json();
        if (!regRes.ok) throw new Error(regJson.error ?? "فشل إنشاء الحساب");
        setPaymentOpen(true);
      } catch (e: any) { premiumToast("error", e.message); }
      finally { setSubmitting(false); }
      return;
    }

    // Free plan
    await createAccount();
  };

  const handlePaymentSuccess = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.success && meData.data?.restaurantId) {
        if (meData.data?.subscriptionStatus !== "PAID") premiumToast("info", "تم إرسال طلب الترقية. سيتم تفعيلها بعد موافقة الإدارة.");
        router.push("/owner"); return;
      }
    } catch {}
    premiumToast("info", "طلبك قيد المراجعة من الإدارة. سيتم إشعارك عند التفعيل.");
  };

  const createAccount = async () => {
    if (!selectedPlan || !isFormValid) { premiumToast("error", "يرجى تعبئة جميع الحقول المطلوبة"); return; }
    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/restaurants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          description: form.description.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim(),
          planId: selectedPlan, username: form.username.trim(), password: form.password.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل إنشاء الحساب");
      if (currentPlan && Number(currentPlan.price) === 0) {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username.trim(), password: form.password.trim() }),
        });
        if (loginRes.ok) { premiumToast("success", "تم إنشاء حسابك! جارِ نقلك إلى لوحة التحكم..."); router.push("/owner"); router.refresh(); return; }
      }
      premiumToast("success", "تم إنشاء الحساب! يمكنك تسجيل الدخول الآن");
      router.push("/login");
    } catch (e: any) { premiumToast("error", e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-orange-muted/20 to-background dark:via-orange-muted/10">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Store className="size-4" /> اشترك الآن
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3"><span>انضم إلى الربط الذكي</span></h1>
          <p className="text-muted-foreground text-lg">وأنشئ منيو رقمي لمطعمك في دقائق</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", step === "plan" ? "bg-primary text-primary-foreground" : "bg-muted/50")}>
            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span> اختر الخطة
          </div>
          <div className="w-8 h-0.5 bg-muted-foreground/20" />
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", step === "form" ? "bg-primary text-primary-foreground" : "bg-muted/50")}>
            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span> بيانات المطعم
          </div>
        </div>

        {/* Step 1: Plan selector */}
        {step === "plan" && (
          <PlanSelector
            plans={plans} selectedPlan={selectedPlan} upgradeMode={upgradeMode}
            onSelect={setSelectedPlan} onContinue={() => setStep("form")}
          />
        )}

        {/* Step 2: Upgrade mode (pay only) */}
        {step === "form" && upgradeMode && currentPlan && (
          <UpgradePlanSummary
            currentPlan={currentPlan}
            onBack={() => setStep("plan")}
            onPay={() => setPaymentOpen(true)}
          />
        )}

        {/* Step 2: New registration form */}
        {step === "form" && !upgradeMode && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <SubscribeForm
              plans={plans} selectedPlan={selectedPlan} form={form}
              step={step} onStepChange={setStep} onFormChange={setForm}
            />
            <div className="max-w-lg mx-auto mt-6">
              <Button className="w-full h-14 text-base font-semibold rounded-sm" size="lg" type="submit" disabled={!isFormValid || submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> جاري إنشاء الحساب...</span>
                ) : (
                  <><Store className="size-5" /> إنشاء الحساب والبدء</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground/60 mt-4">
                بالضغط على إنشاء الحساب، أنت توافق على{" "}
                <Link href="/terms" className="text-primary underline">شروط الخدمة</Link>
              </p>
            </div>
          </form>
        )}

        {/* Payment Dialog */}
        {currentPlan && (
          <PaymentDialogWrapper
            open={paymentOpen} onOpenChange={setPaymentOpen}
            currentPlan={currentPlan} upgradeMode={upgradeMode} user={user}
            form={form} onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
      <SubscribeContent />
    </Suspense>
  );
}
