"use client";
import { BENEFITS } from "./landing-data";
import Reveal from "./Reveal";

export default function FeaturesSection() {
  if (BENEFITS.length === 0) return null;

  return (
    <section className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gold-muted/30 to-transparent dark:from-gold-muted/15" />
      <div className="relative max-w-6xl mx-auto px-4">
        <Reveal animation="animate-reveal" className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">لماذا الربط الذكي؟</h2>
          <p className="text-lg text-muted-foreground">كل ما يحتاجه مطعمك في منصة واحدة</p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {BENEFITS.slice(0, 4).map((f, i) => (
            <Reveal key={i} animation="animate-reveal" delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border/20 bg-card/50 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-gold-muted/60">
                <div className="flex items-start gap-5">
                  <div className="size-12 shrink-0 rounded-xl bg-gold-muted flex items-center justify-center">
                    <f.icon className="size-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.slice(4).map((f, i) => (
            <Reveal key={i} animation="animate-reveal" delay={0.32 + i * 0.08}>
              <div className="h-full rounded-xl border border-border/15 bg-card/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm hover:border-gold-muted/50">
                <div className="size-9 rounded-lg bg-gold-muted flex items-center justify-center mb-3">
                  <f.icon className="size-4.5 text-gold" />
                </div>
                <h3 className="text-sm font-bold mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
