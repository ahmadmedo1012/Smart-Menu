'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { AlertTriangle, Settings2, Sparkles, UtensilsCrossed } from 'lucide-react';
import { MotionMinus } from '@/components/ui/motion-icons';
import AnimatedStar from '@/components/ui/star-icon';
import { MotionPlus } from '@/components/ui/motion-icons';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

/* ponytail: shared spring config — deduped from 3 inline copies */
const CARD_SPRING = { type: 'spring' as const, stiffness: 500, damping: 25 };
const HOVER_SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 };

const DIETARY_ICONS: Record<string, string> = {
	vegetarian: '🌿',
	vegan: '🌱',
	gluten_free: '🌾',
	dairy_free: '🧀',
	halal: '☪️',
	keto: '🥑',
	sugar_free: '🚫',
	organic: '🌍',
	spicy: '🌶️',
	sugarconscious: '🍃',
};

// Arabic labels for dietary/allergen badges shown to CUSTOMERS
const DIETARY_LABELS: Record<string, string> = {
	vegetarian: 'نباتي',
	vegan: 'نباتي صرف',
	gluten_free: 'خالٍ من الغلوتين',
	dairy_free: 'خالٍ من الألبان',
	halal: 'حلال',
	keto: 'كيتو',
	sugar_free: 'بدون سكر',
	organic: 'عضوي',
	spicy: 'حار',
	sugarconscious: 'سكر معتدل',
};
const ALLERGEN_LABELS: Record<string, string> = {
	gluten: 'غلوتين',
	dairy: 'ألبان',
	eggs: 'بيض',
	fish: 'سمك',
	shellfish: 'قشريات',
	tree_nuts: 'مكسرات',
	peanuts: 'فول سوداني',
	soy: 'صويا',
	sesame: 'سمسم',
};

export type MenuItemProp = {
	id: number;
	name: string;
	nameAr: string | null;
	description: string;
	descriptionAr: string;
	price: number;
	discountedPrice: number | null;
	image: string;
	categoryId: number;
	isPopular?: boolean;
	isNew?: boolean;
	createdAt?: string;
	avgRating?: number | null;
	ratingCount?: number;
	dietaryTags?: string[];
	allergens?: string[];
};

const MenuItemCard = memo(function MenuItemCard({
	item,
	onOrder,
	onAddToCart,
	onDecrementCart,
	onReview,
	cartQty = 0,
	variant,
	eager = false,
}: {
	item: MenuItemProp;
	onOrder: (item: MenuItemProp) => void;
	onAddToCart: (item: MenuItemProp) => void;
	onDecrementCart?: (item: MenuItemProp) => void;
	/** Open the shared ReviewSheet (owned by MenuPageClient) for this item */
	onReview?: (item: MenuItemProp) => void;
	cartQty?: number;
	variant?: 'default' | 'featured';
	/* LCP: eager=true → loading="eager" + fetchPriority="high" for above-the-fold images */
	eager?: boolean;
}) {
	const displayName = item.nameAr || item.name;
	const displayDesc = item.descriptionAr || item.description;
	const currentPrice = item.discountedPrice ?? item.price;
	const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;
	const hasRating = item.avgRating != null && item.ratingCount != null && item.ratingCount > 0;
	const [imageError, setImageError] = useState(false);

	/**
	 * Card-level activation (Enter/Space) opens the order dialog — but only when
	 * the event did not originate from an interactive child (buttons handle
	 * themselves and stopPropagation). Without this guard, Space pressed on a
	 * focused "أضف" button would bubble up and double-fire onOrder.
	 */
	const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		const target = e.target as HTMLElement;
		if (target.closest('button, a[href], input, textarea, select')) return;
		e.preventDefault();
		onOrder(item);
	};

	const isFeatured = variant === 'featured';

	return (
		<motion.div
			initial={{ opacity: 0, y: 24 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-60px' }}
			transition={{ type: 'spring', stiffness: 320, damping: 28 }}
			whileHover={{ y: -3, transition: HOVER_SPRING }}
			whileTap={{ scale: 0.99, transition: HOVER_SPRING }}
			className={cn(
				'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm outline-none transition-[transform,box-shadow,border-color] duration-300 focus-visible:ring-2 focus-visible:ring-orange/60 focus-visible:ring-offset-2',
				'hover:border-orange/40 hover:shadow-lg hover:shadow-orange/10',
				isFeatured && 'md:col-span-2'
			)}
			tabIndex={0}
			onClick={() => onOrder(item)}
			onKeyDown={handleCardKeyDown}
			// a11y: the card is a keyboard-operable shortcut to the order dialog
			// (tabIndex + Enter/Space). No role="button" — a button role wrapping
			// real buttons would fail axe nested-interactive; the visible "خيارات"
			// and "أضف" buttons remain the primary, fully-labelled controls and
			// stopPropagation keeps card activation from double-firing.
		>
			{/* Image — aspect-4/3 with zoom */}
			<div className="relative w-full aspect-[4/3] overflow-hidden">
				<div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
					{item.image && !imageError ? (
						<OptimizedImage
							src={item.image}
							alt={displayName}
							aspectRatio="square"
							priority={eager}
							skeleton
							fallback={<span className="text-2xl text-orange/40"><UtensilsCrossed className="size-6 text-orange/40" /></span>}
							onError={() => setImageError(true)}
						/>
					) : (
						<div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/30 via-orange-muted/10 to-transparent">
							<div className="text-3xl opacity-40"><UtensilsCrossed className="size-6 text-orange/40" /></div>
						</div>
					)}
				</div>

				{/* Gradient overlay — fades into glass below */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

				{/* Badges — top-start with glass backdrop */}
				<div className="absolute top-3 start-3 flex flex-col gap-1.5 z-10">
					{item.isPopular && (
						<motion.span
							initial={{ scale: 0, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={CARD_SPRING}
							className="flex items-center gap-1 rounded-md bg-orange px-2 py-1 text-[10px] font-bold text-orange-foreground"
						>
							<AnimatedStar className="size-2.5 fill-current" />
							الأكثر طلباً
						</motion.span>
					)}
					{item.isNew && !item.isPopular && (
						<motion.span
							initial={{ scale: 0, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ ...CARD_SPRING, delay: 0.1 }}
							className="rounded-md bg-success px-2 py-1 text-[10px] font-bold text-success-foreground"
						>
							<Sparkles className="size-2.5 fill-current" />
						جديد
					</motion.span>
					)}
				</div>

				{/* Discount badge — top-end. round80: unified savings semantic —
				 * discount/savings = success family (same meaning, same color as
				 * FeaturedShowcase's discounted price). destructive stays reserved
				 * for errors/unavailability. */}
				{hasDiscount && (
					<div className="absolute top-3 end-3 z-10 rounded-md bg-success px-2 py-1 text-[10px] font-bold text-success-foreground">
						-{toArabicNumber(Math.round((1 - item.discountedPrice! / item.price) * 100))}%
					</div>
				)}
			</div>

			{/* Content area */}
			<div className="relative z-10 p-4 flex flex-col gap-2">
				{/* Name (h2: page outline is h1 restaurant → h2 items) + Rating glass-pill */}
				<div className="flex items-start justify-between gap-2">
					<h2 className="font-bold text-lg leading-[1.4] line-clamp-1">{displayName}</h2>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onReview?.(item);
						}}
						aria-label={`تقييم ${displayName}`}
						className={cn(
							'shrink-0 flex items-center gap-1 text-xs font-bold rounded-xl px-2.5 py-2 min-h-[48px] min-w-[48px] border transition-[color,background-color,border-color] duration-300',
							'border-border/60 bg-muted/60 shadow-none',
							hasRating
								? 'text-ember dark:text-saffron hover:bg-white/30 dark:hover:bg-white/20'
								: 'text-muted-foreground hover:text-ember dark:hover:text-saffron hover:bg-white/20'
						)}
					>
						<AnimatedStar
							className={cn('size-3', hasRating && 'fill-saffron')}
							aria-hidden="true"
						/>
						{hasRating ? toArabicNumber(item.avgRating!.toFixed(1)) : 'قيّم'}
					</button>
				</div>

				{/* Description */}
				{displayDesc ? (
					<p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
						{displayDesc}
					</p>
				) : null}

				{/* Dietary tags + allergens — glass pills */}
				{((item.dietaryTags && item.dietaryTags.length > 0) ||
					(item.allergens && item.allergens.length > 0)) && (
					<div className="flex flex-wrap gap-1.5">
						{item.dietaryTags?.map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center gap-1 rounded-full border border-basil/20 bg-basil/10 px-2 py-0.5 text-[10px] text-basil"
							>
								{DIETARY_ICONS[tag] || '🌿'} {DIETARY_LABELS[tag] || tag}
							</span>
						))}
						{item.allergens?.map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] text-warning"
							>
								<AlertTriangle className="size-3 text-warning" /> {ALLERGEN_LABELS[tag] || tag}
							</span>
						))}
					</div>
				)}

				{/* Price row — round80: discounted price carries the unified savings
				 * semantic (text-success, identical to FeaturedShowcase); full price
				 * keeps the brand primary ink with the warm hover. */}
				<div className="flex items-center gap-2 flex-wrap">
					<span
						className={cn(
							'text-xl font-bold transition-colors duration-300 tabular-nums',
							hasDiscount
								? 'text-success'
								: 'text-primary group-hover:text-[var(--c-ember)]'
						)}
					>
						{toArabicNumber(currentPrice.toFixed(1))}
					</span>
					<span className="text-xs text-muted-foreground">د.ل</span>
					{hasDiscount && (
						<span className="text-xs text-muted-foreground/60 line-through decoration-2">
							{toArabicNumber(item.price.toFixed(1))} د.ل
						</span>
					)}
				</div>

				{/* Options + Animated CTA / Quantity counter row */}
				<div className="flex items-stretch gap-2 w-full">
					{/* a11y (WCAG 2.1.1): the card's onClick is mouse-only — this visible,
						keyboard-reachable button is the primary path to OrderDialog. */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onOrder(item);
						}}
						aria-label={`خيارات ${displayName}`}
						className="shrink-0 inline-flex items-center justify-center gap-1 px-3 min-h-[48px] min-w-[48px] rounded-xl border border-orange/40 bg-orange/5 text-orange dark:text-orange hover:bg-orange/10 active:scale-95 transition-[background-color,transform,translate,scale,rotate,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
					>
						<Settings2 className="size-4" aria-hidden="true" />
						<span className="text-xs font-bold">خيارات</span>
					</button>
					<div className="flex-1">
					<AnimatePresence mode="wait">
						{cartQty === 0 ? (
							<motion.button
								key="cta"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={CARD_SPRING}
								onClick={(e) => {
									e.stopPropagation();
									onAddToCart(item);
								}}
								aria-label={`إضافة ${displayName} إلى السلة`}
						className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-orange px-4 py-3 text-xs font-bold text-orange-foreground shadow-sm shadow-orange/20 transition-[background-color,box-shadow] duration-200 hover:bg-orange/90 hover:shadow-md hover:shadow-orange/30 active:scale-[0.99]"
							>
								<MotionPlus className="size-4" />
								أضف
							</motion.button>
						) : (
							<motion.div
								key="counter"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={CARD_SPRING}
								className="flex items-center rounded-xl overflow-hidden border border-orange bg-orange shadow-lg"
							>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDecrementCart?.(item);
									}}
									aria-label={`إنقاص كمية ${displayName}`}
									className="flex items-center justify-center size-[48px] text-white hover:brightness-110 transition-colors active:brightness-90"
								>
									<MotionMinus className="size-4" />
								</button>
								<span className="flex-1 min-w-[2ch] text-center text-sm font-bold text-white bg-orange tabular-nums leading-none py-1.5">
									{toArabicNumber(cartQty)}
								</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onAddToCart(item);
									}}
									aria-label={`زيادة كمية ${displayName}`}
									className="flex items-center justify-center size-[48px] text-white hover:brightness-110 transition-colors active:brightness-90"
								>
									<MotionPlus className="size-4" />
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	</motion.div>
	);
});

export { MenuItemCard };
