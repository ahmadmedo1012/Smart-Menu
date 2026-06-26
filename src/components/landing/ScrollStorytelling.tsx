"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Smartphone, MessageCircle, BarChart3, Gift } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const EASE = [0.16, 1, 0.2, 1] as const;

const STEPS = [
  {
    icon: Smartphone,
    title: "منيو رقمي تفاعلي",
    desc: "قائمة طعام رقمية بصور عالية الجودة. تحدثها لحظياً دون طباعة.",
    detail: "يعمل على كل الأجهزة — جوال، تابلت، لابتوب — بدون تطبيق.",
  },
  {
    icon: MessageCircle,
    title: "طلب عبر واتساب",
    desc: "الزبون يضيف الأصناف ويرسل الطلب مباشرة لواتساب المطعم.",
    detail: "الطلب يوصل كامل — مع اسم الصنف، الكمية، السعر — جاهز للتحضير.",
  },
  {
    icon: BarChart3,
    title: "تحليلات ذكية",
    desc: "تقارير لحظية عن الطلبات، الأصناف الأكثر طلباً، وسلوك الزبائن.",
    detail: "اعرف وش يطلبون زبائنك ومتى يطلبون أكثر.",
  },
  {
    icon: Gift,
    title: "ولاء ومكافآت",
    desc: "نقاط ومكافآت تحفز الزبائن على العودة وتزيد ارتباطهم بمطعمك.",
    detail: "نظام ولاء متكامل يعمل تلقائياً مع كل طلب.",
  },
] as const;

const STEP_HEIGHT = 100;
const TOTAL = STEPS.length;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

type MotionNum = MotionValue<number>;

/* ─── Main ───────────────────────────────────────────────────────────────── */

/** True scroll-driven narrative — sticky container, 2-col phone + text steps. */
export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const rawStep = useTransform(scrollYProgress, [0, 1], [0, TOTAL - 1]);

  return (
    <section ref={containerRef} className="relative" dir="rtl">
      {/* Scroll spacer — drives the narrative length */}
      <div style={{ height: `${TOTAL * STEP_HEIGHT}vh` }} />

      {/* Sticky viewport container */}
      <div className="absolute inset-0 flex items-center pointer-events-none">
        <div className="sticky top-0 w-full h-screen flex items-center overflow-hidden relative">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
            {/* Section intro badge — animates on first appearance */}
            <div className="text-center mb-6 md:mb-10">
              <motion.span
                className="inline-block px-4 py-1.5 text-[10px] font-semibold
                           tracking-[0.15em] uppercase text-gold
                           border border-gold/20 rounded-full"
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.2, ease: EASE }}
              >
                اكتشف القصة
              </motion.span>
            </div>

            {/* 2-col layout */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <VisualStage
                scrollYProgress={scrollYProgress}
                rawStep={rawStep}
              />
              <TextStage rawStep={rawStep} />
            </div>
          </div>

          {/* Scroll progress indicator */}
          <ScrollIndicator rawStep={rawStep} />
        </div>
      </div>
    </section>
  );
}

/* ─── Visual (Phone) Side ────────────────────────────────────────────────── */

// Smooth 4-segment interpolation helpers — edit these to adjust the arc per step
const SCALE_IN: [number, number, number, number] = [0, 0.12, 0.88, 1];
const SCALE_OUT: [number, number, number, number] = [0.82, 1, 1, 0.82];

const OPACITY_IN: [number, number, number, number] = [0, 0.08, 0.92, 1];
const OPACITY_OUT: [number, number, number, number] = [0.25, 1, 1, 0.25];

function VisualStage({
  scrollYProgress,
  rawStep,
}: {
  scrollYProgress: MotionNum;
  rawStep: MotionNum;
}) {
  // Step index for content switching
  const stepIndex = useTransform(
    scrollYProgress,
    [0, 0.99],
    [0, TOTAL - 1],
  );

  // Phone container motion values
  const phoneScale = useTransform(scrollYProgress, SCALE_IN, SCALE_OUT);
  const phoneY = useTransform(scrollYProgress, [0, 1], [64, -64]);
  const phoneOpacity = useTransform(scrollYProgress, OPACITY_IN, OPACITY_OUT);

  return (
    <motion.div
      className="relative order-first flex items-center justify-center md:order-first"
      style={{ scale: phoneScale, y: phoneY, opacity: phoneOpacity }}
    >
      <div className="relative">
        <PhoneMockup tilt={false} />

        {/* Step content overlay — positioned over phone screen area */}
        <div className="absolute inset-[3px] z-10 overflow-hidden rounded-[2.8rem] pointer-events-none">
          <StepContent stepIndex={stepIndex} rawStep={rawStep} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Text Steps Side ────────────────────────────────────────────────────── */

function TextStage({ rawStep }: { rawStep: MotionNum }) {
  return (
    <div
      className="flex flex-col gap-16 md:gap-20 order-last md:order-last"
      dir="rtl"
    >
      {STEPS.map((s, i) => (
        <StepText key={i} step={s} index={i} rawStep={rawStep} />
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
  rawStep: MotionNum;
}) {
  const dist = useTransform(rawStep, (v) => Math.abs(v - index));
  const opacity = useTransform(dist, (d) => (d < 0.55 ? 1 - d / 0.55 : 0));
  const y = useTransform(dist, (d) => d * 48);
  const scale = useTransform(dist, (d) => (d < 0.55 ? 1 - d * 0.06 : 0.97));

  const Icon = step.icon;

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="pointer-events-none"
      transition={{ duration: 1.2, ease: EASE }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="size-11 rounded-xl bg-gold-muted flex items-center justify-center shadow-sm">
          <Icon className="size-5 text-gold" />
        </div>
        <span className="text-[10px] font-bold text-gold/40 tracking-[0.15em]">
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

/* ─── Phone Screen Content ───────────────────────────────────────────────── */

function StepContent({
  stepIndex,
  rawStep,
}: {
  stepIndex: MotionNum;
  rawStep: MotionNum;
}) {
  return (
    <div className="relative h-full bg-black overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />

      {/* Status bar */}
      <div className="relative z-10 flex items-center justify-between pt-3 px-5">
        <span className="text-[9px] text-white/40 font-medium">
          {String.fromCharCode(0x0669, 0x066a, 0x0664, 0x0661)}
        </span>
        <div className="flex items-center gap-1.5">
          <svg
            className="size-2.5 text-white/40"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="2" y="10" width="4" height="12" rx="0.5" />
            <rect x="8" y="6" width="4" height="16" rx="0.5" />
            <rect x="14" y="2" width="4" height="20" rx="0.5" />
          </svg>
          <svg
            className="size-2.5 text-white/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="1" y="7" width="18" height="10" rx="2" />
            <path d="M22 11v2" />
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
            <div className="text-[10px] font-semibold text-white">
              مطعم مذاق الشام
            </div>
          </div>
        </div>

        {/* Step 0 — Digital Menu */}
        <StepPanel stepIndex={stepIndex} index={0}>
          <div className="flex flex-col gap-2">
            <div className="h-5 rounded bg-gold/20 w-2/3" />
            <div className="h-5 rounded bg-white/5 w-full" />
            <div className="h-5 rounded bg-white/5 w-full" />
            <div className="h-5 rounded bg-white/5 w-3/4" />
          </div>
          <div className="mt-3 text-[9px] text-white/30 text-center">
            منيو رقمي &#x2022; تصفح &#x2022; اختر
          </div>
        </StepPanel>

        {/* Step 1 — WhatsApp Order */}
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
                  item.active
                    ? "bg-gold/15 border border-gold/20"
                    : "bg-white/5"
                }`}
              >
                <span className="text-[9px] text-white/70">{item.text}</span>
                <span
                  className={`text-[8px] ${
                    item.active ? "text-green-400" : "text-white/40"
                  }`}
                >
                  {item.time}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[9px] text-white/30 text-center">
            الطلب يوصل لواتساب المطعم
          </div>
        </StepPanel>

        {/* Step 2 — Analytics */}
        <StepPanel stepIndex={stepIndex} index={2}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-white/50">مبيعات اليوم</span>
              <span className="text-[10px] font-bold text-gold">
                ٤٢٠ د.ل
              </span>
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
              <span className="text-gold">{'★'} ٤.٨</span>
            </div>
          </div>
          <div className="mt-3 text-[9px] text-white/30 text-center">
            تحليلات لحظية &#x2022; قرارات ذكية
          </div>
        </StepPanel>

        {/* Step 3 — Loyalty */}
        <StepPanel stepIndex={stepIndex} index={3}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/60">نقاطك</span>
              <span className="text-[11px] font-bold text-gold">
                ١٬٢٥٠
              </span>
            </div>
            <div className="flex gap-1 justify-center">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`size-5 rounded-full ${
                    i < 3 ? "bg-gold" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <div className="text-center text-[8px] text-white/40">
              اربح نقاط مع كل طلب &#x2022; استبدلها بمكافآت
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

/* ─── Step Panel — crossfade transition per step ─────────────────────────── */

function StepPanel({
  children,
  stepIndex,
  index,
}: {
  children: React.ReactNode;
  stepIndex: MotionNum;
  index: number;
}) {
  const dist = useTransform(stepIndex, (v) => Math.abs(v - index));
  const opacity = useTransform(dist, (d) => (d < 0.5 ? 1 - d * 2 : 0));
  const scale = useTransform(dist, (d) => (d < 0.5 ? 1 : 0.92));
  const y = useTransform(dist, (d) => (d < 0.5 ? d * 8 : 4));

  return (
    <motion.div
      style={{ opacity, y, scale }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Scroll Progress Indicator ──────────────────────────────────────────── */

function StepDot({
  index,
  rawStep,
}: {
  index: number;
  rawStep: MotionNum;
}) {
  const w = useTransform(rawStep, (v) => (Math.abs(v - index) < 0.4 ? 24 : 6));
  const bg = useTransform(rawStep, (v) =>
    Math.abs(v - index) < 0.4
      ? "oklch(0.72 0.14 75 / 0.8)"
      : "oklch(1 0 0 / 0.15)",
  );

  return (
    <motion.div
      className="rounded-full"
      style={{ width: w, height: 4, backgroundColor: bg }}
      transition={{ duration: 1.2, ease: EASE }}
    />
  );
}

function ScrollIndicator({ rawStep }: { rawStep: MotionNum }) {
  return (
    <div className="absolute bottom-6 start-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
      {STEPS.map((_, i) => (
        <StepDot key={i} index={i} rawStep={rawStep} />
      ))}
    </div>
  );
}
