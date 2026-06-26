"use client";
import { STEPS } from "./landing-data";
import Reveal from "./Reveal";

export default function HowItWorksSection() {
  if (STEPS.length === 0) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-6xl mx-auto px-4">
        <Reveal animation="animate-reveal" className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">انطلق في ثلاث خطوات</h2>
          <p className="text-lg text-muted-foreground">من التسجيل إلى أول طلب في دقائق</p>
        </Reveal>

        <div className="relative max-w-4xl mx-auto">
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-gold/60 via-gold/30 to-gold/60" />
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={i} animation="animate-reveal" delay={i * 0.2}>
                <div className="text-center">
                  <div className="relative mb-5 inline-flex">
                    <div className="size-16 rounded-2xl bg-gold flex items-center justify-center mx-auto shadow-xl shadow-gold/20">
                      <step.icon className="size-7 text-gold-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
