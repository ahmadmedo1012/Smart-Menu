"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { BENEFITS } from "./landing-data";

const colSpan = [
  "md:col-span-2 md:row-span-2",
  "md:col-span-1",
  "md:col-span-1",
  "md:col-span-1",
  "md:col-span-1",
  "md:col-span-1",
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] },
  },
};

export default function DisplayCards() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" dir="rtl">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.02] via-transparent to-transparent pointer-events-none" />

      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0 0 0 / 0.5) 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-wider mb-6 text-gold border border-gold/20 rounded-full">
            مميزات Smart Menu
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-balance">
            كل ما تحتاجه لإدارة مطعمك رقمياً
          </h2>
        </div>

        {/* Bento grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={i}
              className={`${colSpan[i] ?? ""}`}
              variants={itemVariants}
            >
              <BentoCard benefit={benefit} index={i} />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="flex justify-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.19, 1, 0.22, 1] }}
        >
          <Link
            href="/demo"
            className="inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-all duration-200 h-9 gap-1.5 px-6 bg-gradient-to-r from-gold to-gold/80 text-gold-foreground hover:opacity-90 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 border-0 active:scale-[0.98]"
          >
            اكتشف المزيد
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function BentoCard({ benefit, index }: { benefit: (typeof BENEFITS)[number]; index: number }) {
  const Icon = benefit.icon;

  return (
    <div className={`double-bezel group h-full ${index === 0 ? "md:min-h-[320px]" : ""}`}>
      <div className="double-bezel-inner h-full p-6 md:p-8 flex flex-col">
        {/* Gold circle icon */}
        <div className="size-12 rounded-full bg-gold/12 flex items-center justify-center mb-5 shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:bg-gold/20">
          <Icon className="size-6 text-gold" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold mb-2 leading-snug">{benefit.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>

        {/* Subtle hover accent */}
        <div className="mt-auto pt-4">
          <div className="h-px w-0 group-hover:w-full bg-gradient-to-r from-gold/30 to-transparent transition-all duration-700 ease-out" />
        </div>
      </div>
    </div>
  );
}
