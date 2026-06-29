"use client";

import { Share2 } from "lucide-react";
import { premiumToast } from "@/lib/premium-toast";

export default function ShareButton({ url, title }: { url: string; title: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        premiumToast("success", "تم نسخ الرابط");
      } catch {
        premiumToast("error", "فشل النسخ");
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-card text-sm font-medium hover:bg-orange/10 transition-all duration-300"
    >
      <Share2 className="size-4" />
      شارك المنيو
    </button>
  );
}
