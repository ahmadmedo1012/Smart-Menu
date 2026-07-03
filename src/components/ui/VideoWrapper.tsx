"use client";

import { useRef, useEffect, useState, memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

type VideoWrapperProps = {
  src: string;
  poster?: string;
  className?: string;
  posterClassName?: string;
  onPlay?: () => void;
};

const VideoWrapper = memo(function VideoWrapper({
  src,
  poster = "",
  className = "",
  posterClassName = "",
  onPlay,
}: VideoWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // IntersectionObserver: load when 200px from viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Track play state
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldLoad) return;
    const onPlayCb = () => setHasPlayed(true);
    el.addEventListener("play", onPlayCb);
    return () => el.removeEventListener("play", onPlayCb);
  }, [shouldLoad]);

  // Fire onPlay when first play happens
  useEffect(() => {
    if (hasPlayed && onPlay) onPlay();
  }, [hasPlayed, onPlay]);

  // Cleanup on unmount
  useEffect(() => {
    const el = videoRef.current;
    return () => {
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ willChange: "transform" }}
    >
      {!shouldLoad && poster ? (
        <Image
          src={poster}
          alt=""
          fill
          className={cn("object-cover", posterClassName)}
          sizes="100vw"
          priority
        />
      ) : !shouldLoad ? (
        <div className="absolute inset-0 bg-card skeleton" />
      ) : null}

      {shouldLoad && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="size-full"
        >
          <video
            ref={videoRef}
            src={src}
            muted
            loop
            playsInline
            preload="none"
            autoPlay
            className="size-full object-cover"
          />
        </motion.div>
      )}
    </div>
  );
});

export { VideoWrapper, type VideoWrapperProps };
