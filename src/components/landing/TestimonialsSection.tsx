"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { TESTIMONIALS } from "./landing-data";

/** Testimonials — editorial quote cards with accent borders, not uniform cards */
export default function TestimonialsSection() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Subtle ambient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold-muted/[0.02] to-muted/10" />

      <div className="relative max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] as const }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/15 rounded-full">
            آراء الشركاء
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            ماذا يقولون
            <br />
            <span className="text-gold">عن Smart Menu؟</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t, i) => {
            const borderSide = i % 3 === 0 ? "start" : i % 3 === 1 ? "end" : "top";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 1,
                  delay: i * 0.15,
                  ease: [0.19, 1, 0.22, 1] as const,
                }}
              >
                <div
                  className={`relative flex flex-col h-full bg-card/30 p-7 md:p-8 rounded-2xl border border-border/15 transition-all duration-500 hover:shadow-lg hover:bg-card/50
                    ${borderSide === "start" ? "border-s-2 border-s-gold/40" : ""}
                    ${borderSide === "end" ? "border-e-2 border-e-gold/40" : ""}
                    ${borderSide === "top" ? "border-t-2 border-t-gold/40" : ""}
                  `}
                >
                  {/* Quote decoration */}
                  <div className="text-5xl leading-none text-gold/15 select-none mb-2">
                    &ldquo;
                  </div>

                  <p className="text-sm text-foreground/80 leading-relaxed mb-6 flex-1">
                    {t.content}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border/10">
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
