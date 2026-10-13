'use client';

import { useState, useCallback, useEffect, useRef, type KeyboardEvent, type TouchEvent } from 'react';
import {Maximize2, Pause, Play} from 'lucide-react';
import { MotionChevronLeft } from '@/components/ui/motion-icons';
import { MotionChevronRight } from '@/components/ui/motion-icons';
import AnimatedX from '@/components/ui/x-icon';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { toArabicNumber } from '@/lib/format';

/* a11y (WCAG 2.2.2): autoplay must not start for reduced-motion users.
   Read once at mount — the OS-level preference rarely changes mid-session. */
const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* r135-B: عتبة السحب (48px) + نسبة السيادة الأفقية 1.5× — نفس نمط
   FeaturedShowcase حتى لا يُختطف التمرير الرأسي داخل المعرض. */
const SWIPE_THRESHOLD = 48;
const SWIPE_AXIS_RATIO = 1.5;

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

        /* r135-B: السحب بالإصبع — مرآة RTL الفيزيائية للحركة (نفس FeaturedShowcase):
         * الصورة التالية تعيش يسار المركز فيُكشف بسحب المحتوى يمينًا. علم
         * كبت النقر يمنع فتح Lightbox/إغلاقه بنقرة الشريحة التي يطلقها المتصفح
         * بعد touchend حتى لو كانت سحبة فعلية. */
        const touchStartRef = useRef<{ x: number; y: number } | null>(null);
        const suppressTapRef = useRef(false);
        const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
                suppressTapRef.current = false; // إيماءة جديدة — أعِد السماح بالنقر
                const t = e.touches[0];
                if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
        }, []);
        const onTouchEndStrip = useCallback(
                (e: TouchEvent<HTMLDivElement>) => {
                        const start = touchStartRef.current;
                        touchStartRef.current = null;
                        if (!start || images.length < 2) return;
                        const t = e.changedTouches[0];
                        if (!t) return;
                        const dx = t.clientX - start.x;
                        const dy = t.clientY - start.y;
                        if (Math.abs(dx) <= SWIPE_THRESHOLD || Math.abs(dx) < SWIPE_AXIS_RATIO * Math.abs(dy)) {
                                return;
                        }
                        suppressTapRef.current = true;
                        // إعادة تمكين النقر بعد مهلة قصيرة (أجهزة اللمس+الفأرة الهجينة)
                        window.setTimeout(() => {
                                suppressTapRef.current = false;
                        }, 100);
                        if (dx > 0) next(); // RTL: سحب يمينًا = التالي
                        else prev(); // RTL: سحب يسارًا = السابق
                },
                [images.length, next, prev]
        );
        const onTouchEndLightbox = useCallback(
                (e: TouchEvent<HTMLDivElement>) => {
                        const start = touchStartRef.current;
                        touchStartRef.current = null;
                        if (!start || images.length < 2) return;
                        const t = e.changedTouches[0];
                        if (!t) return;
                        const dx = t.clientX - start.x;
                        const dy = t.clientY - start.y;
                        if (Math.abs(dx) <= SWIPE_THRESHOLD || Math.abs(dx) < SWIPE_AXIS_RATIO * Math.abs(dy)) {
                                return;
                        }
                        suppressTapRef.current = true;
                        window.setTimeout(() => {
                                suppressTapRef.current = false;
                        }, 100);
                        setLightboxIdx((p) =>
                                dx > 0 ? (p + 1) % images.length : (p - 1 + images.length) % images.length
                        );
                },
                [images.length]
        );

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
                        {/* r135-B: معالجات اللمس على حاوية الشريط — الأسهم/النقاط/الإيقاف
                            أزرار داخلها (بلا stopPropagation للّمس) لكن السحب يحتاج عتبة
                            أفقية فلا يتعارض مع نقرها. */}
                        <div
                                className="group glass-card rounded-xl overflow-hidden"
                                onTouchStart={onTouchStart}
                                onTouchEnd={onTouchEndStrip}
                        >
                                <div className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden">
                                        {images.map((img, i) => (
                                                <div
                                                        key={i}
                                                        /* r139 (P3-10 من تدقيق r138-a، 4.1.2): الشريحة
                                                           التفاعلية (tabIndex + Enter/Space يفتحان
                                                           Lightbox) كانت بلا دور — قارئ الشاشة يعلن
                                                           «group» لا زرًا قابلًا للتفعيل. role=button
                                                           آمنة هنا: لا أزرار متداخلة داخل الشريحة،
                                                           وaria-roledescription يبقي الهوية البصرية
                                                           («شريحة، زر»). */
                                                        role="button"
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
                                                                /* r135-B: كان duration-cinema (720ms) — طُبّع
                                                                   إلى duration-slow (380ms، سقف الحركة) */
                                                                'absolute inset-0 transition-[opacity,transform,translate,scale,rotate] duration-slow ease-out cursor-pointer',
                                                                i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                                                        )}
                                                        onClick={() => {
                                                                /* r135-B: لا تفتح Lightbox بنقرة ما بعد السحبة */
                                                                if (!suppressTapRef.current) openLightbox(i);
                                                        }}
                                                >
                                                        {loaded.has(i) && (
                                                                <OptimizedImage
                                                                        src={img}
                                                                        alt={`${restaurantName || 'صورة'} ${i + 1}`}
                                                                        className="size-full"
                                                                        skeleton={false}
                                                                        priority={i === 0}
                                                                        /* r138: نفس درس البطاقة والعرض المميز — التمرير الصريح
                                                                           لـfetchpriority (priority وحده لا يكفي في Next 16). */
                                                                        fetchPriority={i === 0 ? 'high' : undefined}
                                                                        /* round88-A2: strip fills the max-w-4xl (896px) hero container
                                                                           minus its px-4 gutter — 21/9 aspect. Old generic sizes
                                                                           underfetched 640-1024 (50vw vs ~100vw box) → blur. */
                                                                        sizes="(max-width: 928px) calc(100vw - 32px), 896px"
                                                                />
                                                        )}
                                                        {/* Phase 5 (r152): warm food-imagery grade — faint espresso scrim. */}
                                                        <div className="absolute inset-0 warm-scrim-faint" />
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
                                                        className="absolute start-3 top-1/2 -translate-y-1/2 size-11 rounded-full glass-card flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,transform,translate,scale,rotate,box-shadow,background-color] duration-base hover:scale-110 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                                                        className="absolute end-3 top-1/2 -translate-y-1/2 size-11 rounded-full glass-card flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,transform,translate,scale,rotate,box-shadow,background-color] duration-base hover:scale-110 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                                                        className="absolute bottom-3 end-3 size-11 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,background-color] duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                                                                // r151 (LIVE-AUDIT-SM1 P2-2): صندوق الزر 44×44 (كنون
                                                                // الأسطول) — كان 24×24 (الحد الأدنى WCAG 2.5.8 من
                                                                // r115-F121) وأخفق عرف اللمس 44 في قياس التدقيق الحي.
                                                                // -mx-2.5 المتماثلة تُبقي إيقاع النقاط البصري كما كان
                                                                // (26px خطوة) والنقطة المرئية عنصر داخلي صغير كما هي.
                                                                <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                goTo(i);
                                                                        }}
                                                                        className="relative flex size-11 -mx-2.5 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                                                        aria-label={`صورة ${i + 1}`}
                                                                        aria-current={i === current ? 'true' : undefined}
                                                                >
                                                                        <span
                                                                                className={cn(
                                                                                        'block h-1.5 rounded-full transition-[width,background-color] duration-base',
                                                                                        i === current
                                                                                                ? 'w-6 bg-orange shadow-md'
                                                                                                /* r138 (P2): النقطة الخاملة أوضح —
                                                                                                   white/50 + حلقة داكنة: 3.2:1 على صور
                                                                                                   متوسطة (كانت /40 ≈2.6:1) والحلقة تضمن
                                                                                                   الحد فوق الصور الفاتحة (1.4.11). */
                                                                                                : 'w-1.5 bg-white/50 ring-1 ring-black/60 hover:bg-white/65'
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
                                                /* r135-B: لا تفتح Lightbox بنقرة ما بعد السحبة */
                                                if (!suppressTapRef.current) openLightbox(current);
                                        }}
                                        className="absolute top-3 start-3 size-11 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-[opacity,background-color] duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                        aria-label="تكبير الصورة"
                                >
                                        <Maximize2 className="size-3.5" aria-hidden="true" />
                                </button>
                        </div>

                        {/* r135-B: إعلان تغيّر الشريحة لقارئات الشاشة — الأرقام العربية
                            كعرف التطبيق (تُحدّث مهذبًا مع كل تنقل) */}
                        <p className="sr-only" aria-live="polite">
                                {`صورة ${toArabicNumber(current + 1)} من ${toArabicNumber(images.length)}`}
                        </p>

                        {/* Lightbox */}
                        {lightbox && (
                                <div
                                        ref={dialogRef}
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label={restaurantName ? `معرض صور ${restaurantName}` : 'معرض الصور'}
                                        /* r135-B: سحب بالإصبع داخل Lightbox + كبت إغلاق الخلفية
                                           بنقرة ما بعد السحبة (نفس عتبة الشريط). فخ التركيز/
                                           Escape/إعادة التركيز كما هي (r121-K-4). */
                                        onTouchStart={onTouchStart}
                                        onTouchEnd={onTouchEndLightbox}
                                        className="fixed inset-0 z-(--z-lightbox) bg-black/85 backdrop-blur-md flex items-center justify-center animate-[fade-in_240ms_var(--ease-out-quart)_both]"
                                        onClick={() => {
                                                if (!suppressTapRef.current) closeLightbox();
                                        }}
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
                                                {/* ponytail: raw <img> because OptimizedImage uses fill+object-cover. Lightbox needs object-contain with max-height constraint. next/image doesn't support this layout without hardcoding dimensions.
                                                    r132 (A3 finding 8, CLS): width/height attrs added — the lightbox img had no
                                                    intrinsic dims, so every slide change laid out a 0×0→full-size image inside
                                                    the centered flex and re-centered visibly on slow links. 1200×675 is the
                                                    seeded gallery's 16:9 (demo covers); object-contain + max-* keep the
                                                    rendered geometry constrained — the attrs only give the browser the
                                                    aspect-ratio box up front. */}
                                                <img
                                                        src={images[lightboxIdx]}
                                                        alt={`${restaurantName || 'صورة'} ${lightboxIdx + 1}`}
                                                        width={1200}
                                                        height={675}
                                                        className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-[scale-in_240ms_var(--ease-out-quart)_both]"
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
                                                                                // r151 (LIVE-AUDIT-SM1 P2-2): same 44×44 canon as the
                                                                                // carousel dots above (was the r127-F3/r115-F121 24×24
                                                                                // box) — symmetric -mx-2.5 keeps the 26px visual pitch
                                                                                // and the inner span stays the small dot.
                                                                                <button
                                                                                        key={i}
                                                                                        type="button"
                                                                                        onClick={() => setLightboxIdx(i)}
                                                                                        aria-label={`صورة ${i + 1}`}
                                                                                        aria-current={i === lightboxIdx ? 'true' : undefined}
                                                                                        className="relative flex size-11 -mx-2.5 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                                                                >
                                                                                        <span
                                                                                                className={cn(
                                                                                                        'block h-1.5 rounded-full transition-[width,background-color] duration-base',
                                                                                                        /* r138 (P2): الخاملة white/50 + حلقة داكنة —
                                                                                                           4.9:1 على خلفية Lightbox الداكنة (كانت
                                                                                                           /30 ≈2.5-2.7:1) والحلقة تسند أسوأ حالة
                                                                                                           تداخل مع صورة فاتحة (1.4.11). */
                                                                                                        i === lightboxIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 ring-1 ring-black/60 hover:bg-white/65'
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
