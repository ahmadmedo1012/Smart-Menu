"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "./landing-data";
import { cn } from "@/lib/utils";
import { fadeUp } from "./animations";

/** Pricing — horizontal premium cards, double-bezel for the popular plan. */
export default function PricingSection() {
  if (PRICING_PLANS.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-b from-gold-muted/20 via-background to-background" />

      <div className="relative max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div
          {...fadeUp(0)}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/15 rounded-full">
            خطط و أسعار
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            اختر خطتك
            <br />
            <span className="text-gold">وابدأ فوراً</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              {...fadeUp(0.15 + i * 0.2)}
              className={cn(
                "flex",
                plan.popular && "md:-mt-4 md:mb-4 md:scale-[1.04] z-10",
              )}
            >
              <div
                className={cn(
                  "relative w-full rounded-[--radius-squircle,2rem] p-8 flex flex-col transition-all duration-500",
                  plan.popular
                    ? "double-bezel border border-gold/30 shadow-xl shadow-gold/10"
                    : "border border-border/20 bg-card/40 hover:border-gold/20 hover:bg-card/60 shadow-sm",
                )}
              >
                {/* Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gold text-gold-foreground text-[11px] font-semibold shadow-lg whitespace-nowrap">
                    الأكثر شعبية
                  </div>
                )}

                {/* Plan name & price */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">
                      د.ل / {plan.period}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/10">
                        <Check className="size-3 text-gold" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/pricing">
                  <Button
                    variant={plan.popular ? "gradient" : "gradient-outline"}
                    size="lg"
                    className="w-full h-12 rounded-xl text-sm font-semibold"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
