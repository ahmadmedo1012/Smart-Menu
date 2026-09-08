"use client";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      /* round94 (D A-مجاورة): /90 كانت 4.32:1 لنص 11px في الفاتح — القياسي 5.01:1 ✓ */
      "font-naskh inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-orange mb-5",
      className
    )}>
      {/* Animated pulsing dot — subtle premium indicator */}
      <span
        className="inline-block size-1 rounded-full bg-orange animate-pulse-dot shrink-0"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
