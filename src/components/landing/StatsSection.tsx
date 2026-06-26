"use client";
import { motion } from "framer-motion";
import type { PublicStats } from "./landing-data";
import { Store, Users } from "lucide-react";
import CountUp from "./CountUp";

/** Stats — oversized counter display with gold icon bezels, animated count-up */
export default function StatsSection({ stats }: { stats: PublicStats }) {
  const items = [
    { icon: Store, value: stats.totalRestaurants, suffix: "+", label: "مطعم ومقهى", decimals: 0 },
    { icon: Users, value: stats.totalUsers, suffix: "+", label: "مستخدم", decimals: 0 },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold-muted/40 via-background to-gold-muted/20" />
      <div className="absolute top-0 left-1/2 size-[40vw] rounded-full bg-gold/[0.03] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/2 size-[40vw] rounded-full bg-gold/[0.02] blur-[140px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] as const }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-gold border border-gold/20 rounded-full">
            بأرقام
          </span>
        </motion.div>

        <div className="grid grid-cols-2 gap-10 md:gap-20 max-w-xl mx-auto">
          {items.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                ease: [0.19, 1, 0.22, 1] as const,
              }}
              className="text-center"
            >
              {/* Double-bezel icon container */}
              <div className="inline-flex p-[1px] rounded-2xl bg-gradient-to-b from-gold/20 to-gold/5 mb-5">
                <div className="flex items-center justify-center size-14 rounded-[calc(1rem-1px)] bg-gradient-to-b from-gold-muted to-gold-muted/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                  <s.icon className="size-6 text-gold" />
                </div>
              </div>

              {/* Counter */}
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-2 tracking-tight">
                <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>

              {/* Label */}
              <div className="text-sm md:text-base text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
