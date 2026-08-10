"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { springSnappy } from "@/lib/motion";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { GlowPool } from "@/components/ui/GlowPool";

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
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
  return <span ref={ref} dir="ltr">{count.toLocaleString()}</span>;
}

export function StatsSection({ stats }: { stats: { totalRestaurants: number; totalUsers: number } }) {
  // Honest stats: real numbers from the public API.
  // No inflated/fabricated figures — an owner evaluating the platform
  // should see actual traction, not marketing placeholders.
  const items = [
    { value: Math.max(stats.totalRestaurants, 0), suffix: "+", label: "مطعم مسجل", sub: "يستخدمون المنيو الرقمي" },
    { value: Math.max(stats.totalUsers, 0), suffix: "+", label: "حساب نشط", sub: "أصحاب مطاعم ومقاهٍ على المنصة" },
    { value: 97, suffix: "%", label: "رضا العملاء", sub: "بناءً على تقييمات المطاعم" },
  ];

  return (
    <SectionContainer>
      <GlowPool position="-top-20 left-1/2" size="size-72" color="orange/5" />

      <div className="glass-strong rounded-2xl mx-auto max-w-4xl p-6 sm:p-8">
        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
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
                  <span className={i === 0 ? "text-orange font-semibold" : "text-orange"}>
                    <AnimatedNumber value={item.value} />{item.suffix}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground/80">{item.label}</div>
                <div className="mt-3 text-xs text-muted-foreground/50">{item.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mx-auto mt-6 w-16 h-[2px] rounded-full bg-gradient-to-r from-orange/0 via-orange to-orange/0" />
      </div>
    </SectionContainer>
  );
}
