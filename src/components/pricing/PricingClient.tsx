'use client';

// round86-B5: moved from app/(public)/pricing/page.tsx (server wrapper now
// renders this with initialPlans baked in by ISR)

import { useEffect, useState, useCallback } from 'react';
import type { Plan } from '@/lib/plan-types';
import Link from 'next/link';
import { m, useReducedMotion } from 'motion/react';
import { springDefault } from '@/lib/motion';
import {Star, Crown, Building2, Sparkles, ChevronDown, UtensilsCrossed, Zap, type LucideIcon} from 'lucide-react';
import AnimatedSparkles from '@/components/ui/sparkles-icon';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { fetchJson } from '@/lib/fetch-json';

// Map by plan name (not index) — Enterprise previously fell past the 4-item
// arrays → blank white icon box on the 5th card.
// r95: أُزيل حقلا gradient/glow الميتان — شريحة أيقونة SmartBot §5.4
// (bg-accent-foreground/10) حلّت محل شريحة التدرّج/التوهج القديمة.
const PLAN_META: Record<string, { icon: LucideIcon; badge: string; badgeColor: string }> = {
        Free: {
                icon: Sparkles,
                badge: '',
                badgeColor: '',
        },
        Basic: {
                icon: Star,
                // r95: نص الشارة طُوّر مع شارة zap — «الأكثر طلباً» (فقط إن انزلقت
                // البطاقة عن موقع الشعبية بتغيّر الخطط النشطة).
                badge: 'الأكثر طلباً',
                badgeColor: 'bg-orange text-orange-foreground',
        },
        Premium: {
                icon: Crown,
                badge: 'الأفضل قيمة',
                badgeColor: 'bg-gradient-to-r from-orange to-orange/80 text-orange-foreground',
        },
        Pro: {
                icon: Building2,
                badge: '',
                badgeColor: '',
        },
        Enterprise: {
                icon: Building2,
                badge: 'للشركات الكبرى',
                badgeColor: 'bg-gradient-to-r from-primary to-bloom text-primary-foreground dark:text-primary-foreground',
        },
};
const DEFAULT_META = PLAN_META.Free;

function PlanCard({ plan, index, yearly }: { plan: Plan; index: number; yearly: boolean }) {
        const reduceMotion = useReducedMotion();
        const meta = PLAN_META[plan.name] ?? DEFAULT_META;
        const Icon = meta.icon;
        const monthlyPrice = plan.price;
        const displayPrice = yearly ? monthlyPrice * 10 : monthlyPrice;
        const periodLabel = plan.periodDays === 0 ? '' : yearly ? '/السنة' : '/الشهر';
        const isPopular = index === 1;
        const isFree = plan.price === 0;

        return (
                <m.div
                        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ ...springDefault, delay: index * 0.08 }}
                        className={cn(
                                /* r95: بطاقة SmartBot §5.1 — توهج حدّي بدل الرفع، حركة 500ms */
                                'group relative flex flex-col rounded-2xl border p-5 sm:p-6 transition-[border-color,background-color,box-shadow] duration-500 hover:shadow-lg hover:shadow-accent-foreground/10 hover:border-accent-foreground/30',
                                isPopular
                                        ? /* r95: بطاقة الخطة الشعبية §5.2 — تدرّج زاوية + حدّ accent */
                                          'border-accent-foreground/30 bg-gradient-to-br from-accent-foreground/[0.04] via-card to-card'
                                        : 'border-border/50 bg-card'
                        )}
                >
                        {isPopular && (
                                <>
                                        {/* r95: توهج الزاوية الخلفي §5.2 */}
                                        <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute -top-20 -end-20 size-48 rounded-full bg-accent-foreground/10 blur-3xl"
                                        />
                                        {/* r95: شارة zap SmartBot — «الأكثر طلباً» (كانت «الأكثر شعبية»).
                                               3xs عند SmartBot = 10px — لا توكن 3xs بالمشروع
                                               فتُستخدم text-[0.625rem] (تكبر مع high-contrast). */}
                                        <span className="absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.625rem] font-bold text-primary-foreground">
                                                <Zap className="size-2.5 fill-current" aria-hidden="true" />
                                                الأكثر طلباً
                                        </span>
                                </>
                        )}
                        {!isPopular && meta.badge && (
                                /* r95: شارات الخطط غير الشعبية — نفس هندسة حبة الزاوية بألوانها الأصلية */
                                <span
                                        className={cn(
                                                'absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.625rem] font-bold',
                                                meta.badgeColor
                                        )}
                                >
                                        {meta.badge}
                                </span>
                        )}

                        <div className="relative flex flex-col flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                        {/* r95: شريحة أيقونة SmartBot §5.4 — بلا حدّ، bg-accent-foreground/10 */}
                                        <div
                                                className={cn(
                                                        'flex size-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110',
                                                        isFree
                                                                ? 'bg-muted text-muted-foreground'
                                                                : 'bg-accent-foreground/10 text-accent-foreground group-hover:bg-accent-foreground/15'
                                                )}
                                        >
                                                <Icon className="size-5" />
                                        </div>
                                        <div>
                                                <h2 className="text-base sm:text-lg font-bold">{plan.nameAr}</h2>
                                                <p className="text-xs text-muted-foreground">{plan.name}</p>
                                        </div>
                                </div>

                                <div className="mb-6">
                                        {isFree ? (
                                                <div className="text-[2.75rem] font-bold leading-none tabular-nums">مجاني</div>
                                        ) : (
                                                <div className="flex items-baseline gap-1">
                                                        {/* r95: رقم السعر SmartBot §5.7 — key على span يعيد تشغيل
                                                               أنيميشن price-swap-in (أداة 95-A في globals.css) عند التبديل */}
                                                        <span
                                                                key={yearly ? 'yearly' : 'monthly'}
                                                                className="animate-price-swap-in text-[2.75rem] font-bold leading-none tabular-nums"
                                                        >
                                                                {formatPrice(displayPrice, { suffix: '' })}
                                                        </span>
                                                        <span className="text-sm sm:text-lg text-muted-foreground font-medium">د.ل</span>
                                                        <span className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</span>
                                                </div>
                                        )}
                                        {yearly && !isFree && (
                                                /* r95: نص توفيري — accent-foreground الأسطع (#df5a00)
                                                   5.42:1 على البطاقة الداكنة — text-orange (#bc4700)
                                                   كان 3.9:1 دون AA للنص. */
                                                <p className="text-xs text-accent-foreground mt-1">وفر شهرين عند الاشتراك السنوي</p>
                                        )}
                                </div>

                                <div className="space-y-2 mb-6">
                                        {[
                                                ['المنيو', plan.maxMenus === 9999 ? 'غير محدود' : toArabicNumber(plan.maxMenus)],
                                                [
                                                        'الأصناف',
                                                        plan.maxItems === 9999 ? 'غير محدود' : `حتى ${toArabicNumber(plan.maxItems)}`,
                                                ],
                                                [
                                                        'الطلبات',
                                                        plan.maxOrders === 99999 ? 'غير محدود' : `حتى ${toArabicNumber(plan.maxOrders)}`,
                                                ],
                                        ].map(([label, val]) => (
                                                <div
                                                        key={label as string}
                                                        className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2 text-sm"
                                                >
                                                        <span className="text-muted-foreground">{label as string}</span>
                                                        <span className="font-semibold">{val as string}</span>
                                                </div>
                                        ))}
                                </div>

                                <div className="space-y-3 mb-8 flex-1">
                                        {plan.features.map((feature: string, i: number) => (
                                                <div
                                                        key={i}
                                                        className="flex items-start gap-3 text-sm"
                                                >
                                                        {/* r95: نقاط ميزات SmartBot بدل علامات الصح المتحركة */}
                                                        <span
                                                                aria-hidden="true"
                                                                className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-foreground/60"
                                                        />
                                                        <span className="text-muted-foreground">{feature}</span>
                                                </div>
                                        ))}
                                </div>

                                <Link href={isFree ? '/subscribe' : `/subscribe?plan=${plan.id}`}>
                                        <Button
                                                className={cn(
                                                        'w-full h-12',
                                                        isPopular ? 'bg-orange text-orange-foreground shadow-lg shadow-orange/25' : ''
                                                )}
                                                variant={isPopular ? 'orange' : 'outline'}
                                        >
                                                {isFree ? 'ابدأ مجاناً' : 'اشترك الآن'}
                                        </Button>
                                </Link>
                        </div>
                </m.div>
        );
}

// Yearly billing = 10× the monthly price (two months free) → fixed savings
// anchor shown on the toggle. Derived from the same math as PlanCard.displayPrice.
const YEARLY_SAVINGS_PCT = Math.round((1 - 10 / 12) * 100);

export function PricingClient({ initialPlans }: { initialPlans: Plan[] | null }) {
        // round86-B5: server-rendered initial plans (SEO-visible, no post-hydrate
        // waterfall); the client fetch is only a fallback when the server data was
        // missing (DB hiccup at revalidation time).
        const [plans, setPlans] = useState<Plan[]>(initialPlans ?? []);
        const [loading, setLoading] = useState(initialPlans === null);
        const [yearly, setYearly] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const loadPlans = useCallback(async () => {
                setLoading(true);
                setError(null);
                try {
                        const data = await fetchJson<{ data?: Plan[] }>('/api/plans');
                        setPlans(data.data ?? []);
                        setError(null);
                } catch {
                        setError('فشل تحميل الخطط');
                } finally {
                        setLoading(false);
                }
        }, []);

        useEffect(() => {
                if (plans.length === 0) loadPlans();
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
                <div className="min-h-dvh overflow-x-clip bg-background">
                        <Header />

                        <section className="relative border-b border-border/50 pb-16 pt-24 text-center sm:pb-20 sm:pt-28">

                                <div className="relative z-10 max-w-3xl mx-auto px-4">
                                        {/* r95: حبة علوية — عائلة accent-foreground اللهبية */}
                                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-foreground/20 bg-accent-foreground/[0.06] px-4 py-1.5 text-sm text-accent-foreground">
                                                <AnimatedSparkles className="size-4" />
                                                خطط تناسب جميع الأحجام
                                        </div>
                                        {/* r95: طباعة SmartBot §3 — font-heading + tracking-tight + text-balance */}
                                        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-[1.15] tracking-tight text-balance">اختر خطتك</h1>
                                        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                                                ابدأ برفع منيو مطعمك رقمياً واختر الخطة التي تناسب احتياجاتك
                                        </p>

                                        {/* r95: مفتاح شهري/سنوي SmartBot §5.7 — كبسولة زجاجية rounded-full */}
                                        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur sm:mt-8">
                                                <button
                                                        type="button"
                                                        onClick={() => setYearly(false)}
                                                        aria-pressed={!yearly}
                                                        className={cn(
                                                                'rounded-full px-4 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:text-sm',
                                                                yearly ? 'text-muted-foreground' : 'bg-primary text-primary-foreground'
                                                        )}
                                                >
                                                        شهري
                                                </button>
                                                <button
                                                        type="button"
                                                        onClick={() => setYearly(true)}
                                                        aria-pressed={yearly}
                                                        className={cn(
                                                                'rounded-full px-4 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:text-sm',
                                                                yearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                                                        )}
                                                >
                                                        سنوي ·<span className={cn('ms-1 text-xs font-bold', yearly ? 'text-primary-foreground' : 'text-accent-foreground')}>وفّر {toArabicNumber(YEARLY_SAVINGS_PCT)}%</span>
                                                </button>
                                        </div>
                                </div>
                        </section>

                        <section className="pb-16 sm:pb-24">
                                <div className="max-w-6xl mx-auto px-4">
                                        {loading ? (
                                                <>
                                                        <LoadingAnnouncer loading={loading} message="جاري تحميل الباقات..." />
                                                        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
                                                        {[...Array(4)].map((_, i) => (
                                                                /* r95: هياكل التحميل بنفس هندسة بطاقة SmartBot الجديدة */
                                                                <div key={i} className="rounded-2xl border border-border/50 p-5 sm:p-6">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                                <div className="size-11 rounded-xl skeleton" />
                                                                                <div className="space-y-2 flex-1">
                                                                                        <div className="h-4 w-3/4 skeleton rounded-sm" />
                                                                                        <div className="h-3 w-1/2 skeleton rounded-sm" />
                                                                                </div>
                                                                        </div>
                                                                        <div className="h-8 w-1/2 skeleton rounded-sm mb-6" />
                                                                        <div className="space-y-2 mb-6">
                                                                                {[...Array(3)].map((_, j) => (
                                                                                        <div key={j} className="h-7 skeleton rounded-sm" />
                                                                                ))}
                                                                        </div>
                                                                        <div className="space-y-2 mb-8">
                                                                                {[...Array(4)].map((_, j) => (
                                                                                        <div key={j} className="h-4 w-4/5 skeleton rounded-sm" />
                                                                                ))}
                                                                        </div>
                                                                        <div className="h-12 skeleton rounded-sm" />
                                                                </div>
                                                        ))}
                                                        </div>
                                                </>
                                        ) : error ? (
                                                <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
                                                        <span>{error}</span>
                                                        <Button variant="outline" onClick={loadPlans}>
                                                                إعادة المحاولة
                                                        </Button>
                                                </div>
                                        ) : plans.length === 0 ? (
                                                /* round88-E3: unified EmptyState (icon + copy + retry
                                                   action) — was a bare muted text line with no recovery path. */
                                                <EmptyState
                                                        icon={UtensilsCrossed}
                                                        title="لا توجد خطط متاحة حالياً"
                                                        description="تعذّر تحميل الباقات — يمكنك إعادة المحاولة الآن"
                                                        action={
                                                                <Button variant="outline" onClick={loadPlans}>
                                                                        إعادة المحاولة
                                                                </Button>
                                                        }
                                                />
                                        ) : (
                                                <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
                                                        {plans.map((plan, i) => (
                                                                <PlanCard key={plan.id} plan={plan} index={i} yearly={yearly} />
                                                        ))}
                                                </div>
                                        )}
                                </div>
                        </section>

                        <section className="pb-16 sm:pb-24">
                                <div className="max-w-3xl mx-auto px-4">
                                        <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">أسئلة شائعة</h2>
                                        <div className="space-y-3 sm:space-y-4">
                                                {[
                                                        {
                                                                q: 'هل يمكنني الترقية لاحقاً؟',
                                                                a: 'نعم، يمكنك الترقية في أي وقت. سيتم احتساب الفرق بشكل تناسبي.',
                                                        },
                                                        {
                                                                q: 'هل يوجد فترة تجريبية؟',
                                                                a: 'نعم، الخطة المجانية متاحة للأبد مع ميزات محدودة. يمكنك الترقية في أي وقت.',
                                                        },
                                                        {
                                                                q: 'هل يمكنني إلغاء الاشتراك؟',
                                                                a: 'نعم، يمكنك إلغاء الاشتراك في أي وقت. يظل المنيو نشطاً حتى نهاية الفترة المدفوعة.',
                                                        },
                                                        {
                                                                q: 'هل تدعمون جميع أنواع المطاعم؟',
                                                                a: 'نعم، المنصة تدير المطاعم والمقاهي والمخابز والمطاعم السيارة وجميع أنواع الخدمات الغذائية.',
                                                        },
                                                ].map((faq, i) => (
                                                        <details
                                                                key={i}
                                                                className="group overflow-hidden rounded-xl border border-border/50 bg-card transition-[border-color,box-shadow] duration-500 open:border-accent-foreground/25 open:shadow-sm"
                                                        >
                                                                <summary className="flex items-center justify-between cursor-pointer text-sm sm:text-base font-medium list-none px-4 sm:px-5 py-3 sm:py-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                                                                                                                                        {faq.q}
                                                                                                                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-300 text-xs">
                                                                                                                                                <ChevronDown className="size-4" />
                                                                                                                                        </span>
                                                                                                                                </summary>
                                                                <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
                                                                        <div className="overflow-hidden">
                                                                                <p className="px-4 sm:px-5 pb-3 sm:pb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                                                        {faq.a}
                                                                                </p>
                                                                        </div>
                                                                </div>
                                                        </details>
                                                ))}
                                        </div>
                                </div>
                        </section>

                        <section className="pb-16 sm:pb-24">
                                <div className="max-w-2xl mx-auto px-4 text-center">
                                        {/* r95: بطاقة CTA ختامية بهندسة SmartBot */}
                                        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm sm:p-8 md:p-12">
                                                <div className="absolute inset-x-0 top-0 mx-auto h-1 w-20 bg-primary" />
                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                                                        مستعد لانطلاق مطعمك الرقمي؟
                                                </h2>
                                                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
                                                        ابدأ مجاناً بدون بطاقة ائتمان
                                                </p>
                                                <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
                                                        <Link href="/subscribe">
                                                                <Button variant="flame" size="lg">ابدأ مجاناً</Button>
                                                        </Link>
                                                        <Link href="/menu/al-waha-cafe">
                                                                <Button size="lg" variant="outline">
                                                                        شاهد منيو تجريبي
                                                                </Button>
                                                        </Link>
                                                </div>
                                        </div>
                                </div>
                        </section>

                        <Footer />
                </div>
        );
}
