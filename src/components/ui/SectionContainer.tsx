"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionContainerProps = {
  children: ReactNode;
  className?: string;
};

export const SectionContainer = forwardRef<HTMLDivElement, SectionContainerProps>(
  function SectionContainer({ children, className }, ref) {
    return (
      <section ref={ref} className={cn("relative py-12 sm:py-16 overflow-hidden", className)}>
        <div className="relative max-w-[1220px] mx-auto px-4 sm:px-6">
          {children}
        </div>
      </section>
    );
  }
);
