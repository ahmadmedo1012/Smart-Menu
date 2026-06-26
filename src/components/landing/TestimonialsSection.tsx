"use client";
import { Star } from "lucide-react";
import { TESTIMONIALS } from "./landing-data";
import Reveal from "./Reveal";

export default function TestimonialsSection() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/15">
      <div className="max-w-6xl mx-auto px-4">
        <Reveal animation="animate-reveal" className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">آراء الشركاء</h2>
          <p className="text-lg text-muted-foreground">كلمات من أصحاب المطاعم والمقاهي</p>
        </Reveal>

        <Reveal animation="animate-reveal" delay={0.08} className="mb-5">
          <div className="rounded-2xl border border-border/20 bg-card/50 p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="size-14 rounded-full bg-gold-muted flex items-center justify-center text-gold text-lg font-bold shrink-0 shadow-lg">
                {TESTIMONIALS[0].name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-base text-foreground/80 leading-relaxed mb-5">{TESTIMONIALS[0].content}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{TESTIMONIALS[0].name}</p>
                    <p className="text-sm text-muted-foreground">{TESTIMONIALS[0].role}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(Math.floor(TESTIMONIALS[0].rating))].map((_, j) => (
                      <Star key={j} className="size-4 fill-gold text-gold" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.slice(1).map((t, i) => (
            <Reveal key={i} animation="animate-reveal" delay={0.08 + i * 0.12}>
              <div className="rounded-2xl border border-border/20 bg-card/40 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <p className="text-sm text-foreground/80 leading-relaxed mb-5 flex-1">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-center justify-between pt-4 border-t border-border/15">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gold-muted flex items-center justify-center text-gold text-sm font-bold shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(Math.floor(t.rating))].map((_, j) => (
                      <Star key={j} className="size-3.5 fill-gold text-gold" />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
