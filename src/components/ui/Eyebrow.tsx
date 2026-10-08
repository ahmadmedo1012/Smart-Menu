"use client";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      /* r95: SmartBot twin — النصي الأسطع (#df5a00) في الداكن؛ /90 الحرفية من المواصفة
         محفوظة في الداكن (≈5.5:1 ✓) بينما الفاتح يبقى بعتامة كاملة (بوابة AA §7:
         oklch(0.55 0.19 45)/90 على الكريمي = 4.32:1 ✗ — نفس قياس round94 أدناه). */
      /* r120 (U4-P3-1): font-naskh أُسقطت — خط النسخ (114KB) كان يُحمَّل لكامل
         الصفحة الرئيسية لأجل تسمية 11px واحدة فقط. القيمة الآن ترث خط
         القاهرة (Cairo) الأساسي — توفير ~17% من حجم الصفحة. */
      /* r125 (10-a): tracking-[0.18em] حُذفت — قانون مدارك §6.4/§6.5:
         دور Label (11px) letter-spacing: 0 في كلا الاتجاهين؛ الفاصل
         كان يعطّله حارس RTL أصلًا (أثر صفري عربيًا) وبقي مخاطرة انجراف
         للاتيني. */
      "inline-flex items-center gap-2 text-2xs font-medium uppercase text-accent-foreground/90 mb-5",
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
