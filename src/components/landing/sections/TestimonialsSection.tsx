"use client";

import { motion } from "framer-motion";
import { Star, MessageCircle } from "lucide-react";
import DisplayCards from "@/components/ui/display-cards";

/* ── Premium tokens ── */
const VELVET = [0.32, 0.72, 0, 1] as const;
const VELVET_SLOW: [number, number, number, number] = [0.32, 0.72, 0, 1];

const testimonials = [
  {
    name: "أحمد المبروك",
    role: "صاحب مقهى الواحة",
    content:
      "منذ استخدام الربط الذكي، زادت طلباتنا عبر واتساب. الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا.",
    rating: 5,
  },
  {
    name: "سارة التومي",
    role: "مديرة مطعم الأصيل",
    content:
      "وفرت لنا المنصة وقتاً وجهداً. تحديث المنيو يتم لحظياً والطلبات تصل مرتبة. أنصح بها كل مطعم.",
    rating: 5,
  },
  {
    name: "عمر بن عاشور",
    role: "صاحب بيتزا روما",
    content:
      "نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. زيادة واضحة في المبيعات الشهرية.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="reviews"
      className="relative py-28 sm:py-36 overflow-hidden"
    >
      {/* ── Ambient glow ── */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.07) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* ── BG texture ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80"
          alt=""
          className="size-full object-cover opacity-[0.02]"
          loading="lazy"
        />
      </div>

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* ── Heading block ── */}
        <div className="text-center mb-16 sm:mb-20">
          {/* Eyebrow badge */}
          <motion.span
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: VELVET }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3.5 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase mb-5"
          >
            <MessageCircle className="size-3" />
            تجارب العملاء
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.08, ease: VELVET }}
            className="text-[1.6rem] sm:text-3xl md:text-[2.5rem] font-[520] leading-[1.2] tracking-[-0.02em]"
          >
            ماذا يقول عملاؤنا
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: VELVET }}
            className="mx-auto mt-5 w-12 h-[2px] rounded-full bg-orange/50 origin-center"
          />
        </div>

        {/* ── Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, delay: 0.15, ease: VELVET_SLOW }}
          className="flex justify-center"
        >
          <DisplayCards
            cards={testimonials.map((t) => ({
              title: t.name,
              description: `${t.content}`,
              icon: (
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star
                      key={j}
                      className="size-[14px] fill-orange text-orange"
                    />
                  ))}
                </div>
              ),
              titleClassName: "text-[0.9rem] font-[510]",
            }))}
            className="w-full max-w-[360px] sm:max-w-sm"
          />
        </motion.div>
      </div>
    </section>
  );
}
