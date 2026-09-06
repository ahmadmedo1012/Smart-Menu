'use client';

/**
 * FeaturedShowcase — round79 Stage H (خطة docs/round79-master-plan.md),
 * rebuilt-in-place to match the street-flavor reference per round83
 * (docs/SMART-MENU-ROUND83-PLAN.md) — NOT rebuilt from scratch: RTL motion,
 * OptimizedImage, zero-featured hiding, keyboard support and the a11y gates
 * from rounds 66/79/80 are all preserved.
 *
 * Round83 changes (spec §2, literal numbers):
 * - §2.1 Size: scene is a full-width "scene" (breaks out of the parent's
 *   px-4 gutter), min-h-[70vh] mobile / min-h-[80vh] md+, bottom-only
 *   rounded-b-3xl. The image is a background-style OVERLAY (not a flex-row
 *   column): >=75% scene width on mobile, >=55% from md, centered, with the
 *   giant ghost name behind it and text block anchored at the bottom.
 * - §2.2 Per-item identity color: 5 oklch token pairs live in globals.css
 *   (--showcase-accent-1..5 + -wash). The scene resolves a local
 *   --scene-accent/--scene-wash pair from the item's featuredRank (mod 5),
 *   so the WHOLE scene background visibly re-tints on every arrow press.
 *   The giant ghost name uses the item token at opacity-30 light /
 *   dark:opacity-[0.40] (raised from the old /10 dark:/15 fixed orange).
 * - §2.3 Multiple badges: up to 3 tags from MenuItem.showcaseTags (round83
 *   migration; round88-C dropped the legacy single showcaseTag column — the
 *   array is the only badge storage), absolutely
 *   positioned around the image with % coordinates (responsive, no px).
 * - §2.4 Preserved on purpose: abstract Sparkles floaters (never fake
 *   ingredient photos), NO CTA buttons (ordering stays in the grid below),
 *   prefers-reduced-motion disables all motion, arrows >=44px, aria-live
 *   counter, axe WCAG baseline must stay at zero (re-measured round83).
 *
 * Grid below is untouched (plan gate: `git diff MenuItemCard.tsx` empty).
 */

import { useState, useCallback, useMemo, type CSSProperties, type KeyboardEvent } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'motion/react';
import { MotionChevronLeft, MotionChevronRight } from '@/components/ui/motion-icons';
import SparklesIcon from '@/components/ui/sparkles-icon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { toArabicNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type FeaturedItem = {
        id: number;
        name: string;
        nameAr: string | null;
        description: string;
        descriptionAr: string;
        price: number;
        discountedPrice: number | null;
        image: string;
        sortOrder: number;
        isFeatured?: boolean;
        featuredRank?: number | null;
        /** Round83 §2.3 — up to 3 showcase badges. */
        showcaseTags?: string[] | null;
};

const MAX_SHOWCASE = 5;
const MAX_BADGES = 3;

/** Featured first (rank 1 first, nulls last), then fall back to grid order. */
export function rankFeatured(items: readonly FeaturedItem[]): FeaturedItem[] {
        return items
                .filter((i) => i.isFeatured === true)
                .sort((a, b) => {
                        const ra = a.featuredRank ?? Number.MAX_SAFE_INTEGER;
                        const rb = b.featuredRank ?? Number.MAX_SAFE_INTEGER;
                        if (ra !== rb) return ra - rb;
                        return a.sortOrder - b.sortOrder;
                })
                .slice(0, MAX_SHOWCASE);
}

/**
 * §2.2 — resolve which of the 5 identity tokens this scene uses.
 * Derivation (no new DB column): the item's featuredRank when ranked, else
 * its position in the ranked list — mod 5. Sequential ranks 1..5 map to the
 * 5 distinct accents in order, so adjacent scenes ALWAYS differ.
 */
function accentIndex(item: FeaturedItem, position: number): number {
        const effectiveRank = item.featuredRank ?? position + 1;
        return ((effectiveRank - 1) % 5) + 1;
}

/** §2.3 — badge list: the tags array, trimmed + deduped, max 3. */
function badgeTags(item: FeaturedItem): string[] {
        const fromArray = (item.showcaseTags ?? []).map((t) => t.trim()).filter(Boolean);
        return [...new Set(fromArray)].slice(0, MAX_BADGES);
}

export function FeaturedShowcase({ items }: { items: readonly FeaturedItem[] }) {
        const featured = useMemo(() => rankFeatured(items), [items]);
        const [index, setIndex] = useState(0);
        const [direction, setDirection] = useState(0);
        const reduceMotion = useReducedMotion();

        const total = featured.length;
        const goNext = useCallback(() => {
                if (total < 2) return;
                setDirection(1);
                setIndex((i) => (i + 1) % total);
        }, [total]);
        const goPrev = useCallback(() => {
                if (total < 2) return;
                setDirection(-1);
                setIndex((i) => (i - 1 + total) % total);
        }, [total]);

        // Keyboard support on the whole section (arrows switch scenes; RTL-aware:
        // ArrowLeft = التالي, ArrowRight = السابق — mirrored from LTR conventions).
        const onKeyDown = useCallback(
                (e: KeyboardEvent<HTMLElement>) => {
                        if (total < 2) return;
                        if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                goNext();
                        } else if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                goPrev();
                        }
                },
                [goNext, goPrev, total]
        );

        if (total === 0) return null;
        const current = featured[index]!;
        const displayName = current.nameAr?.trim() ? current.nameAr : current.name;
        const description = (current.descriptionAr?.trim() ? current.descriptionAr : current.description) || '';
        const discounted = current.discountedPrice != null && current.discountedPrice > 0
                ? current.discountedPrice
                : null;
        const badges = badgeTags(current);

        /* §2.2 — the scene's identity pair, resolved per item (position 1-based). */
        const n = accentIndex(current, index);
        const sceneVars = {
                '--scene-accent': `var(--showcase-accent-${n})`,
                '--scene-wash': `var(--showcase-accent-${n}-wash)`,
        } as CSSProperties;

        /* RTL slide direction: "next" enters from the LEFT (mirrored from the
                        LTR reference). Disabled entirely under prefers-reduced-motion. */
        const enterX = reduceMotion ? 0 : direction >= 0 ? '-45%' : '45%';
        const exitX = reduceMotion ? 0 : direction >= 0 ? '45%' : '-45%';

        return (
                <section
                        aria-labelledby="featured-showcase-heading"
                        className="relative mb-6"
                        onKeyDown={onKeyDown}
                >
                        <div className="flex items-center justify-center gap-2 mb-3">
                                <SparklesIcon className="size-4 text-ember dark:text-saffron" aria-hidden="true" />
                                <h2 id="featured-showcase-heading" className="text-sm font-bold text-ember dark:text-saffron tracking-wide">
                                        أصنافنا المميزة
                                </h2>
                        </div>

                        {/* §2.1 — the SCENE: full parent-container width (breaks the px-4
                                        gutter), 70vh/80vh minimum, bottom-only rounding, and the §2.2
                                        per-item wash that animates on every navigation. */}
                        <div
                                style={sceneVars}
                                className="group/showcase -mx-4 relative flex min-h-[70vh] flex-col overflow-hidden rounded-b-3xl bg-[var(--scene-wash)] transition-colors duration-700 motion-reduce:transition-none md:min-h-[80vh]"
                        >
                                {/* Ambient glow behind the image — same accent, radial fade */}
                                <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                                background:
                                                        'radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--scene-accent) 14%, transparent), transparent 68%)',
                                        }}
                                />

                                {/* §2.2 — giant item name as backdrop, PER-ITEM token at
                                                opacity-30 light / dark:opacity-[0.40] (raised from /10 dark:/15). */}
                                <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
                                >
                                        <span className="px-4 text-center text-[clamp(3.5rem,14vw,9.5rem)] font-black leading-[0.95] tracking-tight text-[var(--scene-accent)] opacity-30 transition-colors duration-700 motion-reduce:transition-none dark:opacity-[0.40]">
                                                {displayName}
                                        </span>
                                </div>

                                {/* Generic decorative floaters (round79 option أ — sparkles,
                                                never fake ingredients) — tinted with the scene accent. */}
                                <m.div
                                        aria-hidden="true"
                                        className="absolute top-6 end-[12%] text-[var(--scene-accent)]/40 pointer-events-none"
                                        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                        <SparklesIcon className="size-6" />
                                </m.div>
                                <m.div
                                        aria-hidden="true"
                                        className="absolute bottom-24 start-[8%] text-[var(--scene-accent)]/30 pointer-events-none"
                                        animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                                >
                                        <SparklesIcon className="size-4" />
                                </m.div>

                                <AnimatePresence mode="wait" initial={false}>
                                        <m.div
                                                key={current.id}
                                                initial={{ opacity: 0, x: enterX }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: exitX }}
                                                transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                                                className="relative z-10 flex flex-1 flex-col"
                                        >
                                                {/* §2.1 — image zone: centered OVERLAY (not a flex column),
                                                        >=75% scene width mobile / >=55% md. */}
                                                <div className="relative flex flex-1 items-center justify-center px-4 py-10 md:py-14">
                                                        <div className="relative w-[75%] max-w-[540px] md:w-[55%]">
                                                                <div
                                                                        aria-hidden="true"
                                                                        className="absolute inset-0 scale-90 rounded-[2rem] blur-3xl"
                                                                        style={{
                                                                                background:
                                                                                        'color-mix(in oklab, var(--scene-accent) 30%, transparent)',
                                                                        }}
                                                                />
                                                                {current.image ? (
                                                                        <OptimizedImage
                                                                                src={current.image}
                                                                                alt={displayName}
                                                                                aspectRatio="square"
                                                                                className="relative rounded-3xl border border-[color-mix(in_oklab,var(--scene-accent)_35%,transparent)] shadow-2xl"
                                                                                /* round88-A2: scene breaks out of the px-4 gutter inside the
                                                                                   max-w-4xl (896px) menu container; the image overlay is 75% of
                                                                                   it below md / 55% from md (never hits its 540px cap: 55% of
                                                                                   896 = 493). The old generic sizes (100vw/50vw/33vw) both
                                                                                   overfetched below 640 and underfetched (blur) the 640-1024
                                                                                   bands. First slide is the LCP candidate on featured menus
                                                                                   → eager + high priority (was lazy). */
                                                                                sizes="(max-width: 768px) calc(75vw - 24px), min(55vw, 493px)"
                                                                                priority={index === 0}
                                                                        />
                                                                ) : (
                                                                        <div className="relative flex aspect-square items-center justify-center rounded-3xl border border-[color-mix(in_oklab,var(--scene-accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--scene-wash)_60%,var(--scene-accent)_40%)] text-6xl font-black text-[var(--scene-accent)] md:text-7xl">
                                                                                {displayName.slice(0, 1)}
                                                                        </div>
                                                                )}

                                                                {/* §2.3 — up to 3 badges at fixed RELATIVE (%)
                                                                        positions around the image (responsive: tighter on
                                                                        mobile so nothing clips outside the scene). */}
                                                                {badges.map((tag, i) => (
                                                                        <m.span
                                                                                key={tag}
                                                                                initial={false}
                                                                                animate={reduceMotion ? undefined : { y: [0, i % 2 === 0 ? -6 : 5, 0] }}
                                                                                transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
                                                                                className={cn(
                                                                                        'absolute z-20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur-sm',
                                                                                        'border-[color-mix(in_oklab,var(--scene-accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--scene-wash)_88%,transparent)] text-[var(--scene-accent)]',
                                                                                        i === 0 && 'top-[-6%] start-[-4%] md:start-[-12%]',
                                                                                        i === 1 && 'top-[42%] start-[-8%] md:start-[-24%]',
                                                                                        i === 2 && 'bottom-[4%] end-[-4%] md:end-[-10%]'
                                                                                )}
                                                                        >
                                                                                <SparklesIcon className="size-3" aria-hidden="true" />
                                                                                {tag}
                                                                        </m.span>
                                                                ))}
                                                        </div>
                                                </div>

                                                {/* §2.1 — text block anchored at the scene bottom
                                                        (reference "bottom info area" — no CTA, plan §2.4). */}
                                                <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-14 pt-1 text-center md:pb-20">
                                                        <h3 className="text-3xl font-bold text-foreground md:text-5xl">{displayName}</h3>
                                                        {description && (
                                                                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-foreground/75 line-clamp-2 md:text-base">
                                                                        {description}
                                                                </p>
                                                        )}
                                                        <div className="mt-4 flex items-baseline justify-center gap-2">
                                                                {discounted != null ? (
                                                                        <>
                                                                                <span className="text-2xl font-bold text-success md:text-3xl">
                                                                                        {toArabicNumber(discounted)} د.ل
                                                                                </span>
                                                                                <span className="text-sm text-foreground/60 line-through md:text-base">
                                                                                        {toArabicNumber(current.price)} د.ل
                                                                                </span>
                                                                        </>
                                                                ) : (
                                                                        <span className="text-2xl font-bold text-[var(--scene-accent)] md:text-3xl">
                                                                                {toArabicNumber(current.price)} د.ل
                                                                        </span>
                                                                )}
                                                        </div>
                                                </div>
                                        </m.div>
                                </AnimatePresence>

                                {total > 1 && (
                                        <>
                                                {/* Navigation — real buttons >=44px (round66 Fitts), RTL-correct arrows.
                                                                Scene-accent colored (§2.2). */}
                                                <button
                                                        type="button"
                                                        onClick={goPrev}
                                                        aria-label="الصنف السابق"
                                                        className="absolute start-3 top-1/2 z-20 -translate-y-1/2 flex size-11 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--scene-accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--scene-wash)_85%,var(--background))] text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--scene-accent)]/15 hover:text-[var(--scene-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scene-accent)]"
                                                >
                                                        <MotionChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
                                                </button>
                                                <button
                                                        type="button"
                                                        onClick={goNext}
                                                        aria-label="الصنف التالي"
                                                        className="absolute end-3 top-1/2 z-20 -translate-y-1/2 flex size-11 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--scene-accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--scene-wash)_85%,var(--background))] text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--scene-accent)]/15 hover:text-[var(--scene-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scene-accent)]"
                                                >
                                                        <MotionChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
                                                </button>

                                                {/* Position dots (active = scene accent) + live counter */}
                                                <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1.5" aria-hidden="true">
                                                        {featured.map((f, i) => (
                                                                <button
                                                                        key={f.id}
                                                                        type="button"
                                                                        tabIndex={-1}
                                                                        onClick={() => {
                                                                                setDirection(i > index ? 1 : -1);
                                                                                setIndex(i);
                                                                        }}
                                                                        className={cn(
                                                                                'size-2 rounded-full transition-all',
                                                                                i === index ? 'w-4 bg-[var(--scene-accent)]' : 'bg-[color-mix(in_oklab,var(--scene-accent)_35%,transparent)] hover:bg-[var(--scene-accent)]/60'
                                                                        )}
                                                                />
                                                        ))}
                                                </div>
                                                <p className="sr-only" aria-live="polite">
                                                        {toArabicNumber(index + 1)} من {toArabicNumber(total)}: {displayName}
                                                </p>
                                        </>
                                )}
                        </div>
                </section>
        );
}
