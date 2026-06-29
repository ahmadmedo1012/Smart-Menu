"use client";

import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  Share2,
  MessageCircle,
  Gift,
  Smartphone,
  Users,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { premiumToast } from "@/lib/premium-toast";

type ReferralCardProps = {
  restaurantName: string;
  restaurantSlug: string;
  referralCode: string;
  discountText?: string;
  whatsapp?: string;
  timesShared?: number;
  timesUsed?: number;
};

export default function ReferralCard({
  restaurantName,
  restaurantSlug,
  referralCode,
  discountText = "خصم 10% على أول طلب",
  whatsapp,
  timesShared = 0,
  timesUsed = 0,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl = `${origin}/menu/${restaurantSlug}?ref=${referralCode}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      premiumToast("copy", "تم نسخ رابط الإحالة");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      premiumToast("error", "فشل نسخ الرابط");
    }
  }, [referralUrl]);

  const handleShareWhatsApp = useCallback(() => {
    const text = `مرحباً! 🎉\n\nادعوك لتجربة ${restaurantName} 🍽️\n${discountText} عند استخدام رابط الإحالة الخاص بي:\n${referralUrl}\n\nاستمتع بوجبتك! 😊`;

    if (whatsapp) {
      window.open(
        `https://wa.me/${whatsapp.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`,
        "_blank",
      );
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
      );
    }
  }, [restaurantName, discountText, referralUrl, whatsapp]);

  const handleShareSMS = useCallback(() => {
    if (!whatsapp) {
      handleCopyLink();
      return;
    }
    const text = `جرب ${restaurantName} واحصل على ${discountText}! ${referralUrl}`;
    window.open(`sms:${whatsapp}?body=${encodeURIComponent(text)}`, "_blank");
  }, [restaurantName, discountText, referralUrl, whatsapp, handleCopyLink]);

  return (
    <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-orange to-orange/80 p-0.5 shadow-xl shadow-orange/30">
      {/* Decorative glowing orbs */}
      <div className="absolute -top-20 -end-20 size-40 rounded-full bg-orange/20 blur-3xl" />
      <div className="absolute -bottom-20 -start-20 size-40 rounded-full bg-orange/15 blur-3xl" />

      <div className="relative rounded-md bg-gradient-to-br from-orange-muted to-orange-muted dark:from-orange-muted/80 dark:to-orange-muted/80 p-6 overflow-hidden">
        {/* Inner decorative dots */}
        <div className="absolute inset-0 bg-dot-pattern opacity-30 dark:opacity-10" />

        <div className="relative z-10 space-y-5">
          {/* ===== Header ===== */}
          <div className="text-center">
            <div className="mx-auto mb-3 size-14 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/25 animate-float">
              <Gift className="size-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-orange dark:text-orange">
              {restaurantName}
            </h3>
            <p className="text-sm text-orange/80 dark:text-orange/80 mt-1">
              {discountText}
            </p>
          </div>

          {/* ===== Referral Code Display ===== */}
          <div>
            <label className="block text-xs font-medium text-orange/80 dark:text-orange/80 mb-2 text-center">
              كود الإحالة الخاص بك
            </label>
            <div
              className="mx-auto w-fit rounded-xl bg-white/90 dark:bg-orange-muted/60 border-2 border-orange/50 dark:border-orange/50 px-6 py-3 text-center cursor-pointer transition-all hover:scale-105 active:scale-95"
              onClick={handleCopyLink}
            >
              <span className="text-2xl font-bold tracking-[0.25em] text-orange dark:text-orange font-mono" dir="ltr">
                {referralCode}
              </span>
            </div>
            <p className="text-[10px] text-orange/60 dark:text-orange/60 text-center mt-1.5">
              {copied ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3" /> تم النسخ!
                </span>
              ) : (
                "انقر للنسخ"
              )}
            </p>
          </div>

          {/* ===== Stats Bar ===== */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/60 dark:bg-orange-muted/40 border border-orange/30 dark:border-orange/30 p-3 text-center">
              <Users className="size-4 mx-auto mb-1 text-orange dark:text-orange" />
              <p className="text-lg font-bold text-orange dark:text-orange tabular-nums">
                {timesShared}
              </p>
              <p className="text-[10px] text-orange/60 dark:text-orange/60">
                تم المشاركة
              </p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-orange-muted/40 border border-orange/30 dark:border-orange/30 p-3 text-center">
              <TrendingUp className="size-4 mx-auto mb-1 text-orange dark:text-orange" />
              <p className="text-lg font-bold text-orange dark:text-orange tabular-nums">
                {timesUsed}
              </p>
              <p className="text-[10px] text-orange/60 dark:text-orange/60">
                تم الاستخدام
              </p>
            </div>
          </div>

          {/* ===== Share Buttons ===== */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-orange/70 dark:text-orange/70 text-center">
              شارك عبر
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 h-11 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <MessageCircle className="size-4" />
                واتساب
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 h-11 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                نسخ الرابط
              </button>
              {whatsapp && (
                <button
                  type="button"
                  onClick={handleShareSMS}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-orange/25 hover:shadow-xl hover:shadow-orange/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Smartphone className="size-4" />
                  SMS
                </button>
              )}
            </div>
          </div>

          {/* ===== Full referral link (copy fallback) ===== */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 h-9 rounded-lg bg-white/70 dark:bg-orange-muted/50 border border-orange/30 dark:border-orange/30 flex items-center px-3 text-[11px] text-orange/70 dark:text-orange/70 truncate font-mono"
              dir="ltr"
            >
              {referralUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="نسخ رابط الإحالة"
              className="size-9 rounded-lg bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Share2 className="size-3.5" />
              )}
            </button>
          </div>

          {/* ===== Footer ===== */}
          <p className="text-center text-[10px] text-orange/50 dark:text-orange/50 flex items-center justify-center gap-1">
            <Sparkles className="size-3" />
            شارك الرابط مع أصدقائك واحصل على نقاط مكافأة
            <Sparkles className="size-3" />
          </p>
        </div>
      </div>
    </div>
  );
}
