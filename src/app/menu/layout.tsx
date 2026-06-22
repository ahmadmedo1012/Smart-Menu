"use client";

import CartFloatingButton from "@/components/menu/CartFloatingButton";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <CartFloatingButton />
    </div>
  );
}
