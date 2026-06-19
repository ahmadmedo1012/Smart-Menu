"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, MessageCircle, Check } from "lucide-react";
import { useCart } from "@/store/cart";
import { toArabicNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    items,
    customerName,
    customerPhone,
    notes,
    pickupType,
    updateQuantity,
    removeItem,
    setCustomerName,
    setCustomerPhone,
    setOrderNotes,
    updateNotes,
    setPickupType,
  } = useCart();

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const cartSubtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // --- Empty state ---
  if (items.length === 0 && !confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 px-4 text-center animate-fade-in">
        <div className="size-24 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center">
          <ShoppingCart className="size-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">السلة فارغة</h2>
        <p className="text-muted-foreground">أضف بعض الأصناف إلى السلة</p>
        <Link href="/menu">
          <Button size="lg" className="rounded-xl px-8">
            <ArrowLeft className="ml-2 size-4" />
            العودة إلى القائمة
          </Button>
        </Link>
      </div>
    );
  }

  // --- Success state ---
  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center animate-scale-in">
        <div className="size-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
          <Check className="size-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">تم تأكيد الطلب!</h2>
        <p className="text-muted-foreground">جاري تحويلك إلى صفحة التأكيد...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">سلة الطلب</h1>
        <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {toArabicNumber(items.length)} صنف
        </span>
      </div>

      {/* Pickup type selector */}
      <div className="flex gap-2 mb-6">
        {PICKUP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPickupType(opt.value as typeof pickupType)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all duration-300 border",
              pickupType === opt.value
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]"
                : "bg-card/50 border-border/30 hover:border-amber-200/30",
            )}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Cart items */}
      <div className="space-y-3 mb-8">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-card/60 border border-border/30 p-4 transition-all hover:border-amber-200/30 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-sm text-muted-foreground tabular-nums mt-0.5">
                  {toArabicNumber(item.price.toFixed(1))} د.ل / للواحد
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-300/30 transition-all"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center font-bold tabular-nums">
                  {toArabicNumber(item.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-300/30 transition-all"
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-all mr-1"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="ملاحظات للصنف..."
              value={item.notes}
              onChange={(e) => updateNotes(item.id, e.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20"
            />
          </div>
        ))}
      </div>

      {/* Customer info */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-5 mb-4">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          معلومات العميل
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            placeholder="الاسم"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder="رقم الجوال"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="h-11 rounded-xl text-left"
            dir="ltr"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-2xl bg-card/60 border border-border/30 p-5 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          ملاحظات إضافية
        </h2>
        <textarea
          placeholder="أي ملاحظات للطلب..."
          value={notes}
          onChange={(e) => setOrderNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20 resize-none"
        />
      </div>

      {/* Summary & Checkout */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-200/20 p-5 mb-8">
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground truncate ml-2">
                {item.name} × {toArabicNumber(item.quantity)}
              </span>
              <span className="font-medium tabular-nums shrink-0">
                {toArabicNumber((item.price * item.quantity).toFixed(1))} د.ل
              </span>
            </div>
          ))}
        </div>
        <hr className="border-amber-200/20 my-3" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">المجموع</span>
          <span className="text-2xl font-bold text-primary tabular-nums">
            {toArabicNumber(cartSubtotal.toFixed(1))} د.ل
          </span>
        </div>
      </div>

      {/* Checkout button */}
      <Button
        className="w-full h-13 text-base font-semibold rounded-2xl gap-2"
        onClick={() => setShowPreview(true)}
        size="lg"
      >
        <MessageCircle className="size-5" />
        تأكيد الطلب عبر واتساب
      </Button>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>مراجعة الطلب</DialogTitle>
            <DialogDescription>
              تأكد من بيانات الطلب قبل الإرسال
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">العميل:</span>
              <span className="font-medium">{customerName}</span>
              <span dir="ltr" className="text-muted-foreground">— {customerPhone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">نوع الطلب: </span>
              <span className="font-medium">{PICKUP_LABELS[pickupType]}</span>
            </div>
            <hr className="border-border" />
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="truncate">{item.name} × {toArabicNumber(item.quantity)}</span>
                <span className="tabular-nums shrink-0 font-medium">
                  {toArabicNumber((item.price * item.quantity).toFixed(1))} د.ل
                </span>
              </div>
            ))}
            <hr className="border-border" />
            <div className="flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="tabular-nums">{toArabicNumber(cartSubtotal.toFixed(1))} د.ل</span>
            </div>
            {notes && (
              <>
                <hr className="border-border" />
                <div>
                  <span className="text-muted-foreground">ملاحظات: </span>
                  {notes}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPreview(false)}>
              تعديل
            </Button>
            <Button className="flex-1 rounded-xl" onClick={handleCheckout} disabled={isSubmitting}>
              {isSubmitting ? "جاري الإرسال..." : "تأكيد وإرسال"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
