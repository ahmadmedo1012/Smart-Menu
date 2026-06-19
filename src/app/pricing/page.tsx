"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, ArrowLeft, Sparkles, Star, Crown, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";

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
const PLAN_GLOWS = [
  "shadow-gray-400/20",
  "shadow-amber-500/25",
  "shadow-amber-500/30",
  "shadow-purple-500/25",
];
const PLAN_BADGES = ["", "الأكثر شعبية", "الأفضل قيمة", "للشركات الكبرى"];
const PLAN_BADGE_COLORS = [
  "",
  "bg-amber-500 text-white",
  "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
  "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
];

function PlanCard({
  plan,
  index,
  yearly,
}: {
  plan: Plan;
  index: number;
  yearly: boolean;
}) {
  const Icon = PLAN_ICONS[index] || Sparkles;
  const monthlyPrice = plan.price;
  const displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice; // 2 months free yearly
  const periodLabel = plan.periodDays === 0 ? "" : yearly ? "/السنة" : "/الشهر";
  const isPopular = index === 1;
  const isFree = plan.price === 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-3xl border p-8 transition-all duration-500 hover:scale-[1.02]",
        isPopular
          ? "border-amber-300/50 bg-gradient-to-b from-amber-50/80 to-white shadow-xl shadow-amber-500/10 dark:from-amber-950/20 dark:to-card dark:border-amber-500/30"
          : "border-border/50 bg-card/50 hover:border-amber-200/30 hover:shadow-lg hover:shadow-amber-500/5",
      )}
    >
      {/* Badge */}
      {PLAN_BADGES[index] && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold shadow-lg",
            PLAN_BADGE_COLORS[index],
          )}
        >
          {PLAN_BADGES[index]}
        </div>
      )}

      {/* Shine effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden">
        <div className="absolute -inset-full z-0 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:inset-0 transition-all duration-700 dark:via-white/5" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Icon + Name */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              "size-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
              PLAN_GRADIENTS[index],
              PLAN_GLOWS[index],
            )}
          >
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{plan.nameAr}</h3>
            <p className="text-xs text-muted-foreground">{plan.name}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          {isFree ? (
            <div className="text-4xl font-bold">مجاني</div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{toArabicNumber(displayPrice)}</span>
              <span className="text-lg text-muted-foreground">د.ل</span>
              <span className="text-sm text-muted-foreground">{periodLabel}</span>
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="space-y-2 mb-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المنيو</span>
            <span className="font-medium">{plan.maxMenus === 9999 ? "غير محدود" : `${plan.maxMenus}`}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الأصناف</span>
            <span className="font-medium">{plan.maxItems === 9999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxItems)}`}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الطلبات</span>
            <span className="font-medium">{plan.maxOrders === 99999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxOrders)}`}</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature: string, i: number) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link href={isFree ? "/subscribe" : `/subscribe?plan=${plan.id}`}>
          <Button
            className={cn(
              "w-full h-12 rounded-xl text-base font-semibold transition-all duration-300",
              isPopular
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
                : "",
            )}
            variant={isPopular ? "default" : "outline"}
          >
            {isFree ? "ابدأ مجاناً" : "اشترك الآن"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.data ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-amber-50/20 to-background dark:via-amber-950/10">
      {/* Nav */}
      <nav className="sticky top-0 z-50 h-16 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <ArrowLeft className="size-4" />
            <span>الربط الذكي</span>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">لوحة التحكم</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-10 size-64 rounded-full bg-amber-500/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 size-80 rounded-full bg-primary/5 blur-3xl animate-float-delayed" />

        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="size-4" />
            خطط تناسب جميع الأحجام
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-gradient-amber">اختر خطتك</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            ابدأ برفع منيو مطعمك رقمياً واختر الخطة التي تناسب احتياجاتك
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 mt-8 bg-muted/60 rounded-full p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                !yearly && "bg-white dark:bg-card shadow-sm",
              )}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                yearly && "bg-white dark:bg-card shadow-sm",
              )}
            >
              سنوي
              <span className="mr-1.5 text-xs text-emerald-500 font-bold">وفر شهرين</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              لا توجد خطط متاحة حالياً
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-2 max-w-2xl gap-6">
              {plans.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} yearly={yearly} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            <span className="text-gradient">أسئلة شائعة</span>
          </h2>
          <div className="space-y-4">
            {[
              { q: "هل يمكنني الترقية لاحقاً؟", a: "نعم، يمكنك الترقية في أي وقت. سيتم احتساب الفرق بشكل تناسبي." },
              { q: "هل يوجد فترة تجريبية؟", a: "نعم، الخطة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت." },
              { q: "هل يمكنني إلغاء الاشتراك؟", a: "نعم، يمكنك إلغاء الاشتراك في أي وقت. يظل المنيو نشطاً حتى نهاية الفترة المدفوعة." },
              { q: "هل تدعمون جميع أنواع المطاعم؟", a: "نعم، المنصة تدير المطاعم والمقاهي والمخابز والمطاعم السيارة وجميع أنواع الخدمات الغذائية." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-border/40 bg-card/50 p-5 open:shadow-md transition-all duration-300">
                <summary className="flex items-center justify-between cursor-pointer text-base font-medium list-none">
                  {faq.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-300">▼</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="glass-strong rounded-3xl p-12">
            <h2 className="text-3xl font-bold mb-4">
              <span className="text-gradient">مستعد لانطلاق مطعمك الرقمي؟</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              ابدأ الآن مجاناً بدون بطاقة ائتمان
            </p>
            <div className="flex gap-3 justify-center">
            <Link href="/subscribe">
              <Button size="lg" className="text-lg px-10 h-13 animate-pulse-glow">
                ابدأ الآن مجاناً
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-10 h-13 border-2">
                جرب لوحة التحكم
              </Button>
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — الربط الذكي</p>
      </footer>
    </div>
  );
}
