"use client"

import { m } from "motion/react"
import { STEPS } from "@/components/landing/landing-data"
import { springGentle } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toArabicNumber } from "@/lib/format"

export function HowItWorksSection() {
  return (
    <SectionContainer tone="alt">
      <ScrollReveal y={20}>
        {/* r95: الإيقاع الموحد — رأس مركزي + فاصل متدرج (SectionHeader) */}
        <SectionHeader title="من التسجيل إلى أول طلب" subtitle="ثلاث خطوات واضحة، ثم تدير كل شيء من لوحة واحدة." />
      </ScrollReveal>

      {/* r95: SmartBot twin steps — دوائر متوهجة + خط واصل واحد بمستوى القسم */}
      <div className="relative">
        {/* Connector line (lg only) — يمتد بين مركزي الدائرتين الأولى والثالثة
            (16.67% ≈ مركز العمود في شبكة الثلاثة أعمدة) ويختفي خلف الدوائر */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-16 start-[calc(16.67%+2rem)] end-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-accent-foreground/30 to-transparent"
        />

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
                {/* r95: دائرة الخطوة (§5.5) — توهج خلفي + جسم متدرج + شارة رقم */}
                <div className="relative mb-6">
                  {/* Glow behind */}
                  <div className="absolute inset-0 size-16 rounded-full bg-accent-foreground/20 blur-xl group-hover:blur-2xl group-hover:bg-accent-foreground/30 transition-all duration-cinema" />
                  {/* Circle body */}
                  <div className="relative size-16 rounded-full bg-gradient-to-b from-accent-foreground/25 to-accent-foreground/10 border border-accent-foreground/30 flex items-center justify-center group-hover:border-accent-foreground/50 group-hover:scale-105 transition-all duration-slower shadow-lg shadow-accent-foreground/10">
                    <step.icon className="size-6 text-accent-foreground" />
                  </div>

                  {/* Step badge — bg-primary صلب (§5.5) */}
                  <div className="absolute -top-2 -end-2 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <span className="text-3xs font-bold">
                      {/* r93-W2a policy: أرقام غربية متسقة عبر toArabicNumber */}
                      {toArabicNumber(i + 1)}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-accent-foreground transition-colors duration-base">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[32ch]">{step.desc}</p>
              </m.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}
