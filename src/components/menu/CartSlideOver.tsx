"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { useCart } from "@/store/cart"
import { toArabicNumber } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export default function CartSlideOver() {
  const items = useCart((s) => s.items)
  const totalItems = useCart((s) => s.totalItems())
  const subtotal = useCart((s) => s.subtotal())
  const updateQuantity = useCart((s) => s.updateQuantity)
  const removeItem = useCart((s) => s.removeItem)
  const prevRef = useRef(totalItems)
  const [bounce, setBounce] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (totalItems > prevRef.current && prevRef.current > 0) {
      setBounce(true)
      const t = setTimeout(() => setBounce(false), 500)
      prevRef.current = totalItems
      return () => clearTimeout(t)
    }
    prevRef.current = totalItems
  }, [totalItems])

  if (totalItems === 0) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] end-4 sm:end-6 z-[63]"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`السلة - ${toArabicNumber(totalItems)} أصناف`}
            className={cn(
              "flex items-center gap-3 rounded-full px-5 py-3.5 h-auto",
              "bg-gradient-to-b from-orange to-orange/95",
              "shadow-lg shadow-orange/20 ring-1 ring-white/10 dark:ring-white/5",
              "backdrop-blur-xl",
              "hover:shadow-2xl hover:shadow-orange/30",
              "active:scale-95 transition-all duration-300 ease-out",
              bounce && "scale-110",
            )}
          >
            <div className="relative">
              <ShoppingCart className="size-5" />
              <span
                className={cn(
                  "absolute -top-2 -end-2 size-4 rounded-full bg-orange text-orange-foreground text-[10px] font-bold flex items-center justify-center transition-all duration-300",
                  bounce && "scale-125",
                )}
              >
                {totalItems > 9 ? "9+" : toArabicNumber(totalItems)}
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {toArabicNumber(subtotal.toFixed(1))} د.ل
            </span>
          </button>
        </motion.div>

      <SheetContent side="left" showCloseButton={false} className="flex flex-col gap-0 p-0 w-[85vw] sm:max-w-sm">
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(false)} className="size-8 flex items-center justify-center rounded-sm hover:bg-accent transition-colors -ms-2" aria-label="إغلاق">
              <ArrowLeft className="size-4" />
            </button>
            <SheetTitle className="text-base">سلة الطلبات</SheetTitle>
          </div>
          <span className="text-xs text-muted-foreground">{toArabicNumber(totalItems)} أصناف</span>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-start group">
              {item.image && (
                <div className="size-14 rounded-sm overflow-hidden shrink-0 bg-muted/30 ring-1 ring-border/20">
                  <img src={item.image} alt={item.name} className="size-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {toArabicNumber(item.price.toFixed(1))} د.ل
                </p>
                {/* Quantity controls */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center rounded-sm overflow-hidden border border-border/30">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="إنقاص الكمية"
                      className="size-7 flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-[2ch] text-center text-xs font-semibold tabular-nums px-1">
                      {toArabicNumber(item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="زيادة الكمية"
                      className="size-7 flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="text-xs font-semibold tabular-nums ms-auto">
                    {toArabicNumber((item.price * item.quantity).toFixed(1))} د.ل
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`حذف ${item.name}`}
                    className="size-7 flex items-center justify-center rounded-sm text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — total + CTA */}
        <div className="border-t border-border/30 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="font-bold tabular-nums text-base">{toArabicNumber(subtotal.toFixed(1))} د.ل</span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: "orange" }),
                "flex-1 text-sm",
              )}
            >
              إتمام الطلب
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
