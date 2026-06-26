"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "./landing-data";
import { cn } from "@/lib/utils";

/** Pricing — editorial table, not card-grid. One plan per row, focus on contrast. */
export default function PricingSection() {
  if (PRICING_PLANS.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Clean surface */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold-muted/20 via-background to-background" />

      <div className="relative max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] as const }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/15 rounded-full">
            خطط و أسعار
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            اختر خطتك
            <br />
            <span className="text-gold">وابدأ فوراً</span>
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-4">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: plan.popular ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                ease: [0.19, 1, 0.22, 1] as const,
              }}
            >
              <div
                className={cn(
                  "relative rounded-2xl border p-6 md:p-8 transition-all duration-500 hover:shadow-lg",
                  plan.popular
                    ? "border-gold/40 bg-card shadow-xl shadow-gold/10"
                    : "border-border/20 bg-card/40 hover:border-gold/20 hover:bg-card/60",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 start-6 px-4 py-1 rounded-full bg-gold text-gold-foreground text-[11px] font-semibold shadow-lg">
                    الأكثر شعبية
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  {/* Plan info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">
                        د.ل / {plan.period}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {plan.features.map((f, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <Check className="size-3.5 text-gold shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    <Link href="/pricing">
                      <Button
                        className={cn(
                          "w-full md:w-auto h-11 rounded-xl px-8",
                          plan.popular &&
                            "bg-gold text-gold-foreground hover:opacity-90 shadow-lg shadow-gold/25",
                        )}
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
