"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { TESTIMONIALS } from "./landing-data";
import { fadeUp } from "./animations";

/** Testimonials — editorial quote cards with accent borders, double-bezel architecture */
export default function TestimonialsSection() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Ambient warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold-muted/[0.03] to-muted/10" />
      <div className="absolute top-1/3 start-1/2 size-[50vw] rounded-full bg-gold/[0.02] blur-[160px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Section header */}
        <motion.div {...fadeUp(0)} className="text-center mb-16 md:mb-20">
          <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase mb-5 text-gold border border-gold/20 rounded-full">
            آراء الشركاء
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            ماذا يقولون
            <br />
            <span className="text-gold">عن Smart Menu؟</span>
          </h2>
        </motion.div>

        {/* Cards grid — asymmetric emphasis: first card wider */}
        <div className="grid md:grid-cols-12 gap-5 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t, i) => {
            const borderSide = i % 3 === 0 ? "start" : i % 3 === 1 ? "end" : "top";
            const colSpan = i === 0 ? "md:col-span-4" : "md:col-span-4";

            return (
              <motion.div
                key={i}
                {...fadeUp(i * 0.15)}
                className={colSpan}
              >
                {/* Double-bezel: outer shell */}
                <div className="p-[1px] rounded-2xl bg-gradient-to-b from-gold/10 to-gold/5">
                  {/* Inner core */}
                  <div
                    className={`relative flex flex-col h-full bg-card/40 p-7 md:p-8 rounded-[calc(1rem-1px)] transition-all duration-500
                      ${borderSide === "start" ? "border-s-2 border-s-gold/50" : ""}
                      ${borderSide === "end" ? "border-e-2 border-e-gold/50" : ""}
                      ${borderSide === "top" ? "border-t-2 border-t-gold/50" : ""}
                      shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]
                    `}
                  >
                    {/* Quote ornament */}
                    <div className="text-6xl leading-none text-gold/20 select-none mb-2 font-serif">
                      &ldquo;
                    </div>

                    <p className="text-sm text-foreground/80 leading-relaxed mb-6 flex-1">
                      {t.content}
                    </p>

                    {/* Author row */}
                    <div className="flex items-center justify-between pt-4 border-t border-gold/10">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-gold/15 flex items-center justify-center text-gold text-sm font-bold shrink-0 ring-1 ring-gold/20">
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
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
