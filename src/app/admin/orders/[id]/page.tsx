"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ArrowRight,
  Phone,
  Copy,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderDetail {
  id: number
  orderNo: string
  customerName: string
  customerPhone: string
  notes: string
  pickupType: string
  status: string
  subtotal: number
  discount: number
  total: number
  whatsappSent: boolean
  createdAt: string
  items: {
    id: number
    quantity: number
    price: number
    notes: string
    item: { name: string; nameAr: string | null }
  }[]
}

const statusFlow = [
  "new",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  new: {
    label: "جديد",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: AlertCircle,
  },
  preparing: {
    label: "قيد التحضير",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  ready: {
    label: "جاهز",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: Check,
  },
  completed: {
    label: "مكتمل",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Check,
  },
  cancelled: {
    label: "ملغي",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
  },
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("فشل تحميل تفاصيل الطلب")
        return r.json()
      })
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (status: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("فشل تحديث الحالة")
      const updated = await res.json()
      setOrder(updated)
      toast.success(
        `تم تغيير الحالة إلى ${statusConfig[status]?.label || status}`
      )
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(false)
    }
  }

  const copyWhatsappMessage = () => {
    if (!order) return
    const items = order.items
      .map(
        (oi) =>
          `- ${oi.item.nameAr || oi.item.name} ×${oi.quantity} = ${oi.price} ر.س`
      )
      .join("\n")

    const msg = `📋 طلب رقم: ${order.orderNo}
👤 العميل: ${order.customerName}
📞 الهاتف: ${order.customerPhone}
🕐 الوقت: ${new Date(order.createdAt).toLocaleString("ar-SA")}

🛒 الأصناف:
${items}

💰 الإجمالي: ${order.total} ر.س
📝 ملاحظات: ${order.notes || "لا يوجد"}
`

    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true)
      toast.success("تم نسخ الرسالة")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <Card className="h-64 animate-pulse" />
        <Card className="h-48 animate-pulse" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">عذراً، حدث خطأ</p>
        <p className="text-sm">{error || "الطلب غير موجود"}</p>
        <Button variant="outline" onClick={() => router.push("/admin/orders")}>
          العودة للطلبات
        </Button>
      </div>
    )
  }

  const currentIdx = statusFlow.indexOf(order.status as any)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/orders")}
        >
          <ArrowRight className="ml-1 h-4 w-4" />
          العودة
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            طلب #{order.orderNo}
          </h2>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString("ar-SA")}
          </p>
        </div>
        <Badge
          className={cn(
            "text-sm px-3 py-1",
            statusConfig[order.status]?.color ??
              "bg-gray-100 text-gray-700"
          )}
        >
          {statusConfig[order.status]?.label || order.status}
        </Badge>
      </div>

      {/* Status Flow */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">حالة الطلب</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusFlow.slice(0, 4).map((s, idx) => {
              const isPast = idx <= currentIdx
              const isCurrent = idx === currentIdx
              return (
                <Button
                  key={s}
                  size="sm"
                  variant={isCurrent ? "default" : isPast ? "outline" : "ghost"}
                  disabled={updating || idx < currentIdx || order.status === "cancelled"}
                  className={cn(
                    isPast && !isCurrent && "opacity-60"
                  )}
                  onClick={() => updateStatus(s)}
                >
                  {statusConfig[s]?.label}
                </Button>
              )
            })}
            {order.status !== "cancelled" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={updating}
                onClick={() => updateStatus("cancelled")}
              >
                إلغاء الطلب
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">معلومات العميل</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الهاتف</span>
              <div className="flex items-center gap-2">
                <span className="font-medium" dir="ltr">
                  {order.customerPhone}
                </span>
                <a
                  href={`https://wa.me/${order.customerPhone.replace(/^0/, "966")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted"
                >
                  <Phone className="h-3.5 w-3.5 text-green-600" />
                </a>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">نوع الاستلام</span>
              <span className="font-medium">
                {order.pickupType === "delivery" ? "توصيل" : "استلام"}
              </span>
            </div>
            {order.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ملاحظات</span>
                <span className="font-medium">{order.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">ملخص الطلب</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span>{order.subtotal} ر.س</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الخصم</span>
                <span className="text-green-600">-{order.discount} ر.س</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>الإجمالي</span>
              <span>{order.total} ر.س</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="font-semibold">الأصناف ({order.items.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={copyWhatsappMessage}
          >
            {copied ? (
              <Check className="ml-1 h-4 w-4 text-green-600" />
            ) : (
              <Copy className="ml-1 h-4 w-4" />
            )}
            نسخ رسالة واتساب
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
              <div className="col-span-4">الصنف</div>
              <div className="col-span-2 text-center">الكمية</div>
              <div className="col-span-3 text-center">السعر</div>
              <div className="col-span-3 text-center">المجموع</div>
            </div>
            {order.items.map((oi) => (
              <div
                key={oi.id}
                className="grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm"
              >
                <div className="col-span-4 font-medium">
                  {oi.item.nameAr || oi.item.name}
                </div>
                <div className="col-span-2 text-center">{oi.quantity}</div>
                <div className="col-span-3 text-center">{oi.price} ر.س</div>
                <div className="col-span-3 text-center font-semibold">
                  {oi.quantity * oi.price} ر.س
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Copy preview */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <pre className="text-xs whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
            {`📋 طلب رقم: ${order.orderNo}
👤 العميل: ${order.customerName}
📞 الهاتف: ${order.customerPhone}
🕐 الوقت: ${new Date(order.createdAt).toLocaleString("ar-SA")}

🛒 الأصناف:
${order.items.map((oi) => `- ${oi.item.nameAr || oi.item.name} ×${oi.quantity} = ${oi.price} ر.س`).join("\n")}

💰 الإجمالي: ${order.total} ر.س
📝 ملاحظات: ${order.notes || "لا يوجد"}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
