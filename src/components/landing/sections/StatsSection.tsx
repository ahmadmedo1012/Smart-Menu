"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { springSnappy } from "@/lib/motion";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { toArabicNumber } from '@/lib/format';

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  // Start counting immediately; the section is below the fold so we don't
  // want to wait for an in-view trigger that may never fire on short pages.
  useEffect(() => {
    if (value <= 0) return;
    const step = Math.max(1, Math.ceil(value / 30));
    const timer = setInterval(() => {
      setCount(prev => Math.min(prev + step, value));
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{toArabicNumber(count)}</span>;
}

export function StatsSection({ stats }: { stats: { totalRestaurants: number; totalUsers: number } }) {
  // Honest stats: real numbers from the public API.
  // No inflated/fabricated figures — an owner evaluating the platform
  // should see actual traction, not marketing placeholders.
  const items = [
    { value: Math.max(stats.totalRestaurants, 0), suffix: "+", label: "مطعم مسجل", sub: "يستخدمون المنيو الرقمي" },
    { value: Math.max(stats.totalUsers, 0), suffix: "+", label: "حساب نشط", sub: "أصحاب مطاعم ومقاهٍ على المنصة" },
  ];

  return (
    <SectionContainer tone="alt">
      <ScrollReveal y={24}>
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-md backdrop-blur-md sm:p-8">
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6">
            {items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...springSnappy, delay: i * 0.1 }}
              >
                <div className="text-center">
                  <div className="text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-bold leading-none mb-2">
                    <span className="text-orange">
                      <AnimatedNumber value={item.value} />{item.suffix}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground/95">{item.label}</div>
                  {/* a11y(round84): /75 alpha dropped contrast below 4.5:1 on the
                  section wash bg — full muted-foreground keeps the hierarchy
                  (smaller size + muted hue) while passing AA. */}
              <div className="mt-3 text-xs text-muted-foreground">{item.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mx-auto mt-6 h-px w-16 bg-orange/60" />
        </div>
      </ScrollReveal>
    </SectionContainer>
  );
}
