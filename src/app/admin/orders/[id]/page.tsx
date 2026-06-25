"use client"

import { csrfFetch } from "@/lib/csrf-client";

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
  new: { label: "جديد", icon: Clock, color: "text-gold dark:text-gold", bg: "bg-blue-100 dark:bg-blue-900/30" },
  preparing: { label: "قيد التحضير", icon: ChefHat, color: "text-gold dark:text-gold", bg: "bg-blue-100 dark:bg-blue-900/30" },
  ready: { label: "جاهز", icon: PackageCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  completed: { label: "مكتمل", icon: CheckCircle, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
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
      toast.success(`تم تغيير الحالة إلى ${STATUS_CONFIG[status]?.label}`)
    } catch { toast.error("فشل تحديث الحالة") }
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
      setCopied(true); toast.success("تم نسخ نص الطلب"); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      <div className="h-8 w-32 rounded-xl bg-muted/50 animate-breath" />
      <div className="h-24 rounded-2xl bg-muted/50 animate-breath" />
      <div className="h-48 rounded-2xl bg-muted/50 animate-breath" />
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
  const StatusIcon = config.icon
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
        <div className="rounded-2xl bg-gradient-to-l from-blue-50/50 to-transparent dark:from-blue-950/10 border border-blue-200/20 dark:border-blue-500/20 p-4 flex items-center gap-3">
          <Store className="size-5 text-primary" />
          <span className="font-medium">{order.restaurant.name}</span>
          <Link href={`/menu/${order.restaurant.slug}`} target="_blank" className="text-xs text-primary hover:text-gold transition-colors mr-auto">
            عرض المنيو ←
          </Link>
        </div>
      )}

      {/* Status Timeline */}
      <div className="rounded-2xl bg-card/50 border border-border/30 p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">حالة الطلب</h3>
        <div className="flex items-center">
          {STATUS_FLOW.map((s, idx) => { const StatusIcon = STATUS_CONFIG[s].icon
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
                    isCurrent ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-110" :
                    isActive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-300 dark:border-emerald-700" :
                    "bg-muted/30 text-muted-foreground/30 border-border/20"
                  )}
                >
                  <StatusIcon className="size-5" />
                </button>
                <span className={cn(
                  "text-xs mt-2 font-medium",
                  isCurrent ? "text-foreground" : isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40"
                )}>
                  {STATUS_CONFIG[s].label}
                </span>
                {idx < STATUS_FLOW.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-full -mt-6 mr-10",
                    isActive && idx < currentIdx ? "bg-emerald-300 dark:bg-emerald-700" :
                    isActive ? "bg-blue-300 dark:bg-gold" : "bg-border/20"
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
                <Button
                  onClick={() => updateStatus(STATUS_FLOW[currentIdx + 1])}
                  className="flex-1 rounded-xl h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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
        <div className="rounded-2xl bg-card/50 border border-border/30 p-5">
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
              <a href={`tel:${order.customerPhone}`} className="font-medium text-primary hover:text-gold transition-colors flex items-center gap-1" dir="ltr">
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

        <div className="rounded-2xl bg-card/50 border border-border/30 p-5">
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
      <div className="rounded-2xl bg-card/50 border border-border/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/10">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            الأصناف ({toArabicNumber(order.items.length)})
          </h3>
          <Button variant="outline" size="sm" onClick={copyAsWhatsApp} className="rounded-xl gap-1">
            {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            نسخ للواتساب
          </Button>
        </div>
        <div className="divide-y divide-border/10">
          {order.items.map(oi => (
            <div key={oi.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-gold dark:text-gold text-xs font-bold flex items-center justify-center">
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
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border/30 hover:bg-accent transition-all font-medium text-sm"
        >
          <Phone className="size-4" />
          اتصال بالعميل
        </a>
        <button
          type="button"
          onClick={copyAsWhatsApp}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-green-200/30 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all font-medium text-sm"
        >
          <MessageCircle className="size-4" />
          نسخ للواتساب
        </button>
      </div>
    </div>
  )
}
