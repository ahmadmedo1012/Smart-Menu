'use client';

import { useState, useCallback } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { toArabicNumber } from '@/lib/format';
import { Award, Star, Sparkles, Medal, Gift, Stamp } from 'lucide-react';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { ReferralCard } from './ReferralCard';
import { cn } from '@/lib/utils';
/* SM-D2 (19-AUDIT-SM): الجزيرة كانت آخر مدخل خارج الكانون على مسار مال عام
   (h-10/13px/بلا اسم متاح/ring-2/تدرجات خاصة) — تستهلك الآن ثابت كانون
   مدخل حوار المنيو نفسه (h-11/16px/هالة --state-input-focus-halo) بدل
   وصفة خاصة. المنطق التجاري كما هو حرفيًا. */
import { glassPillInput } from '@/components/menu/order-dialog/constants';

/* SM-D2: التدرجات الخاصة (from-orange to-orange/80) صارت توكنات صلبة —
   نفس لغة الشارات الصلبة في الأسطول (r131-F4)؛ الفضي = الزوج الحيادي. */
const TIER_CONFIG: Record<
        string,
        { labelAr: string; pill: string; fill: string; icon: typeof Award; minPoints: number; color: string }
> = {
        bronze: {
                labelAr: 'برونزي',
                pill: 'bg-orange text-orange-foreground',
                fill: 'bg-orange',
                icon: Medal,
                minPoints: 0,
                /* r95: نص المستويات — accent-foreground الأسطع (AA) بدل الكهرمان القديم */
                color: 'text-accent-foreground',
        },
        silver: {
                labelAr: 'فضي',
                pill: 'bg-muted text-muted-foreground border border-border',
                fill: 'bg-muted-foreground/60',
                icon: Award,
                minPoints: 50,
                color: 'text-muted-foreground',
        },
        gold: {
                labelAr: 'ذهبي',
                pill: 'bg-orange text-orange-foreground',
                fill: 'bg-orange',
                icon: Star,
                minPoints: 150,
                color: 'text-accent-foreground',
        },
        platinum: {
                labelAr: 'بلاتيني',
                pill: 'bg-orange text-orange-foreground',
                fill: 'bg-orange',
                icon: Sparkles,
                minPoints: 400,
                color: 'text-accent-foreground',
        },
};

// ponytail → W6-B6 (تدقيق W6-A3 — إصلاح صغير 3): العتبات صارت من الخادم —
// tierThresholds في استجابة /api/loyalty (المصدر الواحد loyalty-tiers.ts)،
// والقيم هنا سقوط آمن للاستجابات القديمة فقط. التسميات/الأيقونات تبقى
// محلية (عرض فقط — لا حساب).
const tierMinOf = (server: Record<string, number> | undefined, tier: string) =>
        server?.[tier] ?? TIER_CONFIG[tier]?.minPoints ?? 0;

// Reward stamps config — "اطلب 5 مرات واحصل على وجبة مجانية"
const STAMP_GOAL = 5;
const REWARD_LABEL = 'وجبة مجانية';

type LoyaltyWidgetProps = {
        restaurantId?: number;
        restaurantName: string;
        restaurantSlug: string;
        whatsapp?: string;
};

export function LoyaltyWidget({
        restaurantId,
        restaurantName,
        restaurantSlug,
        whatsapp,
}: LoyaltyWidgetProps) {
        const [phone, setPhone] = useState('');
        const [loading, setLoading] = useState(false);
        const [data, setData] = useState<{
                card: {
                        points: number;
                        totalOrders: number;
                        totalSpent: number;
                        tier: string;
                        referralCode: string;
                        customerName: string;
                };
                referralUrl: string;
                tierThresholds?: Record<string, number>;
                /* W7-B (G-4): علم خادمي — «برنامج الإحالات» حقّ خطة الاحترافية
                   فأعلى. undefined = استجابة قديمة (سقوط آمن: تُعرض كما كانت)؛
                   false = مطعم دون الرتبة → غياب صادق للبطاقة: الزبون لا
                   يملك ما يفعله بها أصلًا (الإنشاء مرفوض خادميًا) فلا يُعرض
                   عليه رابط ميت — رحلة الولاء الأساسية (النقاط/الطوابع/
                   المستويات) عالمية وتبقى كما هي. */
                referralProgram?: boolean;
        } | null>(null);
        const [notFound, setNotFound] = useState(false);

        const tier = data ? (TIER_CONFIG[data.card.tier] ?? TIER_CONFIG.bronze) : TIER_CONFIG.bronze;
        const TierIcon = tier.icon;
        // WCAG: skip spring/rotate stamp animation when user prefers reduced motion
        const shouldReduceMotion = useReducedMotion();

        const handleCheck = useCallback(async () => {
                const cleaned = phone.trim();
                if (!cleaned) {
                        premiumToast('error', 'يرجى إدخال رقم الهاتف');
                        return;
                }
                setLoading(true);
                setNotFound(false);
                setData(null);
                try {
                        const res = await fetch(
                                `/api/loyalty?phone=${encodeURIComponent(cleaned)}&restaurantId=${restaurantId ?? 1}`
                        );
                        const json = await res.json();
                        if (json.success && json.data) {
                                setData(json.data);
                                premiumToast('gift', 'تم العثور على بطاقة الولاء!');
                        } else {
                                setNotFound(true);
                                const cr = await csrfFetch('/api/loyalty', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                                customerPhone: cleaned,
                                                customerName: '',
                                                restaurantId: restaurantId ?? 1,
                                        }),
                                });
                                const cj = await cr.json();
                                if (cj.success && cj.data) {
                                        setData(cj.data);
                                        premiumToast('gift', 'تم إنشاء بطاقة ولاء جديدة!');
                                } else premiumToast('error', 'تعذّر إنشاء بطاقة الولاء');
                        }
                } catch {
                        premiumToast('error', 'حدث خطأ في الاتصال');
                } finally {
                        setLoading(false);
                }
        }, [phone, restaurantId]);

        return (
                <section className="max-w-4xl mx-auto px-4 mb-4 mt-8">
                        <div className="rounded-md bg-orange-muted/70 dark:bg-orange-muted/25 border border-orange/30 overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-orange flex items-center justify-center shadow-sm">
                                                        <Gift className="size-5 text-orange-foreground" />
                                                </div>
                                                <div>
                                                        <h2 className="text-sm font-bold flex items-center gap-2">
                                                                برنامج الولاء
                                                                <span className="bg-orange text-orange-foreground text-3xs font-bold px-2 py-0.5 rounded-full">
                                                                        جديد
                                                                </span>
                                                        </h2>
                                                        <p className="text-xs text-muted-foreground">اكسب نقاط مع كل طلب</p>
                                                </div>
                                        </div>
                                        {data && (
                                                <div
                                                        className={cn(
                                                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm',
                                                                tier.pill
                                                        )}
                                                >
                                                        <TierIcon className="size-3" /> {tier.labelAr}
                                                </div>
                                        )}
                                </div>

                                {!data ? (
                                        /* Input form */
                                        <div className="px-4 pb-4">
                                                <div className="flex gap-2">
                                                        {/* SM-D2: نفس وصفة هاتف العميل في حوار الطلب — glassPillInput
                                                            (h-11/rounded-xl/16px/placeholder-AA/hالة التركيز) + عقد tel
                                                            الكامل (r134-W2 #3) + اسم متاح aria-label (كان placeholder وحيد)
                                                            + بلا ring خاص (عقد :focus-visible العام هو المؤشر الوحيد). */}
                                                        <input
                                                                id="loyalty-phone"
                                                                name="phone"
                                                                type="tel"
                                                                inputMode="tel"
                                                                autoComplete="tel"
                                                                value={phone}
                                                                onChange={(e) => setPhone(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                                                                placeholder="رقم هاتفك للولاء"
                                                                aria-label="رقم الهاتف للولاء"
                                                                className={cn(glassPillInput, 'text-left flex-1 min-w-0')}
                                                                dir="ltr"
                                                        />
                                                        <button
                                                                type="button"
                                                                onClick={handleCheck}
                                                                aria-label="تحقق"
                                                                disabled={loading}
                                                                className="min-h-11 px-4 rounded-xl bg-orange text-orange-foreground text-sm font-semibold shadow-[var(--shadow-card-premium)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-premium-h)] transition-[background-color,transform,box-shadow] active:scale-[0.97] active:duration-[var(--t-micro,80ms)] disabled:opacity-55 disabled:pointer-events-none disabled:cursor-not-allowed shrink-0"
                                                        >
                                                                {loading ? (
                                                                        <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin block" />
                                                                ) : (
                                                                        'تحقق'
                                                                )}
                                                        </button>
                                                </div>
                                                {notFound && (
                                                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                                                                {/* SM-D2: الإيموجي 👋 → أيقونة lucide (لغة الأيقونات الموحدة) */}
                                                                <Gift className="size-3.5 shrink-0 text-accent-foreground" aria-hidden="true" />
                                                                لم نجد بطاقة — سيتم إنشاء واحدة جديدة لك!
                                                        </p>
                                                )}
                                        </div>
                                ) : (
                                        /* Loyalty card data */
                                        <div className="px-4 pb-4 space-y-3 animate-fade-in">
                                                {/* Points + Orders summary */}
                                                <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-bold tabular-nums">{toArabicNumber(data.card.points)}</span>
                                                        <span className="text-muted-foreground">نقطة ولاء</span>
                                                        {data.card.totalOrders > 0 && (
                                                                <span className="text-muted-foreground">
                                                                        · {toArabicNumber(data.card.totalOrders)} طلب
                                                                </span>
                                                        )}
                                                </div>

                                                {/* Stamp Card — order stamps progress */}
                                                {(() => {
                                                        const stamps =
                                                                data.card.totalOrders % STAMP_GOAL || (data.card.totalOrders > 0 ? STAMP_GOAL : 0);
                                                        return (
                                                                <div className="rounded-lg bg-card/60 p-3 border border-border/20">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-xs font-bold flex items-center gap-1.5">
                                                                                        {/* r95: أيقونة الطوابع — accent-foreground الأسطع */}
                                                                                        <Stamp className="size-3.5 text-accent-foreground" />
                                                                                        بطاقة الطلبات
                                                                                </span>
                                                                                <span className="text-2xs text-muted-foreground">
                                                                                        {toArabicNumber(stamps)}/{toArabicNumber(STAMP_GOAL)} ← {REWARD_LABEL}
                                                                                </span>
                                                                        </div>
                                                                        <div className="flex gap-1.5 justify-center">
                                                                                {Array.from({ length: STAMP_GOAL }, (_, i) => {
                                                                                        const isFilled = i < stamps;
                                                                                        return (
                                                                                                <m.div
                                                                                                        key={i}
                                                                                                        initial={shouldReduceMotion ? false : { scale: 0, rotate: -90 }}
                                                                                                        animate={{ scale: 1, rotate: 0 }}
                                                                                                        transition={
                                                                                                                shouldReduceMotion
                                                                                                                        ? { duration: 0 }
                                                                                                                        : {
                                                                                                                                delay: i * 0.06,
                                                                                                                                type: 'spring',
                                                                                                                                stiffness: 200,
                                                                                                                                damping: 15,
                                                                                                                        }
                                                                                                        }
                                                                                                        className={cn(
                                                                                                                'size-9 rounded-lg flex items-center justify-center text-xs font-bold border transition-[background-color,border-color,box-shadow]',
                                                                                                                isFilled
                                                                                                                        ? 'bg-orange text-orange-foreground border-orange shadow-sm shadow-orange/25'
                                                                                                                        /* r127-F4: رقم خانة الختم نص مقروء — /30 → /60 (القشرة bg/border تظل زخرفية) */
                                                                                                                        : 'bg-muted/30 text-muted-foreground/60 border-border/20'
                                                                                                        )}
                                                                                                >
                                                                                                        {isFilled ? <Stamp className="size-4" /> : toArabicNumber(i + 1)}
                                                                                                </m.div>
                                                                                        );
                                                                                })}
                                                                        </div>
                                                                </div>
                                                        );
                                                })()}

                                                {/* Points progress to next tier — W6-B6: العتبات
                                                    من استجابة الخادم (tierThresholds) */}
                                                {(() => {
                                                        const tiers = ['silver', 'gold', 'platinum'] as const;
                                                        const nextTier = tiers.find(
                                                                (t) => data.card.points < tierMinOf(data.tierThresholds, t)
                                                        );
                                                        if (nextTier) {
                                                                const current = data.card.points;
                                                                const next = tierMinOf(data.tierThresholds, nextTier);
                                                                const prevIdx = Math.max(0, tiers.indexOf(nextTier) - 1);
                                                                const prev =
                                                                        prevIdx === 0 ? 0 : tierMinOf(data.tierThresholds, tiers[prevIdx]);
                                                                const pct = Math.min(100, ((current - prev) / (next - prev)) * 100);
                                                                const TIcon = TIER_CONFIG[nextTier].icon;
                                                                return (
                                                                        <div className="rounded-lg bg-card/60 p-3 border border-border/20">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                                                                                <TIcon className="size-3.5 text-muted-foreground" />
                                                                                                التقدم نحو المستوى {TIER_CONFIG[nextTier].labelAr}
                                                                                        </span>
                                                                                        <span className="text-2xs text-muted-foreground tabular-nums">
                                                                                                {toArabicNumber(current)}/{toArabicNumber(next)}
                                                                                        </span>
                                                                                </div>
                                                                                <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                                                                                        <m.div
                                                                                                initial={shouldReduceMotion ? false : { width: 0 }}
                                                                                                animate={{ width: `${pct}%` }}
                                                                                                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
                                                                                                className={cn('h-full rounded-full', TIER_CONFIG[nextTier].fill)}
                                                                                        />
                                                                                </div>
                                                                        </div>
                                                                );
                                                        }
                                                        return null;
                                                })()}

                                                {/* Referral — W7-B: يُعرض فقط عندما يفتحه
                                                    خادم الميزة علمه (خطة الاحترافية فأعلى)؛
                                                    غياب صادق لا قفل في وجه الزبون. */}
                                                {data.card.referralCode && data.referralProgram !== false && (
                                                        <ReferralCard
                                                                restaurantName={restaurantName}
                                                                restaurantSlug={restaurantSlug}
                                                                referralCode={data.card.referralCode}
                                                                whatsapp={whatsapp}
                                                        />
                                                )}
                                        </div>
                                )}
                        </div>
                </section>
        );
}
