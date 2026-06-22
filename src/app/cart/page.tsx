"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, MessageCircle, Check, Sparkles, Loader2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { toArabicNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PICKUP_LABELS: Record<string, string> = {
  inside: "داخل المكان",
  takeaway: "سفري",
  delivery: "توصيل",
};

const PICKUP_OPTIONS = [
  { value: "inside", label: "داخل المكان", icon: "🍽️" },
  { value: "takeaway", label: "سفري", icon: "🛍️" },
  { value: "delivery", label: "توصيل", icon: "🚚" },
] as const;

export default function CartPage() {
  const router = useRouter();
  const {
    restaurantId,
    items,
    customerName,
    customerPhone,
    notes,
    pickupType,
    updateQuantity,
    removeItem,
    setOrderNotes,
    updateNotes,
    setPickupType,
  } = useCart();

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [animateItems, setAnimateItems] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimateItems(true), 50);
  }, []);

  const cartSubtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": document.cookie.split("; ").find(r => r.startsWith("csrf-token="))?.split("=")[1] ?? "" },
        body: JSON.stringify({
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes,
            price: i.price,
          })),
          customerName,
          customerPhone,
          notes,
          pickupType,
          subtotal: cartSubtotal,
          total: cartSubtotal,
          restaurantId: restaurantId || undefined,
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "فشل إنشاء الطلب");

      toast.success("تم إنشاء الطلب بنجاح! ✓");
      setConfirmed(true);
      setTimeout(() => {
        router.push(`/order-confirmed?orderNo=${order.data?.orderNo ?? ""}`);
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 px-4 text-center animate-fade-in">
        <div className="size-24 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center animate-float">
          <ShoppingCart className="size-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">السلة فارغة</h2>
        <p className="text-muted-foreground">أضف بعض الأصناف إلى السلة</p>
        <Link href="/menu">
          <Button size="lg" className="rounded-xl px-8 gap-2">
            <ArrowLeft className="size-4" />
            العودة إلى القائمة
          </Button>
        </Link>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center animate-scale-in">
        <div className="size-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 animate-scale-in">
          <Check className="size-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">تم تأكيد الطلب!</h2>
        <p className="text-muted-foreground flex items-center gap-2">
          جاري تحويلك إلى صفحة التأكيد...
          <Loader2 className="size-4 animate-spin" />
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 animate-slide-down">
        <Link href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">سلة الطلب</h1>
        <div className="relative">
          <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/30">
            {toArabicNumber(items.length)} {items.length > 10 ? "صنف" : "أصناف"}
          </span>
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary animate-pulse-glow" />
        </div>
      </div>

      {/* Pickup type selector */}
      <div className="flex gap-2 mb-8 animate-slide-up delay-100">
        {PICKUP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPickupType(opt.value as typeof pickupType)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 border",
              pickupType === opt.value
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]"
                : "bg-card/50 border-border/30 hover:border-amber-200/30 hover:shadow-md",
            )}
          >
            <span className="text-lg">{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Cart items */}
      <div className="space-y-4 mb-8">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl bg-card/60 border border-border/30 p-4 transition-all duration-500 hover:border-amber-200/30 hover:shadow-lg hover:-translate-y-0.5",
              animateItems ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
            style={{ transitionDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary tabular-nums">{toArabicNumber(item.quantity)}</span>
                </div>
                <div>
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    {toArabicNumber(item.price.toFixed(1))} د.ل / للواحد
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-300/30 transition-all active:scale-90">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center font-bold tabular-nums text-lg">{toArabicNumber(item.quantity)}</span>
                <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-300/30 transition-all active:scale-90">
                  <Plus className="size-3.5" />
                </button>
                <button type="button" onClick={() => removeItem(item.id)}
                  className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-all mr-1 active:scale-90">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <input type="text" placeholder="ملاحظات للصنف..." value={item.notes}
              onChange={(e) => updateNotes(item.id, e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card/60 border border-border/30 p-5 mb-6 animate-slide-up delay-300">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          ملاحظات إضافية
        </h2>
        <textarea placeholder="أي ملاحظات للطلب..." value={notes}
          onChange={(e) => setOrderNotes(e.target.value)} rows={2}
          className="w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20 resize-none" />
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-200/20 p-5 mb-8 animate-slide-up delay-400">
        <h3 className="text-sm font-bold mb-4 text-muted-foreground">ملخص الطلب</h3>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm group hover:bg-amber-500/5 -mx-2 px-2 py-1 rounded-lg transition-colors">
              <span className="text-muted-foreground truncate ml-2">
                {item.name}
                <span className="text-muted-foreground/60 mr-1">×{toArabicNumber(item.quantity)}</span>
              </span>
              <span className="font-medium tabular-nums shrink-0">
                {toArabicNumber((item.price * item.quantity).toFixed(1))} د.ل
              </span>
            </div>
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-amber-200/30 to-transparent my-3" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">المجموع الإجمالي</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary tabular-nums">{toArabicNumber(cartSubtotal.toFixed(1))}</span>
            <span className="text-sm text-muted-foreground">د.ل</span>
          </div>
        </div>
      </div>

      <Button className="w-full h-14 text-base font-semibold rounded-2xl gap-2 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300"
        onClick={() => setShowPreview(true)} size="lg" disabled={items.length === 0}>
        <MessageCircle className="size-5" />
        مراجعة الطلب وإرساله
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="rounded-3xl gap-0 p-0 overflow-hidden sm:max-w-md">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">مراجعة الطلب</DialogTitle>
              <DialogDescription className="text-white/80">
                تأكد من بيانات الطلب قبل الإرسال
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">نوع الطلب:</span>
              <span className="font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {pickupType === "inside" ? "🍽️ " : pickupType === "takeaway" ? "🛍️ " : "🚚 "}
                {PICKUP_LABELS[pickupType]}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground mr-1">× {toArabicNumber(item.quantity)}</span>
                    {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">📝 {item.notes}</p>}
                  </div>
                  <span className="tabular-nums shrink-0 font-medium">
                    {toArabicNumber((item.price * item.quantity).toFixed(1))} د.ل
                  </span>
                </div>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-200/30 to-transparent" />
            <div className="flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="tabular-nums text-primary">{toArabicNumber(cartSubtotal.toFixed(1))} د.ل</span>
            </div>
            {notes && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground font-medium">ملاحظات: </span>
                <span>{notes}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-5 pt-0">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPreview(false)}>تعديل</Button>
            <Button className="flex-1 rounded-xl gap-2" onClick={handleCheckout} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> جاري...</> : <><MessageCircle className="size-4" /> تأكيد وإرسال</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
