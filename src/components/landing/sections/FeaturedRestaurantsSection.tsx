'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { m, AnimatePresence, useReducedMotion } from 'motion/react';
import { Phone, Store } from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { MotionArrowLeft } from '@/components/ui/motion-icons';
import AnimatedStar from '@/components/ui/star-icon';
import AnimatedMapPin from '@/components/ui/map-pin-icon';
import { Button } from '@/components/ui/button';
import { SectionContainer } from '@/components/ui/SectionContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import type { FeaturedRestaurant } from '@/lib/landing';

type Props = {
        restaurants: FeaturedRestaurant[] | null;
        /** Present only after a fetch failure — renders a retry affordance under the skeleton. */
        onRetry?: () => void;
};

const AUTOPLAY_INTERVAL = 5000;

/* ponytail: fast cubic-bezier instead of spring — snappier, no bounce tail */
const transition = { x: { ease: 'easeOut' as const, duration: 0.4 }, opacity: { duration: 0.25 } };

export function FeaturedRestaurantsSection({ restaurants, onRetry }: Props) {
        const [[slide, dir], setSlide] = useState([0, 0]);
        const [paused, setPaused] = useState(false);
        const timer = useRef<ReturnType<typeof setInterval>>(undefined);

        const n = restaurants?.length ?? 0;
        const reducedMotion = useReducedMotion();
        const go = useCallback(
                (i: number, d?: number) => {
                        setSlide(([cur]) => [((i % n) + n) % n, d ?? (i > cur ? 1 : -1)]);
                },
                [n]
        );
        const next = useCallback(() => {
                setSlide(([cur]) => [(((cur + 1) % n) + n) % n, 1]);
        }, [n]);
        const prev = useCallback(() => {
                setSlide(([cur]) => [(((cur - 1) % n) + n) % n, -1]);
        }, [n]);

        useEffect(() => {
                if (paused || n <= 1 || reducedMotion) return;
                timer.current = setInterval(next, AUTOPLAY_INTERVAL);
                return () => clearInterval(timer.current);
        }, [paused, next, n, reducedMotion]);

        if (restaurants === null) {
                return (
                        <SectionContainer className="bg-gradient-to-b from-background via-accent-foreground/[0.015] to-background">
                                <SectionHeader
                                        title="اطلع على منيو هذه المطاعم"
                                        subtitle="تصفح منيو مطاعم تستخدم المنصة وشاهد كيف تبدو التجربة من جهة الزبون."
                                />
                                <div className="max-w-[1060px] mx-auto px-1">
                                        <div className="h-[380px] sm:h-[460px] rounded-2xl sm:rounded-3xl bg-card/50 animate-pulse" />
                                        {onRetry && (
                                                <div className="mt-4 flex justify-center">
                                                        <Button variant="ghost" size="sm" onClick={onRetry}>
                                                                <AnimatedRefreshCw className="size-3.5" aria-hidden="true" />
                                                                إعادة المحاولة
                                                        </Button>
                                                </div>
                                        )}
                                </div>
                        </SectionContainer>
                );
        }

        if (n === 0) return null;
        const r = restaurants[slide];

        return (
                <SectionContainer className="bg-gradient-to-b from-background via-accent-foreground/[0.015] to-background">
                        <ScrollReveal y={20}>
                                <SectionHeader
                                        title="اطلع على منيو هذه المطاعم"
                                        subtitle="تصفح منيو مطاعم تستخدم المنصة وشاهد كيف تبدو التجربة من جهة الزبون."
                                />
                        </ScrollReveal>

                        <ScrollReveal y={30} delay={100}>
                        <div
                                className="relative max-w-[1060px] mx-auto px-1"
                                onMouseEnter={() => setPaused(true)}
                                onFocus={() => setPaused(true)}
                                onMouseLeave={() => setPaused(false)}
                                onBlur={() => setPaused(false)}
                                onTouchStart={() => setPaused(true)}
                                onTouchEnd={() => setPaused(false)}
                        >
                                {/* ── Slide ── */}
                                <div className="relative h-[380px] sm:h-[460px] overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-white/10 bg-card shadow-[0_8px_40px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)]">
                                        <AnimatePresence custom={dir} mode="popLayout">
                                                <m.div
                                                        key={r.id}
                                                        custom={dir}
                                                        variants={{
                                                                enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
                                                                center: { x: 0, opacity: 1 },
                                                                exit: (d: number) => ({ x: d > 0 ? -160 : 160, opacity: 0 }),
                                                        }}
                                                        initial="enter"
                                                        animate="center"
                                                        exit="exit"
                                                        transition={transition}
                                                        className="absolute inset-0"
                                                >
                                                        <Link href={`/menu/${r.slug}`} className="block size-full group">
                                                                {/* Full-bleed background image */}
                                                                <div className="absolute inset-0">
                                                                        {r.logo ? (
                                                                                <Image
                                                                                        src={r.logo}
                                                                                        alt=""
                                                                                        fill
                                                                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                                                                        sizes="(max-width: 768px) 100vw, 1060px"
                                                                                        quality={85}
                                                                                        priority
                                                                                />
                                                                        ) : (
                                                                                <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))]">
                                                                                        <Store className="size-32 text-white/25" aria-hidden="true" />
                                                                                </div>
                                                                        )}
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                                                                        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent rtl:bg-gradient-to-l" />
                                                                </div>

                                                                {/* Content */}
                                                                <div className="relative z-10 flex flex-col justify-between size-full p-6 sm:p-10">
                                                                        {/* Top */}
                                                                        <div className="flex items-start justify-between">
                                                                                <div className="flex items-center gap-3.5">
                                                                                        <m.div
                                                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                                                animate={{ scale: 1, opacity: 1 }}
                                                                                                transition={{ delay: 0.1, duration: 0.3 }}
                                                                                                className="size-16 sm:size-20 rounded-2xl overflow-hidden bg-white/15 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center shadow-xl shrink-0"
                                                                                        >
                                                                                                {r.logo ? (
                                                                                                        <Image
                                                                                                                src={r.logo}
                                                                                                                alt={r.name}
                                                                                                                width={80}
                                                                                                                height={80}
                                                                                                                className="object-cover size-full"
                                                                                                        />
                                                                                                ) : (
                                                                                                        <span className="text-2xl font-bold text-white/60">
                                                                                                                {r.name.charAt(0)}
                                                                                                        </span>
                                                                                                )}
                                                                                        </m.div>
                                                                                        <div className="space-y-0.5">
                                                                                                <m.h3
                                                                                                        initial={{ y: 12, opacity: 0 }}
                                                                                                        animate={{ y: 0, opacity: 1 }}
                                                                                                        transition={{ delay: 0.12, duration: 0.3 }}
                                                                                                        className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg"
                                                                                                >
                                                                                                        {r.name}
                                                                                                </m.h3>
                                                                                                {r.city && (
                                                                                                        <m.span
                                                                                                                initial={{ y: 8, opacity: 0 }}
                                                                                                                animate={{ y: 0, opacity: 1 }}
                                                                                                                transition={{ delay: 0.15, duration: 0.3 }}
                                                                                                                className="flex items-center gap-1 text-xs sm:text-sm text-white/70"
                                                                                                        >
                                                                                                                <AnimatedMapPin className="size-3.5" />
                                                                                                                {r.city}
                                                                                                        </m.span>
                                                                                                )}
                                                                                        </div>
                                                                                </div>
                                                                                {r.orderCount > 0 && (
                                                                                        <m.div
                                                                                                initial={{ scale: 0 }}
                                                                                                animate={{ scale: 1 }}
                                                                                                transition={{ delay: 0.2, duration: 0.3 }}
                                                                                                className="flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white/90"
                                                                                        >
                                                                                                <AnimatedStar className="size-3.5 text-saffron" />
                                                                                                {r.orderCount}
                                                                                        </m.div>
                                                                                )}
                                                                        </div>

                                                                        {/* Bottom */}
                                                                        <div className="space-y-3.5 max-w-xl">
                                                                                {r.description && (
                                                                                        <m.p
                                                                                                initial={{ y: 12, opacity: 0 }}
                                                                                                animate={{ y: 0, opacity: 1 }}
                                                                                                transition={{ delay: 0.15, duration: 0.3 }}
                                                                                                className="text-sm sm:text-base text-white/80 leading-relaxed line-clamp-2"
                                                                                        >
                                                                                                {r.description}
                                                                                        </m.p>
                                                                                )}
                                                                                <m.div
                                                                                        initial={{ y: 10, opacity: 0 }}
                                                                                        animate={{ y: 0, opacity: 1 }}
                                                                                        transition={{ delay: 0.18, duration: 0.3 }}
                                                                                        className="flex flex-wrap items-center gap-x-5 gap-y-2"
                                                                                >
                                                                                        {r.phone && (
                                                                                                <span
                                                                                                        className="flex items-center gap-1.5 text-xs sm:text-sm text-white/70"
                                                                                                        dir="ltr"
                                                                                                >
                                                                                                        <Phone className="size-3.5" />
                                                                                                        {r.phone}
                                                                                                </span>
                                                                                        )}
                                                                                        <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-accent-foreground hover:text-saffron transition-colors group/link">
                                                                                                عرض المنيو
                                                                                                {/* HeroSection:95 pattern — ArrowRight + rtl:rotate-180 keeps glyph and hover
                                                                                                nudge coherent in both directions (translate-x is physical in TW4) */}
                                                                                                <MotionArrowRight className="size-4 transition-transform duration-200 group-hover/link:translate-x-1 rtl:rotate-180 rtl:group-hover/link:-translate-x-1" />
                                                                                        </span>
                                                                                </m.div>
                                                                        </div>
                                                                </div>
                                                        </Link>
                                                </m.div>
                                        </AnimatePresence>

                                        {/* ── Arrows ── */}
                                        {n > 1 && (
                                                <>
                                                        <button
                                                                onClick={prev}
                                                                type="button"
                                                                className="absolute start-4 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-white/20 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/35 hover:scale-105 transition-[background-color,transform,translate,scale,rotate,box-shadow,opacity] duration-200 shadow-xl opacity-80 hover:opacity-100"
                                                                aria-label="السابق"
                                                        >
                                                                <MotionArrowLeft className="size-5" />
                                                        </button>
                                                        <button
                                                                onClick={next}
                                                                type="button"
                                                                className="absolute end-4 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-white/20 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/35 hover:scale-105 transition-[background-color,transform,translate,scale,rotate,box-shadow,opacity] duration-200 shadow-xl opacity-80 hover:opacity-100"
                                                                aria-label="التالي"
                                                        >
                                                                <MotionArrowRight className="size-5" />
                                                        </button>
                                                </>
                                        )}

                                        {/* ── Progress bar ── */}
                                        {n > 1 && (
                                                <div className="absolute bottom-0 inset-x-0 z-20 h-1 bg-white/10">
                                                        <m.div
                                                                key={slide}
                                                                className="h-full bg-primary"
                                                                initial={{ scaleX: 0, transformOrigin: 'right' }}
                                                                animate={{ scaleX: 1, transformOrigin: 'right' }}
                                                                exit={{ scaleX: 0, transformOrigin: 'right' }}
                                                                transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: 'linear' }}
                                                        />
                                                </div>
                                        )}
                                </div>

                                {/* ── Dots ── */}
                                {n > 1 && (
                                        <div className="flex items-center justify-center gap-3 mt-5">
                                                {restaurants.map((item, i) => (
                                                        <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => go(i, i > slide ? 1 : -1)}
                                                                        className={`min-h-11 min-w-11 rounded-full transition-[width,height,background-color,box-shadow] duration-300 ${
                                                                        i === slide
                                                                                ? 'w-9 h-3 bg-primary shadow-md shadow-primary/30'
                                                                                : 'w-3 h-3 bg-muted-foreground/20 hover:bg-muted-foreground/40'
                                                                }`}
                                                                aria-label={`الانتقال إلى ${item.name}`}
                                                        />
                                                ))}
                                        </div>
                                )}
                        </div>
                </ScrollReveal>
                </SectionContainer>
        );
}
