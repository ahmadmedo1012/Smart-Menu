"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Phone, ArrowLeft, ArrowRight } from "lucide-react";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { FeaturedRestaurant } from "@/lib/landing";

type Props = {
    restaurants: FeaturedRestaurant[];
};

const AUTOPLAY_INTERVAL = 4000;
const SLIDE_VARIANTS = {
    enter: (dir: number) => ({
        x: dir > 0 ? 300 : -300,
        opacity: 0,
        scale: 0.96,
    }),
    center: {
        x: 0,
        opacity: 1,
        scale: 1,
    },
    exit: (dir: number) => ({
        x: dir > 0 ? -300 : 300,
        opacity: 0,
        scale: 0.96,
    }),
};

export default function FeaturedRestaurantsSection({ restaurants }: Props) {
    const [[current, dir], setSlide] = useState([0, 0]);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const total = restaurants.length;

    const goTo = useCallback(
        (index: number, direction?: number) => {
            const d = direction ?? (index > current ? 1 : -1);
            setSlide([((index % total) + total) % total, d]);
        },
        [current, total],
    );

    const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

    // Autoplay
    useEffect(() => {
        if (isPaused || total <= 1) return;
        intervalRef.current = setInterval(next, AUTOPLAY_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPaused, next, total]);

    if (total === 0) return null;

    const r = restaurants[current];

    return (
        <SectionContainer className="bg-gradient-to-b from-background via-orange/[0.015] to-background">
            <SectionHeader
                icon={<Star className="size-3" />}
                eyebrow="منيو حقيقي"
                title="اطلع على منيو هذه المطاعم"
                subtitle="تصفح منيو مطاعم حقيقية تستخدم المنصة وشاهد تجربة الزبائن"
            />

            <div
                className="relative max-w-[1000px] mx-auto"
                onMouseEnter={() => setIsPaused(true)}
                onFocus={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onBlur={() => setIsPaused(false)}
            >
                {/* ── Slide container ── */}
                <div className="relative h-[340px] sm:h-[380px] overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-border/40 bg-card shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.3)]">
                    <AnimatePresence custom={dir} mode="wait">
                        <motion.div
                            key={r.id}
                            custom={dir}
                            variants={SLIDE_VARIANTS}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 280, damping: 28 },
                                opacity: { duration: 0.35 },
                                scale: { duration: 0.35 },
                            }}
                            className="absolute inset-0"
                        >
                            <Link
                                href={`/menu/${r.slug}`}
                                className="block size-full group"
                            >
                                {/* Background image */}
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-muted/30 to-orange/5">
                                    {r.logo ? (
                                        <Image
                                            src={r.logo}
                                            alt=""
                                            fill
                                            className="object-cover opacity-20 dark:opacity-10"
                                            sizes="1000px"
                                        />
                                    ) : null}
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex flex-col justify-between size-full p-6 sm:p-10">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Logo badge */}
                                        <div className="size-16 sm:size-20 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-muted/50 to-orange/10 ring-1 ring-border/30 shrink-0 flex items-center justify-center">
                                            {r.logo ? (
                                                <Image
                                                    src={r.logo}
                                                    alt={r.name}
                                                    width={80}
                                                    height={80}
                                                    className="object-cover size-full"
                                                />
                                            ) : (
                                                <span className="text-2xl font-bold text-orange/40">
                                                    {r.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Order count */}
                                        {r.orderCount > 0 && (
                                            <div className="flex items-center gap-1 rounded-full bg-background/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-foreground/60">
                                                <Star className="size-3 text-orange" />
                                                {r.orderCount}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        <h3 className="text-xl sm:text-2xl font-bold leading-tight">
                                            {r.name}
                                        </h3>
                                        {r.description && (
                                            <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 max-w-lg">
                                                {r.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
                                            {r.city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="size-3" />
                                                    {r.city}
                                                </span>
                                            )}
                                            {r.phone && (
                                                <span className="flex items-center gap-1" dir="ltr">
                                                    <Phone className="size-3" />
                                                    {r.phone}
                                                </span>
                                            )}
                                        </div>

                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange group-hover:underline underline-offset-4 decoration-orange/40">
                                            عرض المنيو
                                            <ArrowLeft className="size-4 rtl:rotate-0" />
                                        </span>
                                    </div>
                                </div>

                                {/* Gradient overlay at bottom for readability */}
                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
                            </Link>
                        </motion.div>
                    </AnimatePresence>

                    {/* ── Arrows ── */}
                    {total > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prev}
                                className="absolute start-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-background/70 backdrop-blur-sm border border-border/30 flex items-center justify-center text-foreground/70 hover:bg-background hover:text-foreground transition-all shadow-sm"
                                aria-label="السابق"
                            >
                                <ArrowRight className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={next}
                                className="absolute end-3 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-background/70 backdrop-blur-sm border border-border/30 flex items-center justify-center text-foreground/70 hover:bg-background hover:text-foreground transition-all shadow-sm"
                                aria-label="التالي"
                            >
                                <ArrowLeft className="size-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* ── Dots ── */}
                {total > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-5">
                        {restaurants.map((item, i) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => goTo(i, i > current ? 1 : -1)}
                                className={`h-2 rounded-full transition-all duration-500 ${
                                    i === current
                                        ? "w-7 bg-orange"
                                        : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
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
