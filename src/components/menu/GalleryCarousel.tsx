'use client';

import { useState, useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import {Maximize2, Pause, Play} from 'lucide-react';
import { MotionChevronLeft } from '@/components/ui/motion-icons';
import { MotionChevronRight } from '@/components/ui/motion-icons';
import AnimatedX from '@/components/ui/x-icon';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

/* a11y (WCAG 2.2.2): autoplay must not start for reduced-motion users.
   Read once at mount — the OS-level preference rarely changes mid-session. */
const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function GalleryCarousel({
        images,
        restaurantName,
}: {
        images: string[];
        restaurantName?: string;
}) {
        const [current, setCurrent] = useState(0);
        const [lightbox, setLightbox] = useState(false);
        const [lightboxIdx, setLightboxIdx] = useState(0);
        // Reduced-motion users start paused (opt back in via the Pause/Play button)
        const [paused, setPaused] = useState(prefersReducedMotion);
        const [loaded, setLoaded] = useState<Set<number>>(new Set([0]));
        const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

        const next = useCallback(() => {
                setCurrent((prev) => {
                        const nextIdx = (prev + 1) % images.length;
                        setLoaded((s) => new Set(s).add(nextIdx));
                        return nextIdx;
                });
        }, [images.length]);

        const prev = useCallback(() => {
                setCurrent((prev) => {
                        const nextIdx = (prev - 1 + images.length) % images.length;
                        setLoaded((s) => new Set(s).add(nextIdx));
                        return nextIdx;
                });
        }, [images.length]);

        useEffect(() => {
                const start = () => {
                        if (paused || document.visibilityState !== 'visible') return;
                        if (!intervalRef.current) intervalRef.current = setInterval(next, 5000);
                };
                const stop = () => {
                        if (intervalRef.current) {
                                clearInterval(intervalRef.current);
                                intervalRef.current = null;
                        }
                };
                start();
                const onVis = () => {
                        if (document.visibilityState === 'visible') start();
                        else stop();
                };
                document.addEventListener('visibilitychange', onVis);
                return () => {
                        stop();
                        document.removeEventListener('visibilitychange', onVis);
                };
        }, [next, paused]);

        const closeRef = useRef<HTMLButtonElement>(null);
        const lightboxPrevRef = useRef<HTMLButtonElement>(null);
        const lightboxNextRef = useRef<HTMLButtonElement>(null);
        // r121-K-4 (IMPL-3): the lightbox hand-rolled trap only knew three refs
        // (close/prev/next) — Tab from a dot button escaped the aria-modal dialog
        // into the obscured page behind the overlay, and closeLightbox never
        // returned focus to the opener (focus fell to <body>). ReviewSheet is the
        // in-repo model: trap built from the live DOM + opener capture + return.
        const dialogRef = useRef<HTMLDivElement>(null);
        const openerRef = useRef<HTMLElement | null>(null);

        const closeLightbox = () => {
                setLightbox(false);
                setPaused(false);
                // r121-K-4: focus return (WCAG 2.4.3) — unmounting the dialog used to
                // strand keyboard focus on <body> (document start).
                openerRef.current?.focus();
        };

        const trapFocus = useCallback(
                (e: KeyboardEvent) => {
                        if (e.key === 'Escape') {
                                closeLightbox();
                                return;
                        }
                        // r121-K-4: arrow-key slide navigation (RTL: LEFT advances — the same
                        // convention as OrderDialog's radiogroup).
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                if (images.length < 2) return;
                                e.preventDefault();
                                const delta = e.key === 'ArrowLeft' ? 1 : -1;
                                setLightboxIdx((prev) => (prev + delta + images.length) % images.length);
                                return;
                        }
                        if (e.key !== 'Tab') return;
                        const dialog = dialogRef.current;
                        if (!dialog) return;
                        // Trap from the LIVE DOM so every button inside the dialog
                        // (incl. the pagination dots) participates — the old fixed
                        // [close, prev, next] ref list skipped them.
                        const focusable = Array.from(
                                dialog.querySelectorAll<HTMLElement>('button:not([disabled])')
                        );
                        if (focusable.length === 0) {
                                e.preventDefault();
                                return;
                        }
                        const first = focusable[0];
                        const last = focusable[focusable.length - 1];
                        const active = document.activeElement;
                        // Re-entry guard (ReviewSheet pattern): a click on a non-focusable
                        // margin throws focus to body — pull it back inside.
                        if (!dialog.contains(active)) {
                                e.preventDefault();
                                (e.shiftKey ? last : first).focus();
                                return;
                        }
                        if (e.shiftKey && active === first) {
                                e.preventDefault();
                                last.focus();
                        } else if (!e.shiftKey && active === last) {
                                e.preventDefault();
                                first.focus();
                        }
                },
                [images.length]
        );

        useEffect(() => {
                if (lightbox) closeRef.current?.focus();
        }, [lightbox]);

        if (!images.length) return null;

        const openLightbox = (idx: number) => {
                // r121-K-4: remember the opener so closeLightbox can return focus to it.
                openerRef.current =
                        document.activeElement instanceof HTMLElement ? document.activeElement : null;
                setLightboxIdx(idx);
                setLightbox(true);
                setPaused(true);
        };

        const goTo = (idx: number) => {
                setCurrent(idx);
                setLoaded((s) => new Set(s).add(idx));
        };

        return (
                <>
                        <div className="group glass-card rounded-xl overflow-hidden">
                                <div className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden">
                                        {images.map((img, i) => (
                                                <div
                                                        key={i}
                                                        role="group"
                                                        aria-roledescription="شريحة"
                                                        aria-label={`صورة ${i + 1} من ${images.length}`}
                                                        aria-hidden={i !== current}
                                                        tabIndex={i === current ? 0 : -1}
                                                        onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        openLightbox(i);
                                                                }
                                                        }}
                                                        className={cn(
                                                                'absolute inset-0 transition-[opacity,transform,translate,scale,rotate] duration-cinema ease-out cursor-pointer',
                                                                i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                                                        )}
                                                        onClick={() => openLightbox(i)}
                                                >
                                                        {loaded.has(i) && (
                                                                <OptimizedImage
                                                                        src={img}
                                                                        alt={`${restaurantName || 'صورة'} ${i + 1}`}
                                                                        className="size-full"
                                                                        skeleton={false}
                                                                        priority={i === 0}
                                                                        /* round88-A2: strip fills the max-w-4xl (896px) hero container
                                                                           minus its px-4 gutter — 21/9 aspect. Old generic sizes
                                                                           underfetched 640-1024 (50vw vs ~100vw box) → blur. */
                                                                        sizes="(max-width: 928px) calc(100vw - 32px), 896px"
                                                                />
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
                                                </div>
                                        ))}
                                </div>

                                {images.length > 1 && (
                                        <>
                                                {/* glass-pill arrows — revealed on hover AND on keyboard focus
                                                        (a11y 2.4.7: focus-visible keeps controls visible without a mouse) */}
                                                <button
                                                        type="button"
                                                        onClick={(e) => {
                                                                e.stopPropagation();
                                                                prev();
                                                        }}
                                                        aria-label="الصورة السابقة"
                                                        className="absolute start-3 top-1/2 -translate-y-1/2 size-10 rounded-full glass-card flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,transform,translate,scale,rotate,box-shadow,background-color] duration-base hover:scale-110 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                >
                                                        <MotionChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                                                </button>
                                                <button
                                                        type="button"
                                                        onClick={(e) => {
                                                                e.stopPropagation();
                                                                next();
                                                        }}
                                                        aria-label="الصورة التالية"
                                                        className="absolute end-3 top-1/2 -translate-y-1/2 size-10 rounded-full glass-card flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,transform,translate,scale,rotate,box-shadow,background-color] duration-base hover:scale-110 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                >
                                                        <MotionChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                                                </button>

                                                <button
                                                        type="button"
                                                        onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPaused((p) => !p);
                                                        }}
                                                        aria-label={paused ? 'تشغيل العرض التلقائي' : 'إيقاف العرض التلقائي'}
                                                        className="absolute bottom-3 end-3 size-10 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,background-color] duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                >
                                                        {paused ? (
                                                                <Play className="size-3.5" aria-hidden="true" />
                                                        ) : (
                                                                <Pause className="size-3.5" aria-hidden="true" />
                                                        )}
                                                </button>

                                                {/* dot indicators — active w-6 bg-orange */}
                                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                        {images.map((_, i) => (
                                                                // r115-F121: الزر نفسه الآن 24×24 (الحد الأدنى WCAG 2.5.8
                                                                // للمس) — النقطة البصرية عنصر داخلي. قبل الإصلاح كان صندوق
                                                                // الزر 6px فقط (مع ::after توسعة غير قابلة للقياس من أدوات
                                                                // التدقيق) ففشل فحص target-size في Lighthouse.
                                                                <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                goTo(i);
                                                                        }}
                                                                        className="relative flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                                                        aria-label={`صورة ${i + 1}`}
                                                                >
                                                                        <span
                                                                                className={cn(
                                                                                        'block h-1.5 rounded-full transition-[width,background-color] duration-base',
                                                                                        i === current
                                                                                                ? 'w-6 bg-orange shadow-md'
                                                                                                : 'w-1.5 bg-white/40 hover:bg-white/60'
                                                                                )}
                                                                        />
                                                                </button>
                                                        ))}
                                                </div>
                                        </>
                                )}

                                <button
                                        type="button"
                                        onClick={(e) => {
                                                e.stopPropagation();
                                                openLightbox(current);
                                        }}
                                        className="absolute top-3 start-3 size-10 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,background-color] duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                        aria-label="تكبير الصورة"
                                >
                                        <Maximize2 className="size-3.5" aria-hidden="true" />
                                </button>
                        </div>

                        {/* Lightbox */}
                        {lightbox && (
                                <div
                                        ref={dialogRef}
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label={restaurantName ? `معرض صور ${restaurantName}` : 'معرض الصور'}
                                        className="fixed inset-0 z-(--z-lightbox) bg-black/85 backdrop-blur-md flex items-center justify-center animate-fade-in"
                                        onClick={closeLightbox}
                                        onKeyDown={trapFocus}
                                >
                                        <button
                                                ref={closeRef}
                                                type="button"
                                                onClick={closeLightbox}
                                                aria-label="إغلاق"
                                                className="absolute top-4 start-4 size-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/20 transition-[background-color,opacity] z-10"
                                        >
                                                <AnimatedX className="size-5" aria-hidden="true" />
                                        </button>

                                        <div
                                                className="relative max-w-5xl max-h-[92vh] mx-4 w-full flex items-center justify-center"
                                                onClick={(e) => e.stopPropagation()}
                                        >
                                                {/* ponytail: raw <img> because OptimizedImage uses fill+object-cover. Lightbox needs object-contain with max-height constraint. next/image doesn't support this layout without hardcoding dimensions. */}
                                                <img
                                                        src={images[lightboxIdx]}
                                                        alt={`${restaurantName || 'صورة'} ${lightboxIdx + 1}`}
                                                        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-scale-in"
                                                        loading="lazy"
                                                />

                                                {images.length > 1 && (
                                                        <>
                                                                {/* glass-pill lightbox nav */}
                                                                <button
                                                                        type="button"
                                                                        ref={lightboxPrevRef}
                                                                        onClick={() =>
                                                                                setLightboxIdx((prev) => (prev - 1 + images.length) % images.length)
                                                                        }
                                                                        aria-label="الصورة السابقة"
                                                                        className="absolute -start-4 md:start-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 transition-[background-color,box-shadow] shadow-lg"
                                                                >
                                                                        <MotionChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
                                                                </button>
                                                                <button
                                                                        type="button"
                                                                        ref={lightboxNextRef}
                                                                        onClick={() => setLightboxIdx((prev) => (prev + 1) % images.length)}
                                                                        aria-label="الصورة التالية"
                                                                        className="absolute -end-4 md:end-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 transition-[background-color,box-shadow] shadow-lg"
                                                                >
                                                                        <MotionChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
                                                                </button>

                                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                                        {images.map((_, i) => (
                                                                                // r127-F3 (K-12): same fix as the carousel dots
                                                                                // (r115-F121) — the button itself is 24×24 (WCAG
                                                                                // 2.5.8 minimum) and the visual dot is an inner
                                                                                // span. The old ::after hit-area hack measured
                                                                                // ≈22×26px — 2px short of the minimum and
                                                                                // invisible to audit tools.
                                                                                <button
                                                                                        key={i}
                                                                                        type="button"
                                                                                        onClick={() => setLightboxIdx(i)}
                                                                                        aria-label={`صورة ${i + 1}`}
                                                                                        className="relative flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                                                                >
                                                                                        <span
                                                                                                className={cn(
                                                                                                        'block h-1.5 rounded-full transition-[width,background-color] duration-base',
                                                                                                        i === lightboxIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'
                                                                                                )}
                                                                                        />
                                                                                </button>
                                                                        ))}
                                                                </div>
                                                        </>
                                                )}
                                        </div>
                                </div>
                        )}
                </>
        );
}
