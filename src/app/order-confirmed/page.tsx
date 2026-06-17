"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";

function OrderContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get("orderNo");
  const clearCart = useCart((s) => s.clearCart);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      clearCart();
      setCleared(true);
    }
  }, [clearCart, cleared]);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `طلب رقم: ${orderNo ?? "---"}\n\nشكراً لطلبك! سنقوم بتجهيز طلبك في أقرب وقت.`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4 text-center animate-fade-in">
      {/* Success icon */}
      <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle className="size-10 text-green-500" />
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-2">تم تأكيد الطلب!</h1>
        <p className="text-muted-foreground mb-1">رقم الطلب</p>
        <p className="text-3xl font-bold text-primary tabular-nums">
          {orderNo ?? "---"}
        </p>
      </div>

      <p className="text-muted-foreground max-w-xs">
        سيتم تجهيز طلبك وإرسال إشعار عند الاستلام.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button className="w-full" onClick={handleWhatsApp}>
          <MessageCircle className="ml-2 size-4" />
          إرسال عبر واتساب
        </Button>
        <Link href="/menu">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="ml-2 size-4" />
            العودة إلى القائمة
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
