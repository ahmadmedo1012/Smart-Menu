"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import CircularTestimonials from "@/components/ui/circular-testimonials";

const VELVET: [number, number, number, number] = [0.32, 0.72, 0, 1];

const CLIENT_TESTIMONIALS = [
  {
    quote:
      "المنصة سهلت علينا عملية الطلب بشكل كبير. عملاؤنا صاروا يطلبون بضغطة زر والطلبات تصلنا منظمة بدون أخطاء.",
    name: "SOHO",
    designation: "مقهى — طرابلس",
    src: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=150&q=80",
  },
  {
    quote:
      "نظام المنيو الرقمي والواتساب المتكامل خلى طلبات التيك أوي أسرع وأدق. أقل من خطأ بنسبة ٩٥٪.",
    name: "Telepizza",
    designation: "مطعم بيتزا — بنغازي",
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&q=80",
  },
  {
    quote:
      "برنامج الولاء حقق زيادة ٣٠٪ في عودة الزبائن. النقاط والمكافآت حفزت عملائنا على الطلب المتكرر.",
    name: "The Cheese",
    designation: "مطعم برغر — مصراتة",
    src: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=150&q=80",
  },
  {
    quote:
      "سهولة استخدام المنيو الرقمي وربطه بالواتساب وفر علينا وقت وجهد كبيرين. تجربة ممتازة.",
    name: "Empire",
    designation: "مقهى — طرابلس",
    src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=150&q=80",
  },
  {
    quote:
      "من أفضل القرارات اللي أخذناها لمنشأنا. الإحصائيات والتقارير ساعدتنا نفهم سلوك الزبائن ونطور الخدمة.",
    name: "Kubaba",
    designation: "مطعم — بنغازي",
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&q=80",
  },
];

export default function ClientsSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 right-1/4 -translate-y-1/2 size-[50vmin] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-14 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: VELVET }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3.5 py-1 text-[0.65rem] font-medium tracking-[0.15em] text-orange uppercase mb-5"
          >
            <Building2 className="size-3" />
            منصتنا
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.06, ease: VELVET }}
            className="text-[1.6rem] sm:text-3xl md:text-[2.5rem] font-[520] leading-[1.2] tracking-[-0.02em]"
          >
            عملاؤنا
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15, ease: VELVET }}
            className="mx-auto mt-4 w-10 h-[2px] rounded-full bg-orange/50 origin-center"
          />

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: VELVET }}
            className="text-sm text-muted-foreground/70 mt-4 max-w-lg mx-auto"
          >
            آلاف المطاعم والمقاهي تثق في منصتنا الرقمية
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: VELVET }}
        >
          <CircularTestimonials
            testimonials={CLIENT_TESTIMONIALS}
            autoplay={true}
            autoplayInterval={4500}
          />
        </motion.div>
      </div>
    </section>
  );
}
