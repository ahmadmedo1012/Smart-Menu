"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Loader2, ShieldCheck, Smartphone, Copy, Phone } from "lucide-react";

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
  const [step, setStep] = useState<"form" | "waiting">("form");
  const [submitting, setSubmitting] = useState(false);

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
      setStep("waiting");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Libyana: auto-confirm after 5 seconds
  useEffect(() => {
    if (step !== "waiting" || provider !== "libyana") return;
    const t = setTimeout(() => {
      toast.success("تم تفعيل اشتراكك بنجاح");
      onOpenChange(false);
      onSuccess();
    }, 5000);
    return () => clearTimeout(t);
  }, [step, provider, onOpenChange, onSuccess]);

  // Madar: manual confirm
  const handleConfirm = () => {
    toast.success("تم تفعيل اشتراكك بنجاح");
    onOpenChange(false);
    onSuccess();
  };

  // reset on close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep("form");
        setPhone("");
        setAmount(price);
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

          {/* Waiting step — Libyana auto-confirm */}
          {step === "waiting" && provider === "libyana" && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="size-16 rounded-full bg-orange-muted dark:bg-orange-muted flex items-center justify-center">
                  <Loader2 className="size-8 text-orange animate-spin" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">جاري تأكيد الدفع...</p>
            </div>
          )}

          {/* Waiting step — Madar manual confirm */}
          {step === "waiting" && provider === "madar" && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="size-16 rounded-full bg-orange-muted dark:bg-orange-muted flex items-center justify-center">
                  <ShieldCheck className="size-8 text-orange" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">تم الإرسال</p>
              <Button
                variant="orange"
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
