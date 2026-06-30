"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { csrfFetch } from "@/lib/csrf-client";
import { premiumToast } from "@/lib/premium-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Smartphone, Copy, Phone, CheckCircle2 } from "lucide-react";

const MADAR_PHONE = "0910089975";
const LIBYANA_PHONE = "0942119637";


type Provider = "libyana" | "madar";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  planName: string;
  planNameAr: string;
  price: number;
  onSuccess: () => void;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  planId,
  planNameAr,
  price,
  onSuccess,
}: PaymentDialogProps) {
  const [provider, setProvider] = useState<Provider>("libyana");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(price);
  const [step, setStep] = useState<"form" | "waiting" | "success">("form");
  const [countdown, setCountdown] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const providerPhone = provider === "libyana" ? LIBYANA_PHONE : MADAR_PHONE;
  const providerName = provider === "libyana" ? "ليبيانا" : "مدار";

  const quickTransferCode =
    provider === "libyana"
      ? `*122*218942119637*${amount * 1000}*1#`
      : `*140*4*1*${amount}*0910089975#`;

  const encodedUSSD = quickTransferCode.replace(/#/g, "%23");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      premiumToast("copy", "تم النسخ");
    } catch {
      premiumToast("error", "فشل النسخ");
    }
  };

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleSent = async () => {
    if (!phone.trim()) {
      premiumToast("error", "يرجى إدخال رقم هاتفك");
      return;
    }
    setSubmitting(true);
    try {
      const res = await csrfFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), amount, provider, planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل إرسال طلب الدفع");
      setPaymentId(json.data.id);
      setStep("waiting");
      setCountdown(30);
    } catch (e: any) {
      premiumToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const finishFlow = useCallback(() => {
    cleanup();
    onOpenChange(false);
    onSuccess();
  }, [cleanup, onOpenChange, onSuccess]);

  const deadlineRef = useRef(0);

  // Smooth countdown tick + poll for admin approval
  useEffect(() => {
    if (step !== "waiting") return;

    deadlineRef.current = Date.now() + 30000;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        cleanup();
        setStep("success");
      }
    }, 100);

    if (paymentId) {
      let pollFailures = 0;
      const warnedRef = { current: false };
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/subscriptions/status?id=${paymentId}`);
          const json = await res.json();
          pollFailures = 0;
          if (json.data?.status === "verified") {
            clearInterval(tick);
            cleanup();
            finishFlow();
          }
        } catch {
          pollFailures++;
          if (pollFailures >= 3 && !warnedRef.current) {
            warnedRef.current = true;
            premiumToast("error", "تعذر الاتصال بالخادم — تحقق من اتصالك بالإنترنت");
          }
        }
      }, 5000);
    }

    return () => {
      clearInterval(tick);
      cleanup();
    };
  }, [step, paymentId, cleanup, finishFlow]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        cleanup();
        setStep("form");
        setCountdown(30);
        setPhone("");
        setAmount(price);
        setPaymentId(null);
      }
      onOpenChange(open);
    },
    [onOpenChange, price, cleanup]
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmount(val > 99 ? 99 : val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md rounded-2xl p-0 gap-0 max-h-[90dvh] overflow-y-auto border-border/50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange to-orange/80 text-white p-6">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="size-5" />
            <DialogTitle className="text-white text-lg font-bold">
              دفع الاشتراك
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/70 text-sm">
            ادفع عبر المحفظة الإلكترونية
          </DialogDescription>
        </div>

        <div className="p-5 space-y-5">
          {/* Plan summary */}
          <div className="rounded-xl bg-orange-muted/50 dark:bg-orange-muted/20 border border-orange/15 p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">{planNameAr}</span>
              <span className="text-lg font-bold text-orange">{price} د.ل</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">اشتراك شهري</p>
          </div>

          {step === "form" && (
            <>
              {/* Payment method tabs */}
              <div>
                <Label>طريقة الدفع</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {(["libyana", "madar"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={cn(
                        "h-11 rounded-xl border-2 text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50",
                        provider === p
                          ? "border-orange bg-orange-muted/40 dark:bg-orange-muted/20 shadow-sm"
                          : "border-border/30 hover:border-orange/30 text-muted-foreground"
                      )}
                    >
                      {p === "libyana" ? "ليبيانا" : "مدار"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider phone */}
              <div className="rounded-xl bg-muted/30 border border-border/20 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  أرسل المبلغ إلى {providerName}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg tracking-wide font-mono" dir="ltr">
                    {providerPhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(providerPhone)}
                    className="size-8 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                    title="نسخ الرقم"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick transfer code */}
              <div className="rounded-xl bg-gradient-to-br from-green-50/80 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 border border-green-200/30 dark:border-green-800/20 p-3">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
                  رمز التحويل السريع
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-sm font-bold text-orange truncate"
                    dir="ltr"
                  >
                    {quickTransferCode}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`tel:${encodedUSSD}`}
                      className="size-8 rounded-lg border border-green-200/30 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title="اتصال"
                    >
                      <Phone className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(quickTransferCode)}
                      className="size-8 rounded-lg border border-green-200/30 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title="نسخ الرمز"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* User phone */}
              <div>
                <Label>رقم هاتفك</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0910089975"
                  className="h-11 rounded-xl mt-1.5 text-left font-mono"
                  dir="ltr"
                />
              </div>

              {/* Amount — max 99 */}
              <div>
                <Label>المبلغ (د.ل — خانتين فقط)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  className="h-11 rounded-xl mt-1.5"
                  min={1}
                  max={99}
                />
              </div>

              <Button
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={handleSent}
                disabled={submitting || !phone.trim()}
              >
                {submitting ? "جاري الإرسال..." : "إرسال طلب الدفع"}
              </Button>
            </>
          )}

          {step === "waiting" && (
            <div className="flex flex-col items-center py-10 space-y-6">
              {/* Animated payment indicator */}
              <div className="relative size-28">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full border-2 border-orange/20 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                {/* Middle ring */}
                <div className="absolute inset-2 rounded-full border border-orange/30" />
                {/* Inner icon */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/25">
                  <Smartphone className="size-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1.5">
                <p className="text-base font-bold">في انتظار تأكيد الدفع</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                  {provider === "libyana"
                    ? "سيتم تأكيد اشتراكك تلقائياً بعد التحويل"
                    : "بعد التحويل، انتظر موافقة الإدارة"}
                </p>
              </div>

              {/* Live status indicator */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/20">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 rounded-full bg-orange animate-ping opacity-75" />
                  <span className="relative rounded-full size-2 bg-orange" />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {provider === "libyana" ? "بانتظار تأكيد التحويل" : "بانتظار موافقة الإدارة"}
                </span>
              </div>

              {/* Progress bar — scaleX avoids layout thrash */}
              <div className="w-48 space-y-1.5">
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: ((30 - countdown) / 30) }}
                    className="h-full rounded-full bg-gradient-to-r from-orange to-orange/80 origin-left"
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  الإشتراك سينتهي خلال {countdown} ثانية
                </p>
              </div>
            </div>
          )}

          {/* Success screen */}
          {step === "success" && (
            <div className="flex flex-col items-center py-8 space-y-6">
              <div className="relative size-20">
                <div className="absolute inset-0 rounded-full bg-green-500/10 animate-scale-in" />
                <div className="relative size-full rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="size-10 text-green-500" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-bold">تم إرسال طلب الدفع</p>
                <p className="text-xs text-muted-foreground">
                  سيتم تفعيل اشتراكك بعد التحقق من الدفع
                </p>
              </div>
              <Button
                className="w-full h-11 rounded-xl"
                onClick={() => { onOpenChange(false); onSuccess(); }}
              >
                تم
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
