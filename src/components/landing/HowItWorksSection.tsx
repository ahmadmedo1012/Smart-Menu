"use client";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { STEPS } from "./landing-data";
import { fadeUp } from "./animations";

/** How It Works — 3-step visual with gold step numbering, icon boxes, connector lines */
export default function HowItWorksSection() {
  if (STEPS.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Ambient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-gold-muted/[0.02]" />
      <div className="absolute bottom-0 start-0 size-[40vw] rounded-full bg-gold/[0.02] blur-[140px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Section header */}
        <motion.div {...fadeUp(0)} className="text-center mb-16 md:mb-20">
          <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase mb-5 text-gold border border-gold/20 rounded-full">
            كيف يعمل
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance mb-3">
            انطلق في
            <br />
            <span className="text-gold">ثلاث خطوات</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
            من التسجيل إلى أول طلب — في دقائق
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Desktop connector line */}
          <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {STEPS.map((step, i) => (
              <motion.div {...fadeUp(i * 0.25)}>
                <div className="text-center">
                  {/* Step number badge */}
                  <div className="relative mb-5 inline-flex">
                    {/* Outer shell */}
                    <div className="p-[1.5px] rounded-2xl bg-gradient-to-b from-gold/30 to-gold/10">
                      {/* Inner core */}
                      <div className="size-16 rounded-[calc(1rem-1.5px)] bg-gradient-to-b from-gold to-gold/90 flex items-center justify-center shadow-xl shadow-gold/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                        <step.icon className="size-7 text-gold-foreground" />
                      </div>
                    </div>

                    {/* Step numeral */}
                    <div className="absolute -top-2 -end-2 size-6 rounded-full bg-background border border-gold/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gold">{i + 1}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>

                  {/* Arrow connector (mobile only, between steps) */}
                  {i < STEPS.length - 1 && (
                    <div className="md:hidden mt-6 flex justify-center">
                      <ArrowLeft className="size-5 text-gold/40" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
