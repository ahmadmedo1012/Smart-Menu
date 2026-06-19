"use client";

import { useState } from "react";
import { Copy, Check, Share2, MessageCircle, Gift } from "lucide-react";
import { toast } from "sonner";

type ReferralCardProps = {
  restaurantName: string;
  restaurantSlug: string;
  referralCode: string;
  discountText?: string;
  whatsapp?: string;
};

export default function ReferralCard({
  restaurantName,
  restaurantSlug,
  referralCode,
  discountText = "خصم 10% على أول طلب",
  whatsapp,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl = `${origin}/menu/${restaurantSlug}?ref=${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("تم نسخ رابط الإحالة");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل نسخ الرابط");
    }
  };

  const handleShareWhatsApp = () => {
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
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-0.5 shadow-xl shadow-amber-500/30">
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/80 dark:to-orange-950/80 p-6 relative">
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 size-28 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 size-28 rounded-full bg-amber-400/10 blur-3xl" />

        {/* Card header */}
        <div className="relative z-10 text-center mb-5">
          <div className="mx-auto mb-3 size-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Gift className="size-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-1">
            {restaurantName}
          </h3>
          <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
            {discountText}
          </p>
        </div>

        {/* Referral link display */}
        <div className="relative z-10 mb-4">
          <label className="block text-xs font-medium text-amber-800/70 dark:text-amber-200/70 mb-1.5 text-center">
            رابط الإحالة الخاص بك
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 rounded-xl bg-white/80 dark:bg-amber-950/60 border border-amber-300/50 dark:border-amber-700/50 flex items-center px-3 text-xs text-amber-900 dark:text-amber-200 truncate font-mono" dir="ltr">
              {referralUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="size-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="relative z-10 flex gap-3">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 h-11 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98] transition-all"
          >
            <MessageCircle className="size-4" />
            شارك عبر واتساب
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center gap-2 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] transition-all"
          >
            <Share2 className="size-4" />
            نسخ الرابط
          </button>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-center text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-4">
          شارك الرابط مع أصدقائك واحصل على نقاط مكافأة
        </p>
      </div>
    </div>
  );
}
