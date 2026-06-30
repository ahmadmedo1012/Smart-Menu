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
  "from-orange to-orange/80",
  "from-orange to-orange/80",
  "from-gray-600 to-gray-800",
];
const PLAN_GLOWS = [
  "shadow-gray-400/20",
  "shadow-orange/25",
  "shadow-orange/30",
  "shadow-gray-600/25",
];
const PLAN_BADGES = ["", "الأكثر شعبية", "الأفضل قيمة", "للشركات الكبرى"];
const PLAN_BADGE_COLORS = [
  "",
  "bg-orange text-orange-foreground",
  "bg-gradient-to-r from-orange to-orange/80 text-orange-foreground",
  "bg-gradient-to-r from-gray-600 to-gray-800 text-white dark:text-white",
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
  const displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice;
  const periodLabel = plan.periodDays === 0 ? "" : yearly ? "/السنة" : "/الشهر";
  const isPopular = index === 1;
  const isFree = plan.price === 0;

  return (
    <div className={cn(
      "group relative flex flex-col rounded-sm border p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1",
      isPopular
        ? "border-orange/40 bg-card shadow-lg shadow-orange/15 dark:shadow-orange/10"
        : "border-border/50 bg-card hover:border-orange-muted/60 hover:shadow-lg hover:shadow-orange/10",
    )}>
      {PLAN_BADGES[index] && (
        <div className={cn("absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-sm text-xs font-bold shadow-lg", PLAN_BADGE_COLORS[index])}>
          {PLAN_BADGES[index]}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
        <div className="absolute -inset-full z-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:inset-0 transition-all duration-700 dark:via-white/10" />
      </div>

      {isPopular && (
        <div className="absolute bottom-0 inset-x-0 h-1/2 rounded-b-sm bg-gradient-to-t from-orange/5 to-transparent pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("size-11 rounded-sm bg-gradient-to-br flex items-center justify-center shadow-lg", PLAN_GRADIENTS[index], PLAN_GLOWS[index])}>
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">{plan.nameAr}</h3>
            <p className="text-xs text-muted-foreground">{plan.name}</p>
          </div>
        </div>

        <div className="mb-6">
          {isFree ? (
            <div className="text-3xl sm:text-4xl font-bold">مجاني</div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight">{toArabicNumber(displayPrice)}</span>
              <span className="text-sm sm:text-lg text-muted-foreground font-medium">د.ل</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</span>
            </div>
          )}
          {yearly && !isFree && (
            <p className="text-xs text-orange mt-1">وفر شهرين عند الاشتراك السنوي</p>
          )}
        </div>

        <div className="space-y-2 mb-6">
          {[
            ["المنيو", plan.maxMenus === 9999 ? "غير محدود" : toArabicNumber(plan.maxMenus)],
            ["الأصناف", plan.maxItems === 9999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxItems)}`],
            ["الطلبات", plan.maxOrders === 99999 ? "غير محدود" : `حتى ${toArabicNumber(plan.maxOrders)}`],
          ].map(([label, val]) => (
            <div key={label as string} className="flex items-center justify-between rounded-sm bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label as string}</span>
              <span className="font-semibold">{val as string}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature: string, i: number) => (
            <div key={i} className="flex items-start gap-3 text-sm transition-all duration-300 hover:translate-x-1">
              <div className="relative shrink-0 mt-0.5">
                <Check className="size-4 text-orange transition-all duration-300 group-hover/feature:scale-110" />
                <span className="absolute inset-0 size-4 rounded-full bg-orange/20 scale-0 group-hover/feature:scale-150 transition-transform duration-300" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Link href={isFree ? "/subscribe" : `/subscribe?plan=${plan.id}`}>
          <Button className={cn("w-full h-12", isPopular ? "bg-orange text-orange-foreground shadow-lg shadow-orange/25" : "")} variant={isPopular ? "orange" : "outline"}>
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <section className="relative pt-20 sm:pt-24 pb-12 sm:pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-10 size-48 sm:size-64 rounded-full bg-orange-muted blur-3xl" />
        <div className="absolute bottom-20 right-10 size-48 sm:size-80 rounded-full bg-orange/5 blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm bg-orange-muted text-orange text-sm mb-6">
            <Sparkles className="size-4" />
            خطط تناسب جميع الأحجام
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            اختر خطتك
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            ابدأ برفع منيو مطعمك رقمياً واختر الخطة التي تناسب احتياجاتك
          </p>

          <div className="inline-flex items-center mt-6 sm:mt-8 bg-muted/60 rounded-sm p-1 relative">
            <div className={cn("absolute inset-y-1 w-1/2 rounded-sm bg-background shadow-sm transition-all duration-300", yearly ? "translate-x-full" : "translate-x-0")} />
            <button type="button" onClick={() => setYearly(false)} className="relative z-10 px-5 sm:px-6 py-2 rounded-sm text-xs sm:text-sm font-medium transition-colors">
              شهري
            </button>
            <button type="button" onClick={() => setYearly(true)} className="relative z-10 px-5 sm:px-6 py-2 rounded-sm text-xs sm:text-sm font-medium transition-colors">
              سنوي —
              <span className="mr-1 text-xs text-orange font-bold">وفر شهرين</span>
            </button>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-orange" />
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
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto">
              {plans.slice(0, 2).map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} yearly={yearly} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">أسئلة شائعة</h2>
          <div className="space-y-3 sm:space-y-4">
            {[
              { q: "هل يمكنني الترقية لاحقاً؟", a: "نعم، يمكنك الترقية في أي وقت. سيتم احتساب الفرق بشكل تناسبي." },
              { q: "هل يوجد فترة تجريبية؟", a: "نعم، الخطة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت." },
              { q: "هل يمكنني إلغاء الاشتراك؟", a: "نعم، يمكنك إلغاء الاشتراك في أي وقت. يظل المنيو نشطاً حتى نهاية الفترة المدفوعة." },
              { q: "هل تدعمون جميع أنواع المطاعم؟", a: "نعم، المنصة تدير المطاعم والمقاهي والمخابز والمطاعم السيارة وجميع أنواع الخدمات الغذائية." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-sm border border-border/40 bg-card open:border-border/60 open:shadow-sm transition-all duration-300 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer text-sm sm:text-base font-medium list-none px-4 sm:px-5 py-3 sm:py-4">
                  {faq.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-300 text-xs">▼</span>
                </summary>
                <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-all duration-300">
                  <div className="overflow-hidden">
                    <p className="px-4 sm:px-5 pb-3 sm:pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="glass-strong rounded-sm p-6 sm:p-8 md:p-12 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-orange to-transparent rounded-full" />
            <div className="absolute -top-8 -right-8 size-24 sm:size-32 rounded-full bg-gradient-to-br from-orange/10 to-transparent blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 size-24 sm:size-28 rounded-full bg-gradient-to-tr from-orange/10 to-transparent blur-2xl pointer-events-none" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">مستعد لانطلاق مطعمك الرقمي؟</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
              ابدأ الآن مجاناً بدون بطاقة ائتمان
            </p>
            <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
              <Link href="/subscribe">
                <Button size="lg">ابدأ الآن مجاناً</Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline">جرب لوحة التحكم</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
