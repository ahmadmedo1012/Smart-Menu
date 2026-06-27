"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Premium tokens ── */
const SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 200,
  damping: 20,
  mass: 0.8,
};
const CUBIC_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const CUBIC_EASE_SLOW: [number, number, number, number] = [0.32, 0.72, 0, 1];

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

/* ── Magnetic card with Double-Bezel ── */
function Card({
  card,
  index,
  total,
}: {
  card: DisplayCardProps;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isTop = index === 0;
  const hasOverlay = index < 2;

  /* Z-axis cascade: rotation, depth offset, shadow weight */
  const rot = isTop ? 0 : index % 2 === 1 ? -2 : 2; // alternating tilt
  const zOffset = index * 6; // px deeper per card
  const zShadow = index * 2;

  /* RTL flip */
  const isRtl =
    typeof document !== "undefined" &&
    document.documentElement.dir === "rtl";
  const rotFinal = isRtl ? rot * -1 : rot;

  /* Magnetic tilt on hover */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tiltX = useSpring(mouseY, { stiffness: 150, damping: 15 });
  const tiltY = useSpring(mouseX, { stiffness: 150, damping: 15 });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current || !isTop) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width; // -0.5..0.5
    const dy = (e.clientY - cy) / rect.height;
    mouseX.set(dx * 12); // ±6deg
    mouseY.set(dy * -12);
  };

  const resetTilt = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36, scale: 0.94, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.9,
        delay: index * 0.1,
        ease: CUBIC_EASE,
      }}
      onMouseMove={handleMouse}
      onMouseLeave={resetTilt}
      style={{
        zIndex: total - index,
        rotate: rotFinal,
        translateY: -zOffset,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "[grid-area:stack]",
        "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "hover:z-50",
        isTop && "cursor-default",
        card.className,
      )}
    >
      {/* ── Double-Bezel: Outer shell ── */}
      <motion.div
        style={{ rotateX: tiltX, rotateY: tiltY, perspective: 1200 }}
        transition={SPRING_TRANSITION}
        className={cn(
          "relative rounded-[1.75rem] sm:rounded-[2rem] p-[1.5px]",
          "bg-gradient-to-b from-white/[0.12] to-white/[0.03]",
          "dark:from-white/[0.08] dark:to-white/[0.02]",
          "shadow-2xl",
          "transition-shadow duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "hover:shadow-[0_20px_80px_-12px_rgba(0,0,0,0.5),0_8px_24px_-6px_rgba(0,0,0,0.3)]",
          "dark:hover:shadow-[0_20px_80px_-12px_oklch(0.68_0.19_45/0.15)]",
          isTop && "shadow-[0_12px_48px_-8px_rgba(0,0,0,0.4)]",
        )}
      >
        {/* ── Animated border shimmer (top card only) ── */}
        {isTop && (
          <motion.div
            className="pointer-events-none absolute -inset-[1.5px] rounded-[calc(1.75rem+1.5px)] sm:rounded-[calc(2rem+1.5px)] opacity-60"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.68 0.19 45 / 0.4), transparent 30%, transparent 70%, oklch(0.68 0.19 45 / 0.2))",
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* ── Inner core ── */}
        <div
          className={cn(
            "relative rounded-[calc(1.75rem-1px)] sm:rounded-[calc(2rem-1.5px)]",
            "bg-background",
            "shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.08)]",
            "dark:shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.06)]",
            "overflow-hidden",
          )}
        >
          {/* overlay on top cards */}
          {hasOverlay && (
            <div className="pointer-events-none absolute inset-0 z-10 rounded-[calc(1.75rem-1px)] sm:rounded-[calc(2rem-1.5px)] bg-background/60 backdrop-blur-[2px] transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-0" />
          )}

          <div className="relative z-0 p-6 sm:p-7">
            {card.icon && (
              <div className={cn("mb-4", card.iconClassName)}>{card.icon}</div>
            )}
            {card.title && (
              <h3
                className={cn(
                  "font-[550] text-[0.95rem] sm:text-base tracking-tight mb-1.5",
                  card.titleClassName,
                )}
              >
                {card.title}
              </h3>
            )}
            {card.description && (
              <p className="text-sm text-muted-foreground/80 leading-[1.7] tracking-[-0.01em]">
                {card.description}
              </p>
            )}
            {card.date && (
              <time className="mt-3 block text-[0.75rem] text-muted-foreground/50 tracking-wide">
                {card.date}
              </time>
            )}
          </div>

          {/* bottom gradient kiss */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/60 to-transparent" />
        </div>
      </motion.div>
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
      <div className="text-sm text-muted-foreground/60 text-center py-16">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid [grid-template-areas:stack] justify-center",
        "min-h-[420px] sm:min-h-[480px]",
        className,
      )}
      style={{ perspective: 1200 }}
    >
      {cards.map((card, i) => (
        <Card key={i} card={card} index={i} total={cards.length} />
      ))}
    </div>
  );
}
