"use client";

import CartSlideOver from "@/components/menu/CartSlideOver";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
      <CartSlideOver />
    </div>
  );
}
