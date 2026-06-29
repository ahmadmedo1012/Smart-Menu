"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toArabicNumber } from "@/lib/format";
import { Phone, Award, Star, Sparkles, Medal, Gift, Stamp } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";
import { premiumToast } from "@/lib/premium-toast";
import ReferralCard from "./ReferralCard";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<string, { labelAr: string; gradient: string; icon: typeof Award; minPoints: number; color: string }> = {
  bronze:   { labelAr: "برونزي", gradient: "from-orange to-orange/80", icon: Medal, minPoints: 0, color: "text-orange" },
  silver:   { labelAr: "فضي",    gradient: "from-slate-300 to-slate-500", icon: Award, minPoints: 50, color: "text-slate-500" },
  gold:     { labelAr: "ذهبي",   gradient: "from-orange via-orange to-orange/80", icon: Star, minPoints: 150, color: "text-orange" },
  platinum: { labelAr: "بلاتيني", gradient: "from-orange to-orange/80", icon: Sparkles, minPoints: 400, color: "text-orange" },
};

// ponytail: tier thresholds duplicated inline in progress calc, keep until extracted
// Reward stamps config — "اطلب 5 مرات واحصل على وجبة مجانية"
const STAMP_GOAL = 5;
const REWARD_LABEL = "وجبة مجانية";

type LoyaltyWidgetProps = {
  restaurantId?: number;
  restaurantName: string;
  restaurantSlug: string;
  whatsapp?: string;
};

export default function LoyaltyWidget({ restaurantId, restaurantName, restaurantSlug, whatsapp }: LoyaltyWidgetProps) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    card: { points: number; totalOrders: number; totalSpent: number; tier: string; referralCode: string; customerName: string };
    referralUrl: string;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const tier = data ? TIER_CONFIG[data.card.tier] ?? TIER_CONFIG.bronze : TIER_CONFIG.bronze;
  const TierIcon = tier.icon;

  const handleCheck = useCallback(async () => {
    const cleaned = phone.trim();
    if (!cleaned) { premiumToast("error", "يرجى إدخال رقم الهاتف"); return; }
    setLoading(true); setNotFound(false); setData(null);
    try {
      const res = await fetch(`/api/loyalty?phone=${encodeURIComponent(cleaned)}&restaurantId=${restaurantId ?? 1}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        premiumToast("gift", "تم العثور على بطاقة الولاء!");
      } else {
        setNotFound(true);
        const cr = await csrfFetch("/api/loyalty", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerPhone: cleaned, customerName: "", restaurantId: restaurantId ?? 1 }),
        });
        const cj = await cr.json();
        if (cj.success && cj.data) { setData(cj.data); premiumToast("gift", "تم إنشاء بطاقة ولاء جديدة!"); }
        else premiumToast("error", "تعذر إنشاء بطاقة الولاء");
      }
    } catch { premiumToast("error", "حدث خطأ في الاتصال"); }
    finally { setLoading(false); }
  }, [phone, restaurantId]);

  return (
    <section className="max-w-4xl mx-auto px-4 mb-4 mt-8">
      <div className="rounded-md bg-gradient-to-br from-orange-muted/80 to-orange-muted/50 dark:from-orange-muted/20 dark:to-orange-muted/10 border border-orange/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-md">
              <Gift className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                برنامج الولاء
                <span className="bg-gradient-to-r from-orange to-orange/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">جديد</span>
              </h2>
              <p className="text-xs text-muted-foreground">اكسب نقاط مع كل طلب</p>
            </div>
          </div>
          {data && (
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r text-white shadow-sm", tier.gradient)}>
              <TierIcon className="size-3" /> {tier.labelAr}
            </div>
          )}
        </div>

        {!data ? (
          /* Input form */
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative rounded-xl border border-border/30 bg-white/70 dark:bg-card/70">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCheck()}
                  placeholder="رقم هاتفك للولاء" className="w-full h-10 pr-10 px-3 bg-transparent text-sm outline-none rounded-xl" dir="ltr" />
              </div>
              <button type="button" onClick={handleCheck} disabled={loading}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-orange to-orange text-white text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-50 shrink-0">
                {loading ? <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin block" /> : "تحقق"}
              </button>
            </div>
            {notFound && <p className="text-xs text-muted-foreground mt-2">👋 لم نجد بطاقة — سيتم إنشاء واحدة جديدة لك!</p>}
          </div>
        ) : (
          /* Loyalty card data */
          <div className="px-4 pb-4 space-y-3 animate-fade-in">
            {/* Points + Orders summary */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold tabular-nums">{toArabicNumber(data.card.points)}</span>
              <span className="text-muted-foreground">نقطة ولاء</span>
              {data.card.totalOrders > 0 && (
                <span className="text-muted-foreground">· {toArabicNumber(data.card.totalOrders)} طلب</span>
              )}
            </div>

            {/* Stamp Card — order stamps progress */}
            {(() => {
              const stamps = data.card.totalOrders % STAMP_GOAL || (data.card.totalOrders > 0 ? STAMP_GOAL : 0);
              return (
                <div className="rounded-lg bg-card/60 p-3 border border-border/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Stamp className="size-3.5 text-orange" />
                      بطاقة الطلبات
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {toArabicNumber(stamps)}/{toArabicNumber(STAMP_GOAL)} ← {REWARD_LABEL}
                    </span>
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    {Array.from({ length: STAMP_GOAL }, (_, i) => {
                      const isFilled = i < stamps;
                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 15 }}
                          className={cn(
                            "size-9 rounded-lg flex items-center justify-center text-xs font-bold border transition-all",
                            isFilled
                              ? "bg-orange text-white border-orange shadow-sm shadow-orange/25"
                              : "bg-muted/30 text-muted-foreground/30 border-border/20",
                          )}
                        >
                          {isFilled ? <Stamp className="size-4" /> : toArabicNumber(i + 1)}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Points progress to next tier */}
            {(() => {
              const tiers = ["silver", "gold", "platinum"] as const;
              const tierKeys = { silver: 50, gold: 150, platinum: 400 } as const;
              const nextTier = tiers.find(t => data.card.points < tierKeys[t]);
              if (nextTier) {
                const current = data.card.points;
                const next = tierKeys[nextTier];
                // Find previous threshold
                const prevIdx = Math.max(0, tiers.indexOf(nextTier) - 1);
                const prev = prevIdx === 0 ? 0 : tierKeys[tiers[prevIdx] as keyof typeof tierKeys];
                const pct = Math.min(100, ((current - prev) / (next - prev)) * 100);
                const TIcon = TIER_CONFIG[nextTier].icon;
                return (
                  <div className="rounded-lg bg-card/60 p-3 border border-border/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <TIcon className="size-3.5 text-muted-foreground" />
                        التقدم نحو المستوى {TIER_CONFIG[nextTier].labelAr}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {toArabicNumber(current)}/{toArabicNumber(next)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn("h-full rounded-full", TIER_CONFIG[nextTier].gradient)}
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Referral */}
            {data.card.referralCode && (
              <ReferralCard restaurantName={restaurantName} restaurantSlug={restaurantSlug}
                referralCode={data.card.referralCode} whatsapp={whatsapp} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
