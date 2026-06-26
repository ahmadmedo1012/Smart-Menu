"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Smartphone, MessageCircle, BarChart3, Gift } from "lucide-react";

const STEPS = [
  {
    icon: Smartphone,
    title: "منيو رقمي تفاعلي",
    desc: "قائمة طعام رقمية بصور عالية الجودة. تحدثها لحظياً دون طباعة.",
    detail: "يعمل على كل الأجهزة — جوال، تابلت، لابتوب — بدون تطبيق.",
    color: "from-gold/10 to-transparent",
  },
  {
    icon: MessageCircle,
    title: "طلب عبر واتساب",
    desc: "الزبون يضيف الأصناف ويرسل الطلب مباشرة لواتساب المطعم.",
    detail: "الطلب يوصل كامل — مع اسم الصنف، الكمية، السعر — جاهز للتحضير.",
    color: "from-gold/15 to-transparent",
  },
  {
    icon: BarChart3,
    title: "تحليلات ذكية",
    desc: "تقارير لحظية عن الطلبات، الأصناف الأكثر طلباً، وسلوك الزبائن.",
    detail: "اعرف وش يطلبون زبائنك ومتى يطلبون أكثر.",
    color: "from-gold/20 to-transparent",
  },
  {
    icon: Gift,
    title: "ولاء ومكافآت",
    desc: "نقاط ومكافآت تحفز الزبائن على العودة وتزيد ارتباطهم بمطعمك.",
    detail: "نظام ولاء متكامل يعمل تلقائياً مع كل طلب.",
    color: "from-gold/25 to-transparent",
  },
];

const STEP_HEIGHT = 100; // vh per step
const TOTAL_SECTIONS = STEPS.length;

/** True scroll-driven narrative — sticky container, content transitions progressively */
export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress through the full container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Current step: 0..TOTAL_SECTIONS-1
  const rawStep = useTransform(
    scrollYProgress,
    [0, 1],
    [0, TOTAL_SECTIONS - 1],
  );

  return (
    <section ref={containerRef} className="relative" dir="rtl">
      {/* Tall spacer — drives the scroll length */}
      <div style={{ height: `${TOTAL_SECTIONS * STEP_HEIGHT}vh` }} />

      {/* Sticky container — centered viewport content */}
      <div className="absolute inset-0 flex items-center pointer-events-none">
        <div className="sticky top-0 w-full h-screen flex items-center overflow-hidden">
          <div className="w-full max-w-6xl mx-auto px-4">
            {/* Section label */}
            <div className="text-center mb-8 md:mb-12">
              <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase text-gold border border-gold/15 rounded-full">
                اكتشف القصة
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Visual side — progressive state */}
              <VisualStage scrollYProgress={scrollYProgress} />

              {/* Text side — step content */}
              <TextStage rawStep={rawStep} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Visual phone state that changes per step */
function VisualStage({ scrollYProgress }: { scrollYProgress: import("framer-motion").MotionValue<number> }) {
  const stepIndex = useTransform(scrollYProgress, [0, 0.99], [0, STEPS.length - 1]);

  const phoneScale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.85, 1, 1, 0.85]);
  const phoneY = useTransform(scrollYProgress, [0, 1], [48, -48]);
  const phoneOpacity = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [0.4, 1, 1, 0.4]);

  return (
    <motion.div
      className="relative flex items-center justify-center order-first md:order-first"
      style={{ scale: phoneScale, y: phoneY, opacity: phoneOpacity }}
    >
      {/* Phone frame */}
      <div className="relative w-[240px] md:w-[260px]">
        {/* Glow */}
        <div
          className="absolute -inset-12 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 80%, oklch(0.72 0.14 75 / 0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Bezel */}
        <div
          className="relative w-full rounded-[2.5rem] p-[3px]"
          style={{
            background: "var(--frame-gradient)",
            boxShadow: "var(--frame-shadow-premium)",
          }}
        >
          {/* Screen */}
          <div className="relative w-full aspect-[9/19.5] rounded-[2.3rem] bg-black overflow-hidden">
            {/* Glass reflection */}
            <div
              className="absolute inset-0 z-20 pointer-events-none rounded-[2.3rem]"
              style={{
                background: "linear-gradient(135deg, oklch(1 0 0 / 0.05) 0%, transparent 40%, transparent 60%, oklch(1 0 0 / 0.015) 100%)",
              }}
            />
            <div
              className="absolute inset-0 z-20 pointer-events-none rounded-[2.3rem]"
              style={{ boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.05)" }}
            />

            {/* Step-reactive screen content */}
            <StepContent stepIndex={stepIndex} />
          </div>
          <div className="absolute inset-[3px] rounded-[2.3rem] ring-1 ring-inset ring-white/[0.06] pointer-events-none z-20" />
        </div>
      </div>
    </motion.div>
  );
}

/** Text content that transitions between steps on scroll */
function TextStage({ rawStep }: { rawStep: import("framer-motion").MotionValue<number> }) {
  return (
    <div className="flex flex-col gap-16 md:gap-20 order-last md:order-last" dir="rtl">
      {STEPS.map((step, i) => (
        <StepText key={i} step={step} index={i} rawStep={rawStep} />
      ))}
    </div>
  );
}

function StepText({
  step,
  index,
  rawStep,
}: {
  step: (typeof STEPS)[number];
  index: number;
  rawStep: import("framer-motion").MotionValue<number>;
}) {
  // Active when rawStep is near this index
  const dist = useTransform(rawStep, (v) => Math.abs(v - index));
  const opacity = useTransform(dist, (d) => (d < 0.5 ? 1 - d * 2 : 0));
  const y = useTransform(dist, (d) => d * 40);
  const scale = useTransform(dist, (d) => (d < 0.5 ? 1 - d * 0.08 : 0.96));

  return (
    <motion.div style={{ opacity, y, scale }} className="pointer-events-none">
      <div className="flex items-center gap-4 mb-4">
        <div className="size-10 rounded-xl bg-gold-muted flex items-center justify-center">
          <step.icon className="size-5 text-gold" />
        </div>
        <span className="text-[10px] font-bold text-gold/40 tracking-widest">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold leading-snug mb-3 text-foreground">
        {step.title}
      </h3>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-3">
        {step.desc}
      </p>
      <p className="text-sm text-muted-foreground/60 leading-relaxed">
        {step.detail}
      </p>
    </motion.div>
  );
}

/** Phone screen content that shows different UI per step */
function StepContent({
  stepIndex,
}: {
  stepIndex: import("framer-motion").MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 z-10 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between pt-3 px-5">
        <span className="text-[9px] text-white/40 font-medium">٩:٤١</span>
        <div className="flex items-center gap-1.5">
          <svg className="size-2.5 text-white/40" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="10" width="4" height="12" rx="0.5" />
            <rect x="8" y="6" width="4" height="16" rx="0.5" />
            <rect x="14" y="2" width="4" height="20" rx="0.5" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 px-5 mt-4" dir="rtl">
        {/* Restaurant header — always visible */}
        <div className="flex items-center gap-3 mb-3">
          <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-gold text-xs font-bold border border-white/10">
            م
          </div>
          <div>
            <div className="text-[10px] font-semibold text-white">مطعم مذاق الشام</div>
          </div>
        </div>

        {/* Step 0: Digital Menu */}
        <StepPanel stepIndex={stepIndex} index={0}>
          <div className="flex flex-col gap-2">
            <div className="h-5 rounded bg-gold/20 w-2/3" />
            <div className="h-5 rounded bg-white/5 w-full" />
            <div className="h-5 rounded bg-white/5 w-full" />
            <div className="h-5 rounded bg-white/5 w-3/4" />
          </div>
          <div className="mt-3 text-[9px] text-white/30 text-center">
            منيو رقمي • تصفح • اختر
          </div>
        </StepPanel>

        {/* Step 1: WhatsApp Order */}
        <StepPanel stepIndex={stepIndex} index={1}>
          <div className="space-y-2">
            {[
              { text: "طلب جديد من طاولة ٥", time: "الآن", active: true },
              { text: "شاورما دجاج × ٢", time: "٢٥ د.ل", active: false },
              { text: "كباب بندورة × ١", time: "٣٠ د.ل", active: false },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  item.active ? "bg-gold/15 border border-gold/20" : "bg-white/5"
                }`}
              >
                <span className="text-[9px] text-white/70">{item.text}</span>
                <span className={`text-[8px] ${item.active ? "text-green-400" : "text-white/40"}`}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[9px] text-white/30 text-center">
            الطلب يوصل لواتساب المطعم
          </div>
        </StepPanel>

        {/* Step 2: Analytics */}
        <StepPanel stepIndex={stepIndex} index={2}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-white/50">مبيعات اليوم</span>
              <span className="text-[10px] font-bold text-gold">٤٢٠ د.ل</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-gold/60" />
            </div>
            <div className="flex items-center justify-between text-[8px] text-white/40 mt-2">
              <span>الوجبة الأكثر طلباً</span>
              <span>شاورما دجاج</span>
            </div>
            <div className="flex items-center justify-between text-[8px] text-white/40">
              <span>متوسط التقييم</span>
              <span className="text-gold">★ ٤.٨</span>
            </div>
          </div>
          <div className="mt-3 text-[9px] text-white/30 text-center">
            تحليلات لحظية • قرارات ذكية
          </div>
        </StepPanel>

        {/* Step 3: Loyalty */}
        <StepPanel stepIndex={stepIndex} index={3}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/60">نقاطك</span>
              <span className="text-[11px] font-bold text-gold">١٬٢٥٠</span>
            </div>
            <div className="flex gap-1 justify-center">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`size-5 rounded-full ${i < 3 ? "bg-gold" : "bg-white/10"}`}
                />
              ))}
            </div>
            <div className="text-center text-[8px] text-white/40">
              اربح نقاط مع كل طلب • استبدلها بمكافآت
            </div>
            <div className="mt-2 h-8 rounded-lg bg-gradient-to-l from-gold/20 to-transparent flex items-center justify-center">
              <span className="text-[8px] text-gold/80 font-semibold">
                كوبون خصم ١٠٪ متاح!
              </span>
            </div>
          </div>
          <div className="mt-2 text-[9px] text-white/30 text-center">
            ولاء يعيدهم إليك
          </div>
        </StepPanel>
      </div>
    </div>
  );
}

/** Renders children only when stepIndex matches */
function StepPanel({
  children,
  stepIndex,
  index,
}: {
  children: React.ReactNode;
  stepIndex: import("framer-motion").MotionValue<number>;
  index: number;
}) {
  const opacity = useTransform(stepIndex, (v) => {
    const d = Math.abs(v - index);
    return d < 0.5 ? 1 - d * 2 : 0;
  });
  const scale = useTransform(stepIndex, (v) => {
    const d = Math.abs(v - index);
    return d < 0.5 ? 1 : 0.92;
  });

  return (
    <motion.div style={{ opacity, scale }} className="mt-4">
      {children}
    </motion.div>
  );
}
