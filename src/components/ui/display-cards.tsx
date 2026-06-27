"use client";

import { type ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Premium tokens ── */
const SPRING = { type: "spring" as const, stiffness: 200, damping: 20 };
const VELVET: [number, number, number, number] = [0.32, 0.72, 0, 1];

interface DisplayCardProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  className?: string;
}

interface DisplayCardsProps {
  cards: DisplayCardProps[];
  className?: string;
  emptyMessage?: string;
}

/* ── Single card with magnetic tilt & Z-cascade stacking ── */
function Card({
  card,
  i,
  total,
}: {
  card: DisplayCardProps;
  i: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isTop = i === 0;

  /* ── Z-axis cascade: each card shifts DOWN + right (RTL: left) ── */
  const baseShift = isTop ? 0 : i * 12; // px per step
  const textShift = isTop ? 0 : i * 6;

  /* RTL flip horizontal offset */
  const isRtl =
    typeof document !== "undefined" &&
    document.documentElement.dir === "rtl";
  const xOff = isTop ? 0 : isRtl ? -baseShift : baseShift;

  /* ── Magnetic tilt on top card ── */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tiltX = useSpring(mouseY, { stiffness: 120, damping: 18 });
  const tiltY = useSpring(mouseX, { stiffness: 120, damping: 18 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current || !isTop) return;
    const r = ref.current.getBoundingClientRect();
    mouseX.set(((e.clientX - r.left) / r.width - 0.5) * 8);
    mouseY.set(((e.clientY - r.top) / r.height - 0.5) * -8);
  };

  const resetTilt = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      initial={{ opacity: 0, y: 28, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.8,
        delay: i * 0.1,
        ease: VELVET,
      }}
      style={{
        zIndex: total - i,
        x: xOff,
        y: textShift,
        rotate: isTop ? 0 : i % 2 === 0 ? 1.5 : -1.5,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "[grid-area:stack]",
        "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "hover:z-50",
        card.className,
      )}
    >
      {/* ── Outer shell (gradient border) ── */}
      <motion.div
        style={{ rotateX: tiltX, rotateY: tiltY, perspective: 1000 }}
        transition={SPRING}
        className={cn(
          "relative rounded-2xl p-px",
          "bg-gradient-to-b from-white/[0.10] to-white/[0.02]",
          "shadow-2xl",
          isTop && "shadow-[0_12px_48px_-8px_rgba(0,0,0,0.4)]",
          "hover:shadow-[0_20px_80px_-12px_rgba(0,0,0,0.5)]",
          "dark:hover:shadow-[0_20px_80px_-12px_oklch(0.68_0.19_45/0.12)]",
        )}
      >
        {/* ── Inner core ── */}
        <div className="relative rounded-[calc(1rem-1px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {/* Content - always above any overlay */}
          <div className="relative z-10 p-6 sm:p-7">
            {card.icon && (
              <div className={cn("mb-3.5", card.iconClassName)}>
                {card.icon}
              </div>
            )}
            {card.title && (
              <h3
                className={cn(
                  "text-[0.95rem] sm:text-base font-[510] tracking-tight mb-1.5",
                  card.titleClassName,
                )}
              >
                {card.title}
              </h3>
            )}
            {card.description && (
              <p className="text-sm text-muted-foreground leading-[1.7]">
                {card.description}
              </p>
            )}
            {card.date && (
              <time className="mt-3 block text-xs text-muted-foreground/60 tracking-wide">
                {card.date}
              </time>
            )}
          </div>

          {/* Subtle bottom gradient kiss — purely decorative, never on top card */}
          {!isTop && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-background/70 to-transparent" />
          )}
        </div>
      </motion.div>

      {/* ── Light overlay on non-top cards — no blur ── */}
      {i >= 1 && i <= 2 && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-background/50 transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-0" />
      )}
    </motion.div>
  );
}

/* ── Root ── */
export default function DisplayCards({
  cards,
  className,
  emptyMessage = "—",
}: DisplayCardsProps) {
  if (!cards?.length) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground/60">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid [grid-template-areas:stack] justify-center",
        "min-h-[420px] sm:min-h-[460px]",
        className,
      )}
      style={{ perspective: 1000 }}
    >
      {cards.toReversed().map((card, i) => (
        <Card key={i} card={card} i={i} total={cards.length} />
      ))}
    </div>
  );
}
