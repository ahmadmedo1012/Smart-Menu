"use client";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      /* r95: SmartBot twin — النصي الأسطع (#df5a00) في الداكن؛ /90 الحرفية من المواصفة
         محفوظة في الداكن (≈5.5:1 ✓) بينما الفاتح يبقى بعتامة كاملة (بوابة AA §7:
         oklch(0.55 0.19 45)/90 على الكريمي = 4.32:1 ✗ — نفس قياس round94 أدناه). */
      "font-naskh inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-foreground dark:text-accent-foreground/90 mb-5",
      className
    )}>
      {/* Animated pulsing dot — subtle premium indicator */}
      {/* r95: bg-primary (اللهب الصلب) — مواصفة §3 */}
      {/* round94 (D A-مجاورة): /90 كانت 4.32:1 لنص 11px في الفاتح — القياسي 5.01:1 ✓ */}
      <span
        className="inline-block size-1 rounded-full bg-primary animate-pulse-dot shrink-0"
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
