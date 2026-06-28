"use client"

import { motion } from "framer-motion"
import { STEPS } from "@/components/landing/landing-data"

const EASE: [number, number, number, number] = [0.16, 1, 0.2, 1]

export default function HowItWorksSection() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 -translate-y-1/2 size-[50vmin] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3.5 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase mb-5"
          >
            خطوات بسيطة
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="text-[1.6rem] sm:text-3xl md:text-[2.5rem] font-[520] leading-[1.2] tracking-[-0.02em]"
          >
            ابدأ في ٣ خطوات فقط
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
            className="text-sm text-muted-foreground/70 mt-4 max-w-lg mx-auto"
          >
            من التسجيل إلى استقبال الطلبات في دقائق
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: EASE }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number circle */}
              <div className="relative mb-6">
                <div className="size-16 sm:size-20 rounded-full bg-orange/10 border border-orange/20 flex items-center justify-center">
                  <step.icon className="size-7 sm:size-8 text-orange" />
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-[calc(100%+1.5rem)] h-[1px] -translate-y-1/2 bg-gradient-to-r from-orange/30 to-transparent" />
                )}
              </div>

              {/* Step label */}
              <span className="inline-flex items-center justify-center size-6 rounded-full bg-orange text-white text-[0.65rem] font-bold mb-3">
                {i + 1}
              </span>

              <h3 className="text-lg sm:text-xl font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-[30ch]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
