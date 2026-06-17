"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";

export default function CartFloatingButton() {
  const totalItems = useCart((s) => s.totalItems());

  if (totalItems === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 shadow-lg hover:bg-primary/90 active:scale-95 transition-all animate-slide-up"
    >
      <ShoppingCart className="size-5" />
      <span className="text-sm font-medium tabular-nums">{totalItems}</span>
    </Link>
  );
}
