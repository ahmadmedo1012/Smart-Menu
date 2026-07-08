"use client"

import { motion } from "framer-motion"
import { STEPS } from "@/components/landing/landing-data"
import { springGentle, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { GlowPool } from "@/components/ui/GlowPool"

export default function HowItWorksSection() {
  return (
    <SectionContainer>
      <GlowPool position="top-1/3 right-1/4 rtl:left-1/4" size="size-[50vmin]" color="orange/4" />
      <GlowPool position="bottom-1/3 left-1/4 rtl:right-1/4" size="size-[30vmin]" color="orange/3" />

      <SectionHeader eyebrow="خطوات بسيطة" title="ابدأ في ٣ خطوات فقط" subtitle="من التسجيل إلى استقبال الطلبات في دقائق" />

      {/* Steps grid */}
      <div className="grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 32, rotate: -3, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            viewport={{ once: false, margin: "-60px" }}
            transition={{ ...springGentle, delay: i * 0.15 }}
            className="relative flex flex-col items-center text-center group"
          >
            {/* Icon container */}
            <div className="relative mb-4">
              <div className="absolute inset-0 size-18 sm:size-22 rounded-full bg-orange/10 blur-md group-hover:blur-lg transition-colors duration-500" />
              <div className="relative size-18 sm:size-22 rounded-full bg-gradient-to-b from-orange/15 to-orange/5 border border-orange/20 flex items-center justify-center group-hover:border-orange/40 group-hover:scale-105 transition-colors duration-500">
                <step.icon className="size-6 sm:size-7 text-orange" />
              </div>

              {/* Step badge */}
              <div className="absolute -top-1 -right-1 size-6 rounded-full bg-gold text-gold-foreground text-[0.6rem] font-bold flex items-center justify-center shadow-lg shadow-gold/40 animate-pulse-glow">
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
    </SectionContainer>
  )
}
