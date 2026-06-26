"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import { toArabicNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";

export default function CartFloatingButton() {
  const totalItems = useCart((s) => s.totalItems());
  const subtotal = useCart((s) => s.subtotal());
  const prevRef = useRef(totalItems);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (totalItems > prevRef.current && prevRef.current > 0) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 500);
      prevRef.current = totalItems;
      return () => clearTimeout(t);
    }
    prevRef.current = totalItems;
  }, [totalItems]);

  if (totalItems === 0) return null;

  return (
    <Link
      href="/cart"
      aria-label={`السلة - ${toArabicNumber(totalItems)} أصناف`}
      className={cn(
        buttonVariants({ variant: "gradient" }),
        "fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] end-6 z-[60]",
        "flex items-center gap-3 rounded-full px-5 py-3 h-auto",
        "shadow-xl shadow-orange/20",
        "hover:shadow-2xl hover:shadow-orange/30",
        "active:scale-95 transition-all duration-300",
        "animate-slide-up",
        bounce && "scale-110",
      )}
    >
      <div className="relative">
        <ShoppingCart className="size-5" />
        <span
          className={cn(
            "absolute -top-2 -end-2 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center transition-all duration-300",
            bounce && "scale-125",
          )}
        >
          {totalItems > 9 ? "9+" : toArabicNumber(totalItems)}
        </span>
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {toArabicNumber(subtotal.toFixed(1))} د.ل
      </span>
    </Link>
  );
}
