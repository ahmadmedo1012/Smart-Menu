"use client"

import { csrfFetch } from "@/lib/csrf-client";
import { premiumToast } from "@/lib/premium-toast"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight, Copy, Check, AlertCircle, Phone, MessageCircle,
  ShoppingCart, User, MapPin, FileText, Store,
  Clock, ChefHat, PackageCheck, CheckCircle, XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toArabicNumber, formatDate } from "@/lib/format"
import Link from "next/link"

interface OrderDetail {
  id: number; orderNo: string; customerName: string; customerPhone: string
  notes: string; pickupType: string; status: string
  subtotal: number; total: number; createdAt: string
  restaurant: { id: number; name: string; slug: string } | null
  items: { id: number; quantity: number; price: number; item: { name: string; nameAr: string | null } }[]
}

const STATUS_FLOW = ["new", "preparing", "ready", "completed"] as const
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  new: { label: "جديد", icon: Clock, color: "text-orange dark:text-orange", bg: "bg-orange/10" },
  preparing: { label: "قيد التحضير", icon: ChefHat, color: "text-orange dark:text-orange", bg: "bg-orange/10" },
  ready: { label: "جاهز", icon: PackageCheck, color: "text-success", bg: "bg-success/10" },
  completed: { label: "مكتمل", icon: CheckCircle, color: "text-muted-foreground", bg: "bg-muted" },
  cancelled: { label: "ملغي", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
}

export default function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(d => setOrder(d.data ?? d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (status: string) => {
    try {
      const res = await csrfFetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw Error()
      const d = await res.json()
      setOrder(d.data ?? d)
      premiumToast("success", "تم تغيير الحالة", STATUS_CONFIG[status]?.label)
    } catch { premiumToast("error", "فشل تحديث الحالة") }
  }

  const copyAsWhatsApp = () => {
    if (!order) return
    const items = order.items.map(oi =>
      `• ${oi.item.nameAr || oi.item.name} ×${oi.quantity} = ${toArabicNumber((oi.price * oi.quantity).toFixed(1))} د.ل`
    ).join("\n")
    const text = `📋 طلب ${order.orderNo}
🏪 ${order.restaurant?.name || "المطعم"}
━━━━━━━━━━━━━
👤 ${order.customerName} | ${order.customerPhone}
📍 ${order.pickupType === "delivery" ? "توصيل" : order.pickupType === "takeaway" ? "سفري" : "داخل المكان"}
━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━
💰 الإجمالي: ${toArabicNumber(order.total.toFixed(1))} د.ل`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); premiumToast("success", "تم نسخ نص الطلب"); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      <div className="h-8 w-32 rounded-xl bg-muted/50 animate-breath" />
      <div className="h-24 rounded-md bg-muted/50 animate-breath" />
      <div className="h-48 rounded-md bg-muted/50 animate-breath" />
    </div>
  )

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <AlertCircle className="size-12 text-destructive/60" />
      <p className="text-lg font-semibold">الطلب غير موجود</p>
      <Button variant="outline" onClick={() => router.push("/admin/orders")}>العودة للطلبات</Button>
    </div>
  )

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new
  const currentIdx = STATUS_FLOW.indexOf(order.status as typeof STATUS_FLOW[number])

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back + title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/orders")} className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors">
            <ArrowRight className="size-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold">طلب #{order.orderNo}</h2>
            <p className="text-xs text-muted-foreground">{formatDate(new Date(order.createdAt))}</p>
          </div>
        </div>
        <Badge className={cn("text-sm px-4 py-1.5 rounded-full", config.bg, config.color)}>
          {config.label}
        </Badge>
      </div>

      {/* Restaurant info */}
      {order.restaurant && (
        <div className="rounded-md bg-gradient-to-l from-orange-muted/50 to-transparent dark:from-orange-muted border border-orange/20 dark:border-orange/15 p-4 flex items-center gap-3">
          <Store className="size-5 text-primary" />
          <span className="font-medium">{order.restaurant.name}</span>
          <Link href={`/menu/${order.restaurant.slug}`} target="_blank" className="text-xs text-primary hover:text-orange transition-colors mr-auto">
            عرض المنيو ←
          </Link>
        </div>
      )}

      {/* Status Timeline */}
      <div className="rounded-md bg-card/50 border border-border/30 p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">حالة الطلب</h3>
        <div className="flex items-center">
          {STATUS_FLOW.map((s, idx) => { const StepIcon = STATUS_CONFIG[s].icon
            const isActive = idx <= currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div key={s} className="flex-1 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isActive && updateStatus(s)}
                  disabled={!isActive || order.status === "cancelled"}
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center transition-all duration-300 border-2",
                    isCurrent ? "bg-gradient-to-r from-orange to-orange/80 text-white border-orange shadow-lg shadow-orange/25 scale-110" :
                    isActive ? "bg-success/15 text-emerald-600 border-success/30" :
                    "bg-muted/30 text-muted-foreground/30 border-border/20"
                  )}
                >
                  <StepIcon className="size-5" />
                </button>
                <span className={cn(
                  "text-xs mt-2 font-medium",
                  isCurrent ? "text-foreground" : isActive ? "text-success" : "text-muted-foreground/40"
                )}>
                  {STATUS_CONFIG[s].label}
                </span>
                {idx < STATUS_FLOW.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-full -mt-6 mr-10",
                    isActive && idx < currentIdx ? "bg-emerald-300 dark:bg-emerald-700" :
                    isActive ? "bg-orange/60 dark:bg-orange" : "bg-border/20"
                  )} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 mt-4">
          {order.status !== "cancelled" && order.status !== "completed" && (
            <>
              {currentIdx < STATUS_FLOW.length - 1 && (
                <Button variant="orange"
                  onClick={() => updateStatus(STATUS_FLOW[currentIdx + 1])}
                  className="flex-1 rounded-md h-11"
                >
                  ← {STATUS_CONFIG[STATUS_FLOW[currentIdx + 1]]?.label}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => updateStatus("cancelled")}
                className="rounded-xl h-11 border-red-200/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                إلغاء الطلب
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Order info grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-card/50 border border-border/30 p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <User className="size-4" /> معلومات العميل
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">الاسم</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">رقم الهاتف</p>
              <a href={`tel:${order.customerPhone}`} className="font-medium text-primary hover:text-orange transition-colors flex items-center gap-1" dir="ltr">
                <Phone className="size-3" />
                {order.customerPhone}
              </a>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نوع الاستلام</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="size-3.5 text-muted-foreground" />
                {order.pickupType === "delivery" ? "توصيل" : order.pickupType === "takeaway" ? "سفري" : "داخل المكان"}
              </p>
            </div>
            {order.notes && (
              <div>
                <p className="text-xs text-muted-foreground">ملاحظات</p>
                <p className="text-sm bg-muted/30 rounded-xl p-3 mt-1">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md bg-card/50 border border-border/30 p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <ShoppingCart className="size-4" /> ملخص الطلب
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span className="tabular-nums">{toArabicNumber(order.subtotal.toFixed(1))} د.ل</span>
            </div>
            <hr className="border-border/30" />
            <div className="flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="tabular-nums text-primary">{toArabicNumber(order.total.toFixed(1))} د.ل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            الأصناف ({toArabicNumber(order.items.length)})
          </h3>
          <Button variant="outline" size="sm" onClick={copyAsWhatsApp} className="gap-1">
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            نسخ للواتساب
          </Button>
        </div>
        <div className="divide-y divide-border/10">
          {order.items.map(oi => (
            <div key={oi.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="size-7 rounded-lg bg-orange/10 text-orange dark:text-orange text-xs font-bold flex items-center justify-center">
                  {toArabicNumber(oi.quantity)}
                </span>
                <span className="font-medium">{oi.item.nameAr || oi.item.name}</span>
              </div>
              <span className="font-semibold tabular-nums">
                {toArabicNumber((oi.price * oi.quantity).toFixed(1))} د.ل
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`tel:${order.customerPhone}`}
          className="flex items-center justify-center gap-2 py-3.5 rounded-md border border-border/30 hover:bg-accent transition-all font-medium text-sm"
        >
          <Phone className="size-4" />
          اتصال بالعميل
        </a>
        <button
          type="button"
          onClick={copyAsWhatsApp}
          className="flex items-center justify-center gap-2 py-3.5 rounded-md border border-green-200/30 text-success hover:bg-success/15 transition-all font-medium text-sm"
        >
          <MessageCircle className="size-4" />
          نسخ للواتساب
        </button>
      </div>
    </div>
  )
}
