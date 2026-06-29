"use client";

import { useState, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: "size-3.5", md: "size-5", lg: "size-7" };
const labels = ["سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

const StarRating = memo(function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const handleKey = useCallback(
    (e: React.KeyboardEvent, star: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange?.(star);
      } else if (e.key === "ArrowRight" && star < 5) {
        e.preventDefault();
        onChange?.(star + 1);
      } else if (e.key === "ArrowLeft" && star > 1) {
        e.preventDefault();
        onChange?.(star - 1);
      }
    },
    [onChange]
  );

  const display = hovered || value;

  return (
    <div
      className={cn("flex items-center gap-0.5", readonly && "pointer-events-none")}
      role={readonly ? "img" : "radiogroup"}
      aria-label={readonly ? `التقييم: ${value} من 5` : "اختر التقييم"}
      dir="ltr"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= display;
        const half = !filled && star - 0.5 <= display;

        return (
          <motion.button
            key={star}
            type="button"
            disabled={readonly}
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} نجوم — ${labels[star - 1]}`}
            tabIndex={star === (value || 1) ? 0 : -1}
            whileHover={readonly ? {} : { scale: 1.25 }}
            whileTap={readonly ? {} : { scale: 0.85 }}
            onClick={() => onChange?.(star)}
            onKeyDown={(e) => handleKey(e, star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            // ponytail: manual focus management via tabIndex is fine for 5 items
            className={cn(
              "relative transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange rounded-sm",
              readonly ? "cursor-default" : "cursor-pointer",
              filled
                ? "text-amber-400"
                : half
                  ? "text-amber-400/30"
                  : "text-muted-foreground/20"
            )}
          >
            <Star
              className={cn(
                sizes[size],
                filled && "fill-current",
                !readonly && "drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]"
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
});

export { StarRating, type StarRatingProps };
