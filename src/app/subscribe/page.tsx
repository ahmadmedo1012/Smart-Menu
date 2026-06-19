"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowLeft, Loader2, Sparkles, Store, Building2, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

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
  "from-amber-500 to-amber-600",
  "from-amber-500 via-yellow-500 to-amber-600",
  "from-cyan-500 via-purple-500 to-pink-500",
];

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get("plan");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"plan" | "form">(
    preselectedPlan ? "form" : "plan"
  );

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
      .catch(() => toast.error("فشل تحميل الخطط"))
      .finally(() => setLoading(false));
  }, [preselectedPlan]);

  const currentPlan = plans.find((p) => p.id === selectedPlan);
  const isFormValid =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.username.trim().length >= 3 &&
    form.password.trim().length >= 4;

  const handleSubmit = async () => {
    if (!selectedPlan || !isFormValid) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/restaurants", {
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
      toast.success("تم إنشاء الحساب! يمكنك تسجيل الدخول الآن");
      router.push("/login");
    } catch (e: any) {
      toast.error(e.message);
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
    <div className="min-h-screen bg-gradient-to-b from-background via-amber-50/20 to-background dark:via-amber-950/10">
      {/* Nav */}
      <nav className="sticky top-0 z-50 h-16 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <ArrowLeft className="size-4" />
            <span>الربط الذكي</span>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">تسجيل الدخول</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Store className="size-4" />
            اشترك الآن
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">
            <span className="text-gradient-amber">انضم إلى الربط الذكي</span>
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

        {/* Step 1: Plan selection */}
        {step === "plan" && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-8">اختر خطة تناسب مطعمك</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {plans.map((plan, i) => {
                const Icon = PLAN_ICONS[i] || Sparkles;
                const isSelected = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "relative flex flex-col rounded-2xl border-2 p-5 text-right transition-all duration-300 hover:scale-[1.02]",
                      isSelected
                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg shadow-amber-500/10"
                        : "border-border/30 hover:border-amber-200/30 bg-card/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -left-2 size-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                        <Check className="size-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "size-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg",
                      PLAN_GRADIENTS[i]
                    )}>
                      <Icon className="size-5 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{plan.nameAr}</h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold">{plan.price === 0 ? "مجاني" : plan.price}</span>
                      {plan.price > 0 && <span className="text-xs text-muted-foreground">د.ل/شهر</span>}
                    </div>
                    <div className="space-y-1.5 mb-4 flex-1">
                      {plan.features.slice(0, 4).map((f, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <Check className="size-3 text-emerald-500 shrink-0" />
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
                className="px-10 h-13 text-lg rounded-xl"
                disabled={!selectedPlan}
                onClick={() => setStep("form")}
              >
                {selectedPlan ? `اخترت ${plans.find(p => p.id === selectedPlan)?.nameAr}` : "اختر خطة أولاً"}
                <ArrowLeft className="mr-2 size-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Registration form */}
        {step === "form" && (
          <div className="animate-fade-in max-w-lg mx-auto">
            {/* Selected plan summary */}
            {currentPlan && (
              <div className={cn(
                "rounded-2xl p-5 mb-8 border-2 border-amber-200/30 bg-gradient-to-r from-amber-50/80 to-white dark:from-amber-950/20 dark:to-card",
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                      PLAN_GRADIENTS[plans.indexOf(currentPlan)]
                    )}>
                      {(() => { const Icon = PLAN_ICONS[plans.indexOf(currentPlan)] || Sparkles; return <Icon className="size-5 text-white" />; })()}
                    </div>
                    <div>
                      <p className="font-bold">{currentPlan.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        {currentPlan.price === 0 ? "مجاني" : `${currentPlan.price} د.ل/شهر`}
                        {" • "}
                        {currentPlan.maxItems === 9999 ? "أصناف غير محدودة" : `حتى ${currentPlan.maxItems} صنف`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep("plan")}>
                    تغيير
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* Restaurant name + slug */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم المطعم *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مقهى الواحة"
                    className="h-11 rounded-xl mt-1.5"
                  />
                </div>
                <div>
                  <Label>الرابط المختصر *</Label>
                  <div className="flex items-center mt-1.5">
                    <span className="text-xs text-muted-foreground bg-muted/50 h-11 px-3 rounded-r-xl border border-l-0 border-input flex items-center shrink-0">
                      /menu/
                    </span>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })}
                      placeholder="al-waha-cafe"
                      className="h-11 rounded-r-none rounded-l-xl text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>الوصف</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="مقهى ومطعم يقدم أشهى المشروبات..."
                  className="h-11 rounded-xl mt-1.5"
                />
              </div>

              {/* Phone + WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="218911111111"
                    className="h-11 rounded-xl mt-1.5 text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>رقم واتساب</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="218911111111"
                    className="h-11 rounded-xl mt-1.5 text-left"
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
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="admin"
                    className="h-11 rounded-xl mt-1.5 text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>كلمة المرور *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="أدخل كلمة المرور"
                    className="h-11 rounded-xl mt-1.5"
                  />
                </div>
              </div>

              {/* Summary */}
              {currentPlan && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-200/20 p-5 mt-6">
                  <h4 className="font-bold mb-3">ملخص الاشتراك</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخطة</span>
                      <span className="font-medium">{currentPlan.nameAr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">السعر</span>
                      <span className="font-medium">{currentPlan.price === 0 ? "مجاني" : `${currentPlan.price} د.ل/شهر`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحد الأقصى للأصناف</span>
                      <span className="font-medium">{currentPlan.maxItems === 9999 ? "غير محدود" : currentPlan.maxItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الطلبات</span>
                      <span className="font-medium">{currentPlan.maxOrders === 99999 ? "غير محدودة" : `حتى ${currentPlan.maxOrders}`}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-13 text-base font-semibold rounded-xl mt-4"
                size="lg"
                onClick={handleSubmit}
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
                <Link href="/" className="text-primary underline">شروط الخدمة</Link>
              </p>
            </div>
          </div>
        )}
      </div>
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
