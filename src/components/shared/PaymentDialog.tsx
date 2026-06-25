"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { csrfFetch } from "@/lib/csrf-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Loader2, Timer, ShieldCheck, Smartphone, Copy } from "lucide-react";

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
  planName,
  planNameAr,
  price,
  onSuccess,
}: PaymentDialogProps) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("libyana");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(price);
  const [step, setStep] = useState<"form" | "waiting" | "success">("form");
  const [countdown, setCountdown] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const providerPhone = provider === "libyana" ? LIBYANA_PHONE : MADAR_PHONE;
  const providerName = provider === "libyana" ? "ليبيانا" : "مدار";

  const quickTransferCode =
    provider === "libyana"
      ? `*122*21894211963${amount}#`
      : provider === "madar"
      ? `*140*4*1*${amount}#`
      : "";

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
      setStep("waiting");
      setCountdown(30);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // countdown timer
  useEffect(() => {
    if (step !== "waiting") return;
    if (countdown <= 0) {
      setStep("success");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const handleConfirm = async () => {
    try {
      await onSuccess();
      onOpenChange(false);
    } catch {
      // if createAccount fails, stay open so user can retry
    }
  };

  // reset on close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep("form");
        setCountdown(30);
        setPhone("");
        setAmount(price);
      }
      onOpenChange(open);
    },
    [onOpenChange, price]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md mx-2 rounded-2xl p-0 gap-0 max-h-[90dvh] overflow-y-auto" showCloseButton={false}>
        {/* Header */}
        <div className="bg-gradient-to-br from-gold to-gold/80 text-primary-foreground p-6 rounded-t-2xl">
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
          <div className="rounded-xl bg-gold-muted dark:bg-gold-muted border border-gold/20 p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">{planNameAr}</span>
              <span className="text-lg font-bold text-gold">{price} د.ل</span>
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
                      "h-12 rounded-xl border-2 text-sm font-medium transition-all",
                      provider === "libyana"
                        ? "border-gold bg-gold-muted dark:bg-gold-muted"
                        : "border-border/30 hover:border-gold/30"
                    )}
                  >
                    ليبيانا
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("madar")}
                    className={cn(
                      "h-12 rounded-xl border-2 text-sm font-medium transition-all",
                      provider === "madar"
                        ? "border-gold bg-gold-muted dark:bg-gold-muted"
                        : "border-border/30 hover:border-gold/30"
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
                    className="size-8 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent"
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
                  <span className="font-mono text-sm font-bold text-gold dark:text-gold" dir="ltr">
                    {quickTransferCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(quickTransferCode)}
                    className="size-8 rounded-lg border border-green-200/30 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="نسخ الرمز"
                  >
                    <Copy className="size-3.5" />
                  </button>
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
                  placeholder="218911111111"
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
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="h-11 rounded-xl mt-1.5"
                  min={1}
                />
              </div>

              {/* Submit */}
              <Button
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
                  "تم الإرسال"
                )}
              </Button>
            </>
          )}

          {/* Waiting step */}
          {step === "waiting" && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="size-16 rounded-full bg-gold-muted dark:bg-gold-muted flex items-center justify-center">
                  <Timer className="size-8 text-gold animate-pulse" />
                </div>
              </div>
              <div className="text-lg font-bold">
                {countdown}
              </div>
              <p className="text-sm text-muted-foreground">
                تم استلام طلب الدفع. جاري التحقق من قبل الإدارة.
                <br />
                سيتم تأكيد اشتراكك خلال 30 ثانية
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000"
                  style={{ width: `${((30 - countdown) / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success step */}
          {step === "success" && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="size-8 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                سيتم تفعيل اشتراكك بعد التحقق من الدفع
              </p>
              <Button
                className="w-full h-12 text-base font-semibold rounded-xl"
                onClick={handleConfirm}
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
