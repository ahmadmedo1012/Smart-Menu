"use client";

import { motion } from "framer-motion";
import CircularTestimonials from "@/components/ui/circular-testimonials";

const EASE = [0.16, 1, 0.2, 1] as const;

/** Real restaurants/cafes using the platform — testimonials with authentic data */
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
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-xl sm:text-2xl md:text-3xl font-medium"
          >
            عملاؤنا
          </motion.h2>
          <div className="mx-auto mt-3 w-12 h-0.5 rounded-full bg-orange/40" />
          <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
            آلاف المطاعم والمقاهي تثق في منصتنا الرقمية
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
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
