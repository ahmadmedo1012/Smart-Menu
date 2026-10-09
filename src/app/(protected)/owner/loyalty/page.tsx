'use client';
import { toArabicNumber } from '@/lib/format';
import { buildWhatsAppShareUrl } from '@/lib/whatsapp';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {Users, Gift, TrendingUp, Award, Share2} from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import AnimatedClock from '@/components/ui/clock-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { premiumToast } from '@/lib/premium-toast';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiGridSkeleton, ListCardSkeleton } from '@/components/shared/DashboardSkeletons';
import { TierChart } from './TierChart';
import { ReferrerList } from './ReferrerList';
import { TransactionTable } from './TransactionTable';
import { ReferralQR } from './ReferralQR';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { csrfJson } from '@/lib/csrf-client';

const LoyaltySettings = dynamic(
        () =>
                import('@/components/loyalty/LoyaltySettings').then((m) => ({ default: m.LoyaltySettings })),
        { ssr: false }
);

/* ---------- Types ---------- */

interface StatsData {
        totalLoyaltyCards: number;
        totalReferrals: number;
        convertedReferrals: number;
        conversionRate: number;
        totalRewardPoints: number;
        referralsByStatus: { pending: number; converted: number; expired: number };
        topReferrers: { customerName: string; referralCount: number; rewardsGiven: number }[];
        tierDistribution: Record<string, number>;
        recentTransactions: {
                id: number;
                type: string;
                points: number;
                description: string;
                createdAt: string;
        }[];
        recentReferrals: {
                id: number;
                referredName: string;
                referredPhone: string;
                status: string;
                discountPercent: number;
                referrerRewardPct: number;
                createdAt: string;
                convertedAt: string | null;
                referrer: { customerName: string };
        }[];
}

/* ---------- Animated Count Up ---------- */

function AnimatedCount({ value, suffix = '' }: { value: number; suffix?: string }) {
        const [display, setDisplay] = useState(0);
        const prev = useRef(0);

        useEffect(() => {
                const start = prev.current;
                const end = value;
                // Reduced motion: jump straight to the final value, no rAF count-up
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        prev.current = end;
                        setDisplay(end);
                        return;
                }
                const duration = 800;
                const startTime = performance.now();
                if (start === end) {
                        setDisplay(end);
                        return;
                }
                let rafId: number;
                const tick = (now: number) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setDisplay(Math.round(start + (end - start) * eased));
                        if (progress < 1) rafId = requestAnimationFrame(tick);
                };
                rafId = requestAnimationFrame(tick);
                prev.current = end;
                return () => cancelAnimationFrame(rafId);
        }, [value]);

        return (
                <span className="tabular-nums">
                        {toArabicNumber(display)}
                        {suffix}
                </span>
        );
}

/* ---------- Stat Card ---------- */

function StatCard({
        label,
        value,
        suffix = '',
        icon: Icon,
        color,
        bg,
}: {
        label: string;
        value: number;
        suffix?: string;
        icon: typeof Users;
        color: string;
        bg: string;
}) {
        return (
                <div className="group card-premium relative overflow-hidden rounded-xl bg-card p-5 border border-border/50 shadow-lg shadow-black/20">
                        <div className="pointer-events-none absolute inset-0 z-0 w-[300%] -translate-x-2/3 skew-x-12 bg-gradient-to-r from-transparent via-accent-foreground/10 to-transparent transition-transform duration-cinema ease-out group-hover:translate-x-1/3 group-hover:skew-x-0" />
                        <div className="relative z-10 flex items-start justify-between">
                                <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                        <p className="text-3xl font-bold tracking-normal">
                                                <AnimatedCount value={value} suffix={suffix} />
                                        </p>
                                </div>
                                <div className={cn('rounded-md p-3.5 ring-1 ring-border/50', bg)}>
                                        <Icon className={cn('size-6', color)} />
                                </div>
                        </div>
                </div>
        );
}

/* ---------- Conversion Rate Bar ---------- */

function ConversionRate({
        rate,
        total,
        converted,
}: {
        rate: number;
        total: number;
        converted: number;
}) {
        return (
                <div className="card-premium relative overflow-hidden rounded-xl bg-card p-5 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                        <TrendingUp className="size-4 text-orange" />
                                        <span className="text-sm font-semibold">معدل التحويل</span>
                                </div>
                                <span className="text-sm font-bold tabular-nums text-accent-foreground">{rate}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
                                <div
                                        className="h-full rounded-full bg-gradient-to-r from-orange to-orange/80 transition-[width] duration-cinema ease-out"
                                        style={{ width: `${rate}%` }}
                                />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{toArabicNumber(converted)} تم التحويل</span>
                                <span>{toArabicNumber(total)} إجمالي</span>
                        </div>
                </div>
        );
}

/* ---------- Redeem Panel (r103-F2) ----------
 * The stamp-card promise ("اطلب 5 مرات واحصل على وجبة مجانية") was display-only:
 * the redeem endpoint existed (tested, race-safe) but NO UI anywhere could call
 * it — the loyalty loop could never close through the product. This panel gives
 * the owner the counter-side flow: look up a customer's card by phone →
 * confirm → POST /api/loyalty/redeem. All money/state logic stays server-side.
 */
function RedeemPanel({ restaurantId, onRedeemed }: { restaurantId: number | null; onRedeemed: () => void }) {
        const [phone, setPhone] = useState('');
        const [card, setCard] = useState<{ id: number; tier: string; totalOrders: number; points: number } | null>(null);
        const [phase, setPhase] = useState<'idle' | 'searching' | 'found' | 'redeeming'>('idle');
        const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

        const REWARD_COST = 5; // stamps per free meal — mirrors the endpoint's contract
        const eligible = card !== null && card.totalOrders >= REWARD_COST && (card.points ?? 0) >= REWARD_COST;

        const search = async () => {
                const trimmed = phone.trim();
                if (!/^\+?[0-9]{7,15}$/.test(trimmed.replace(/[\s-]/g, ''))) {
                        setNotice({ kind: 'error', text: 'أدخل رقم هاتف صالحاً' });
                        return;
                }
                setPhase('searching');
                setNotice(null);
                setCard(null);
                try {
                        const qs = new URLSearchParams({ phone: trimmed.replace(/[\s-]/g, '') });
                        if (restaurantId) qs.set('restaurantId', String(restaurantId));
                        const res = await fetch(`/api/loyalty?${qs.toString()}`);
                        const json = await res.json();
                        if (res.ok && json.success && json.data?.card) {
                                const c = json.data.card as { id: number; tier: string; totalOrders: number; points: number };
                                setCard(c);
                                setPhase('found');
                        } else {
                                setPhase('idle');
                                setNotice({ kind: 'error', text: json.error ?? 'بطاقة الولاء غير موجودة' });
                        }
                } catch {
                        setPhase('idle');
                        setNotice({ kind: 'error', text: 'تعذّر البحث — تحقق من الاتصال' });
                }
        };

        const redeem = async () => {
                if (!card || !eligible) return;
                setPhase('redeeming');
                setNotice(null);
                try {
                        // csrfJson throws on non-2xx with the server's Arabic message
                        const json = await csrfJson<{ success: boolean; data?: { message?: string } }>('/api/loyalty/redeem', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cardId: card.id }),
                        });
                        premiumToast('success', json.data?.message ?? 'تم الاستبدال بنجاح');
                        setCard(null);
                        setPhone('');
                        setPhase('idle');
                        onRedeemed();
                } catch (e) {
                        setPhase('found');
                        setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'تعذّر الاستبدال — حاول مجدداً' });
                }
        };

        return (
                <div className="card-premium relative overflow-hidden rounded-xl bg-card p-5 border border-border/50">
                        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                                <Gift className="size-4 text-muted-foreground" /> استبدال وجبة مجانية
                        </h2>
                        <p className="text-xs text-muted-foreground mb-4">
                                ابحث عن بطاقة العميل برقم هاتفه، ثم أكّد الاستبدال عند تسليم الوجبة — يُخصم {toArabicNumber(REWARD_COST)} طلبات من البطاقة.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                        type="tel"
                                        dir="ltr"
                                        inputMode="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && phase !== 'searching' && search()}
                                        placeholder="+218 91 000 0000"
                                        aria-label="رقم هاتف العميل"
                                        className="flex-1 h-11 rounded-md border border-border/40 bg-background/60 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60 tabular-nums"
                                />
                                <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-11 px-4 gap-1.5"
                                        onClick={search}
                                        disabled={phase === 'searching'}
                                >
                                        {phase === 'searching' ? <AnimatedRefreshCw className="size-4 animate-spin" /> : <Users className="size-4" />}
                                        بحث
                                </Button>
                        </div>

                        {notice && (
                                <p className={cn('text-xs mt-3', notice.kind === 'error' ? 'text-destructive' : 'text-muted-foreground')} role="status">
                                        {notice.text}
                                </p>
                        )}

                        {card && (
                                <div className="mt-4 rounded-md border border-border/40 bg-background/40 p-4 animate-fade-in">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                        <Badge variant="outline" className="border-border/50 bg-muted text-xs">{card.tier}</Badge>
                                                        <span className="text-muted-foreground">
                                                                {toArabicNumber(card.totalOrders)} طلب · {toArabicNumber(card.points ?? 0)} نقطة
                                                        </span>
                                                </div>
                                                <Button
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={redeem}
                                                        disabled={!eligible || phase === 'redeeming'}
                                                >
                                                        {phase === 'redeeming' ? <AnimatedRefreshCw className="size-4 animate-spin" /> : <Gift className="size-4" />}
                                                        استبدال الوجبة
                                                </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                                {eligible
                                                        ? 'البطاقة مؤهلة للاستبدال الآن.'
                                                        : `الاستبدال يتطلب ${toArabicNumber(REWARD_COST)} طلبات و${toArabicNumber(REWARD_COST)} نقاط على الأقل.`}
                                        </p>
                                </div>
                        )}
                </div>
        );
}

/* ================================================================
   PAGE
   ================================================================ */

export default function OwnerLoyaltyPage() {
        const router = useRouter();
        const { activeId } = useActiveRestaurant();
        const [stats, setStats] = useState<StatsData | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [showSettings, setShowSettings] = useState(false);
        const [copied, setCopied] = useState(false);

        /* r93-W3 (بقية تقرير 1-d رقم 15): حارس hydration لمنشأ رابط الإحالة —
           نفس نمط mounted-guard المعتمد في المشروع (ThemeToggle + ReferralCard
           بعد r93-W2a): أول لقطة (ما يقارنه hydration) بلا window إطلاقًا
           (الرابط يُصيّر نسبيًا على الخادم والعميل معًا) ثم يمتلئ المنشأ بعد
           التركيب. النسخ/المشاركة/QR تفاعلات ما-بعد-التركيب فلا تتأثر الرحلة. */
        const [mounted, setMounted] = useState(false);
        useEffect(() => setMounted(true), []);
        const origin = mounted ? window.location.origin : '';
        const ownerRefUrl = `${origin}/owner/loyalty?ref=share`;

        const load = useCallback(async () => {
                setLoading(true);
                setError(null);
                try {
                        // Multi-menu: scope loyalty stats to the active restaurant
                        const qs = activeId ? `?restaurantId=${activeId}` : '';
                        const res = await fetch(`/api/loyalty/stats${qs}`);
                        if (!res.ok) throw new Error('load_failed');
                        const json = await res.json();
                        if (json.success && json.data) setStats(json.data);
                        else throw new Error('invalid_response');
                } catch {
                        setError('تعذّر تحميل بيانات الولاء');
                } finally {
                        setLoading(false);
                }
        }, [activeId]);

        useEffect(() => {
                load();
        }, [load]);

        const handleCopyReferralLink = useCallback(async () => {
                try {
                        await navigator.clipboard.writeText(ownerRefUrl);
                        setCopied(true);
                        premiumToast('copy', 'تم نسخ رابط الإحالة');
                        setTimeout(() => setCopied(false), 2000);
                } catch {
                        premiumToast('error', 'تعذّر نسخ الرابط');
                }
        }, [ownerRefUrl]);

        /* ---------- Loading ---------- */
        if (loading)
                // r131-F5 (A11 SM-2): shape-matched skeleton (KPI strip + breakdown
                // cards) — was four bare animate-pulse blocks.
                return (
                        <div className="space-y-8 animate-fade-in" aria-live="polite" aria-label="جارٍ تحميل بيانات الولاء">
                                <LoadingAnnouncer loading message="جارٍ تحميل بيانات الولاء…" completedMessage="تم تحميل بيانات الولاء" />
                                <KpiGridSkeleton />
                                <div className="grid gap-6 lg:grid-cols-3">
                                        <ListCardSkeleton />
                                        <ListCardSkeleton rows={3} />
                                        <ListCardSkeleton rows={3} />
                                </div>
                        </div>
                );

        /* ---------- Error ---------- */
        if (error)
                // r131-F5 (A1 P1-12): canonical error family (56px well + dot + retry).
                return (
                        <ErrorState
                                title="تعذّر تحميل بيانات الولاء"
                                error={error}
                                onRetry={() => load()}
                        />
                );

        /* ---------- Empty state (no data at all) ---------- */
        const isEmpty =
                stats &&
                stats.totalLoyaltyCards === 0 &&
                stats.recentReferrals.length === 0 &&
                stats.recentTransactions.length === 0;

        if (isEmpty)
                // r131-F5 (A1 P0-3): the full-card hand-rolled empty joins the shared
                // EmptyState primitive (56px tile / 18px title / CTA).
                return (
                        <div className="mx-auto max-w-[1280px] space-y-8 animate-fade-in">
                                <Button variant="ghost" size="sm" onClick={() => router.push('/owner')} className="mb-2">
                                        <MotionArrowRight className="size-4 me-1" /> العودة
                                </Button>
                                <EmptyState
                                        icon={Gift}
                                        title="لا توجد عناصر"
                                        description="لم يتم إضافة أي بيانات ولاء بعد. ابدأ بإعداد برنامج الولاء من الإعدادات."
                                        action={
                                                <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-2">
                                                        <Award className="size-4" /> الإعدادات
                                                </Button>
                                        }
                                />
                                {showSettings && (
                                        <div className="mx-auto w-full max-w-md animate-fade-in">
                                                <LoyaltySettings
                                                        onSaved={() => {
                                                                setShowSettings(false);
                                                                load();
                                                        }}
                                                />
                                        </div>
                                )}
                        </div>
                );

        const statCards = [
                {
                        label: 'إجمالي الأعضاء',
                        value: stats?.totalLoyaltyCards ?? 0,
                        icon: Users,
                        color: 'text-orange',
                        bg: 'bg-orange/10',
                },
                {
                        label: 'إجمالي الإحالات',
                        value: stats?.totalReferrals ?? 0,
                        icon: Gift,
                        color: 'text-success',
                        bg: 'bg-success/10',
                },
                {
                        label: 'تم التحويل',
                        value: stats?.convertedReferrals ?? 0,
                        icon: TrendingUp,
                        color: 'text-orange',
                        bg: 'bg-orange/10',
                },
                {
                        label: 'النقاط المكتسبة',
                        value: stats?.totalRewardPoints ?? 0,
                        icon: Award,
                        color: 'text-ember dark:text-saffron',
                        bg: 'bg-saffron/20 dark:bg-saffron/10',
                },
        ];

        const rbs = stats?.referralsByStatus ?? { pending: 0, converted: 0, expired: 0 };

        return (
                /* r131-F5 (A1 P0-8/P1-7): canonical 1280px container + page-header. */
                <div className="mx-auto max-w-[1280px] space-y-8 animate-fade-in">
                        {/* ---- Header ---- */}
                        <Button variant="ghost" size="sm" onClick={() => router.push('/owner')} className="mb-2">
                                <MotionArrowRight className="size-4 me-1" /> العودة
                        </Button>
                        <PageHeader
                                title="برنامج الولاء"
                                subtitle="إدارة برنامج الولاء والإحالات والمكافآت"
                                actions={
                                        <>
                                                <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={() => setShowSettings(!showSettings)}
                                                >
                                                        <Award className="size-4" />
                                                        {showSettings ? 'إخفاء الإعدادات' : 'الإعدادات'}
                                                </Button>
                                                <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={() => load()}
                                                >
                                                        <AnimatedRefreshCw className="size-4" /> تحديث
                                                </Button>
                                        </>
                                }
                        />

                        {/* ---- Settings panel ---- */}
                        {showSettings && (
                                <div className="animate-fade-in">
                                        <LoyaltySettings
                                                onSaved={() => {
                                                        setShowSettings(false);
                                                        load();
                                                }}
                                        />
                                </div>
                        )}

                        {/* ---- Stats Grid ---- */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {statCards.map((card) => (
                                        <StatCard key={card.label} {...card} />
                                ))}
                        </div>

                        {/* ---- Redeem (r103-F2): close the loyalty loop at the counter ---- */}
                        <RedeemPanel restaurantId={activeId} onRedeemed={load} />

                        {/* ---- Referral Dashboard ---- */}
                        <div className="grid gap-6 lg:grid-cols-3">
                                <ConversionRate
                                        rate={stats?.conversionRate ?? 0}
                                        total={stats?.totalReferrals ?? 0}
                                        converted={stats?.convertedReferrals ?? 0}
                                />

                                <div className="card-premium relative overflow-hidden rounded-xl bg-card p-5 border border-border/50">
                                        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                                <Award className="size-4 text-muted-foreground" /> الإحالات حسب الحالة
                                        </h2>
                                        <div className="space-y-3">
                                                {[
                                                        { label: 'معلق', count: rbs.pending, color: 'bg-orange' },
                                                        { label: 'تم التحويل', count: rbs.converted, color: 'bg-success' },
                                                        { label: 'منتهي', count: rbs.expired, color: 'bg-muted-foreground/60' },
                                                ].map((s) => (
                                                        <div key={s.label} className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                        <span className={cn('size-2.5 rounded-full', s.color)} />
                                                                        <span className="text-sm">{s.label}</span>
                                                                </div>
                                                                <span className="text-sm font-semibold tabular-nums">
                                                                        {toArabicNumber(s.count)}
                                                                </span>
                                                        </div>
                                                ))}
                                        </div>
                                </div>

                                <div className="card-premium relative overflow-hidden rounded-xl bg-card p-5 border border-border/50">
                                        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                <Share2 className="size-4 text-muted-foreground" /> مشاركة رابط الإحالة
                                        </h2>
                                        <div className="flex flex-col items-center gap-3">
                                                <ReferralQR url={ownerRefUrl} />
                                                <div className="w-full flex gap-2">
                                                        <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 gap-1 text-xs"
                                                                onClick={() =>
                                                                        // round97-X3: shared wa.me builder (encodes internally).
                                                                        window.open(
                                                                                buildWhatsAppShareUrl(`ادعوك لتجربة الربط الذكي\n${ownerRefUrl}`),
                                                                                '_blank'
                                                                        )
                                                                }
                                                        >
                                                                <AnimatedMessageCircle className="size-3.5" /> واتساب
                                                        </Button>
                                                        <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 gap-1 text-xs"
                                                                onClick={handleCopyReferralLink}
                                                        >
                                                                {copied ? <MotionCheck className="size-3.5" /> : <AnimatedCopy className="size-3.5" />}
                                                                {copied ? 'تم النسخ!' : 'نسخ الرابط'}
                                                        </Button>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        {/* ---- Referrals + Transactions ---- */}
                        <div className="grid gap-6 lg:grid-cols-2">
                                <div className="card-premium relative overflow-hidden rounded-xl bg-card border border-border/50">
                                        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                        <Gift className="size-4 text-muted-foreground" />
                                                        <h2 className="text-sm font-semibold">الإحالات</h2>
                                                </div>
                                                <Badge
                                                        variant="outline"
                                                        className="text-3xs tabular-nums border-border/50 bg-muted"
                                                >
                                                        {toArabicNumber(stats?.totalReferrals ?? 0)} إجمالي
                                                </Badge>
                                        </div>
                                        <ReferrerList referrals={stats?.recentReferrals ?? []} />
                                </div>

                                <div className="card-premium relative overflow-hidden rounded-xl bg-card border border-border/50">
                                        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                        <AnimatedClock className="size-4 text-muted-foreground" />
                                                        <h2 className="text-sm font-semibold">آخر المعاملات</h2>
                                                </div>
                                        </div>
                                        <TransactionTable transactions={stats?.recentTransactions ?? []} />
                                </div>
                        </div>

                        {/* ---- Tier Distribution ---- */}
                        <div className="card-premium relative overflow-hidden rounded-xl bg-card border border-border/50">
                                <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
                                        <div className="flex items-center gap-2">
                                                <Award className="size-4 text-muted-foreground" />
                                                <h2 className="text-sm font-semibold">توزيع المستويات</h2>
                                        </div>
                                        <Badge
                                                variant="outline"
                                                className="text-3xs tabular-nums border-border/50 bg-muted"
                                        >
                                                {toArabicNumber(stats?.totalLoyaltyCards ?? 0)} إجمالي
                                        </Badge>
                                </div>
                                <div className="p-5">
                                        <TierChart distribution={stats?.tierDistribution ?? {}} />
                                </div>
                        </div>
                </div>
        );
}
