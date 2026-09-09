"use client";

import { useState, memo, type ReactNode } from "react";
import { m, AnimatePresence } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { UtensilsCrossed } from "lucide-react";

type AspectRatio = "auto" | "square" | "video";

type OptimizedImageProps = {
  src: string;
  alt: string;
  aspectRatio?: AspectRatio;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** LCP hint passed through to next/image (renders as fetchpriority="high") */
  fetchPriority?: "high" | "low" | "auto";
  skeleton?: boolean;
  fallback?: ReactNode;
  onError?: () => void;
  /**
   * round88-A2: per-usage image sizes. `fill` images without a correct
   * `sizes` make the browser pick a srcset candidate from the VIEWPORT
   * (100vw-ish) instead of the real display box — multi-KB overfetch for
   * small fixed boxes (32/48/56/80px logos/previews) and undersized
   * (blurry) fetches for boxes larger than the claimed vw share. Each
   * call site now passes the box width derived from its own layout
   * (grids: container max-w-4xl/896px, cols, gaps). Default keeps the old
   * generic value for any call site without an explicit override.
   */
  sizes?: string;
};

const aspectMap: Record<AspectRatio, string> = {
  auto: "aspect-auto",
  square: "aspect-square",
  video: "aspect-video",
};

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  aspectRatio = "square",
  className = "",
  imageClassName = "",
  priority = false,
  fetchPriority,
  skeleton = true,
  fallback,
  onError,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: OptimizedImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div
      className={cn(
        /* r97-X1: rounded-lg الافتراضي — rounded-[4px] كان يقصّ «حفرة» زاوية داخل
           مقصّات rounded-2xl للبطاقات ويتعارض مع تجاوزات النداء (المواقع التي
           تمرر صنفها الخاص تظل كما هي لأن tailwind-merge يحسم التعارض). */
        "relative overflow-hidden rounded-lg",
        aspectMap[aspectRatio],
        className,
      )}
    >
      {/* Shimmer skeleton */}
      <AnimatePresence>
        {skeleton && status === "loading" && (
          <m.div
            key="shimmer"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 shimmer"
            style={{
              background: "linear-gradient(90deg, transparent 0%, var(--image-shimmer) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              willChange: "background-position",
            }}
          />
        )}
      </AnimatePresence>

      {/* Image */}
      {status !== "error" ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn(
            "object-cover transition-opacity duration-500",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
          sizes={sizes}
          loading={priority ? undefined : "lazy"}
          priority={priority}
          fetchPriority={fetchPriority}
          onLoad={() => setStatus("loaded")}
          onError={() => { setStatus("error"); onError?.(); }}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/40 to-transparent">
          {fallback || (
            <span className="text-2xl text-orange/40">
              <UtensilsCrossed className="size-6 text-orange/40" />
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export { OptimizedImage, type OptimizedImageProps, type AspectRatio };
