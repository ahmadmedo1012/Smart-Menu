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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, Smartphone, Copy, Phone, Timer } from "lucide-react";

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
      toast.success("تم النسخ");
    } catch {
      toast.error("فشل النسخ");
    }
  };

  const handleSent = async () => {
    if (!phone.trim()) {
      toast.error("يرجى إدخال رقم هاتفك");
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
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Countdown tick every 1s + poll for admin approval every 5s
  useEffect(() => {
    if (step !== "waiting") return;

    // Decrement countdown every second
    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll for admin approval every 5s
    if (paymentId) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/subscriptions/status?id=${paymentId}`);
          const json = await res.json();
          if (json.data?.status === "verified") {
            clearInterval(tick);
            if (pollRef.current) clearInterval(pollRef.current);
            toast.success("✅ تم تأكيد الدفع! جاري تحويلك...");
            onOpenChange(false);
            onSuccess();
          }
        } catch {}
      }, 5000);
    }

    return () => {
      clearInterval(tick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, paymentId, onOpenChange, onSuccess]);

  // Reset on close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep("form");
        setCountdown(30);
        setPhone("");
        setAmount(price);
        setPaymentId(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }
      onOpenChange(open);
    },
    [onOpenChange, price]
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmount(val > 99 ? 99 : val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md rounded-md p-0 gap-0 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange to-orange/80 text-primary-foreground p-6 rounded-t-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="size-5" />
            <DialogTitle className="text-primary-foreground text-lg font-bold">
              دفع الاشتراك
            </DialogTitle>
          </div>
          <DialogDescription className="text-primary-foreground/80 text-sm">
            ادفع عبر المحفظة الإلكترونية وأرسل إيصال الدفع
          </DialogDescription>
        </div>

        <div className="p-5 space-y-5">
          {/* Plan summary */}
          <div className="rounded-xl bg-orange-muted dark:bg-orange-muted border border-orange/20 p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">{planNameAr}</span>
              <span className="text-lg font-bold text-orange">{price} د.ل</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">اشتراك شهري</p>
          </div>

          {step === "form" && (
            <>
              {/* Payment method tabs */}
              <div>
                <Label>طريقة الدفع</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setProvider("libyana")}
                    className={cn(
                      "h-12 rounded-xl border-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2",
                      provider === "libyana"
                        ? "border-orange bg-orange-muted dark:bg-orange-muted"
                        : "border-border/30 hover:border-orange/30"
                    )}
                  >
                    ليبيانا
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("madar")}
                    className={cn(
                      "h-12 rounded-xl border-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2",
                      provider === "madar"
                        ? "border-orange bg-orange-muted dark:bg-orange-muted"
                        : "border-border/30 hover:border-orange/30"
                    )}
                  >
                    مدار
                  </button>
                </div>
              </div>

              {/* Provider phone */}
              <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                <p className="text-xs text-muted-foreground mb-1">
                  أرسل المبلغ إلى رقم {providerName}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg tracking-wide" dir="ltr">
                    {providerPhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(providerPhone)}
                    className="size-8 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
                    title="نسخ الرقم"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick transfer code */}
              <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/30 p-3">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1.5">
                  رمز التحويل السريع
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-sm font-bold text-orange dark:text-orange"
                    dir="ltr"
                  >
                    {quickTransferCode}
                  </span>
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${encodedUSSD}`}
                      className="size-8 rounded-lg border border-green-200/30 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30"
                      title="اتصال"
                    >
                      <Phone className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(quickTransferCode)}
                      className="size-8 rounded-lg border border-green-200/30 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
                      title="نسخ الرمز"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
                {provider === "madar" && (
                  <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">
                    ملاحظة: الحد الأقصى 20 د.ل لكل عملية
                  </p>
                )}
              </div>

              {/* User phone */}
              <div>
                <Label>رقم هاتفك</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0910089975"
                  className="h-11 rounded-xl mt-1.5 text-left"
                  dir="ltr"
                />
              </div>

              {/* Amount */}
              <div>
                <Label>المبلغ المرسل (د.ل)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  className="h-11 rounded-xl mt-1.5"
                  min={1}
                  max={99}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  خانتين فقط (الحد الأقصى 99)
                </p>
              </div>

              {/* Submit */}
              <Button
                variant="orange"
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={handleSent}
                disabled={submitting || !phone.trim()}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    جاري الإرسال...
                  </span>
                ) : (
                  "إرسال طلب الدفع"
                )}
              </Button>
            </>
          )}

          {/* Waiting step — professional animated countdown */}
          {step === "waiting" && (
            <div className="text-center py-6 space-y-5">
              {/* Circular countdown */}
              <div className="relative size-24 mx-auto">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-muted/30"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - countdown / 30)}`}
                    strokeLinecap="round"
                    className="text-orange transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums text-orange">{countdown}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                في انتظار تأكيد الدفع من الإدارة...
              </p>
              {provider === "madar" && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  بعد التحويل، انتظر الموافقة من الإدارة
                </p>
              )}
              {/* Pulse bar beneath */}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange to-orange/60 animate-pulse"
                  style={{ width: `${((30 - countdown) / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success step */}
          {step === "success" && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="size-16 rounded-full bg-orange-muted dark:bg-orange-muted flex items-center justify-center">
                  <ShieldCheck className="size-8 text-orange" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                سيتم تفعيل اشتراكك بعد التحقق من الدفع
              </p>
              <Button
                variant="orange"
                className="w-full h-12 text-base font-semibold rounded-xl"
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
