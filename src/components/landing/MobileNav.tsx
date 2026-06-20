"use client";
import Link from "next/link";
import { X, Store, Star, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const PARTNER_SLUG = "pizza-roma";

export default function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />}
      <div className={cn("fixed top-0 left-0 bottom-0 z-50 w-72 bg-background border-l shadow-2xl transition-transform duration-400 ease-out",
        open ? "translate-x-0" : "-translate-x-full")}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            <span className="text-lg font-bold text-gradient">الربط الذكي</span>
            <button onClick={onClose} className="size-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors">
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Link href="/pricing" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
              <Star className="size-4 text-amber-500" /> الخطط والأسعار
            </Link>
            <Link href={`/menu/${PARTNER_SLUG}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
              <Store className="size-4 text-amber-500" /> منيو تجريبي
            </Link>
            <Link href="/login" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
              <LayoutDashboard className="size-4 text-amber-500" /> لوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
