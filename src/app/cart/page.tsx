"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from "lucide-react";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const pickupLabels: Record<string, string> = {
  inside: "داخل المكان",
  takeaway: "سفري",
  delivery: "توصيل",
};

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    customerName,
    customerPhone,
    notes,
    pickupType,
    updateQuantity,
    updateNotes,
    removeItem,
    setCustomerName,
    setCustomerPhone,
    setOrderNotes,
    setPickupType,
  } = useCart();

  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartSubtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return;
    setIsSubmitting(true);
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
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "فشل إنشاء الطلب");
      router.push(`/order-confirmed?orderNo=${order.orderNo}`);
    } catch {
      // The API is not built yet — will work once backend is ready
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --- Empty state --- */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4 text-center animate-fade-in">
        <div className="size-20 rounded-full bg-muted flex items-center justify-center">
          <ShoppingCart className="size-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">السلة فارغة</h2>
        <p className="text-muted-foreground">أضف بعض الأصناف إلى السلة</p>
        <Link href="/menu">
          <Button variant="default">
            <ArrowLeft className="ml-2 size-4" />
            العودة إلى القائمة
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/menu"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">سلة الطلب</h1>
      </div>

      {/* Cart Items */}
      <div className="space-y-3 mb-8">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.price} ر.س
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="size-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="size-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="size-7 rounded-md border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors mr-1"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="ملاحظات للصنف..."
              value={item.notes}
              onChange={(e) => updateNotes(item.id, e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        ))}
      </div>

      {/* Customer Info */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 mb-4">
        <h2 className="font-semibold mb-3">معلومات العميل</h2>
        <div className="space-y-3">
          <Input
            placeholder="الاسم"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            placeholder="رقم الجوال"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Pickup Type & Notes */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 mb-4">
        <h2 className="font-semibold mb-3">تفاصيل الطلب</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              نوع الطلب
            </label>
            <Select
              value={pickupType}
              onValueChange={(v) =>
                setPickupType(v as "inside" | "takeaway" | "delivery")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر نوع الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inside">داخل المكان</SelectItem>
                <SelectItem value="takeaway">سفري</SelectItem>
                <SelectItem value="delivery">توصيل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="ملاحظات إضافية للطلب..."
            value={notes}
            onChange={(e) => setOrderNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Subtotal & Checkout */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">المجموع</span>
          <span className="text-xl font-bold tabular-nums">
            {cartSubtotal} ر.س
          </span>
        </div>
        <Button
          className="w-full h-11 text-base"
          onClick={() => setShowPreview(true)}
          disabled={!customerName.trim() || !customerPhone.trim()}
        >
          تأكيد الطلب
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مراجعة الطلب</DialogTitle>
            <DialogDescription>
              تأكد من بيانات الطلب قبل الإرسال
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">العميل: </span>
              {customerName} — {customerPhone}
            </div>
            <div>
              <span className="text-muted-foreground">نوع الطلب: </span>
              {pickupLabels[pickupType]}
            </div>
            <hr className="border-border" />
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {item.name} x{item.quantity}
                </span>
                <span className="tabular-nums shrink-0">
                  {item.price * item.quantity} ر.س
                </span>
              </div>
            ))}
            <hr className="border-border" />
            <div className="flex justify-between font-bold text-base">
              <span>الإجمالي</span>
              <span className="tabular-nums">{cartSubtotal} ر.س</span>
            </div>
            {notes ? (
              <>
                <hr className="border-border" />
                <div>
                  <span className="text-muted-foreground">ملاحظات: </span>
                  {notes}
                </div>
              </>
            ) : null}
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPreview(false)}
            >
              تعديل
            </Button>
            <Button
              className="flex-1"
              onClick={handleCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الإرسال..." : "تأكيد وإرسال"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
