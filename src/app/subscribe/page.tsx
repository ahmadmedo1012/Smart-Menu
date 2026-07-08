"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowLeft, Loader2, Sparkles, Store, Building2, Crown, Star, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { csrfFetch } from "@/lib/csrf-client";
import { premiumToast } from "@/lib/premium-toast";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import PaymentDialog from "@/components/shared/PaymentDialog";

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

const PLAN_ICONS = [Sparkles, Star, Crown, Building2];
const PLAN_GRADIENTS = [
  "from-gray-400 to-gray-500",
  "from-orange to-orange/80",
  "from-orange to-orange/80",
  "from-orange to-orange/80",
];

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get("plan");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<"plan" | "form">(
    preselectedPlan ? "form" : "plan"
  );

  const [paymentOpen, setPaymentOpen] = useState(false);

  // Upgrade mode: authenticated free owner upgrading plan
  const [user, setUser] = useState<{ role: string; subscriptionStatus: string; restaurantId: number | null } | null>(null);
  const [upgradeMode, setUpgradeMode] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    phone: "",
    whatsapp: "",
    username: "",
    password: "",
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

  // Check if user is an authenticated free owner → upgrade mode
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const u = d.data;
          if (u.role === "owner" && u.restaurantId) {
            // Already PAID → no reason to be on subscribe page
            if (u.subscriptionStatus === "PAID") {
              router.push("/owner");
              return;
            }
            setUser({ role: u.role, subscriptionStatus: u.subscriptionStatus, restaurantId: u.restaurantId });
            setUpgradeMode(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  // SSE stream for instant rejection notification (user is authenticated via pre-payment registration)
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

  const currentPlan = plans.find((p) => p.id === selectedPlan);
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const touchField = (field: string) => setFieldTouched(prev => ({ ...prev, [field]: true }));
  const fieldError = (field: string) => {
    const touched = fieldTouched[field] || submitted;
    if (!touched) return false;
    switch (field) {
      case "name": return form.name.trim().length < 2;
      case "slug": return form.slug.trim().length < 2;
      case "username": return form.username.trim().length < 3;
      case "password": return form.password.trim().length < 4;
      default: return false;
    }
  };
  const isFormValid =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.username.trim().length >= 3 &&
    form.password.trim().length >= 4;

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

  const handlePaymentSuccess = async () => {
    // Only redirect to dashboard if user has access (restaurant exists / admin approved)
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.success && meData.data?.restaurantId) {
        // Owner upgrade path or approved payment — redirect to dashboard
        if (meData.data?.subscriptionStatus !== "PAID") {
          premiumToast("info", "تم إرسال طلب الترقية. سيتم تفعيلها بعد موافقة الإدارة.");
        }
        router.push("/owner");
        return;
      }
    } catch {}
    // No restaurantId yet — payment still pending admin approval
    premiumToast("info", "طلبك قيد المراجعة من الإدارة. سيتم إشعارك عند التفعيل.");
  };

  const createAccount = async () => {
    if (!selectedPlan ||
        form.name.trim().length < 2 ||
        form.slug.trim().length < 2 ||
        form.username.trim().length < 3 ||
        form.password.trim().length < 4) {
      premiumToast("error", "يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          description: form.description.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
          planId: selectedPlan,
          username: form.username.trim(),
          password: form.password.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل إنشاء الحساب");

      // Free plan: auto-login and redirect to dashboard
      if (currentPlan && Number(currentPlan.price) === 0) {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username.trim(), password: form.password.trim() }),
        });
        if (loginRes.ok) {
          premiumToast("success", "تم إنشاء حسابك! جارِ نقلك إلى لوحة التحكم...");
          router.push("/owner");
          router.refresh();
          return;
        }
      }
      premiumToast("success", "تم إنشاء الحساب! يمكنك تسجيل الدخول الآن");
      router.push("/login");
    } catch (e: any) {
      premiumToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-orange-muted/20 to-background dark:via-orange-muted/10">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Store className="size-4" />
            اشترك الآن
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">
            <span>انضم إلى الربط الذكي</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            وأنشئ منيو رقمي لمطعمك في دقائق
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            step === "plan" ? "bg-primary text-primary-foreground" : "bg-muted/50"
          )}>
            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
            اختر الخطة
          </div>
          <div className="w-8 h-0.5 bg-muted-foreground/20" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            step === "form" ? "bg-primary text-primary-foreground" : "bg-muted/50"
          )}>
            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
            بيانات المطعم
          </div>
        </div>

        {/* Step 1: Plan selection — hide free plans in upgrade mode */}
        {step === "plan" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-8">{upgradeMode ? "اختر خطة للترقية إليها" : "اختر خطة تناسب مطعمك"}</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
              {plans.filter(p => !upgradeMode ? true : Number(p.price) > 0).slice(0, 2).map((plan, i) => {
                const Icon = PLAN_ICONS[i] || Sparkles;
                const isSelected = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "relative flex flex-col rounded-md border-2 p-5 text-start transition-all duration-300 hover:scale-[1.02]",
                      isSelected
                        ? "border-orange bg-orange-muted/50 dark:bg-orange-muted shadow-lg shadow-orange/10"
                        : "border-border/30 hover:border-orange/30 bg-card/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 size-6 rounded-full bg-orange flex items-center justify-center shadow-lg">
                        <Check className="size-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "size-10 rounded-sm bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg",
                      PLAN_GRADIENTS[i]
                    )}>
                      <Icon className="size-5 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{plan.nameAr}</h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold">{Number(plan.price) === 0 ? "مجاني" : toArabicNumber(plan.price)}</span>
                      {Number(plan.price) > 0 && <span className="text-xs text-muted-foreground">د.ل/شهر</span>}
                    </div>
                    <div className="space-y-1.5 mb-4 flex-1">
                      {plan.features.slice(0, 4).map((f, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <Check className="size-3 text-primary shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <p className="text-xs text-primary font-medium">+{plan.features.length - 4} ميزات أخرى</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <Button
                size="lg"
                className="px-10 h-14 text-lg rounded-sm"
                disabled={!selectedPlan}
                onClick={() => setStep("form")}
              >
                {selectedPlan ? `اخترت ${plans.find(p => p.id === selectedPlan)?.nameAr}` : "اختر خطة أولاً"}
                <ArrowLeft className="ms-2 size-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Registration form or upgrade pay */}
        {step === "form" && upgradeMode ? (
          <div className="animate-fade-in max-w-lg mx-auto">
            {/* Upgrade mode: show plan + pay only — no form */}
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
        ) : step === "form" ? (
          <div className="animate-fade-in max-w-lg mx-auto">
            {/* Selected plan summary */}
            {currentPlan && (
              <div className={cn(
                "rounded-md p-5 mb-8 border-2 border-orange/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card",
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-10 rounded-[4px] bg-gradient-to-br flex items-center justify-center",
                      PLAN_GRADIENTS[plans.findIndex(p => p.id === currentPlan.id)]
                    )}>
                      {(() => { const Icon = PLAN_ICONS[plans.findIndex(p => p.id === currentPlan.id)] || Sparkles; return <Icon className="size-5 text-white" />; })()}
                    </div>
                    <div>
                      <p className="font-bold">{currentPlan.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(currentPlan.price) === 0 ? "مجاني" : `${currentPlan.price} د.ل/شهر`}
                        {" • "}
                        {currentPlan.maxItems === 9999 ? "أصناف غير محدودة" : `حتى ${toArabicNumber(currentPlan.maxItems)} صنف`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("plan")}>
                    تغيير
                  </Button>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              {/* Restaurant name + slug */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم المطعم *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => { setForm({ ...form, name: e.target.value }); setSubmitted(false); }}
                    onBlur={() => touchField("name")}
                    placeholder="اسم المطعم (مثال: مقهى الواحة)"
                    className={cn("h-11 mt-1.5", fieldError("name") && "border-destructive ring-1 ring-destructive/30")}
                    aria-invalid={fieldError("name") || undefined}
                    required
                  />
                  {fieldError("name") && <p className="text-xs text-destructive mt-1">اسم المطعم مطلوب (حرفان على الأقل)</p>}
                </div>
                <div>
                  <Label>الرابط المختصر *</Label>
                  <div className="flex items-center mt-1.5">
                    <span className="text-xs text-muted-foreground bg-muted/50 h-11 px-3 rounded-sm border-e-0 border-input flex items-center shrink-0">
                      /menu/
                    </span>
                    <Input
                      value={form.slug}
                      onChange={(e) => { setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() }); setSubmitted(false); }}
                      onBlur={() => touchField("slug")}
                      placeholder="الرابط المختصر (مثال: al-waha-cafe)"
                      className={cn("h-11 rounded-[4px] -me-[2px] text-left", fieldError("slug") && "border-destructive ring-1 ring-destructive/30")}
                      dir="ltr"
                      aria-invalid={fieldError("slug") || undefined}
                      required
                    />
                  </div>
                  {fieldError("slug") && <p className="text-xs text-destructive mt-1">الرابط مطلوب (حرفان على الأقل)</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>الوصف</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف المطعم (اختياري)"
                  className="h-11 mt-1.5"
                />
              </div>

              {/* Phone + WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="رقم الهاتف (مثال: 0912345678)"
                    className="h-11 mt-1.5 text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>رقم واتساب</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => { setForm({ ...form, whatsapp: e.target.value }) }}
                    placeholder="رقم الواتساب (مثال: 0912345678)"
                    className="h-11 mt-1.5 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">بيانات تسجيل الدخول</span>
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم المستخدم *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => { setForm({ ...form, username: e.target.value }); setSubmitted(false); }}
                    onBlur={() => touchField("username")}
                    placeholder="اسم المستخدم (3 أحرف على الأقل)"
                    className={cn("h-11 mt-1.5 text-left", fieldError("username") && "border-destructive ring-1 ring-destructive/30")}
                    dir="ltr"
                    aria-invalid={fieldError("username") || undefined}
                    required
                  />
                  {fieldError("username") && <p className="text-xs text-destructive mt-1">اسم المستخدم مطلوب (3 أحرف على الأقل)</p>}
                </div>
                <div>
                  <Label>كلمة المرور *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setSubmitted(false); }}
                    onBlur={() => touchField("password")}
                    placeholder="كلمة المرور (4 أحرف على الأقل)"
                    className={cn("h-11 mt-1.5", fieldError("password") && "border-destructive ring-1 ring-destructive/30")}
                    aria-invalid={fieldError("password") || undefined}
                    required
                  />
                  {fieldError("password") && <p className="text-xs text-destructive mt-1">كلمة المرور مطلوبة (4 أحرف على الأقل)</p>}
                </div>
              </div>

              {/* Summary */}
              {currentPlan && (
                <div className="rounded-md bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mt-6">
                  <h4 className="font-bold mb-3">ملخص الاشتراك</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخطة</span>
                      <span className="font-medium">{currentPlan.nameAr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">السعر</span>
                      <span className="font-medium">{Number(currentPlan.price) === 0 ? "مجاني" : `${currentPlan.price} د.ل/شهر`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحد الأقصى للأصناف</span>
                      <span className="font-medium">{currentPlan.maxItems === 9999 ? "غير محدود" : toArabicNumber(currentPlan.maxItems)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الطلبات</span>
                      <span className="font-medium">{currentPlan.maxOrders === 99999 ? "غير محدودة" : `حتى ${toArabicNumber(currentPlan.maxOrders)}`}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-14 text-base font-semibold rounded-sm mt-4"
                size="lg"
                type="submit"
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    جاري إنشاء الحساب...
                  </span>
                ) : (
                  <>
                    <Store className="size-5" />
                    إنشاء الحساب والبدء
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground/60">
                بالضغط على إنشاء الحساب، أنت توافق على{" "}
                <Link href="/terms" className="text-primary underline">شروط الخدمة</Link>
              </p>
            </form>
          </div>
        ) : null}
      </div>

      {/* Payment Dialog for paid plans */}
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
          tempRestaurantName={form.name}
          tempRestaurantSlug={form.slug}
        />
      )}
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
