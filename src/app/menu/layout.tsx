"use client";

import CartFloatingButton from "@/components/menu/CartFloatingButton";
import { Header } from "@/components/layout/Header";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">{children}</div>
      <CartFloatingButton />
    </div>
  );
}
