"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Phone, ArrowLeft, ArrowRight, Store } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { FeaturedRestaurant } from "@/lib/landing";

type Props = {
    restaurants: FeaturedRestaurant[] | null;
};

const AUTOPLAY_INTERVAL = 5000;

/* ponytail: fast cubic-bezier instead of spring — snappier, no bounce tail */
const transition = { x: { ease: "easeOut" as const, duration: 0.4 }, opacity: { duration: 0.25 } };

export default function FeaturedRestaurantsSection({ restaurants }: Props) {
    const [[slide, dir], setSlide] = useState([0, 0]);
    const [paused, setPaused] = useState(false);
    const timer = useRef<ReturnType<typeof setInterval>>(undefined);

    const n = restaurants?.length ?? 0;
    const go = useCallback((i: number, d?: number) => {
        setSlide(([cur]) => [((i % n) + n) % n, d ?? (i > cur ? 1 : -1)]);
    }, [n]);
    const next = useCallback(() => {
        setSlide(([cur]) => [((cur + 1) % n + n) % n, 1]);
    }, [n]);
    const prev = useCallback(() => {
        setSlide(([cur]) => [((cur - 1) % n + n) % n, -1]);
    }, [n]);

    useEffect(() => {
        if (paused || n <= 1) return;
        timer.current = setInterval(next, AUTOPLAY_INTERVAL);
        return () => clearInterval(timer.current);
    }, [paused, next, n]);

    if (restaurants === null) {
        return (
            <SectionContainer className="bg-gradient-to-b from-background via-orange/[0.015] to-background">
                <SectionHeader
                    icon={<Store className="size-3" />}
                    eyebrow="منيو حقيقي"
                    title="اطلع على منيو هذه المطاعم"
                    subtitle="تصفح منيو مطاعم حقيقية تستخدم المنصة وشاهد تجربة الزبائن"
                />
                <div className="max-w-[1060px] mx-auto px-1">
                    <div className="h-[380px] sm:h-[460px] rounded-2xl sm:rounded-3xl bg-card/50 animate-pulse" />
                </div>
            </SectionContainer>
        );
    }

    if (n === 0) return null;
    const r = restaurants[slide];

    return (
        <SectionContainer className="bg-gradient-to-b from-background via-orange/[0.015] to-background">
            <SectionHeader
                icon={<Store className="size-3" />}
                eyebrow="منيو حقيقي"
                title="اطلع على منيو هذه المطاعم"
                subtitle="تصفح منيو مطاعم حقيقية تستخدم المنصة وشاهد تجربة الزبائن"
            />

            <div
                className="relative max-w-[1060px] mx-auto px-1"
                onMouseEnter={() => setPaused(true)}
                onFocus={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onBlur={() => setPaused(false)}
            >
                {/* ── Slide ── */}
                <div className="relative h-[380px] sm:h-[460px] overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-white/10 bg-card shadow-[0_8px_40px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)]">
                    <AnimatePresence custom={dir} mode="popLayout">
                        <motion.div
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
                                    {r.logo && (
                                        <Image
                                            src={r.logo}
                                            alt=""
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, 1060px"
                                            quality={85}
                                            priority
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex flex-col justify-between size-full p-6 sm:p-10">
                                    {/* Top */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.1, duration: 0.3 }}
                                                className="size-16 sm:size-20 rounded-2xl overflow-hidden bg-white/15 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center shadow-xl shrink-0"
                                            >
                                                {r.logo ? (
                                                    <Image src={r.logo} alt={r.name} width={80} height={80} className="object-cover size-full" />
                                                ) : (
                                                    <span className="text-2xl font-bold text-white/60">{r.name.charAt(0)}</span>
                                                )}
                                            </motion.div>
                                            <div className="space-y-0.5">
                                                <motion.h3
                                                    initial={{ y: 12, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.12, duration: 0.3 }}
                                                    className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg"
                                                >
                                                    {r.name}
                                                </motion.h3>
                                                {r.city && (
                                                    <motion.span
                                                        initial={{ y: 8, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        transition={{ delay: 0.15, duration: 0.3 }}
                                                        className="flex items-center gap-1 text-xs sm:text-sm text-white/70"
                                                    >
                                                        <MapPin className="size-3.5" />
                                                        {r.city}
                                                    </motion.span>
                                                )}
                                            </div>
                                        </div>
                                        {r.orderCount > 0 && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2, duration: 0.3 }}
                                                className="flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white/90"
                                            >
                                                <Star className="size-3.5 text-yellow-400" />
                                                {r.orderCount}
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Bottom */}
                                    <div className="space-y-3.5 max-w-xl">
                                        {r.description && (
                                            <motion.p
                                                initial={{ y: 12, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.15, duration: 0.3 }}
                                                className="text-sm sm:text-base text-white/80 leading-relaxed line-clamp-2"
                                            >
                                                {r.description}
                                            </motion.p>
                                        )}
                                        <motion.div
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.18, duration: 0.3 }}
                                            className="flex flex-wrap items-center gap-x-5 gap-y-2"
                                        >
                                            {r.phone && (
                                                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-white/70" dir="ltr">
                                                    <Phone className="size-3.5" />
                                                    {r.phone}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-orange-400 hover:text-orange-300 transition-colors group/link">
                                                عرض المنيو
                                                <ArrowLeft className="size-4 transition-transform duration-200 group-hover/link:-translate-x-1" />
                                            </span>
                                        </motion.div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    </AnimatePresence>

                    {/* ── Arrows ── */}
                    {n > 1 && (
                        <>
                            <button onClick={prev} type="button"
                                className="absolute start-4 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-white/20 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/35 hover:scale-105 transition-all duration-200 shadow-xl opacity-0 group-hover:opacity-100 md:opacity-70 md:hover:opacity-100"
                                aria-label="السابق">
                                <ArrowRight className="size-5" />
                            </button>
                            <button onClick={next} type="button"
                                className="absolute end-4 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-white/20 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/35 hover:scale-105 transition-all duration-200 shadow-xl opacity-0 group-hover:opacity-100 md:opacity-70 md:hover:opacity-100"
                                aria-label="التالي">
                                <ArrowLeft className="size-5" />
                            </button>
                        </>
                    )}

                    {/* ── Progress bar ── */}
                    {n > 1 && (
                        <div className="absolute bottom-0 inset-x-0 z-20 h-1 bg-white/10">
                            <motion.div
                                key={slide}
                                className="h-full bg-orange-400"
                                initial={{ scaleX: 0, transformOrigin: "right" }}
                                animate={{ scaleX: 1, transformOrigin: "right" }}
                                exit={{ scaleX: 0, transformOrigin: "right" }}
                                transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: "linear" }}
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
                                className={`rounded-full transition-all duration-300 ${
                                    i === slide
                                        ? "w-9 h-3 bg-orange shadow-md shadow-orange/30"
                                        : "w-3 h-3 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                                }`}
                                aria-label={`الانتقال إلى ${item.name}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </SectionContainer>
    );
}
