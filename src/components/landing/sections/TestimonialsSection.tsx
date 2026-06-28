"use client";

import { motion } from "framer-motion";
import { MessageCircle, Star } from "lucide-react";
import DisplayCards from "@/components/ui/display-cards";

const VELVET: [number, number, number, number] = [0.32, 0.72, 0, 1];

const testimonialCards = [
  {
    title: "أحمد المبروك",
    description: '"منذ استخدام الربط الذكي، زادت طلباتنا عبر واتساب. الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا."',
    date: "صاحب مقهى الواحة",
    icon: <Star className="size-4 fill-orange text-orange" />,
    iconClassName: "text-orange",
    titleClassName: "text-orange",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:inset-0",
  },
  {
    title: "سارة التومي",
    description: '"وفرت لنا المنصة وقتاً وجهداً. تحديث المنيو يتم لحظياً والطلبات تصل مرتبة. أنصح بها كل مطعم."',
    date: "مديرة مطعم الأصيل",
    icon: <Star className="size-4 fill-orange text-orange" />,
    iconClassName: "text-orange",
    titleClassName: "text-orange",
    className:
      "[grid-area:stack] translate-x-16 translate-y-10 rtl:-translate-x-16 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:inset-0",
  },
  {
    title: "عمر بن عاشور",
    description: '"نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. زيادة واضحة في المبيعات الشهرية."',
    date: "صاحب بيتزا روما",
    icon: <Star className="size-4 fill-orange text-orange" />,
    iconClassName: "text-orange",
    titleClassName: "text-orange",
    className:
      "[grid-area:stack] translate-x-32 translate-y-20 rtl:-translate-x-32 hover:translate-y-10",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="reviews" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[60vmin] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.06) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-14 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: VELVET }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3.5 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase mb-5"
          >
            <MessageCircle className="size-3" />
            تجارب العملاء
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.06, ease: VELVET }}
            className="text-[1.6rem] sm:text-3xl md:text-[2.5rem] font-[520] leading-[1.2] tracking-[-0.02em]"
          >
            ماذا يقول عملاؤنا
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15, ease: VELVET }}
            className="mx-auto mt-4 w-10 h-[2px] rounded-full bg-orange/50 origin-center"
          />
        </div>

        {/* Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: VELVET }}
          className="flex justify-center"
        >
          <DisplayCards cards={testimonialCards} />
        </motion.div>
      </div>
    </section>
  );
}
