"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, MessageCircle, X, Check, Store } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MenuItemProp } from "./MenuItemCard";
import { toArabicNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildReceiptMessage } from "@/lib/receipt";

type OrderDialogProps = {
  item: MenuItemProp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantWhatsapp?: string;
  restaurantName?: string;
  restaurantId: number;
  restaurantLogo?: string;
  restaurantSlug?: string;
};

const QUICK_NOTES = [
  "بدون سكر", "سكر زيادة", "بدون ثلج", "حار", "بارد", "بدون بصل",
];

export default function OrderDialog({
  item,
  open,
  onOpenChange,
  restaurantWhatsapp,
  restaurantName,
  restaurantId,
  restaurantLogo,
  restaurantSlug,
}: OrderDialogProps) {
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) { setNotes(""); setQuantity(1); setSubmitting(false); setConfirmed(false); setOrderType("delivery"); setCustomerName(""); setCustomerPhone(""); }
  }, [open, item?.id]);

  if (!item) return null;

  const displayName = item.nameAr || item.name;
  const currentPrice = item.discountedPrice ?? item.price;
  const totalPrice = currentPrice * quantity;
  const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;

  const handleConfirm = async () => {
    if (!restaurantWhatsapp) return;
    setSubmitting(true);

    // Save order to DB (best-effort — WhatsApp receipt is primary)
    try {
      const orderRes = await csrfFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ itemId: item.id, quantity, notes: notes.trim(), price: currentPrice }],
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes,
          pickupType: orderType,
          subtotal: totalPrice,
          total: totalPrice,
          restaurantId,
        }),
      });
      if (!orderRes.ok) console.warn("Order DB save failed:", await orderRes.text());
    } catch (e) { console.warn("Order DB save error:", e); }

    const origin = window.location.origin;
    const menuUrl = restaurantSlug ? `${origin}/menu/${restaurantSlug}` : undefined;

    const receipt = buildReceiptMessage({
      restaurantName: restaurantName || "المطعم",
      items: [{ name: displayName, qty: quantity, price: currentPrice, notes: notes.trim() || undefined }],
      totalPrice,
      notes: notes.trim() || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      pickupType: orderType,
      menuUrl: menuUrl,
    });

    const encoded = encodeURIComponent(receipt);
    const waNumber = restaurantWhatsapp.replace(/^\+/, "");
    window.open(`https://wa.me/${waNumber}?text=${encoded}`, "_blank");

    setSubmitting(false);
    setConfirmed(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 1500);
  };

  const toggleQuickNote = (note: string) => {
    setNotes((prev) => {
      if (prev.includes(note)) return prev.replace(note, "").replace(/\s+/g, " ").trim();
      return prev ? `${prev}، ${note}` : note;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden rounded-3xl" showCloseButton={false}>
        {/* Image preview */}
        {item.image && (
          <div className="relative h-44 bg-muted overflow-hidden">
            <img src={item.image} alt={displayName} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            <button type="button" onClick={() => onOpenChange(false)}
              className="absolute top-3 start-3 size-8 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <X className="size-4" />
            </button>
            <div className="absolute bottom-4 end-4 start-16">
              <h3 className="text-white font-bold text-lg drop-shadow-sm">{displayName}</h3>
            </div>
          </div>
        )}

        {confirmed ? (
          <div className="p-10 text-center animate-scale-in">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="size-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-1">تم إرسال الطلب! <svg className="size-5 inline text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4M7.5 7.5l.5-.5M16.5 7.5l-.5-.5M12 5.5V3M12 21v-2.5M5.5 12H3M21 12h-2.5"/></svg></h3>
            <p className="text-sm text-muted-foreground">جاري فتح واتساب لتأكيد الإرسال</p>
          </div>
        ) : (
          <div className={cn("p-6 space-y-4", !item.image && "pt-8")}>
            {!item.image && (
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">{displayName}</h3>
              </div>
            )}

            {/* Restaurant info bar */}
            <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
              <div className="size-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                {restaurantLogo ? (
                  <img src={restaurantLogo} alt="" className="size-full object-cover rounded-xl" loading="lazy" />
                ) : (
                  <Store className="size-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{restaurantName || "المطعم"}</p>
                <p className="text-xs text-muted-foreground">طلب جديد</p>
              </div>
              {hasDiscount && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  -{Math.round((1 - item.discountedPrice! / item.price) * 100)}%
                </span>
              )}
            </div>

            {/* Customer info */}
            <div className="grid grid-cols-2 gap-2">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="الاسم (اختياري)" maxLength={30}
                className="h-11 rounded-xl border border-border/30 bg-card/50 px-4 text-sm outline-none focus-visible:border-blue-300" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)" maxLength={15} dir="ltr"
                className="h-11 rounded-xl border border-border/30 bg-card/50 px-4 text-sm outline-none focus-visible:border-blue-300 text-left" />
            </div>

            {/* Quantity selector */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-500/5 to-blue-600/5 border border-blue-200/20 p-4">
              <div>
                <span className="text-xs text-muted-foreground">السعر</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-bold text-xl text-primary tabular-nums">{toArabicNumber(currentPrice.toFixed(1))}</span>
                  <span className="text-xs text-muted-foreground">د.ل</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                  className="size-10 rounded-xl border border-border/40 flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-300/30 disabled:opacity-30">
                  <Minus className="size-4" />
                </button>
                <span className="font-bold text-xl min-w-[2.5ch] text-center tabular-nums">{toArabicNumber(quantity)}</span>
                <button type="button" onClick={() => setQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99}
                  className="size-10 rounded-xl border border-border/40 flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-300/30 disabled:opacity-30">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Order type */}
            <div className="flex gap-2">
              {(["delivery", "takeaway"] as const).map(type => (
                <button key={type} type="button" onClick={() => setOrderType(type)}
                  className={cn("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    orderType === type
                      ? "bg-blue-500/10 border-blue-300/30 text-blue-700 dark:text-blue-300"
                      : "border-border/30 text-muted-foreground hover:border-blue-200/30")}>
                  {type === "delivery" ? "توصيل" : "استلام"}
                </button>
              ))}
            </div>

            {/* Quick notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">إضافات</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((note) => (
                  <button key={note} type="button" onClick={() => toggleQuickNote(note)}
                    className={cn("px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                      notes.includes(note)
                        ? "bg-blue-500/10 border-blue-300/30 text-blue-700 dark:text-blue-300"
                        : "bg-muted/30 border-border/30 text-muted-foreground hover:border-blue-200/30")}>
                    {note}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية للطلب..."
              rows={2} className="w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm outline-none transition-all focus-visible:border-blue-300 focus-visible:ring-4 focus-visible:ring-blue-500/20 resize-none" />

            {/* Total + WhatsApp */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-t border-dashed border-border/40 pt-3">
                <span className="font-bold text-sm">المجموع</span>
                <span className="font-bold text-xl text-primary tabular-nums">
                  {toArabicNumber(totalPrice.toFixed(1))} <span className="text-sm font-normal text-muted-foreground">د.ل</span>
                </span>
              </div>
              <Button className="w-full h-12 rounded-xl gap-2 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20"
                onClick={handleConfirm} disabled={submitting || !restaurantWhatsapp}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    جاري...
                  </span>
                ) : (
                  <><MessageCircle className="size-5 text-white" /> أرسل الطلب عبر واتساب</>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground/60">
                سيتم فتح واتساب مع رسالة الطلب لإرسالها مباشرة
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
