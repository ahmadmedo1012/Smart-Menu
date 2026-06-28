"use client"

import { motion } from "framer-motion"
import { STEPS } from "@/components/landing/landing-data"

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

export default function HowItWorksSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute top-1/3 right-1/4 size-[50vmin] rounded-full bg-orange/4 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/4 size-[30vmin] rounded-full bg-orange/3 blur-[80px]" />

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-4 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase mb-5"
          >
            خطوات بسيطة
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="text-[1.8rem] sm:text-3xl md:text-[2.75rem] font-[520] leading-[1.2] tracking-[-0.02em]"
          >
            ابدأ في ٣ خطوات فقط
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
            className="text-sm text-muted-foreground/70 mt-3 max-w-lg mx-auto"
          >
            من التسجيل إلى استقبال الطلبات في دقائق
          </motion.p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8 sm:gap-12 md:gap-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: EASE }}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Icon container — compressed spacing */}
              <div className="relative mb-4">
                <div className="absolute inset-0 size-14 sm:size-16 rounded-full bg-orange/10 blur-md group-hover:blur-lg transition-all duration-500" />
                <div className="relative size-14 sm:size-16 rounded-full bg-gradient-to-b from-orange/15 to-orange/5 border border-orange/20 flex items-center justify-center group-hover:border-orange/40 group-hover:scale-105 transition-all duration-500">
                  <step.icon className="size-6 sm:size-7 text-orange" />
                </div>

                {/* Step badge */}
                <div className="absolute -top-1 -right-1 size-5 rounded-full bg-orange text-white text-[0.55rem] font-bold flex items-center justify-center shadow-md shadow-orange/30">
                  {i + 1}
                </div>

                {/* Connector line (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-[1px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange/40 to-transparent" />
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.8 + i * 0.15, ease: EASE }}
                      className="absolute inset-0 bg-gradient-to-r from-orange/60 to-orange/10 origin-left"
                      style={{ transformOrigin: "left center" }}
                    />
                  </div>
                )}
              </div>

              {/* Diamond divider — tighter */}
              <motion.div
                initial={{ opacity: 0, rotate: 45 }}
                whileInView={{ opacity: 1, rotate: 45 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.15, ease: EASE }}
                className="size-1.5 bg-orange/40 rounded-sm mb-3"
              />

              <h3 className="text-base sm:text-lg font-medium mb-1.5 group-hover:text-orange transition-colors duration-300">{step.title}</h3>
              <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-[30ch]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
