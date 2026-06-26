"use client";
import { motion } from "framer-motion";
import type { PublicStats } from "./landing-data";
import { Store, Users } from "lucide-react";
import CountUp from "./CountUp";

export default function StatsSection({ stats }: { stats: PublicStats }) {
  const items = [
    { icon: Store, value: stats.totalRestaurants, suffix: "+", label: "مطعم ومقهى", decimals: 0 },
    { icon: Users, value: stats.totalUsers, suffix: "+", label: "مستخدم", decimals: 0 },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gold-muted/60 to-background">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
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
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-gold-muted mb-3 mx-auto">
                <s.icon className="size-5 text-gold" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
