"use client";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "font-naskh inline-flex items-center text-sm font-semibold text-orange mb-5",
      className
    )}>
      {children}
    </span>
  );
}
