'use client';

/**
 * FeaturedShowcase — round79 Stage H (خطة docs/round79-master-plan.md).
 *
 * Cinematic showcase for up to 5 featured menu items at the top of the public
 * menu page. ADDITION to the existing grid — MenuItemCard and the full grid
 * below remain untouched (plan gate: `git diff MenuItemCard.tsx` stays empty).
 *
 * Design constraints (from the plan):
 * - Colors come ONLY from Stage-B theme tokens (no raw palette / no hex).
 * - Full RTL: navigation arrows mirror correctly (chevron rtl:-scale-x-100,
 *   same convention as GalleryCarousel) — never copied LTR from the reference.
 * - Framer Motion (already in the project) for scene transitions;
 *   `prefers-reduced-motion` disables the slide entirely (round66 a11y rule).
 * - Images go through OptimizedImage (mandatory) — no raw <img>.
 * - Floating decorations are GENERIC sparkles (plan option أ) — never fake
 *   ingredient imagery.
 * - Deliberately NOT a duplicate of GalleryCarousel: no autoplay, no lightbox,
 *   no index-Set lazy-loading — it is a full-scene pager, not an image strip
 *   (verified via ast-grep at the H gate).
 * - No ordering CTA here: ordering stays in the grid below (no OrderDialog
 *   duplication).
 */

import { useState, useCallback, useMemo, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
	showcaseTag?: string | null;
};

const MAX_SHOWCASE = 5;

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
				<SparklesIcon className="size-4 text-ember" aria-hidden="true" />
				<h2 id="featured-showcase-heading" className="text-sm font-bold text-ember tracking-wide">
					أصنافنا المميزة
				</h2>
			</div>

			<div className="group/showcase relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-sm">
				{/* Giant item name as backdrop — theme token color, never raw */}
				<div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden">
					<span className="whitespace-nowrap text-[clamp(3rem,12vw,7rem)] font-black leading-none text-orange/10 dark:text-orange/15">
						{displayName}
					</span>
				</div>

				{/* Generic decorative floaters (plan option أ — sparkles, not fake ingredients) */}
				<motion.div
					aria-hidden="true"
					className="absolute top-6 end-[12%] text-saffron/40 dark:text-saffron/30 pointer-events-none"
					animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
					transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
				>
					<SparklesIcon className="size-6" />
				</motion.div>
				<motion.div
					aria-hidden="true"
					className="absolute bottom-8 start-[8%] text-ember/30 dark:text-ember/25 pointer-events-none"
					animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
					transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
				>
					<SparklesIcon className="size-4" />
				</motion.div>

				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={current.id}
						initial={{ opacity: 0, x: enterX }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: exitX }}
						transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
						className="relative z-10 flex flex-col-reverse items-center gap-4 p-5 sm:p-8 md:flex-row md:items-center md:gap-8 md:p-10"
					>
						{/* Text side */}
						<div className="flex-1 space-y-3 text-center md:text-start">
							{current.showcaseTag?.trim() && (
								<span className="inline-flex items-center gap-1.5 rounded-full bg-orange/15 px-3 py-1 text-[11px] font-bold text-ember dark:text-saffron">
									<SparklesIcon className="size-3" aria-hidden="true" />
									{current.showcaseTag.trim()}
								</span>
							)}
							<h3 className="text-2xl font-bold md:text-4xl">{displayName}</h3>
							{description && (
								<p className="mx-auto md:mx-0 max-w-md text-sm leading-relaxed text-muted-foreground line-clamp-2">
									{description}
								</p>
							)}
							<div className="flex items-baseline justify-center md:justify-start gap-2 pt-1">
								{discounted != null ? (
									<>
										<span className="text-2xl font-bold text-success">
											{toArabicNumber(discounted)} د.ل
										</span>
										<span className="text-sm text-muted-foreground line-through">
											{toArabicNumber(current.price)} د.ل
										</span>
									</>
								) : (
									<span className="text-2xl font-bold text-ember dark:text-saffron">
										{toArabicNumber(current.price)} د.ل
									</span>
								)}
							</div>
						</div>

						{/* Image side — OptimizedImage (mandatory), dramatic shadow */}
						<div className="relative shrink-0 w-40 sm:w-52 md:w-64">
							<div aria-hidden="true" className="absolute inset-0 translate-y-3 scale-95 rounded-3xl bg-gradient-to-b from-orange/25 to-transparent blur-2xl" />
							{current.image ? (
								<OptimizedImage
									src={current.image}
									alt={displayName}
									aspectRatio="square"
									className="relative rounded-3xl border border-border/40 shadow-xl shadow-orange/25 dark:shadow-orange/15"
								/>
							) : (
								<div className="relative flex aspect-square items-center justify-center rounded-3xl border border-border/40 bg-orange-muted text-ember text-4xl font-black">
									{displayName.slice(0, 1)}
								</div>
							)}
						</div>
					</motion.div>
				</AnimatePresence>

				{total > 1 && (
					<>
						{/* Navigation — real buttons ≥44px (round66 Fitts), RTL-correct arrows.
							 Mirrors GalleryCarousel: prev=start edge, next=end edge — in RTL "next"
										 sits on the LEFT and points LEFT (reading direction). */}
						<button
							type="button"
							onClick={goPrev}
							aria-label="الصنف السابق"
							className="absolute start-3 top-1/2 z-20 -translate-y-1/2 flex size-11 items-center justify-center rounded-full border border-border/50 bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-orange/15 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
						>
							<MotionChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={goNext}
							aria-label="الصنف التالي"
							className="absolute end-3 top-1/2 z-20 -translate-y-1/2 flex size-11 items-center justify-center rounded-full border border-border/50 bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-orange/15 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
						>
							<MotionChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
						</button>

						{/* Position dots + live counter for screen readers */}
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
										i === index ? 'w-4 bg-orange' : 'bg-border hover:bg-orange/50'
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
