"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import { toArabicNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CartFloatingButton() {
  const totalItems = useCart((s) => s.totalItems());
  const subtotal = useCart((s) => s.subtotal());

  if (totalItems === 0) return null;

  return (
    <Link
      href="/cart"
      className={cn(
        "fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full",
        "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
        "px-5 py-3 shadow-xl shadow-amber-500/25",
        "hover:shadow-2xl hover:shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700",
        "active:scale-95 transition-all duration-300",
        "animate-slide-up",
      )}
    >
      <div className="relative">
        <ShoppingCart className="size-5" />
        <span className="absolute -top-2 -right-2 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {totalItems > 9 ? "9+" : toArabicNumber(totalItems)}
        </span>
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {toArabicNumber(subtotal.toFixed(1))} د.ل
      </span>
    </Link>
  );
}
