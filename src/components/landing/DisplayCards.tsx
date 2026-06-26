"use client";

import { motion } from "framer-motion";
import { QrCode, Globe, Shield, TrendingUp } from "lucide-react";

/** Four cards — each with a unique visual identity. No icon+text repeat pattern. */
const CARDS = [
  {
    icon: QrCode,
    title: "QR كود مخصص",
    desc: "كل طاولة QR خاص. الزبون يمسح ويطلب من جواله بدون انتظار.",
    tag: "ابدأ في دقائق",
    // "glass" variant — transparent, blur, gold border accent
    treatment: "glass" as const,
  },
  {
    icon: Globe,
    title: "يعمل على كل الشاشات",
    desc: "تجربة مثالية على الجوال، التابلت، والحاسوب — بدون تطبيق. تصميم متجاوب بالكامل.",
    tag: "responsive",
    treatment: "editorial" as const,
  },
  {
    icon: Shield,
    title: "تحكم كامل",
    desc: "لوحة تحكم متكاملة لإدارة المنيو والطلبات والموظفين والإعدادات. مطاعم متعددة بحساب واحد.",
    tag: "dashboard",
    treatment: "minimal" as const,
  },
  {
    icon: TrendingUp,
    title: "نمو المبيعات",
    desc: "زيادة المبيعات عبر الطلب الرقمي السريع وتجربة مستخدم مريحة. نظام ولاء يضمن عودة الزبائن.",
    tag: "نتائج ملموسة",
    treatment: "gold" as const,
  },
];

/** Premium display cards — staggered reveal, 4 unique visual treatments */
export default function DisplayCards() {
  return (
    <section className="relative py-32 md:py-40 overflow-hidden" dir="rtl">
      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.012] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0 0 0 / 0.6) 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/15 rounded-full">
            أربع أدوات، منصة واحدة
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            كل ما تحتاجه
            <br />
            <span className="text-gold">لإدارة مطعمك رقمياً</span>
          </h2>
        </div>

        {/* Cards — 2x2 grid, unique treatments */}
        <div className="grid sm:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
          {CARDS.map((card, i) => (
            <DisplayCardItem key={i} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: [0.19, 1, 0.22, 1] as const },
  },
};

function DisplayCardItem({
  card,
  index,
}: {
  card: (typeof CARDS)[number];
  index: number;
}) {
  const treatments = {
    glass: "bg-glass-bg backdrop-blur-sm border border-glass-border shadow-glass hover:shadow-glass-lg hover:border-gold/30",
    editorial:
      "bg-card border-2 border-border/30 shadow-sm hover:shadow-lg hover:border-gold/30",
    minimal:
      "bg-transparent border border-transparent hover:border-border/40 shadow-none hover:shadow-sm",
    gold: "bg-gradient-to-br from-gold/10 via-gold/[0.04] to-transparent border border-gold/20 shadow-md hover:shadow-xl hover:shadow-gold/10 hover:border-gold/40",
  };

  return (
    <motion.div
      className="relative"
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.25 }}
    >
      <div
        className={`group relative rounded-2xl p-7 md:p-8 transition-all duration-700 ease-out hover:-translate-y-1 ${treatments[card.treatment]}`}
      >
        {/* Card number — corner */}
        <span className="absolute start-3 top-3 text-[10px] font-bold text-muted-foreground/15 select-none">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Icon */}
        <div
          className={`size-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 ${
            card.treatment === "gold"
              ? "bg-gold text-gold-foreground"
              : "bg-gold-muted text-gold"
          }`}
        >
          <card.icon className="size-5" />
        </div>

        {/* Tag */}
        <div className="text-[10px] font-semibold tracking-widest uppercase text-gold/60 mb-2">
          {card.tag}
        </div>

        {/* Content */}
        <h3 className="text-base font-bold mb-2 leading-snug">{card.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>

        {/* Hover accent line — glass and gold treatments */}
        {card.treatment !== "minimal" && (
          <div className="absolute bottom-0 start-4 end-4 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
        )}
      </div>
    </motion.div>
  );
}
