"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Check, Sparkles, Star, Crown, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
        "group relative flex flex-col rounded-3xl border p-8 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1",
        isPopular
          ? "border-amber-400/60 bg-gradient-to-b from-amber-50/80 to-white shadow-2xl shadow-amber-500/20 dark:from-amber-950/20 dark:to-card dark:border-amber-400/40 hover:shadow-[0_0_30px_rgba(251,191,36,0.25)] hover:shadow-amber-500/30"
          : "border-border/50 bg-card/50 hover:border-amber-200/30 hover:shadow-xl hover:shadow-amber-500/10 hover:bg-card/80",
      )}
    >
      {/* Badge */}
      {PLAN_BADGES[index] && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-fade-in-down",
            PLAN_BADGE_COLORS[index],
            isPopular && "animate-pulse-glow-ring",
          )}
        >
          {PLAN_BADGES[index]}
        </div>
      )}

      {/* Shine effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
        <div className="absolute -inset-full z-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:inset-0 transition-all duration-700 dark:via-white/10" />
      </div>

      {/* Subtle bottom gradient glow for popular card */}
      {isPopular && (
        <div className="absolute bottom-0 inset-x-0 h-1/2 rounded-b-3xl bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
      )}

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
              <span className="text-4xl font-bold tracking-tight">{toArabicNumber(displayPrice)}</span>
              <span className="text-lg text-muted-foreground font-medium">د.ل</span>
              <span className="text-sm text-muted-foreground">{periodLabel}</span>
            </div>
          )}
          {yearly && !isFree && (
            <p className="text-xs text-primary mt-1">وفر شهرين عند الاشتراك السنوي</p>
          )}
        </div>

        {/* Limits */}
        <div className="space-y-2.5 mb-6">
          {[
            ["المنيو", plan.maxMenus === 9999 ? "غير محدود" : toArabicNumber(plan.maxMenus)],
            ["الأصناف", plan.maxItems === 9999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxItems)}`],
            ["الطلبات", plan.maxOrders === 99999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxOrders)}`],
          ].map(([label, val]) => (
            <div key={label as string} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label as string}</span>
              <span className="font-semibold">{val as string}</span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature: string, i: number) => (
            <div key={i} className="group/feature flex items-start gap-3 text-sm transition-all duration-300 hover:translate-x-1">
              <div className="relative shrink-0 mt-0.5">
                <Check className="size-4 text-primary transition-all duration-300 group-hover/feature:scale-110 group-hover/feature:text-primary/80" />
                <span className="absolute inset-0 size-4 rounded-full bg-primary/20 scale-0 group-hover/feature:scale-150 transition-transform duration-300" />
              </div>
              <span className="group-hover/feature:text-foreground/90 transition-colors duration-300">{feature}</span>
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

  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.data ?? d ?? []))
      .catch(() => setError("فشل تحميل الخطط"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-amber-50/20 to-background dark:via-amber-950/10">
      <Header />

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
            <span>اختر خطتك</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            ابدأ برفع منيو مطعمك رقمياً واختر الخطة التي تناسب احتياجاتك
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center mt-8 bg-muted/60 rounded-full p-1 relative">
            <div
              className={cn(
                "absolute inset-y-1 w-1/2 rounded-full bg-white dark:bg-card shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                yearly ? "translate-x-full" : "translate-x-0",
              )}
            />
            <button
              type="button"
              onClick={() => setYearly(false)}
              className="relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200"
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className="relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200"
            >
              سنوي
              <span className="mr-1.5 text-xs text-primary font-bold">وفر شهرين</span>
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
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
              <span>{error}</span>
              <Button variant="outline" onClick={loadPlans}>إعادة المحاولة</Button>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              لا توجد خطط متاحة حالياً
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {plans.slice(0, 2).map((plan, i) => (
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
            <span>أسئلة شائعة</span>
          </h2>
          <div className="space-y-4">
            {[
              { q: "هل يمكنني الترقية لاحقاً؟", a: "نعم، يمكنك الترقية في أي وقت. سيتم احتساب الفرق بشكل تناسبي." },
              { q: "هل يوجد فترة تجريبية؟", a: "نعم، الخطة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت." },
              { q: "هل يمكنني إلغاء الاشتراك؟", a: "نعم، يمكنك إلغاء الاشتراك في أي وقت. يظل المنيو نشطاً حتى نهاية الفترة المدفوعة." },
              { q: "هل تدعمون جميع أنواع المطاعم؟", a: "نعم، المنصة تدير المطاعم والمقاهي والمخابز والمطاعم السيارة وجميع أنواع الخدمات الغذائية." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-border/40 bg-card/50 open:bg-card/80 open:border-border/60 open:shadow-md transition-all duration-300 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer text-base font-medium list-none">
                  {faq.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-300">▼</span>
                </summary>
                <div className="animate-slide-down origin-top">
                  <p className="pt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="glass-strong rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span>مستعد لانطلاق مطعمك الرقمي؟</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              ابدأ الآن مجاناً بدون بطاقة ائتمان
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/subscribe">
                <Button size="lg" className="text-lg px-10 h-14 shadow-lg shadow-amber-500/20">
                  ابدأ الآن مجاناً
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="text-lg px-10 h-14 border-2">
                  جرب لوحة التحكم
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
