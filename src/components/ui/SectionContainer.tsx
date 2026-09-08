"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionContainerProps = {
        children: ReactNode;
        className?: string;
        /** Visual separation tone: "default" (flat background) or "alt" (subtle raised band) */
        tone?: "default" | "alt";
};

export const SectionContainer = forwardRef<HTMLDivElement, SectionContainerProps>(
        function SectionContainer({ children, className, tone = "default" }, ref) {
                return (
                        <section
                                ref={ref}
                                className={cn(
                                        "relative scroll-mt-20 py-16 sm:py-24 lg:py-28 overflow-hidden transition-[background-color,border-color] duration-300",
                                        tone === "alt" && "bg-[var(--surface-sunken)]/60 border-y border-border/40",
                                        className
                                )}
                        >
                                <div className="relative max-w-[1220px] mx-auto px-4 sm:px-6">{children}</div>
                                {/* r95: الحاوية مطابقة حرفياً لإيقاع SmartBot (§4) — تحقق فقط، لا تغيير */}
                        </section>
                );
        }
);
