"use client";

import { useRef } from "react";
import { Smartphone, MessageCircle, BarChart3, QrCode, Gift, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const STORY_STEPS = [
  {
    icon: Smartphone,
    title: "منيو رقمي تفاعلي",
    desc: "قائمة طعام رقمية بصور عالية الجودة وتفاصيل دقيقة. محدثة لحظياً دون طباعة.",
    detail: "يشتغل المنيو على كل الأجهزة — جوال، تابلت، لابتوب — بدون تطبيق.",
  },
  {
    icon: MessageCircle,
    title: "طلب عبر واتساب بنقرة",
    desc: "الزبون يضيف الأصناف ويرسل الطلب مباشرة لواتساب المطعم.",
    detail: "الطلب يوصل كامل — مع اسم الصنف، الكمية، السعر — جاهز للتحضير.",
  },
  {
    icon: QrCode,
    title: "QR كود على كل طاولة",
    desc: "كل طاولة QR خاص. الزبون يمسح ويطلب من جواله بدون انتظار.",
    detail: "توزع الأكواد على الطاولات، الفواتير، والمواد الدعائية.",
  },
  {
    icon: BarChart3,
    title: "تحليلات ذكية",
    desc: "تقارير لحظية عن الطلبات، الأصناف الأكثر طلباً، وسلوك الزبائن.",
    detail: "تعرف وش يطلبون زبائنك ومتى يطلبون أكثر.",
  },
  {
    icon: Gift,
    title: "برنامج ولاء ومكافآت",
    desc: "نقاط ومكافآت تحفز الزبائن على العودة وتزيد ارتباطهم بمطعمك.",
    detail: "نظام ولاء متكامل يشتغل تلقائياً مع كل طلب.",
  },
  {
    icon: Globe,
    title: "يعمل على كل الشاشات",
    desc: "تجربة مثالية على الجوال، التابلت، والحاسوب — بدون تطبيق.",
    detail: "تصميم متجاوب يتكيف مع كل حجم شاشة.",
  },
];

export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative py-32 md:py-40 overflow-hidden bg-gradient-to-b from-background via-gold-muted/[0.03] to-background" dir="rtl">
      {/* Ambient glow */}
      <div className="absolute top-1/3 -start-32 size-96 rounded-full bg-gold/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 -end-32 size-96 rounded-full bg-gold/5 blur-[140px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-20 md:mb-24">
          <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/15 rounded-full">
            اكتشف الميزات
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            كل ما يحتاجه مطعمك<br />
            <span className="text-gold">في منصة واحدة</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-2xl mx-auto leading-relaxed">
            من المنيو الرقمي إلى التحليلات الذكية — أدوات متكاملة تصمّم لتزيد مبيعاتك وتوفّر وقتك.
          </p>
        </div>

        {/* Story cards — staggered reveal */}
        <div
          ref={containerRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
        >
          {STORY_STEPS.map((step, i) => (
            <StoryCard key={i} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryCard({
  step,
  index,
}: {
  step: (typeof STORY_STEPS)[number];
  index: number;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/20 bg-card/40 p-6 md:p-7",
        "transition-all duration-700 ease-out hover:-translate-y-1",
        "hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5",
        "opacity-0 animate-fade-in",
      )}
      style={{
        animationDelay: `${index * 120}ms`,
        animationFillMode: "forwards",
      }}
    >
      {/* Step number */}
      <div className="absolute start-4 top-4 text-[10px] font-bold text-gold/30 select-none">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Icon */}
      <div className="size-11 rounded-xl bg-gold-muted flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
        <step.icon className="size-5 text-gold" />
      </div>

      {/* Text */}
      <h3 className="text-base font-bold mb-2 leading-snug">{step.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.desc}</p>

      {/* Detail — subtle */}
      <div className="border-t border-border/10 pt-3 mt-auto">
        <p className="text-xs text-muted-foreground/60 leading-relaxed">{step.detail}</p>
      </div>

      {/* Hover gradient glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.72 0.14 75 / 0.03) 0%, transparent 50%)",
        }}
      />
    </div>
  );
}
