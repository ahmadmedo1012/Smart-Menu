"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function StickyMenuHeader({
  name,
  logo,
}: {
  name: string;
  logo?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-14 flex items-center px-4 gap-3 transition-all duration-400",
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border/40 shadow-sm"
          : "bg-transparent",
      )}
    >
      <div
        className={cn(
          "size-8 rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden transition-all duration-400",
          scrolled
            ? logo
              ? "ring-1 ring-border/30"
              : "bg-gradient-to-br from-amber-400 to-amber-600"
            : logo
              ? "ring-1 ring-white/20"
              : "bg-gradient-to-br from-amber-400/80 to-amber-600/80",
        )}
      >
        {logo ? (
          <img src={logo} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "font-bold text-sm truncate block transition-all duration-400",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        >
          {name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {!scrolled && (
          <div className="animate-float">
            <ChevronDown className="size-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
