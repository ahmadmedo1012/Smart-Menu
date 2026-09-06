"use client"

import { m } from "motion/react"
import { STEPS } from "@/components/landing/landing-data"
import { springGentle, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

export function HowItWorksSection() {
  return (
    <SectionContainer tone="alt">
      <ScrollReveal y={20}>
        <SectionHeader align="start" title="من التسجيل إلى أول طلب" subtitle="ثلاث خطوات واضحة، ثم تدير كل شيء من لوحة واحدة." />
      </ScrollReveal>

      {/* Steps grid */}
      <div className="grid md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {STEPS.map((step, i) => (
          <ScrollReveal key={step.title} y={24} delay={i * 80}>
            <m.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...springGentle, delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Icon container */}
              <div className="relative mb-4">
                <div className="absolute inset-0 size-18 sm:size-22 rounded-full bg-orange/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative size-18 sm:size-22 rounded-full bg-orange/10 border border-orange/30 flex items-center justify-center group-hover:border-orange/60 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-orange/15 transition-[border-color,transform,translate,scale,rotate,box-shadow] duration-300">
                  <step.icon className="size-6 sm:size-7 text-orange" />
                </div>

                {/* Step badge */}
                <div className="absolute -top-1 -end-1 size-6 rounded-full bg-orange text-orange-foreground text-[0.6rem] font-bold flex items-center justify-center shadow-md shadow-orange/25">
                  {i + 1}
                </div>

                {/* Connector line (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-[calc(50%+2.5rem)] rtl:left-auto rtl:right-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-[2px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange/40 to-transparent" />
                    <m.div
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
              <m.div
                initial={{ opacity: 0, rotate: 45 }}
                whileInView={{ opacity: 1, rotate: 45 }}
                viewport={{ once: true }}
                transition={{ ...springSnappy, delay: 0.25 + i * 0.15 }}
                className="size-1.5 bg-orange/40 rounded-sm mb-3"
              />

              <h3 className="text-lg font-medium mb-1.5 group-hover:text-orange transition-colors duration-300">{step.title}</h3>
              <p className="text-sm text-muted-foreground/95 leading-relaxed max-w-[30ch]">{step.desc}</p>
            </m.div>
          </ScrollReveal>
        ))}
      </div>
    </SectionContainer>
  )
}
