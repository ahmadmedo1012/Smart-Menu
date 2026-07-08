"use client"

import { motion } from "framer-motion"
import { STEPS } from "@/components/landing/landing-data"
import { springGentle, springSnappy } from "@/lib/motion"
import { Eyebrow } from "@/components/ui/Eyebrow"

export default function HowItWorksSection() {
  return (
    <section className="relative py-12 sm:py-16 overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute top-1/3 right-1/4 rtl:left-1/4 size-[50vmin] rounded-full bg-orange/4 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/4 rtl:right-1/4 size-[30vmin] rounded-full bg-orange/3 blur-[80px]" />

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springSnappy}
          >
            <Eyebrow>خطوات بسيطة</Eyebrow>
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springGentle, delay: 0.06 }}
            className="text-[1.8rem] sm:text-3xl md:text-[2.75rem] font-[520] leading-[1.2]"
          >
            ابدأ في ٣ خطوات فقط
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...springSnappy, delay: 0.15 }}
            className="text-sm text-muted-foreground/70 mt-3 max-w-lg mx-auto"
          >
            من التسجيل إلى استقبال الطلبات في دقائق
          </motion.p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 32, rotate: -3, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...springGentle, delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Icon container */}
              <div className="relative mb-4">
                <div className="absolute inset-0 size-18 sm:size-22 rounded-full bg-orange/10 blur-md group-hover:blur-lg transition-all duration-500" />
                <div className="relative size-18 sm:size-22 rounded-full bg-gradient-to-b from-orange/15 to-orange/5 border border-orange/20 flex items-center justify-center group-hover:border-orange/40 group-hover:scale-105 transition-all duration-500">
                  <step.icon className="size-6 sm:size-7 text-orange" />
                </div>

                {/* Step badge */}
                <div className="absolute -top-1 -right-1 size-6 rounded-full bg-gold text-white text-[0.6rem] font-bold flex items-center justify-center shadow-lg shadow-gold/40 animate-pulse-glow">
                  {i + 1}
                </div>

                {/* Connector line (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-[calc(50%+2.5rem)] rtl:left-auto rtl:right-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-[2px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange/40 to-transparent" />
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ ...springGentle, delay: 0.8 + i * 0.15 }}
                      className="absolute inset-0 bg-gradient-to-r from-orange/60 to-orange/10 origin-[left_center] rtl:origin-[right_center]"
                    />
                  </div>
                )}
              </div>

              {/* Diamond divider */}
              <motion.div
                initial={{ opacity: 0, rotate: 45 }}
                whileInView={{ opacity: 1, rotate: 45 }}
                viewport={{ once: true }}
                transition={{ ...springSnappy, delay: 0.25 + i * 0.15 }}
                className="size-1.5 bg-gold/40 rounded-sm mb-3"
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
