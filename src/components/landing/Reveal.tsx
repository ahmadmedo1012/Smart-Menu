"use client";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Reveal({
  children,
  delay = 0,
  className = "",
  animation = "animate-reveal",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  animation?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Content always visible. Animation is progressive enhancement on scroll.
  return (
    <div
      ref={ref}
      className={cn(animate && animation, className)}
      style={{
        transitionDelay: animate ? `${delay}s` : "0s",
        willChange: animate ? "transform, opacity" : "auto",
      }}
    >
      {children}
    </div>
  );
}
