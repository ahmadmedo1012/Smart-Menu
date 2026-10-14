'use client';

// round86-B5: moved from app/(public)/pricing/page.tsx (server wrapper now
// renders this with initialPlans baked in by ISR)

import { useEffect, useState, useCallback } from 'react';
import type { Plan } from '@/lib/plan-types';
import Link from 'next/link';
import { m, useReducedMotion } from 'motion/react';
import { springDefault } from '@/lib/motion';
import { ChevronDown, UtensilsCrossed, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/ui/CountUp';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import { fetchJson } from '@/lib/fetch-json';
/* P13-2b (T4): خريطة عرض الخطط — وحدة واحدة لكل الأسطح (كانت هنا PLAN_META
   محلية توأم PlanSelector/SubscribeForm). */
import { PLAN_META, DEFAULT_PLAN_META } from '@/components/subscribe/plan-meta';
/* P13-2b (T3): إزالة تكرار الحدود داخل البطاقة — قائد النقاط هو سطح الحد
   الوحيد، وسلاسل الميزات التي تعيد ذكر نفس السقف تُفلتر من العرض. */
import { filterLimitFeatures } from '@/components/subscribe/plan-comparison';

/* P13-2b (T4): PLAN_META استُخرج لـ components/subscribe/plan-meta.ts —
   المصدر الوحيد المشترك مع /subscribe (كانت نسخة محلية ثالثة هنا).
   r95: أُزيل حقلا gradient/glow الميتان — شريحة أيقونة SmartBot §5.4
   (bg-accent-foreground/10) حلّت محل شريحة التدرّج/التوهج القديمة. */

/* r121-P1 (backlog #34): الدفع السنوي اختلاق غير قابل للشراء — الخادم يرفض
   أي مبلغ ≠ plan.price (subscriptions/route.ts:88) والموافقة تمنح 30 يوماً
   دائماً. مفتاح «سنوي · وفّر 17%» وسعر ×10 وحدهما عرضٌ لا يمكن دفعه، فأُزيل
   كل شيء سنوي (X1 تحقق كاملاً). الخطط شهرية فقط، بأسعار صادقة. إن أُريد
   سنوي حقيقي فهو ميزة منتج لاحقة (صف خطة periodDays=365 — r119-S2-P2-2
   يدعمه) لا إصلاحًا يمتطي دفعة إصلاح. */
function PlanCard({ plan, index }: { plan: Plan; index: number }) {
        const reduceMotion = useReducedMotion();
        /* P13-2b (T3): السقوف الثلاثة معروضة أعلاه كقائد نقاط مطبوع — سلاسل
           الميزات التي تعيد ذكر نفس الأرقام تُفلتر (سطح حدّ واحد لكل بطاقة). */
        const features = filterLimitFeatures(plan.features, plan, ['menus', 'items', 'orders']);
        const meta = PLAN_META[plan.name] ?? DEFAULT_PLAN_META;
        const Icon = meta.icon;
        const periodLabel = plan.periodDays === 0 ? '' : '/الشهر';
        const isPopular = index === 1;
        const isFree = plan.price === 0;

        return (
                <m.div
                        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ ...springDefault, delay: index * 0.08 }}
                        className={cn(
                                /* r128-F5 (§4 flat cards) → Phase 6 (r154): هندسة الطبق —
                                   rounded-2xl (24px) → rounded-lg = طبق 16، الدرجة
                                   القانونية للبطاقة ( Card/الأسطح المالية ذاتها). */
                                'group relative flex flex-col rounded-lg border p-5 sm:p-6 transition-[border-color] duration-slower hover:border-accent-foreground/30',
                                isPopular ? 'border-accent-foreground/30 bg-card' : 'border-border/50 bg-card'
                        )}
                >
                        {isPopular && (
                                <>
                                        {/* r95 → r120 (U11-P2-4): شارة zap — «الأكثر شعبية»
                                               (موحّدة مع /subscribe؛ كانت «الأكثر طلباً» غير الدقيقة).
                                               r127-F4: توكن 3xs أصبح موجودًا الآن (--text-3xs
                                               بـ globals.css) فحلّ text-3xs محل الكتابة اليدوية. */}
                                        <span className="absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-3xs font-bold text-primary-foreground">
                                                <Zap className="size-2.5 fill-current" aria-hidden="true" />
                                                الأكثر شعبية
                                        </span>
                                </>
                        )}
                        {!isPopular && meta.badge && (
                                /* r95: شارات الخطط غير الشعبية — نفس هندسة حبة الزاوية بألوانها الأصلية */
                                <span
                                        className={cn(
                                                'absolute top-4 end-4 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-3xs font-bold',
                                                meta.badgeColor
                                        )}
                                >
                                        {meta.badge}
                                </span>
                        )}

                        <div className="relative flex flex-col flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                        <div
                                                className={cn(
                                                        /* r95: شريحة أيقونة SmartBot §5.4 — بلا حدّ، bg-accent-foreground/10
                                                           Phase 6 (r154): بئر الطبق — الدائرة الكاملة بحافة التراكوتا
                                                           1.5px (نفس عقد بطاقة KPI)؛ المجاني يظل محايدًا والمدفوع
                                                           دافئًا (تراكوتا على غسلة دافئة). P13-2b (T4): الصنف من
                                                           plan-meta الموحّدة (كان شرطية isFree محلية توأمة). */
                                                        'flex size-11 items-center justify-center rounded-full ring-[1.5px] ring-inset ring-[color:var(--accent-solid)]/30 transition-[background-color,transform] duration-base group-hover:scale-110',
                                                        meta.chip
                                                )}
                                        >
                                                <Icon className="size-5" />
                                        </div>
                                        <div>
                                                {/* Phase 6 (r154): اسم الخطة بالوجه الطهوي (Baloo)
                                                   — إيقاع العناوين على الأسطح الجزئية أيضًا. */}
                                                <h2 className="font-heading text-base sm:text-lg font-bold">{plan.nameAr}</h2>
                                                <p className="text-xs text-muted-foreground">{plan.name}</p>
                                        </div>
                                </div>

                                <div className="mb-6">
                                        {isFree ? (
                                                /* r131 (A2 P1-5 — حكم توحيد السعر): درجة --fs-metric-lg (30px)
                                                   mono+tnum على أسطح الأسعار الأربعة (كانت 44px هنا و30px
                                                   في /subscribe — القيمة الواحدة لرقم المال). */
                                                <div className="text-[length:var(--fs-metric-lg,30px)] font-bold leading-none tabular-nums font-mono">مجاني</div>
                                        ) : (
                                                <div className="flex items-baseline gap-1">
                                                        {/* r95: رقم السعر SmartBot §5.7 — أنيميشن price-swap-in
                                                               عند ظهور البطاقة في الشاشة (r121-P1: بلا مفتاح تبديل
                                                               بعد إزالة السنوي — الدخول مرة واحدة يكفي).
                                                               r128-F5: أرقام الأسعار بخط mono (نمط ln-mono).
                                                               r131 (A2 P1-5): 44px → درجة --fs-metric-lg الموحّدة. */}
                                                        <span
                                                                className="animate-price-swap-in text-[length:var(--fs-metric-lg,30px)] font-bold leading-none tabular-nums font-mono"
                                                        >
                                                                {formatPrice(plan.price, { suffix: '' })}
                                                        </span>
                                                        <span className="text-sm sm:text-lg text-muted-foreground font-medium">د.ل</span>
                                                        <span className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</span>
                                                </div>
                                        )}
                                </div>

                                <div className="space-y-3 mb-6">
                                        {/* r128-F5 (§4) → Phase 6 (r154): قائد النقاط — حدود الخطة
                                           على طراز المنيو المطبوع (نفس بصمة بطاقة الصنف/ملخص
                                           الطلب) بدل خلايا الغسل المنفصلة؛ الأرقام غربية بخط
                                           mono جدولي مع CountUp.
                                           r143 (Phase-4 W1 D10): قانون صدق r92 «TEXT follows
                                           ENFORCEMENT» يمتد لصفوف الحدود — كانت 9999/99999
                                           تُعرض «غير محدود» بينما الحارس يرفض الصنف 9999
                                           (PlanLimitError) وخصائص الخطة نفسها تقول
                                           «أصناف حتى 9999» — كذب داخل بطاقة واحدة. */}
                                        {[
                                                ['المنيو', `حتى ${plan.maxMenus}`],
                                                ['الأصناف', `حتى ${plan.maxItems}`],
                                                ['الطلبات', `حتى ${plan.maxOrders}`],
                                        ].map(([label, val]) => (
                                                <div
                                                        key={label as string}
                                                        className="flex items-baseline gap-2 text-sm menu-leader"
                                                >
                                                        <span className="text-muted-foreground shrink-0">{label as string}</span>
                                                        <i className="menu-leader-rule" aria-hidden="true" />
                                                        <span className="font-semibold font-mono tabular-nums shrink-0">
                                                                <CountUp value={val as string} />
                                                        </span>
                                                </div>
                                        ))}
                                </div>

                                <div className="space-y-3 mb-8 flex-1">
                                        {/* P13-2b (T3): الميزات المصفّاة — قائد النقاط أعلاه هو سطح
                                           الحدّ الوحيد في البطاقة، فسلاسل الميزات التي تعيد ذكر نفس
                                           السقف (بنيت من حقول الخطة نفسها، لا قائمة صلبة) تُسقط. */}
                                        {features.map((feature: string, i: number) => (
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
                                                        /* r128-F5: زر مسطّح — بلا ظلّ */
                                                        'w-full h-12',
                                                        isPopular ? 'bg-orange text-orange-foreground' : ''
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

export function PricingClient({ initialPlans }: { initialPlans: Plan[] | null }) {
        // round86-B5: server-rendered initial plans (SEO-visible, no post-hydrate
        // waterfall); the client fetch is only a fallback when the server data was
        // missing (DB hiccup at revalidation time).
        const [plans, setPlans] = useState<Plan[]>(initialPlans ?? []);
        const [loading, setLoading] = useState(initialPlans === null);
        const [error, setError] = useState<string | null>(null);

        const loadPlans = useCallback(async () => {
                setLoading(true);
                setError(null);
                try {
                        const data = await fetchJson<{ data?: Plan[] }>('/api/plans');
                        setPlans(data.data ?? []);
                        setError(null);
                } catch {
                        setError('تعذّر تحميل الخطط');
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
                                        {/* r128-F5 (§4): حاجب بنمط ln-label — ترقيم فصول mono
                                           مسطّح (بديل حبة الزجاج)؛ الرقم اللاتيني يفتح القراءة
                                           في السياق RTL.
                                           r151 (LIVE-AUDIT-SM1 P1-2): tracking-[0.08em] أُزيل —
                                           السطر مختلط (رقم + شرطة + عربي) والتتبع يكسر اتصال
                                           الحروف العربية (قانون الأسطول: لا تتبع على العربي). */}
                                        <p className="mb-6 font-mono text-xs font-medium text-accent-foreground tabular-nums">
                                                01 — الخطط
                                        </p>
                                        {/* r95: طباعة SmartBot §3 — font-heading + text-balance.
                                            r126 (P4-W3b / audit E1): tracking-tight حُذفت (تباعد صفري
                                            على العربية — قانون مدارك). */}
                                        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-[1.15] text-balance">اختر خطتك</h1>
                                        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                                                ابدأ برفع منيو مطعمك رقمياً واختر الخطة التي تناسب احتياجاتك
                                        </p>

                                        {/* r121-P1: مفتاح شهري/سنوي أُزيل هنا — كان يعرض أسعار ×10
                                           لا يمكن شراؤها (سلسلة X1: CTA بلا معامل فترة، الخادم يرفض
                                           أي مبلغ ≠ الشهري، الموافقة تمنح 30 يوماً). كل الأسعار شهرية. */}
                                </div>
                        </section>

                        <section className="pb-16 sm:pb-24">
                                <div className="max-w-7xl mx-auto px-4">
                                        {loading ? (
                                                <>
                                                        <LoadingAnnouncer loading={loading} message="جارٍ تحميل الباقات…" />
                                                        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
                                                        {/* P13-2b (T4): ٥ هياكل — سلّم الإنتاج خمس خطط (كانت ٤
                                                           هياكل تحجب البطاقة الخامسة عن انتظار المستخدم). */}
                                                        {[...Array(5)].map((_, i) => (
                                                                /* r95: هياكل التحميل بنفس هندسة بطاقة SmartBot الجديدة
                                                                   Phase 6 (r154): هندسة الطبق — البطاقة 16 والبئر دائرة
                                                                   (تنعكس نفس القواعد في pricing/loading.tsx). */
                                                                <div key={i} className="rounded-lg border border-border/50 p-5 sm:p-6">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                                <div className="size-11 rounded-full skeleton" />
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
                                                /* Phase 6 (r154): حالة الخطأ تنضم لعائلة الأطباق (EmptyState
                                                   الدافئ — بئر الأيقونة + عنوان 18/600) بدل سطرين عاريين. */
                                                <EmptyState
                                                        icon={UtensilsCrossed}
                                                        title={error}
                                                        action={
                                                                <Button variant="outline" onClick={loadPlans}>
                                                                        إعادة المحاولة
                                                                </Button>
                                                        }
                                                />
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
                                                <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
                                                        {plans.map((plan, i) => (
                                                                <PlanCard key={plan.id} plan={plan} index={i} />
                                                        ))}
                                                </div>
                                        )}
                                </div>
                        </section>

                        <section className="pb-16 sm:pb-24">
                                <div className="max-w-3xl mx-auto px-4">
                                        {/* Phase 6 (r154): إيقاع بالو للعناوين الفرعية (FAQ) */}
                                        <h2 className="font-heading text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">أسئلة شائعة</h2>
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
                                                                className="group overflow-hidden rounded-lg border border-border/50 bg-card transition-[border-color] duration-slower open:border-accent-foreground/25"
                                                        >
                                                                <summary className="flex items-center justify-between cursor-pointer text-sm sm:text-base font-medium list-none px-4 sm:px-5 py-3 sm:py-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                                                                                                                                        {faq.q}
                                                                                                                                        <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-base text-xs">
                                                                                                                                                <ChevronDown className="size-4" />
                                                                                                                                        </span>
                                                                                                                                </summary>
                                                                <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-base">
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
                                        {/* r95: بطاقة CTA ختامية بهندسة SmartBot — r128-F5: مسطّحة بلا ظل
                                            Phase 6 (r154): طبق 16 + عنوان بالو (إيقاع الأقسام). */}
                                        <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card p-6 sm:p-8 md:p-12">
                                                <div className="absolute inset-x-0 top-0 mx-auto h-1 w-20 bg-primary" />
                                                <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                                                        مستعد لانطلاق مطعمك الرقمي؟
                                                </h2>
                                                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
                                                        ابدأ مجاناً بدون بطاقة ائتمان
                                                </p>
                                                <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
                                                        <Link href="/subscribe">
                                                                <Button variant="flame" size="lg">ابدأ مجاناً</Button>
                                                        </Link>
                                                        <Link href="/menu/al-waha-cafe-demo">
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
