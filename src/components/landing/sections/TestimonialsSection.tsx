"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import DisplayCards from "@/components/ui/display-cards";

const EASE = [0.16, 1, 0.2, 1] as const;

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
      className="relative py-16 sm:py-24 overflow-hidden"
    >
      {/* bg texture */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80"
          alt=""
          className="w-full h-full object-cover opacity-[0.025]"
          loading="lazy"
        />
      </div>

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-2xl sm:text-3xl md:text-4xl font-medium leading-[1.2]"
          >
            ماذا يقول عملاؤنا
          </motion.h2>
          <div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-orange/40" />
        </div>

        <div className="flex justify-center">
          <DisplayCards
            cards={testimonials.map((t) => ({
              title: t.name,
              description: `"${t.content}"`,
              icon: (
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star
                      key={j}
                      className="size-3.5 fill-orange text-orange"
                    />
                  ))}
                </div>
              ),
              titleClassName: "text-sm font-medium",
            }))}
            className="w-full max-w-sm"
          />
        </div>
      </div>
    </section>
  );
}
