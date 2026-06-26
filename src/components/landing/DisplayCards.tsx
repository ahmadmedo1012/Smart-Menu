"use client";

import { Smartphone, MessageCircle, QrCode, BarChart3, Gift, Shield, Store, Users, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayCard {
  icon: typeof Smartphone;
  title: string;
  desc: string;
  variant: "glass" | "gradient" | "border" | "minimal";
}

const CARDS: DisplayCard[] = [
  {
    icon: Smartphone,
    title: "منيو رقمي تفاعلي",
    desc: "قائمة طعام رقمية بصور عالية الجودة. محدثة لحظياً بدون طباعة. تشتغل على كل الأجهزة.",
    variant: "glass",
  },
  {
    icon: MessageCircle,
    title: "طلب عبر واتساب",
    desc: "يصل الطلب مباشرة إلى واتساب المطعم مع تفاصيل كاملة جاهزة للتحضير.",
    variant: "gradient",
  },
  {
    icon: QrCode,
    title: "QR كود مخصص",
    desc: "رمز QR خاص لمطعمك للطباعة على الطاولات والفواتير والمواد الدعائية.",
    variant: "border",
  },
  {
    icon: BarChart3,
    title: "إحصائيات وتحليلات",
    desc: "تقارير مفصلة عن الطلبات والأصناف الأكثر طلباً وسلوك الزبائن.",
    variant: "minimal",
  },
  {
    icon: Gift,
    title: "برنامج ولاء",
    desc: "نظام نقاط ومكافآت يحفز الزبائن على العودة ويزيد ارتباطهم بمطعمك.",
    variant: "glass",
  },
  {
    icon: Shield,
    title: "تحكم كامل",
    desc: "لوحة تحكم متكاملة لإدارة المنيو والطلبات والموظفين والإعدادات.",
    variant: "gradient",
  },
  {
    icon: Store,
    title: "إدارة مطاعم متعددة",
    desc: "لوحة تحكم واحدة تدير كل فروع مطعمك — كل فرع بمنيو مستقل.",
    variant: "border",
  },
  {
    icon: TrendingUp,
    title: "نمو المبيعات",
    desc: "زيادة المبيعات عبر الطلب الرقمي السريع وتجربة مستخدم مريحة.",
    variant: "minimal",
  },
];

/** Premium display cards with staggered reveal — inspired by Codehagen */
export default function DisplayCards() {
  return (
    <section className="relative py-32 overflow-hidden" dir="rtl">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" 
        style={{ backgroundImage: "radial-gradient(circle, oklch(0 0 0 / 0.6) 0.5px, transparent 0.5px)", backgroundSize: "20px 20px" }} 
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-5 text-gold border border-gold/15 rounded-full">
            مميزات متقدمة
          </span>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-balance">
            أدوات احترافية<br />
            <span className="text-gold">لمطعمك الرقمي</span>
          </h2>
        </div>

        {/* Cards grid — 4 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {CARDS.map((card, i) => (
            <DisplayCardItem key={i} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DisplayCardItem({ card, index }: { card: DisplayCard; index: number }) {
  const variants: Record<string, string> = {
    glass:
      "bg-glass-bg backdrop-blur-sm border border-glass-border shadow-glass hover:shadow-glass-lg hover:border-gold/30",
    gradient:
      "bg-gradient-to-br from-gold/5 via-gold/[0.02] to-transparent border border-gold/10 hover:border-gold/30 shadow-sm hover:shadow-lg hover:shadow-gold/5",
    border:
      "bg-card/20 border-2 border-border/30 hover:border-gold/30 shadow-sm hover:shadow-md",
    minimal:
      "bg-transparent border border-transparent hover:border-border/40 shadow-none hover:shadow-sm",
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-6 transition-all duration-700 ease-out",
        "hover:-translate-y-1.5",
        "opacity-0 animate-fade-in",
        variants[card.variant],
      )}
      style={{
        animationDelay: `${60 * (index + 1)}ms`,
        animationFillMode: "forwards",
      }}
    >
      {/* Card number */}
      <span className="absolute start-3 top-3 text-[10px] font-bold text-muted-foreground/20 select-none">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Icon container — varies by variant */}
      <div
        className={cn(
          "size-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110",
          card.variant === "gradient"
            ? "bg-gold text-gold-foreground"
            : "bg-gold-muted text-gold",
        )}
      >
        <card.icon className="size-5" />
      </div>

      {/* Content */}
      <h3 className="text-sm font-bold mb-2 leading-snug">{card.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>

      {/* Hover accent line */}
      <div className="absolute bottom-0 start-4 end-4 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
    </div>
  );
}
