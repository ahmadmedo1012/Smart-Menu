"use client";

import { motion } from "framer-motion";
import { Building2, Coffee, Pizza, Beer, ChefHat, Soup, Sandwich } from "lucide-react";
import CircularTestimonials from "@/components/ui/circular-testimonials";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlowPool } from "@/components/ui/GlowPool";
import { springGentle } from "@/lib/motion";

const PARTNER_LOGOS = [
  { name: "مقهى الواحة", icon: Coffee },
  { name: "مطعم الأصيل", icon: ChefHat },
  { name: "بيتزا روما", icon: Pizza },
  { name: "SOHO", icon: Beer },
  { name: "Telepizza", icon: Pizza },
  { name: "The Cheese", icon: Sandwich },
  { name: "Empire", icon: Coffee },
  { name: "Kubaba", icon: Soup },
];

const CLIENT_TESTIMONIALS = [
  {
    quote: "المنصة سهلت علينا عملية الطلب بشكل كبير. عملاؤنا صاروا يطلبون بضغطة زر والطلبات تصلنا منظمة بدون أخطاء.",
    name: "SOHO", designation: "مقهى — طرابلس",
    src: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=150&q=80",
  },
  {
    quote: "نظام المنيو الرقمي والواتساب المتكامل خلى طلبات التيك أوي أسرع وأدق. أقل من خطأ بنسبة ٩٥٪.",
    name: "Telepizza", designation: "مطعم بيتزا — بنغازي",
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&q=80",
  },
  {
    quote: "برنامج الولاء حقق زيادة ٣٠٪ في عودة الزبائن. النقاط والمكافآت حفزت عملائنا على الطلب المتكرر.",
    name: "The Cheese", designation: "مطعم برغر — مصراتة",
    src: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=150&q=80",
  },
  {
    quote: "سهولة استخدام المنيو الرقمي وربطه بالواتساب وفر علينا وقت وجهد كبيرين. تجربة ممتازة.",
    name: "Empire", designation: "مقهى — طرابلس",
    src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=150&q=80",
  },
  {
    quote: "من أفضل القرارات اللي أخذناها لمنشأنا. الإحصائيات والتقارير ساعدتنا نفهم سلوك الزبائن ونطور الخدمة.",
    name: "Kubaba", designation: "مطعم — بنغازي",
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&q=80",
  },
  {
    quote: "منذ استخدام الربط الذكي، زادت طلباتنا عبر واتساب. الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا.",
    name: "أحمد المبروك", designation: "صاحب مقهى الواحة — طرابلس",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
  },
  {
    quote: "نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. زيادة واضحة في المبيعات الشهرية.",
    name: "عمر بن عاشور", designation: "صاحب بيتزا روما — مصراتة",
    src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80",
  },
];

function PartnerMarquee() {
  const doubled = [...PARTNER_LOGOS, ...PARTNER_LOGOS];
  return (
    <div className="relative overflow-hidden mb-12 py-6 border-y border-orange/5">
      {/* Gradient fades on edges */}
      <div className="absolute inset-y-0 start-0 w-16 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 end-0 w-16 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      <motion.div
        className="flex gap-16 items-center"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((partner, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <div className="size-10 rounded-full bg-orange/10 flex items-center justify-center">
              <partner.icon className="size-5 text-orange/70" />
            </div>
            <span className="text-sm font-medium text-muted-foreground/70 whitespace-nowrap">
              {partner.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function ClientsSection() {
  return (
    <SectionContainer className="bg-gradient-to-b from-background via-orange/[0.02] to-background">
      <GlowPool position="top-1/2 right-1/4" size="size-[50vmin]" color="orange/5" />

      <SectionHeader
        icon={<Building2 className="size-3" />}
        eyebrow="منصتنا"
        title="عملاؤنا"
        subtitle="آلاف المطاعم والمقاهي تثق في منصتنا الرقمية"
      />

      {/* Infinite scrolling partner strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...springGentle, delay: 0.05 }}
      >
        <PartnerMarquee />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ ...springGentle, delay: 0.1 }}
        className="ring-1 ring-orange/10 rounded-2xl p-6 sm:p-8"
      >
        <CircularTestimonials
          testimonials={CLIENT_TESTIMONIALS}
          autoplay={true}
          autoplayInterval={4500}
        />
      </motion.div>
    </SectionContainer>
  );
}
