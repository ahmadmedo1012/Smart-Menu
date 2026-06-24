"use client";

import { useState, useEffect, useCallback } from "react";
import Confetti from "@/components/shared/Confetti";
import {
  CheckCircle,
  Copy,
  Check,
  MessageCircle,
  Camera,
  Phone,
  Gift,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ShareAfterOrderProps = {
  orderNo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── Component ─────────────────────────────────────────────────────────

export default function ShareAfterOrder({
  orderNo,
  open,
  onOpenChange,
}: ShareAfterOrderProps) {
  const [step, setStep] = useState<"phone" | "referral">("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("phone");
      setPhone("");
      setReferralCode(null);
      setCopied(false);
      setShowSkip(false);
      const timer = setTimeout(() => setShowSkip(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const referralUrl = referralCode
    ? `${origin}/menu?ref=${referralCode}`
    : "";

  // ─── Register loyalty & get referral link ─────────────────────────

  const handleGetReferralLink = useCallback(async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerPhone: cleaned, customerName: "" }),
      });
      const json = await res.json();

      if (json.success && json.data?.card?.referralCode) {
        setReferralCode(json.data.card.referralCode);
        setStep("referral");
        toast.success("تم تفعيل برنامج الولاء!");

        // Also register this order as a referral action
        fetch("/api/loyalty/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referralCode: json.data.card.referralCode,
            referredPhone: cleaned,
            referredName: "",
          }),
        }).catch(() => {
          // Silent — referral record is best-effort here
        });
      } else {
        toast.error(json.error || "تعذر تفعيل برنامج الولاء");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  // ─── Copy referral link ────────────────────────────────────────────

  const handleCopyLink = useCallback(async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("تم نسخ رابط الإحالة");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل نسخ الرابط");
    }
  }, [referralUrl, referralCode]);

  // ─── Share via WhatsApp ────────────────────────────────────────────

  const handleShareWhatsApp = useCallback(() => {
    if (!referralCode) return;
    const text = `مرحباً! 🎉

ادعوك لتجربة الطلب عبر المنيو الذكي
${referralUrl}

استمتع بخصم 10٪ عند استخدام رابط الإحالة الخاص بي! 😊`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }, [referralUrl, referralCode]);

  // ─── Share via Instagram ───────────────────────────────────────────

  const handleShareInstagram = useCallback(() => {
    if (!referralCode) return;
    const text = `ادعوك لتجربة الطلب عبر المنيو الذكي واستمتع بخصم 10٪ 🎉\n${referralUrl}`;
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص — شاركه الآن في قصتك على إنستغرام");
  }, [referralUrl, referralCode]);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden rounded-2xl">
        {/* Confetti header */}
        <div className="relative h-36 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 overflow-hidden">
          <Confetti active variant="rects" count={20} loop className="absolute inset-0 pointer-events-none overflow-hidden" />

          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-white/5 blur-3xl" />

          {/* Sparkle decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="size-12 text-white/20 animate-spin-slow" />
          </div>

          {/* Checkmark */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full pt-4">
            <div className="size-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1 shadow-lg">
              <CheckCircle className="size-8 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Success title + order number */}
          <div className="text-center">
            <h2 className="text-xl font-bold">تم طلبك بنجاح!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              رقم الطلب:{" "}
              <span
                className="font-bold text-foreground tabular-nums"
                dir="ltr"
              >
                {orderNo}
              </span>
            </p>
          </div>

          {/* ─── Step 1: Phone input ─────────────────────────────── */}
          {step === "phone" && (
            <>
              {/* CTA */}
              <div className="text-center">
                <div className="mx-auto mb-3 size-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Gift className="size-7 text-white" />
                </div>
                <p className="text-base font-semibold mb-1">
                  ادع صديق وكل منكما يحصل على خصم 10٪
                </p>
                <p className="text-sm text-muted-foreground">
                  أدخل رقم هاتفك لتفعيل برنامج الولاء والحصول على رابط
                  الإحالة
                </p>
              </div>

              {/* Phone field */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  رقم الهاتف
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative glow-within rounded-xl border border-border/40 bg-white/70 dark:bg-card/70 backdrop-blur-xl">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full h-12 pr-10 px-4 bg-transparent text-sm outline-none rounded-xl"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                className="w-full h-12 rounded-xl text-base gap-2"
                onClick={handleGetReferralLink}
                disabled={loading || !phone.trim()}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    جاري التفعيل...
                  </span>
                ) : (
                  <>
                    <Gift className="size-5" />
                    احصل على رابط الإحالة
                  </>
                )}
              </Button>

              {/* Skip — appears after 5 seconds */}
              {showSkip && (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1 cursor-pointer"
                >
                  لا شكراً
                </button>
              )}
            </>
          )}

          {/* ─── Step 2: Referral link + share ───────────────────── */}
          {step === "referral" && referralCode && (
            <div className="space-y-5 animate-fade-in">
              {/* Referral link */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 text-center">
                  رابط الإحالة الخاص بك
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-11 rounded-xl bg-muted/50 border border-border/40 flex items-center px-3 text-xs text-foreground truncate font-mono"
                    dir="ltr"
                  >
                    {referralUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    aria-label="نسخ رابط الإحالة"
                    className="size-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <MessageCircle className="size-5" />
                  واتساب
                </button>
                <button
                  type="button"
                  onClick={handleShareInstagram}
                  className="h-12 rounded-xl bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Camera className="size-5" />
                  إنستغرام
                </button>
              </div>

              {/* Done */}
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
                onClick={() => onOpenChange(false)}
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
