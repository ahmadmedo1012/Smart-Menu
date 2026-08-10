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
					"relative py-12 sm:py-16 overflow-hidden transition-colors",
					tone === "alt" && "bg-[var(--surface-sunken)]/60 border-y border-border/40",
					className
				)}
			>
				<div className="relative max-w-[1220px] mx-auto px-4 sm:px-6">{children}</div>
			</section>
		);
	}
);
