"use client";

import { useState, useEffect } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, MessageCircle, Check, Sparkles, Loader2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { toArabicNumber } from "@/lib/format";
import { buildReceiptMessage } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
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
  { value: "inside", label: "داخل المكان", icon: "inside" },
  { value: "takeaway", label: "سفري", icon: "takeaway" },
  { value: "delivery", label: "توصيل", icon: "delivery" },
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
    restaurantWhatsapp,
    restaurantName,
    updateQuantity,
    removeItem,
    setOrderNotes,
    updateNotes,
    setPickupType,
    setCustomerName,
    setCustomerPhone,
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

    // 1. Send WhatsApp receipt to restaurant FIRST
    const receipt = buildReceiptMessage({
      restaurantName: restaurantName || "المطعم",
      items: items.map(i => ({ name: i.name, qty: i.quantity, price: i.price, notes: i.notes || undefined })),
      totalPrice: cartSubtotal,
      notes: notes || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      pickupType,
    });
    const waNumber = restaurantWhatsapp.replace(/^\+/, "");
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(receipt)}`, "_blank");
    }

    // 2. Save order to DB (best-effort)
    try {
      await csrfFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ itemId: i.itemId, quantity: i.quantity, notes: i.notes, price: i.price })),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes,
          pickupType,
          subtotal: cartSubtotal,
          total: cartSubtotal,
          restaurantId: restaurantId || undefined,
        }),
      });
    } catch {}

    setConfirmed(true);
    setIsSubmitting(false);
    setTimeout(() => {
      router.push(`/order-confirmed?wa=${encodeURIComponent(waNumber)}`);
    }, 1500);
  };

  if (items.length === 0 && !confirmed) {
    return (
      <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 px-4 text-center animate-fade-in">
        <div className="size-16 rounded-md bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center animate-float">
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
      </>
    );
  }

  if (confirmed) {
    return (
      <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center animate-scale-in">
        <div className="size-24 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-6 animate-scale-in">
          <Check className="size-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">تم تأكيد الطلب!</h2>
        <p className="text-muted-foreground flex items-center gap-2">
          جاري تحويلك إلى صفحة التأكيد...
          <Loader2 className="size-4 animate-spin" />
        </p>
      </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in pt-20">
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
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary animate-breath" />
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
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-md text-sm font-medium transition-all duration-300 border",
              pickupType === opt.value
                ? "bg-gradient-to-r from-orange to-orange/80 text-white border-orange shadow-lg shadow-orange/20 scale-[1.02]"
                : "bg-card/50 border-border/30 hover:border-orange/20 hover:shadow-md",
            )}
          >
            {opt.icon === "inside" ? (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            ) : opt.icon === "takeaway" ? (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            ) : (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            )}
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
              "rounded-md bg-card/60 border border-border/30 p-4 transition-all duration-500 hover:border-orange/20 hover:shadow-lg hover:-translate-y-0.5",
              animateItems ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
            style={{ transitionDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center shrink-0">
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
                  className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-orange-muted hover:border-orange/30 transition-all active:scale-90">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center font-bold tabular-nums text-lg">{toArabicNumber(item.quantity)}</span>
                <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-orange-muted hover:border-orange/30 transition-all active:scale-90">
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
              className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20" />
          </div>
        ))}
      </div>

      <div className="rounded-md bg-card/60 border border-border/30 p-5 mb-6 animate-slide-up delay-300">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          ملاحظات إضافية
        </h2>
        <textarea placeholder="أي ملاحظات للطلب..." value={notes}
          onChange={(e) => setOrderNotes(e.target.value)} rows={2}
          className="w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20 resize-none" />
      </div>

      {/* Customer info */}
      <div className="rounded-md bg-card/60 border border-border/30 p-5 mb-6 animate-slide-up delay-250">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          معلومات الاتصال
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cart-name" className="block text-xs text-muted-foreground mb-1.5">الاسم</label>
            <input id="cart-name" type="text" dir="auto" placeholder="الاسم (اختياري)" maxLength={30}
              value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-11 rounded-xl border border-input bg-transparent px-4 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20" />
          </div>
          <div>
            <label htmlFor="cart-phone" className="block text-xs text-muted-foreground mb-1.5">رقم الهاتف</label>
            <input id="cart-phone" type="tel" dir="auto" placeholder="رقم الهاتف (اختياري)" maxLength={15}
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full h-11 rounded-xl border border-input bg-transparent px-4 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20" />
          </div>
        </div>
      </div>

      <div className="rounded-md bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mb-8 animate-slide-up delay-400">
        <h3 className="text-sm font-bold mb-4 text-muted-foreground">ملخص الطلب</h3>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm group hover:bg-orange-muted/50 -mx-2 px-2 py-1 rounded-sm transition-colors">
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
        <div className="h-px bg-gradient-to-r from-transparent via-orange/30 to-transparent my-3" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">المجموع الإجمالي</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary tabular-nums">{toArabicNumber(cartSubtotal.toFixed(1))}</span>
            <span className="text-sm text-muted-foreground">د.ل</span>
          </div>
        </div>
      </div>

      <Button className="w-full h-14 text-base font-semibold rounded-md gap-2 shadow-lg shadow-orange/20 hover:shadow-xl hover:shadow-orange/30 transition-all duration-300"
        onClick={() => setShowPreview(true)} size="lg" disabled={items.length === 0}>
        <MessageCircle className="size-5" />
        مراجعة الطلب وإرساله
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="rounded-md gap-0 p-0 overflow-hidden sm:max-w-md">
          <div className="bg-gradient-to-r from-orange to-orange/80 p-5 text-white">
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
              <span className="font-medium px-3 py-1 rounded-full bg-orange-muted text-orange/80 dark:text-orange">
                {pickupType === "inside" ? (
                  <svg className="size-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ) : pickupType === "takeaway" ? (
                  <svg className="size-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                ) : (
                  <svg className="size-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                )}
                {PICKUP_LABELS[pickupType]}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground mr-1">× {toArabicNumber(item.quantity)}</span>
                    {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1"><svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> {item.notes}</p>}
                  </div>
                  <span className="tabular-nums shrink-0 font-medium">
                    {toArabicNumber((item.price * item.quantity).toFixed(1))} د.ل
                  </span>
                </div>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-orange/20 to-transparent" />
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
  </>
  );
}
