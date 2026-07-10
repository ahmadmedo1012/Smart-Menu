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
    restaurants: FeaturedRestaurant[];
};

const AUTOPLAY_INTERVAL = 4500;

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 360 : -360, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -360 : 360, opacity: 0 }),
};

export default function FeaturedRestaurantsSection({ restaurants }: Props) {
    const [[slide, dir], setSlide] = useState([0, 0]);
    const [paused, setPaused] = useState(false);
    const timer = useRef<ReturnType<typeof setInterval>>(undefined);

    const n = restaurants.length;
    const go = useCallback(
        (i: number, d?: number) => setSlide([((i % n) + n) % n, d ?? (i > slide ? 1 : -1)]),
        [slide, n],
    );
    const next = useCallback(() => go(slide + 1, 1), [slide, go]);
    const prev = useCallback(() => go(slide - 1, -1), [slide, go]);

    useEffect(() => {
        if (paused || n <= 1) return;
        timer.current = setInterval(next, AUTOPLAY_INTERVAL);
        return () => clearInterval(timer.current);
    }, [paused, next, n]);

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
                className="relative max-w-[1000px] mx-auto"
                onMouseEnter={() => setPaused(true)}
                onFocus={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onBlur={() => setPaused(false)}
            >
                {/* ── Slide ── */}
                <div className="relative h-[360px] sm:h-[420px] overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-border/30 bg-card shadow-[0_8px_40px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.4)]">
                    <AnimatePresence custom={dir} mode="wait">
                        <motion.div
                            key={r.id}
                            custom={dir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ x: { type: "spring", stiffness: 260, damping: 26 }, opacity: { duration: 0.3 } }}
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
                                            sizes="1000px"
                                        />
                                    )}
                                    {/* Multi-layer gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex flex-col justify-between size-full p-6 sm:p-10">
                                    {/* Top section */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="size-14 sm:size-16 rounded-xl overflow-hidden bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shadow-lg">
                                                {r.logo ? (
                                                    <Image src={r.logo} alt={r.name} width={64} height={64} className="object-cover size-full" />
                                                ) : (
                                                    <span className="text-xl font-bold text-white/60">{r.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-sm">{r.name}</h3>
                                                {r.city && (
                                                    <span className="flex items-center gap-1 text-xs text-white/70 mt-0.5">
                                                        <MapPin className="size-3" />
                                                        {r.city}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {r.orderCount > 0 && (
                                            <div className="flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/80">
                                                <Star className="size-3 text-yellow-400" />
                                                {r.orderCount}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom section */}
                                    <div className="space-y-3">
                                        {r.description && (
                                            <p className="text-sm sm:text-base text-white/80 leading-relaxed line-clamp-2 max-w-xl drop-shadow-sm">
                                                {r.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-white/60">
                                            {r.phone && (
                                                <span className="flex items-center gap-1.5" dir="ltr">
                                                    <Phone className="size-3.5" />
                                                    {r.phone}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors group/link">
                                                عرض المنيو
                                                <ArrowLeft className="size-4 transition-transform group-hover/link:-translate-x-0.5" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    </AnimatePresence>

                    {/* ── Arrows ── */}
                    {n > 1 && (
                        <>
                            <button onClick={prev} type="button" className="absolute start-3 top-1/2 -translate-y-1/2 z-20 size-11 rounded-full bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-white/30 transition-all shadow-lg opacity-0 group-hover:opacity-100 md:opacity-60 md:hover:opacity-100" aria-label="السابق">
                                <ArrowRight className="size-4" />
                            </button>
                            <button onClick={next} type="button" className="absolute end-3 top-1/2 -translate-y-1/2 z-20 size-11 rounded-full bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-white/30 transition-all shadow-lg opacity-0 group-hover:opacity-100 md:opacity-60 md:hover:opacity-100" aria-label="التالي">
                                <ArrowLeft className="size-4" />
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
                    <div className="flex items-center justify-center gap-2.5 mt-5">
                        {restaurants.map((item, i) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => go(i, i > slide ? 1 : -1)}
                                className={`rounded-full transition-all duration-500 ${
                                    i === slide ? "w-8 h-2.5 bg-orange shadow-sm shadow-orange/30" : "w-2 h-2.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
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
