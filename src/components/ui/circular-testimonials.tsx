"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

/* ── Premium tokens ── */
const SPRING_STIFF = { type: "spring" as const, stiffness: 90, damping: 14 };
const VELVET = [0.32, 0.72, 0, 1] as const;

interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}

interface CircularTestimonialsProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
}

/* ── Orbital thumbnail ── */
function OrbitalThumb({
  t,
  i,
  n,
  active,
  radius,
  onSelect,
}: {
  t: Testimonial;
  i: number;
  n: number;
  active: number;
  radius: number;
  onSelect: () => void;
}) {
  const isActive = i === active;

  /* compute position with active-index offset */
  const angle = (360 / n) * i - 90;
  const ringAngle = (360 / n) * active;
  const rx =
    Math.cos((((angle - ringAngle) * Math.PI) / 180)) * radius;
  const ry =
    Math.sin((((angle - ringAngle) * Math.PI) / 180)) * radius;

  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        "absolute left-1/2 top-1/2",
        "size-13 sm:size-15 rounded-full overflow-hidden",
        "transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange",
        isActive
          ? "z-20 ring-[2.5px] ring-orange ring-offset-[3px] ring-offset-background shadow-[0_0_24px_-4px_var(--orange)]"
          : "z-10 ring-[1.5px] ring-border/40 hover:ring-orange/60",
      )}
      style={{
        x: rx,
        y: ry,
        translateX: "-50%",
        translateY: "-50%",
      }}
      animate={{ x: rx, y: ry, scale: isActive ? 1.12 : 1 }}
      transition={SPRING_STIFF}
      aria-label={`عرض تقييم ${t.name}`}
    >
      <div className="size-full p-[2px]">
        <div className="size-full rounded-full overflow-hidden bg-background">
          <img
            src={t.src}
            alt={t.name}
            className="size-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </motion.button>
  );
}

/* ── Arrow button (Button-in-Button) ── */
function ArrowBtn({
  dir,
  onClick,
  label,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  label: string;
}) {
  const Icon = dir === "prev" ? ChevronRight : ChevronLeft;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative size-11 rounded-full",
        "bg-card/80 backdrop-blur-xl",
        "border border-white/[0.06]",
        "shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]",
        "hover:bg-orange hover:border-orange/40",
        "active:scale-[0.94]",
        "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange",
      )}
      aria-label={label}
    >
      {/* inner circle — Button-in-Button */}
      <span
        className={cn(
          "mx-auto flex size-8 items-center justify-center rounded-full",
          "text-muted-foreground/70",
          "group-hover:text-white",
          "transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "rtl:rotate-180",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
    </button>
  );
}

/* ── Root ── */
export default function CircularTestimonials({
  testimonials,
  autoplay = true,
  autoplayInterval = 5000,
}: CircularTestimonialsProps) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = testimonials.length;

  const goTo = useCallback(
    (i: number) => setActive(((i % n) + n) % n),
    [n],
  );
  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (!autoplay || n < 2) return;
    timerRef.current = setInterval(next, autoplayInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, autoplayInterval, next, n]);

  const activeT = testimonials[active];
  const isRtl =
    typeof document !== "undefined" &&
    document.documentElement.dir === "rtl";

  if (!n) return null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full max-w-3xl mx-auto",
        "gap-10 sm:gap-12",
      )}
    >
      {/* ── Orbit ring ── */}
      <div className="relative size-[290px] sm:size-[340px] md:size-[380px] shrink-0">
        {/* ring glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.68 0.19 45 / 0.04) 0%, transparent 70%)",
          }}
        />
        {/* ring track */}
        <div className="absolute inset-[18px] rounded-full border border-white/[0.04] dark:border-white/[0.03]" />

        {testimonials.map((t, i) => (
          <OrbitalThumb
            key={i}
            t={t}
            i={i}
            n={n}
            active={active}
            radius={116}
            onSelect={() => goTo(i)}
          />
        ))}
      </div>

      {/* ── Active testimonial card (Double-Bezel) ── */}
      <div className="w-full max-w-lg px-2 min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -24, filter: "blur(4px)" }}
            transition={{ duration: 0.7, ease: VELVET }}
          >
            {/* ── Double-Bezel outer shell ── */}
            <div
              className={cn(
                "relative rounded-[1.5rem] p-[1.5px]",
                "bg-gradient-to-b from-white/[0.08] to-white/[0.02]",
                "shadow-[0_12px_48px_-12px_rgba(0,0,0,0.3)]",
              )}
            >
              {/* inner core */}
              <div
                className={cn(
                  "relative rounded-[calc(1.5rem-1.5px)]",
                  "bg-card",
                  "shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.06)]",
                  "px-6 sm:px-8 py-8 sm:py-10",
                  "text-center",
                )}
              >
                {/* stars */}
                <div className="flex justify-center gap-1.5 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="size-[14px] sm:size-4 fill-orange text-orange/80"
                    />
                  ))}
                </div>

                <blockquote className="text-[0.95rem] sm:text-[1.05rem] leading-[1.8] sm:leading-[1.75] text-muted-foreground/85 mb-6 sm:mb-7 font-[430] tracking-[-0.01em]">
                  &ldquo;{activeT.quote}&rdquo;
                </blockquote>

                <div className="flex items-center justify-center gap-3.5">
                  <div className="size-11 rounded-full overflow-hidden ring-1 ring-border/30 shrink-0">
                    <img
                      src={activeT.src}
                      alt={activeT.name}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="text-right rtl:text-left">
                    <p className="text-sm font-[510] text-foreground/90 tracking-tight">
                      {activeT.name}
                    </p>
                    <p className="text-[0.78rem] text-muted-foreground/60 mt-0.5">
                      {activeT.designation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Arrows (Button-in-Button) ── */}
      {n > 1 && (
        <div className="flex gap-4">
          <ArrowBtn
            dir="prev"
            onClick={isRtl ? next : prev}
            label="السابق"
          />
          <ArrowBtn
            dir="next"
            onClick={isRtl ? prev : next}
            label="التالي"
          />
        </div>
      )}
    </div>
  );
}
