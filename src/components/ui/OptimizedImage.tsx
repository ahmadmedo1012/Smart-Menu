"use client";

import { useState, memo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AspectRatio = "auto" | "square" | "video";

type OptimizedImageProps = {
  src: string;
  alt: string;
  aspectRatio?: AspectRatio;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  skeleton?: boolean;
  fallback?: ReactNode;
  onError?: () => void;
};

const aspectMap: Record<AspectRatio, string> = {
  auto: "aspect-auto",
  square: "aspect-square",
  video: "aspect-video",
};

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  aspectRatio = "auto",
  className = "",
  imageClassName = "",
  priority = false,
  skeleton = true,
  fallback,
  onError,
}: OptimizedImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[4px]",
        aspectMap[aspectRatio],
        className,
      )}
    >
      {/* Shimmer skeleton */}
      <AnimatePresence>
        {skeleton && status === "loading" && (
          <motion.div
            key="shimmer"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 shimmer"
            style={{
              background: "linear-gradient(90deg, transparent 0%, oklch(0.2 0 0 / 0.15) 50%, transparent 100%)",
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
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading={priority ? undefined : "lazy"}
          priority={priority}
          onLoad={() => setStatus("loaded")}
          onError={() => { setStatus("error"); onError?.(); }}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/40 to-transparent">
          {fallback || <span className="text-2xl text-orange/40">🍽️</span>}
        </div>
      )}
    </div>
  );
});

export { OptimizedImage, type OptimizedImageProps, type AspectRatio };
