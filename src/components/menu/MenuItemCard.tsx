'use client';

import { useState, memo } from 'react';
import { DIETARY_LABELS, ALLERGEN_LABELS } from '@/lib/dietary';
import { DietaryIcon } from './dietary-icons';
import { m, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { formatPrice, toArabicNumber } from '@/lib/format';
import type { ModifierGroupProp } from './menu-types';
import { AlertTriangle, Settings2, Sparkles, UtensilsCrossed, Zap } from 'lucide-react';
import { MotionMinus } from '@/components/ui/motion-icons';
import AnimatedStar from '@/components/ui/star-icon';
import { MotionPlus } from '@/components/ui/motion-icons';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

/* ponytail: shared spring config — deduped from 3 inline copies */
const CARD_SPRING = { type: 'spring' as const, stiffness: 500, damping: 25 };
const HOVER_SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 };



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
        /* w3-f1: live modifier groups (server pre-filters to available options;
         * undefined = plain item, no choices — zero rendering cost). */
        modifierGroups?: ModifierGroupProp[];
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
        /* w3-f1: groups with at least one bookable option. A group whose options
         * were all switched unavailable is treated as absent (belt-and-braces —
         * the server serializer already drops those). */
        const liveGroups = item.modifierGroups?.filter((g) => g.options.length > 0) ?? [];
        const hasModifiers = liveGroups.length > 0;
        /* Required choices must be made before the line is orderable — the
         * quick-add path can't capture them, so it defers to the dialog
         * (UpMenu behaviour: same tap, richer step). */
        const needsConfig = hasModifiers && liveGroups.some((g) => g.minSelect > 0);

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

        /* round88-A2: the grid lives in the max-w-4xl (896px) menu container:
         * 1 col below sm / 2 cols 640-1024 / 3 cols ≥1024, and the featured
         * variant spans md:col-span-2 (full row 768-1024, 2 of 3 cols ≥1024).
         * Card ≈ (container − gaps)/cols → 288px at ≥1024, 576px featured.
         * The old generic 100vw/50vw/33vw overfetched ~2× on wide screens and
         * underfetched (blur) every featured card. Eager rows (LCP) above. */
        const imageSizes = isFeatured
                ? '(max-width: 640px) calc(100vw - 32px), (max-width: 768px) calc(50vw - 24px), (max-width: 1024px) calc(100vw - 32px), 576px'
                : '(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 24px), 288px';

        return (
                <m.div
                        /* r97-W6: أُزيل دخول whileInView (initial مخفي كان يُخبز في
                           HTML الثابت فلا يرى البطاقات زائر بلا-JS، وLCP ينتظر
                           الماء، وكان دخولًا مزدوجًا مع animate-reveal على الغلاف).
                           الدخول الآن CSS خالص على غلاف الشبكة — يعمل بلا JS. تبقى
                           نوابض hover/tap التوأمة أدناه. */
                        whileHover={{ y: -3, transition: HOVER_SPRING }}
                        whileTap={{ scale: 0.99, transition: HOVER_SPRING }}
                        className={cn(
                                'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm outline-none transition-[transform,box-shadow,border-color] duration-slower focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2',
                                /* r95: توهج SmartBot §5.1 — accent-foreground بدل orange على الحدود/الظل */
                                'hover:border-accent-foreground/30 hover:shadow-lg hover:shadow-accent-foreground/10',
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
                                <div className="absolute inset-0 transition-transform duration-slower ease-out group-hover:scale-105">
                                        {item.image && !imageError ? (
                                                <OptimizedImage
                                                        src={item.image}
                                                        alt={displayName}
                                                        /* r97-X1: "auto" + size-full — كان aspect-square داخل صندوق
                                                           ٤:٣ أطول منه (يعتمد على القصّ) فيقصّ الصورة مرتين. الآن
                                                           يملأ الصندوق تماماً. rounded-none — الصورة ممتدة حتى حافة
                                                           البطاقة ومقصّ rounded-2xl للبطاقة يعرّف الزوايا (بدل 18px
                                                           داخل 16px = هلال خلفية). */
                                                        aspectRatio="auto"
                                                        className="size-full rounded-none"
                                                        priority={eager}
                                                        sizes={imageSizes}
                                                        skeleton
                                                        /* r95: أيقونة البديل — عائلة اللهب الأسطع بذات العتامة الزخرفية */
                                                        fallback={<span className="text-2xl text-accent-foreground/50"><UtensilsCrossed className="size-6 text-accent-foreground/50" /></span>}
                                                        onError={() => setImageError(true)}
                                                />
                                        ) : (
                                                <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-muted/30 via-orange-muted/10 to-transparent">
                                                        {/* r95: أيقونة البديل — عائلة اللهب الأسطع بذات العتامة الزخرفية */}
                                                        <div className="text-3xl opacity-40"><UtensilsCrossed className="size-6 text-accent-foreground/50" /></div>
                                                </div>
                                        )}
                                </div>

                                {/* Gradient overlay — fades into glass below */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                                {/* Badges — top-start with glass backdrop */}
                                <div className="absolute top-3 start-3 flex flex-col gap-1.5 z-10">
                                        {item.isPopular && (
                                                <m.span
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={CARD_SPRING}
                                                        /* r95: شارة SmartBot — حبة zap بدل النجمة (نفس نمط بطاقات التسعير) */
                                                        className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-3xs font-bold text-primary-foreground"
                                                >
                                                        <Zap className="size-2.5 fill-current" aria-hidden="true" />
                                                        الأكثر طلباً
                                                </m.span>
                                        )}
                                        {item.isNew && !item.isPopular && (
                                                <m.span
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ ...CARD_SPRING, delay: 0.1 }}
                                                        className="rounded-md bg-success px-2 py-1 text-3xs font-bold text-success-foreground"
                                                >
                                                        <Sparkles className="size-2.5 fill-current" />
                                                جديد
                                        </m.span>
                                        )}
                                </div>

                                {/* Discount badge — top-end. round80: unified savings semantic —
                                 * discount/savings = success family (same meaning, same color as
                                 * FeaturedShowcase's discounted price). destructive stays reserved
                                 * for errors/unavailability. */}
                                {hasDiscount && (
                                        <div className="absolute top-3 end-3 z-10 rounded-md bg-success px-2 py-1 text-3xs font-bold text-success-foreground">
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
                                                        'shrink-0 flex items-center gap-1 text-xs font-bold rounded-xl px-2.5 py-2 min-h-[48px] min-w-[48px] border transition-[color,background-color,border-color] duration-base',
                                                        'border-border/60 bg-muted/60 shadow-none',
                                                        hasRating
                                                                ? 'text-ember dark:text-saffron hover:bg-foreground/10 dark:hover:bg-foreground/10'
                                                                : 'text-muted-foreground hover:text-ember dark:hover:text-saffron hover:bg-foreground/10'
                                                )}
                                        >
                                                <AnimatedStar
                                                        // round94 (D/A1): تعبئة النجمة تحاذي لون زر التقييم المحروس (ember فاتح)
                                                        className={cn('size-3', hasRating && 'fill-ember dark:fill-saffron')}
                                                        aria-hidden="true"
                                                />
                                                {hasRating ? toArabicNumber(item.avgRating!.toFixed(1)) : 'قيّم'}
                                        </button>
                                </div>

                                {/* Description */}
                                {displayDesc ? (
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
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
                                                                className="inline-flex items-center gap-1 rounded-full border border-basil/20 bg-basil/10 px-2 py-0.5 text-3xs text-basil"
                                                        >
                                                                {/* r96-W4b: أيقونة lucide SVG بدل الإيموجي (قاعدة SmartBot
                                                                   «لا إيموجي كأيقونات») — مفتاح غير مخطط يسقط على Leaf
                                                                   العام داخل DietaryIcon، بلا إيموجي في أي مسار */}
                                                                <DietaryIcon tag={tag} className="size-3 shrink-0" />
                                                                {DIETARY_LABELS[tag] || tag}
                                                        </span>
                                                ))}
                                                {item.allergens?.map((tag) => (
                                                        <span
                                                                key={tag}
                                                                className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-3xs text-warning"
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
                                                        'text-xl font-bold transition-colors duration-base tabular-nums',
                                                        hasDiscount
                                                                ? 'text-success'
                                                                /* r95: حبر السعر — accent-foreground (#df5a00) 5.42:1 على
                                                                   البطاقة الداكنة بدرجة واحدة AA في الثيمين. */
                                                                // a11y(round84): --primary (#c53c00) is
                                                                // tuned for white-text-on-orange BUTTONS
                                                                // (4.5:1) — as TEXT on dark cards it is
                                                                // 3.89:1. ember (light ~6.5:1) /
                                                                // saffron (dark ~9.8:1) keep the brand
                                                                // hue at AA in both themes.
                                                                : 'text-accent-foreground'
                                                )}
                                        >
                                                {formatPrice(currentPrice, { suffix: '' })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">د.ل</span>
                                        {hasDiscount && (
                                                <span className="text-xs text-muted-foreground line-through decoration-2">
                                                        {formatPrice(item.price)}
                                                </span>
                                        )}
                                        {/* w3-f1: a light «خيارات متاحة» pill signals choices exist without
                                         * loading the card — muted border, no icon, hidden when none. */}
                                        {hasModifiers && (
                                                <span className="inline-flex items-center rounded-full border border-accent-foreground/25 bg-accent-foreground/5 px-2 py-0.5 text-3xs font-medium text-accent-foreground">
                                                        خيارات متاحة
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
                                                className="shrink-0 inline-flex items-center justify-center gap-1 px-3 min-h-[48px] min-w-[48px] rounded-xl border border-accent-foreground/40 bg-accent-foreground/5 text-accent-foreground hover:bg-accent-foreground/10 active:scale-[0.97] active:duration-[var(--t-micro,80ms)] transition-[background-color,transform,color] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                        >
                                                <Settings2 className="size-4" aria-hidden="true" />
                                                <span className="text-xs font-bold">خيارات</span>
                                        </button>
                                        <div className="flex-1">
                                        <AnimatePresence mode="wait">
                                                {cartQty === 0 ? (
                                                        <m.button
                                                                key="cta"
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.9 }}
                                                                transition={CARD_SPRING}
                                                                onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // w3-f1: required choices need the dialog —
                                                                        // a silent add would ship an unconfigured line.
                                                                        needsConfig ? onOrder(item) : onAddToCart(item);
                                                                }}
                                                                aria-label={`إضافة ${displayName} إلى السلة`}
                                                className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-orange px-4 py-3 text-xs font-bold text-orange-foreground shadow-[var(--shadow-card-premium)] transition-[background-color,box-shadow,transform] duration-fast hover:bg-orange/90 hover:shadow-[var(--shadow-card-premium-h)] hover:-translate-y-[2px] active:scale-[0.97] active:duration-[var(--t-micro,80ms)]"
                                                        >
                                                                <MotionPlus className="size-4" />
                                                                أضف
                                                        </m.button>
                                                ) : (
                                                        <m.div
                                                                key="counter"
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.9 }}
                                                                transition={CARD_SPRING}
                                                                className="flex items-center rounded-xl overflow-hidden border border-orange bg-orange shadow-[var(--shadow-card-premium)]"
                                                        >
                                                                <button
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onDecrementCart?.(item);
                                                                        }}
                                                                        aria-label={`إنقاص كمية ${displayName}`}
                                                                        className="flex items-center justify-center size-[48px] text-orange-foreground hover:brightness-110 transition-[color,transform] active:scale-[0.97] active:duration-[var(--t-micro,80ms)]"
                                                                >
                                                                        <MotionMinus className="size-4" />
                                                                </button>
                                                                <span className="flex-1 min-w-[2ch] text-center text-sm font-bold text-orange-foreground bg-orange tabular-nums leading-none py-1.5">
                                                                        {toArabicNumber(cartQty)}
                                                                </span>
                                                                <button
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // w3-f1: + on a needs-config item opens the
                                                                                // dialog too (another configured line).
                                                                                needsConfig ? onOrder(item) : onAddToCart(item);
                                                                        }}
                                                                        aria-label={`زيادة كمية ${displayName}`}
                                                                        className="flex items-center justify-center size-[48px] text-orange-foreground hover:brightness-110 transition-[color,transform] active:scale-[0.97] active:duration-[var(--t-micro,80ms)]"
                                                                >
                                                                        <MotionPlus className="size-4" />
                                                                </button>
                                                        </m.div>
                                                )}
                                        </AnimatePresence>
                                </div>
                        </div>
                </div>
        </m.div>
        );
});

export { MenuItemCard };
