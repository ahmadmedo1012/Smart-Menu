"use client";
import Link from "next/link";
import { Check, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "./landing-data";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

export default function PricingSection() {
  if (PRICING_PLANS.length === 0) return null;

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <Reveal animation="animate-scale-in" className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">خطط تناسب الجميع</h2>
          <p className="text-lg text-muted-foreground">ابدأ مجاناً وطور مطعمك تدريجياً</p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {PRICING_PLANS.map((plan, i) => (
            <Reveal key={i} animation="animate-scale-in" delay={i * 0.15}>
              <div
                className={cn(
                  "relative flex flex-col rounded-3xl border p-8 transition-all duration-500",
                  plan.popular
                    ? "border-gold/40 bg-card shadow-2xl shadow-gold/15 dark:border-gold/30"
                    : "border-border/20 bg-card/40 hover:shadow-xl",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gold text-gold-foreground text-[11px] font-semibold shadow-lg">
                    الأكثر شعبية
                  </div>
                )}
                <div className="size-10 rounded-xl bg-gold-muted flex items-center justify-center mb-4">
                  <Store className="size-5 text-gold" />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">د.ل / {plan.period}</span>
                </div>
                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-4 text-gold shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/pricing">
                  <Button
                    className={cn(
                      "w-full h-12 rounded-xl text-base",
                      plan.popular && "bg-gold text-gold-foreground hover:opacity-90 shadow-lg shadow-gold/25",
                    )}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
