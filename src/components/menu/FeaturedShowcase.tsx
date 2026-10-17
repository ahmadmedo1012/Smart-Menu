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
 *   ingredient photos), prefers-reduced-motion disables all motion, arrows
 *   >=44px, aria-live counter, axe WCAG baseline must stay at zero (re-measured
 *   round83).
 *   r135-B amendment: the scene is now TAPPABLE when the parent passes onSelect
 *   (opens OrderDialog) + touch-swipe navigation — the old "no CTA" rule
 *   retired by the round135 coordinator (ordering surface on the scene itself).
 *   Reduced-motion users get the same tap; only decorative motion is disabled.
 *
 * Grid below is untouched (plan gate: `git diff MenuItemCard.tsx` empty).
 */

import { useState, useCallback, useMemo, useRef, type CSSProperties, type KeyboardEvent, type TouchEvent } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'motion/react';
import { ShoppingBag, AlertTriangle } from 'lucide-react';
import { MotionChevronLeft, MotionChevronRight } from '@/components/ui/motion-icons';
import SparklesIcon from '@/components/ui/sparkles-icon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { formatPrice, toArabicNumber } from '@/lib/format';
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
        /* r135-B (حزام وسروال): false = الصنف نافذ — المنسّق يرفض فتح نافذة
         * الطلب أصلًا؛ نُخفي نحن أيضًا سطح النقر/شريحة «اضغط للطلب» حتى لا
         * نَعِد بإجراء لا يحدث. غياب الحقل = متاح. */
        isAvailable?: boolean;
};

const MAX_SHOWCASE = 5;
const MAX_BADGES = 3;
/* r135-B: عتبة السحب (48px) + نسبة السيادة الأفقية 1.5× حتى لا يُختطف
   التمرير الرأسي للصفحة داخل المنسق */
const SWIPE_THRESHOLD = 48;
const SWIPE_AXIS_RATIO = 1.5;

/** Featured first (rank 1 first, nulls last), then fall back to grid order.
 * r135-B: أصبحت عامّة (generic) — تحفظ نوع العنصر الكامل الذي يمرّره المنسّق
 * (MenuItemProp & FeaturedItem) فيصل إلى onSelect بنفس النوع بلا توسيع. */
export function rankFeatured<T extends FeaturedItem>(items: readonly T[]): T[] {
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

/* r135-B: البطاقة المميزة كانت معرضًا بصريًا فقط (لا نقر) — خسارة تفاعل.
 * onSelect (اختياري): عند تمريره يصبح المشهد كله قابلاً للنقر/لوحة المفاتيح
 * ويفتح نافذة الطلب مباشرة، مع شريحة «اضغط للطلب» ظاهرة أسفل المشهد +
 * سحب أفقي بالإصبع للتنقل (RTL-aware). عامّية (generic) حتى يصل العنصر
 * إلى المنسّق بنوعه الكامل (MenuItemProp & FeaturedItem). */
export function FeaturedShowcase<T extends FeaturedItem>({
        items,
        onSelect,
}: {
        items: readonly T[];
        /** r135-B: يُستدعى عند نقر/تنشيط المشهد بالعنصر الحالي كاملًا. */
        onSelect?: (item: T) => void;
}) {
        const featured = useMemo(() => rankFeatured(items), [items]);
        const [index, setIndex] = useState(0);
        const [direction, setDirection] = useState(0);
        const reduceMotion = useReducedMotion();
        /* r135-B: حالة السحب — نقطة البداية + علم كبت النقر بعد سحبة فعلية
           (المتصفح يطلق click بعد touchend حتى لو كانت السحبة >48px). */
        const touchStartRef = useRef<{ x: number; y: number } | null>(null);
        const suppressTapRef = useRef(false);

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

        /* r135-B: السحب بالإصبع — مرآة RTL الفيزيائية للحركة: التالي يدخل من
         * اليسار (enterX سالب أدناه) فيُكشف بسحب المحتوى نحو اليمين، والعكس
         * للسابق — نفس اتجاه منتجات RTL الحقيقية (iOS بالعربية). الحد الأدنى
         * 48px أفقيًا مع سيادة 1.5× على الرأسي حتى لا نعطّل تمرير الصفحة. */
        const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
                suppressTapRef.current = false; // إيماءة جديدة — أعِد السماح بالنقر
                const t = e.touches[0];
                if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
        }, []);
        const onTouchEnd = useCallback(
                (e: TouchEvent<HTMLDivElement>) => {
                        const start = touchStartRef.current;
                        touchStartRef.current = null;
                        if (!start || total < 2) return;
                        const t = e.changedTouches[0];
                        if (!t) return;
                        const dx = t.clientX - start.x;
                        const dy = t.clientY - start.y;
                        if (Math.abs(dx) <= SWIPE_THRESHOLD || Math.abs(dx) < SWIPE_AXIS_RATIO * Math.abs(dy)) {
                                return;
                        }
                        // سحبة فعلية — اكبت نقرة المشهد التي يطلقها المتصفح بعدها،
                        // وأعِد تمكين النقر بعد مهلة قصيرة (أجهزة اللمس+الفأرة الهجينة)
                        suppressTapRef.current = true;
                        window.setTimeout(() => {
                                suppressTapRef.current = false;
                        }, 100);
                        if (dx > 0) goNext(); // RTL: سحب يمينًا = التالي
                        else goPrev(); // RTL: سحب يسارًا = السابق
                },
                [goNext, goPrev, total]
        );

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
        /* r135-B: المشهد قابل للطلب فقط حين يمرّر الأب onSelect والصنف متاح —
         * النافذ (isAvailable=false) يبقى معرضًا بلا سطح طلب (المنسّق يرفضه
         * أصلًا؛ لا نَعِد بإجراء لا يحدث). */
        const tappable = Boolean(onSelect) && current.isAvailable !== false;
        /* P20-B1 (availability honesty): a sold-out featured scene kept its full
           cinematic presentation — name, description, price — with the ONLY signal
           being the silently vanished «اضغط للطلب» chip. A customer could not tell
           WHY the hero dish would not order. The scene now says it: a muted
           «غير متوفر حالياً» chip takes the order-chip's exact slot/family (the
           MenuItemCard sold-out badge grammar — neutral muted, never destructive)
           and the text block keeps the taller chip padding so nothing collides.
           Data semantics unchanged: isAvailable is the server's truth. */
        const soldOut = current.isAvailable === false;
        const hasBottomChip = tappable || soldOut;

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
                        /* r125 (11-b): دخول القسم — rise-in (تحويل فقط، مرئي من أول رسم
                           وفق عقيدة r120) يسبق دخول البطاقات المتدرّج تحته. */
                        className="relative mb-6 animate-rise-in"
                        onKeyDown={onKeyDown}
                >
                        <div className="flex items-center justify-center gap-2 mb-3">
                                <SparklesIcon className="size-4 text-ember dark:text-saffron" aria-hidden="true" />
                                <h2 id="featured-showcase-heading" className="text-sm font-bold text-ember dark:text-saffron">
                                        {/* r125 (10-a): tracking-wide حُذفت — قانون مدارك للعناوين العربية
                                            (letter-spacing 0؛ الحارس كان يعطّلها عربيًا أصلًا). */}
                                        أصنافنا المميزة
                                </h2>
                        </div>

                        {/* §2.1 — the SCENE: full parent-container width (breaks the px-4
                                        gutter), 70vh/80vh minimum, bottom-only rounding, and the §2.2
                                        per-item wash that animates on every navigation.
                                        P18-W2-c (fold law): the 70vh mobile minimum is retired — the
                                        QR customer's first «أضف» must be ≤~1.2 viewports deep at
                                        390×844 (measured 2113px before). Mobile scene is now
                                        content-driven (image at 75% width still centered, text
                                        block compact); ≥md keeps the 80vh cinematic stage. */}
                        <div
                                style={sceneVars}
                                onTouchStart={onTouchStart}
                                onTouchEnd={onTouchEnd}
                                className="group/showcase -mx-4 relative flex min-h-0 flex-col overflow-hidden rounded-b-3xl bg-[var(--scene-wash)] transition-colors duration-cinema motion-reduce:transition-none md:min-h-[80vh]"
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
                                        <span className="px-4 text-center text-[clamp(3.5rem,14vw,9.5rem)] font-black leading-[0.95] text-[var(--scene-accent)] opacity-30 transition-colors duration-cinema motion-reduce:transition-none dark:opacity-[0.40]">
                                                {displayName}
                                        </span>
                                </div>

                                {/* r151 (LIVE-AUDIT-SM1 P3-1): ستارة تباين أسفل المشهد —
                                    تدرّج صاعد من الغسيل الصلب يضمن سطحًا مؤكدًا تحت
                                    عنوان/وصف/سعر المشهد (التدقيق الحي: العنوان والوصف
                                    يُقرآن فوق الاسم العملاق والتوهج الزخرفي بلا ضمان
                                    تباين — 1.06-1.51 ضد أبيض). فوق الزخارف (z-auto)
                                    وتحت المحتوى (z-10) والنقاط (z-20) — زخرفة بلا لمس. */}
                                <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-56 md:h-72 bg-gradient-to-t from-[var(--scene-wash)] via-[color-mix(in_oklab,var(--scene-wash)_78%,transparent)] to-transparent"
                                />

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
                                                <div className="relative flex flex-1 items-center justify-center px-4 py-6 md:py-14">
                                                        <div className="relative w-[75%] max-w-[540px] md:w-[55%]">
                                                                <div
                                                                        aria-hidden="true"
                                                                        className="absolute inset-0 scale-90 rounded-3xl blur-3xl"
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
                                                                                /* r138: نفس درس MenuItemCard — priority لا يصدّر
                                                                                   fetchpriority في Next 16؛ التمرير الصريح إلزامي. */
                                                                                fetchPriority={index === 0 ? 'high' : undefined}
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
                                                                                        'absolute z-20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-2xs font-bold backdrop-blur-sm',
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
                                                        (reference "bottom info area"; no CTA, plan §2.4).
                                                        r135-B: عند قابلية النقر نرفع الحاشية السفلية
                                                        ليخلُ شريط «اضغط للطلب» (bottom-12) للنقاط
                                                        والشريحة معًا بلا تصادم. */}
                                                <div
                                                        className={cn(
                                                                'relative z-10 mx-auto w-full max-w-2xl px-4 pt-1 text-center',
                                                                hasBottomChip ? 'pb-16 md:pb-28' : 'pb-10 md:pb-20'
                                                        )}
                                                >
                                                        <h3 className="text-2xl font-bold text-foreground md:text-5xl">{displayName}</h3>
                                                        {description && (
                                                                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-foreground/75 line-clamp-2 md:text-base">
                                                                        {description}
                                                                </p>
                                                        )}
                                                        <div className="mt-4 flex items-baseline justify-center gap-2">
                                                                {/* r97-X1 → r120: formatPrice الذكي — أعداد صحيحة بلا «.0»
                                                                   وكسور حقيقية بمنزلتين، مطابق لتكوين بطاقات الشبكة. */}
                                                                {discounted != null ? (
                                                                        <>
                                                                                {/* r138 (P1-1): حبر السعر المخفّض في الفاتح —
                                                                                   success-ink 7.8-8.0:1 على غسيلات المشهد
                                                                                   (كان success 2.48-2.54:1)؛ والداكن كما هو. */}
                                                                                <span className="text-2xl font-bold text-success-ink tabular-nums md:text-3xl">
                                                                                        {formatPrice(discounted)}
                                                                                </span>
                                                                                {/* r138 (P2): المشطوب /70 بدل /60 — كان
                                                                                   4.31:1 (تحت 4.5) والآن 5.9-6.0:1. */}
                                                                                <span className="text-sm text-foreground/70 line-through tabular-nums md:text-base">
                                                                                        {formatPrice(current.price)}
                                                                                </span>
                                                                        </>
                                                                ) : (
                                                                        <span className="text-2xl font-bold text-[var(--scene-accent)] tabular-nums md:text-3xl">
                                                                                {formatPrice(current.price)}
                                                                        </span>
                                                                )}
                                                        </div>
                                                </div>
                                        </m.div>
                                </AnimatePresence>

                                {/* r135-B: سطح النقر — زر شفاف يغطي المشهد كله (تحت
                                        الأسهم/النقاط z-20 فيبقى التنقل متاحًا). الاسم المتاح
                                        الكامل + السعر في aria-label، والنقرة تُكبت بعد سحبة
                                        فعلية (suppressTapRef) حتى لا يفتح السحبُ نافذةَ الطلب.
                                        Enter/Space يعملان أصلاً عبر الزر نفسه. */}
                                {tappable && onSelect && (
                                        <button
                                                type="button"
                                                onClick={() => {
                                                        if (!suppressTapRef.current) onSelect(current);
                                                }}
                                                aria-label={`اطلب ${displayName} الآن — ${formatPrice(discounted ?? current.price)}`}
                                                /* r133: التركيز = المخطط العام الواحد (:focus-visible
                                                   في globals.css) — بلا ring إضافي */
                                                className="absolute inset-0 z-10 cursor-pointer"
                                        >
                                                {/* شريحة النداء — أسفل المشهد بزاوية منطقية (end)،
                                                        ≥44px هدفاً (min-h-11)، فوق شريط النقاط (bottom-12)
                                                        وبنمط أسهم المشهد الزجاجي نفسه */}
                                                <span
                                                        className={cn(
                                                                'absolute bottom-3 end-4 md:bottom-12 inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold backdrop-blur-sm transition-colors duration-base',
                                                                'border-[color-mix(in_oklab,var(--scene-accent)_50%,transparent)]',
                                                                'bg-[color-mix(in_oklab,var(--scene-wash)_88%,var(--background))] text-[var(--scene-accent)]',
                                                                'hover:bg-[var(--scene-accent)]/15'
                                                        )}
                                                >
                                                        <ShoppingBag className="size-4" aria-hidden="true" />
                                                        اضغط للطلب
                                                </span>
                                        </button>
                                )}

                                {/* P20-B1: the sold-out voice in the order-chip slot — same
                                        position, same 44px floor, the muted non-interactive family.
                                        A span (not a button): the state is information, not an action. */}
                                {soldOut && (
                                        <span
                                                className={cn(
                                                        'absolute bottom-3 end-4 md:bottom-12 inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold backdrop-blur-sm',
                                                        'border-border/60 bg-muted/85 text-muted-foreground'
                                                )}
                                        >
                                                <AlertTriangle className="size-4" aria-hidden="true" />
                                                غير متوفر حالياً
                                        </span>
                                )}

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

                                                {/* Position dots (active = scene accent) + live counter.
                                                        r110-F5: the dots were aria-hidden + tabIndex=-1 — screen
                                                        readers only had the sr-only counter and the arrows. But a
                                                        dot is a real jump-to-item control for pointer users, and
                                                        automated a11y audits flagged 5 unnamed buttons. They are
                                                        now first-class named controls: each carries the item's
                                                        name + position, keyboard focusable, aria-current on the
                                                        active one (the sr-only live counter above stays). */}
                                                <div className="absolute bottom-0.5 md:bottom-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-0.5">
                                                        {featured.map((f, i) => (
                                                                // r151 (LIVE-AUDIT-SM1 P2-2): the button box is now
                                                                // 44×44 (fleet touch canon — was the r115-F121 24×24
                                                                // box, measured short on the live audit). Symmetric
                                                                // -mx-2.5 keeps the 26px visual pitch identical and
                                                                // the inner span stays the small scene dot.
                                                                <button
                                                                        key={f.id}
                                                                        type="button"
                                                                        aria-label={`الانتقال إلى ${toArabicNumber(i + 1)}: ${f.nameAr?.trim() ? f.nameAr : f.name}`}
                                                                        aria-current={i === index ? 'true' : undefined}
                                                                        onClick={() => {
                                                                                setDirection(i > index ? 1 : -1);
                                                                                setIndex(i);
                                                                        }}
                                                                        className="flex size-11 -mx-2.5 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_oklab,var(--scene-accent)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--scene-accent)] focus-visible:ring-offset-2"
                                                                >
                                                                        <span
                                                                                className={cn(
                                                                                        /* r128-F5 (§1.5): transition-all → خصائص محدّدة */
                                                                                        'block size-2 rounded-full transition-[width,background-color]',
                                                                                        i === index ? 'w-4 bg-[var(--scene-accent)]' : 'bg-[color-mix(in_oklab,var(--scene-accent)_35%,transparent)] hover:bg-[var(--scene-accent)]/60'
                                                                                )}
                                                                        />
                                                                </button>
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
