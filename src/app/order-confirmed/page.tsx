"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import ShareAfterOrder from "@/components/loyalty/ShareAfterOrder";

const Confetti = dynamic(() => import("@/components/shared/Confetti"), { ssr: false });

function OrderContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get("orderNo") ?? "";
  const waNumber = searchParams.get("wa") ?? "";
  const displayOrderNo = orderNo && orderNo !== "undefined" && orderNo !== "null" ? orderNo : null;
  const clearCart = useCart((s) => s.clearCart);
  const [cleared, setCleared] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!cleared) {
      clearCart();
      setCleared(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [clearCart, cleared]);

  useEffect(() => {
    if (cleared && orderNo) {
      const timer = setTimeout(() => setShowShare(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [cleared, orderNo]);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `طلب رقم: ${displayOrderNo ?? "---"}\n\nشكراً لطلبك! سنقوم بتجهيز طلبك في أقرب وقت.`
    );
    const phone = waNumber ? `https://wa.me/${waNumber}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(phone, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={null}><Confetti active={showConfetti} /></Suspense>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center animate-fade-in">
        <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center animate-scale-in">
          <CheckCircle className="size-10 text-green-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">تم تأكيد الطلب!</h1>
          <p className="text-muted-foreground">رقم الطلب</p>
          <p className="text-3xl font-bold text-orange tabular-nums">
            {displayOrderNo ?? "---"}
          </p>
        </div>

        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
          سيتم تجهيز طلبك وإرسال إشعار عند الاستلام.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button className="w-full" onClick={handleWhatsApp}>
            <MessageCircle className="ms-2 size-4" />
            إرسال عبر واتساب
          </Button>
          <Link href="/menu">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="ms-2 size-4" />
              العودة إلى القائمة
            </Button>
          </Link>
        </div>
      </div>

      <ShareAfterOrder
        orderNo={displayOrderNo ?? "---"}
        open={showShare}
        onOpenChange={setShowShare}
      />
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="size-8 rounded-full border-2 border-border border-t-orange animate-spin" />
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
