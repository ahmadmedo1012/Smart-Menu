"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionContainerProps = {
  children: ReactNode;
  className?: string;
};

export function SectionContainer({ children, className }: SectionContainerProps) {
  return (
    <section className={cn("relative py-12 sm:py-16 overflow-hidden", className)}>
      <div className="relative max-w-[1220px] mx-auto px-4 sm:px-6">
        {children}
      </div>
    </section>
  );
}
