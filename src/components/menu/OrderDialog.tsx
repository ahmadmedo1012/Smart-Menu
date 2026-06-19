"use client";

import { useState, useEffect } from "react";
import { Minus, Plus, MessageCircle, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MenuItemProp } from "./MenuItemCard";
import { toArabicNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type OrderDialogProps = {
  item: MenuItemProp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantWhatsapp?: string;
  restaurantName?: string;
  restaurantId?: number;
  restaurantLogo?: string;
};

const QUICK_NOTES = [
  "بدون سكر", "سكر زيادة", "بدون ثلج", "حار", "بارد", "بدون بصل",
];

/** Format order as a clean receipt-style text for WhatsApp */
function buildReceiptMessage(opts: {
  restaurantName: string;
  restaurantLogo?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string;
}): string {
  const sep = "─".repeat(28);
  const lines: string[] = [];

  // Header: restaurant name
  lines.push(`🛒 *${opts.restaurantName}*`);
  lines.push(sep);
  lines.push("");

  // Item line
  lines.push(`*${opts.itemName}*`);
  lines.push(`  ${opts.quantity} × ${toArabicNumber(opts.unitPrice.toFixed(1))} د.ل`);
  if (opts.notes) {
    lines.push(`  📝 ${opts.notes}`);
  }
  lines.push("");

  // Total
  lines.push(sep);
  lines.push(`*المجموع:*   ${toArabicNumber(opts.totalPrice.toFixed(1))} د.ل`);
  lines.push(sep);
  lines.push("");

  // Footer
  lines.push(`_تم الطلب عبر ${opts.restaurantName}_`);
  lines.push(`_شكراً لطلبكم!_ 🍽️`);

  return lines.join("\n");
}

export default function OrderDialog({
  item,
  open,
  onOpenChange,
  restaurantWhatsapp,
  restaurantName,
  restaurantId,
  restaurantLogo,
}: OrderDialogProps) {
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) { setNotes(""); setQuantity(1); setSubmitting(false); setConfirmed(false); }
  }, [open, item?.id]);

  if (!item) return null;

  const displayName = item.nameAr || item.name;
  const currentPrice = item.discountedPrice ?? item.price;
  const totalPrice = currentPrice * quantity;
  const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;

  const handleConfirm = async () => {
    if (!restaurantWhatsapp) return;
    setSubmitting(true);

    // Save order to DB (best-effort)
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ itemId: item.id, quantity, notes, price: currentPrice }],
          customerName: "",
          customerPhone: "",
          notes,
          pickupType: "delivery",
          subtotal: totalPrice,
          total: totalPrice,
          restaurantId: restaurantId || 1,
        }),
      });
    } catch {}

    // Build receipt-style message
    const receipt = buildReceiptMessage({
      restaurantName: restaurantName || "المطعم",
      restaurantLogo,
      itemName: displayName,
      quantity,
      unitPrice: currentPrice,
      totalPrice,
      notes: notes.trim(),
    });

    const encoded = encodeURIComponent(receipt);
    const waNumber = restaurantWhatsapp.replace(/^\+/, "");
    window.open(`https://wa.me/${waNumber}?text=${encoded}`, "_blank");

    setSubmitting(false);
    setConfirmed(true);
    setTimeout(() => {
      onOpenChange(false);
      setConfirmed(false);
      setNotes("");
      setQuantity(1);
    }, 1200);
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
            <img src={item.image} alt={displayName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            <button type="button" onClick={() => onOpenChange(false)}
              className="absolute top-3 left-3 size-8 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm flex items-center justify-center">
              <X className="size-4" />
            </button>
            <div className="absolute bottom-4 right-4 left-16">
              <h3 className="text-white font-bold text-lg drop-shadow-lg">{displayName}</h3>
            </div>
          </div>
        )}

        {confirmed ? (
          <div className="p-10 text-center animate-scale-in">
            <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="size-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-1">تم إرسال الطلب!</h3>
            <p className="text-sm text-muted-foreground">سيتم توجيهك إلى واتساب</p>
          </div>
        ) : (
          <div className={cn("p-6 space-y-5", !item.image && "pt-8")}>
            {!item.image && (
              <DialogHeader>
                <DialogTitle className="text-xl">{displayName}</DialogTitle>
              </DialogHeader>
            )}

            {/* Restaurant logo + name */}
            <div className="flex items-center gap-3 pb-2">
              {restaurantLogo && (
                <img src={restaurantLogo} alt="" className="size-10 rounded-xl object-cover ring-1 ring-border" />
              )}
              <div>
                <p className="text-sm font-bold">{restaurantName || "المطعم"}</p>
                <p className="text-xs text-muted-foreground">فاتورة طلب</p>
              </div>
            </div>

            {/* Price & Quantity */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-200/20 p-4">
              <div>
                <span className="text-xs text-muted-foreground">السعر</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-bold text-xl text-primary tabular-nums">{toArabicNumber(currentPrice.toFixed(1))}</span>
                  <span className="text-xs text-muted-foreground">د.ل</span>
                  {hasDiscount && <span className="text-xs text-muted-foreground/50 line-through mr-1">{toArabicNumber(item.price.toFixed(1))}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                  className="size-10 rounded-xl border border-border/40 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-300/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <Minus className="size-4" />
                </button>
                <span className="font-bold text-xl min-w-[2.5ch] text-center tabular-nums">{toArabicNumber(quantity)}</span>
                <button type="button" onClick={() => setQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99}
                  className="size-10 rounded-xl border border-border/40 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-300/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* Quick notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">إضافات</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_NOTES.map((note) => (
                  <button key={note} type="button" onClick={() => toggleQuickNote(note)}
                    className={cn("px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                      notes.includes(note)
                        ? "bg-amber-500/10 border-amber-300/30 text-amber-700 dark:text-amber-300"
                        : "bg-muted/30 border-border/30 text-muted-foreground hover:border-amber-200/30")}>
                    {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes textarea */}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={2} className="w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20 resize-none" />

            {/* Total + Submit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-t border-dashed border-border/40 pt-3">
                <span className="font-bold">المجموع</span>
                <span className="font-bold text-xl text-primary tabular-nums">
                  {toArabicNumber(totalPrice.toFixed(1))} <span className="text-sm font-normal text-muted-foreground">د.ل</span>
                </span>
              </div>
              <Button className="w-full h-12 rounded-xl gap-2 text-base font-semibold"
                onClick={handleConfirm} disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    جاري...
                  </span>
                ) : (
                  <><MessageCircle className="size-5" /> أرسل الطلب عبر واتساب</>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground/60">
                سيتم إرسال فاتورة الطلب إلى واتساب المطعم
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
