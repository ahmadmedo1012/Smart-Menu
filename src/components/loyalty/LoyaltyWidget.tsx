"use client";

import { useState, useCallback } from "react";
import { toArabicNumber } from "@/lib/format";
import {
  Phone,
  ChevronDown,
  ChevronUp,
  Award,
  Star,
  TrendingUp,
  Gift,
  UserPlus,
  Sparkles,
  Medal,
  Target,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import ReferralCard from "./ReferralCard";

// ─── Tier config ────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
  string,
  {
    label: string;
    labelAr: string;
    color: string;
    gradient: string;
    glow: string;
    icon: typeof Award;
    minPoints: number;
    nextTier: string | null;
    nextPoints: number;
  }
> = {
  bronze: {
    label: "Bronze",
    labelAr: "برونزي",
    color: "text-amber-700 dark:text-amber-400",
    gradient: "from-amber-400 to-amber-600",
    glow: "shadow-amber-500/20",
    icon: Medal,
    minPoints: 0,
    nextTier: "silver",
    nextPoints: 50,
  },
  silver: {
    label: "Silver",
    labelAr: "فضي",
    color: "text-slate-500 dark:text-slate-300",
    gradient: "from-slate-300 to-slate-500",
    glow: "shadow-slate-400/20",
    icon: Award,
    minPoints: 50,
    nextTier: "gold",
    nextPoints: 150,
  },
  gold: {
    label: "Gold",
    labelAr: "ذهبي",
    color: "text-amber-500 dark:text-amber-300",
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    glow: "shadow-amber-500/30",
    icon: Star,
    minPoints: 150,
    nextTier: "platinum",
    nextPoints: 400,
  },
  platinum: {
    label: "Platinum",
    labelAr: "بلاتيني",
    color: "text-cyan-600 dark:text-cyan-300",
    gradient: "from-cyan-400 via-purple-400 to-cyan-500",
    glow: "shadow-cyan-400/30",
    icon: Sparkles,
    minPoints: 400,
    nextTier: null,
    nextPoints: 0,
  },
};

// ─── Types ───────────────────────────────────────────────────────────────

type LoyaltyData = {
  card: {
    id: number;
    customerPhone: string;
    customerName: string;
    totalOrders: number;
    totalSpent: number;
    points: number;
    tier: string;
    referralCode: string;
  };
  tier: string;
  nextTier: string | null;
  pointsToNext: number;
  referralUrl: string;
};

type LoyaltyWidgetProps = {
  restaurantId?: number;
  restaurantName: string;
  restaurantSlug: string;
  whatsapp?: string;
};

// ─── Component ──────────────────────────────────────────────────────────

export default function LoyaltyWidget({
  restaurantId,
  restaurantName,
  restaurantSlug,
  whatsapp,
}: LoyaltyWidgetProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleCheck = useCallback(async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }

    setLoading(true);
    setNotFound(false);
    setLoyaltyData(null);

    try {
      const res = await fetch(
        `/api/loyalty?phone=${encodeURIComponent(cleaned)}&restaurantId=${restaurantId ?? 1}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        setLoyaltyData(json.data as LoyaltyData);
        toast.success("تم العثور على بطاقة الولاء الخاصة بك");
      } else {
        setNotFound(true);
        // Register new loyalty card
        const createRes = await fetch("/api/loyalty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerPhone: cleaned,
            customerName: "",
            restaurantId: restaurantId ?? 1,
          }),
        });
        const createJson = await createRes.json();
        if (createJson.success && createJson.data) {
          setLoyaltyData(createJson.data as LoyaltyData);
          toast.success("تم إنشاء بطاقة ولاء جديدة!");
        } else {
          toast.error("تعذر إنشاء بطاقة الولاء");
        }
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [phone, restaurantId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCheck();
  };

  const tier = loyaltyData ? TIER_CONFIG[loyaltyData.tier] ?? TIER_CONFIG.bronze : TIER_CONFIG.bronze;
  const TierIcon = tier.icon;

  const progressPercent = loyaltyData
    ? tier.nextTier
      ? Math.min(
          100,
          Math.round(
            ((loyaltyData.card.points - tier.minPoints) /
              (tier.nextPoints - tier.minPoints)) *
              100,
          ),
        )
      : 100
    : 0;

  return (
    <section className="max-w-4xl mx-auto px-4 mb-8">
      <div className="glass-card rounded-2xl overflow-hidden transition-all duration-400">
        {/* Accordion header */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-5 text-right hover:bg-amber-500/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Award className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                برنامج الولاء
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  جديد
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                اكسب نقاط مع كل طلب واحصل على مكافآت
              </p>
            </div>
          </div>
          <div className="size-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            {open ? (
              <ChevronUp className="size-4 text-amber-500" />
            ) : (
              <ChevronDown className="size-4 text-amber-500" />
            )}
          </div>
        </button>

        {/* Accordion content */}
        {open && (
          <div className="px-5 pb-6 animate-slide-down">
            {/* Phone input */}
            {!loyaltyData && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  أدخل رقم هاتفك للتحقق من ولائك
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative glow-within rounded-xl border border-border/40 bg-white/70 dark:bg-card/70 backdrop-blur-xl">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="0912345678"
                      className="w-full h-12 pr-10 px-4 bg-transparent text-sm outline-none rounded-xl"
                      dir="ltr"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheck}
                    disabled={loading}
                    className="h-12 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        جاري...
                      </span>
                    ) : (
                      "تحقق"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Not found state — CTA */}
            {notFound && !loyaltyData && (
              <div className="text-center py-8 animate-fade-in">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                  <ShoppingBag className="size-8 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">مرحباً بك! 👋</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6 leading-relaxed">
                  ابدأ رحلة الولاء معنا
                  <br />
                  اطلب أول طلب لبدء جمع النقاط والمكافآت
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium shadow-lg shadow-amber-500/25">
                  <Award className="size-4" />
                  ابدأ الآن
                </div>
              </div>
            )}

            {/* Found — loyalty card details */}
            {loyaltyData && (
              <div className="animate-fade-in space-y-5">
                {/* Tier badge */}
                <div className="text-center relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-5 blur-2xl rounded-full`}
                  />
                  <div
                    className={`mx-auto mb-3 size-16 rounded-2xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center shadow-lg ${tier.glow} relative`}
                  >
                    <TierIcon className="size-8 text-white" />
                  </div>
                  <span
                    className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r ${tier.gradient} text-white shadow-lg ${tier.glow}`}
                  >
                    {tier.labelAr}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {toArabicNumber(loyaltyData.card.points)} نقطة ولاء
                  </p>
                </div>

                {/* Points progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Target className="size-3 text-amber-500" />
                      {toArabicNumber(loyaltyData.card.points)} نقطة
                    </span>
                    {tier.nextTier ? (
                      <span className="text-muted-foreground">
                        المستوى التالي:{" "}
                        <span className={`font-medium ${TIER_CONFIG[tier.nextTier]?.color}`}>
                          {TIER_CONFIG[tier.nextTier]?.labelAr}
                        </span>{" "}
                        ({toArabicNumber(tier.nextPoints)} نقطة)
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium flex items-center gap-1">
                        <Sparkles className="size-3" />
                        أعلى مستوى
                      </span>
                    )}
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${tier.gradient} transition-all duration-700 ease-out`}
                      style={{ width: `${toArabicNumber(progressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <ShoppingBag className="size-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-bold">{toArabicNumber(loyaltyData.card.totalOrders)}</p>
                    <p className="text-xs text-muted-foreground">عدد الطلبات</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <TrendingUp className="size-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-bold">
                      {toArabicNumber(loyaltyData.card.totalSpent.toFixed(1))}
                    </p>
                    <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
                  </div>
                </div>

                {/* Referral section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="size-4 text-amber-500" />
                    <span className="text-sm font-semibold">شارك مع صديق</span>
                  </div>
                  <ReferralCard
                    restaurantName={restaurantName}
                    restaurantSlug={restaurantSlug}
                    referralCode={loyaltyData.card.referralCode}
                    whatsapp={whatsapp}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
