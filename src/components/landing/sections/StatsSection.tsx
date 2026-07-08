"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { springGentle, springSnappy } from "@/lib/motion";

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (inView) {
      const timer = setInterval(() => {
        setCount(prev => Math.min(prev + Math.ceil(value / 30), value));
      }, 30);
      return () => clearInterval(timer);
    }
  }, [inView, value]);
  return <span ref={ref} dir="ltr">{count.toLocaleString()}</span>;
}

export default function StatsSection({ stats }: { stats: { totalRestaurants: number } }) {
  const items = [
    { value: Math.max(stats.totalRestaurants, 500), suffix: "+", label: "مطعم مسجل", sub: "ينضمون إلينا شهرياً" },
    { value: 10000, suffix: "+", label: "طلب يومياً", sub: "يتم إدارتها عبر المنصة" },
    { value: 98, suffix: "%", label: "رضا العملاء", sub: "بناءً على آلاف التقييمات" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={springGentle}
    >
      <section className="relative py-12 sm:py-16 text-center overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-72 rounded-full bg-orange/5 blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-[1220px] mx-auto px-4">
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...springSnappy, delay: i * 0.1 }}
              >
                <div className="group rounded-sm bg-card border border-border/50 p-4 md:p-6 lg:p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300">
                  <div className="text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-[520] text-orange leading-none mb-2">
                    <AnimatedNumber value={item.value} />{item.suffix}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground/80">{item.label}</div>
                  <div className="mt-3 text-[0.6rem] text-muted-foreground/40">{item.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
