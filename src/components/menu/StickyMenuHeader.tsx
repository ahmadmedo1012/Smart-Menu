"use client";

import { useEffect, useState } from "react";
import { Store, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StickyMenuHeader({ name }: { name: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3 transition-all duration-400",
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border/40 shadow-sm"
          : "bg-transparent",
      )}
    >
      <div className={cn(
        "size-8 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-all duration-400",
        scrolled
          ? "bg-gradient-to-br from-amber-400 to-amber-600"
          : "bg-gradient-to-br from-amber-400/80 to-amber-600/80",
      )}>
        <Store className="size-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "font-bold text-sm truncate block transition-all duration-400",
          scrolled ? "opacity-100" : "opacity-0",
        )}>
          {name}
        </span>
      </div>
      {!scrolled && (
        <div className="animate-float">
          <ChevronDown className="size-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
