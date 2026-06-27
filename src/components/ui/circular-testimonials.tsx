"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

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
  colors?: {
    name?: string;
    designation?: string;
    testimony?: string;
    arrowBackground?: string;
    arrowForeground?: string;
    arrowHoverBackground?: string;
  };
  fontSizes?: {
    name?: string;
    designation?: string;
    quote?: string;
  };
}

/**
 * CircularTestimonials — rotating testimonial carousel with orbit-style
 * thumbnail ring. RTL-aware: arrow direction flips in RTL context.
 */
export default function CircularTestimonials({
  testimonials,
  autoplay = true,
  autoplayInterval = 5000,
  colors = {},
  fontSizes = {},
}: CircularTestimonialsProps) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRtl =
    typeof document !== "undefined" &&
    document.documentElement.dir === "rtl";

  const n = testimonials.length;

  const goTo = useCallback(
    (i: number) => setActive(((i % n) + n) % n),
    [n],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  /* autoplay */
  useEffect(() => {
    if (!autoplay || n < 2) return;
    timerRef.current = setInterval(next, autoplayInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, autoplayInterval, next, n]);

  if (!n) return null;

  const activeT = testimonials[active];

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto gap-8">
      {/* orbit ring */}
      <div className="relative size-[280px] sm:size-[320px] md:size-[360px]">
        {testimonials.map((t, i) => {
          const angle = (360 / n) * i - 90; // start at top
          const radius = 120; // px from center
          const isActive = i === active;

          /* rotate ring so active is at top */
          const ringAngle = (360 / n) * active;
          const rx = Math.cos(((angle - ringAngle) * Math.PI) / 180) * radius;
          const ry = Math.sin(((angle - ringAngle) * Math.PI) / 180) * radius;

          return (
            <motion.button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "absolute left-1/2 top-1/2 size-12 sm:size-14 rounded-full overflow-hidden border-2 transition-shadow duration-300",
                isActive
                  ? "border-orange shadow-lg shadow-orange/20 z-10 scale-110"
                  : "border-border/50 hover:border-orange/50 z-0",
              )}
              style={{
                x: rx,
                y: ry,
                translateX: "-50%",
                translateY: "-50%",
              }}
              animate={{
                x: rx,
                y: ry,
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ type: "spring", stiffness: 80, damping: 16 }}
              aria-label={`عرض تقييم ${t.name}`}
            >
              <img
                src={t.src}
                alt={t.name}
                className="size-full object-cover"
                loading="lazy"
              />
            </motion.button>
          );
        })}
      </div>

      {/* active card */}
      <div className="w-full max-w-xl px-4 min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.2, 1] }}
            className="text-center"
          >
            {/* stars */}
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="size-4 fill-orange text-orange" />
              ))}
            </div>

            <blockquote
              className="text-base sm:text-lg leading-relaxed text-muted-foreground mb-6"
              style={{ color: colors.testimony, fontSize: fontSizes.quote }}
            >
              &ldquo;{activeT.quote}&rdquo;
            </blockquote>

            <div className="flex items-center justify-center gap-3">
              <div className="size-10 rounded-full bg-orange/10 flex items-center justify-center text-orange font-bold text-sm">
                {activeT.name.charAt(0)}
              </div>
              <div className="text-right rtl:text-left">
                <p
                  className="text-sm font-medium"
                  style={{ color: colors.name, fontSize: fontSizes.name }}
                >
                  {activeT.name}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{
                    color: colors.designation,
                    fontSize: fontSizes.designation,
                  }}
                >
                  {activeT.designation}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* arrows */}
      {n > 1 && (
        <div className="flex gap-3">
          <button
            onClick={isRtl ? next : prev}
            className="size-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-orange hover:text-white hover:border-orange transition-colors duration-200"
            aria-label="السابق"
            style={{
              background: colors.arrowBackground,
              color: colors.arrowForeground,
            }}
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </button>
          <button
            onClick={isRtl ? prev : next}
            className="size-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-orange hover:text-white hover:border-orange transition-colors duration-200"
            aria-label="التالي"
            style={{
              background: colors.arrowBackground,
              color: colors.arrowForeground,
            }}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
