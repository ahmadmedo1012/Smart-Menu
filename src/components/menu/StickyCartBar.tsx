'use client';
import Link from 'next/link';
import { ShoppingCartIcon } from 'lucide-react';

import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Arabic count label following project digit convention (Western digits only,
 * per lib/format.ts — never Arabic-Indic numerals).
 */
function cartCountLabel(count: number): string {
	if (count === 1) return 'صنف واحد في السلة';
	if (count === 2) return 'صنفان في السلة';
	if (count <= 10) return `${count} أصناف في السلة`;
	return `${count} صنفاً في السلة`;
}

type StickyCartBarProps = {
	/** Override the store-derived item count (tests / non-menu contexts). */
	itemCount?: number;
	/** Override the store-derived subtotal. */
	total?: number;
	/** CTA destination. Defaults to /cart. Ignored when onCta is provided. */
	href?: string;
	/** Click handler instead of navigation (e.g. opens CartSlideOver). */
	onCta?: () => void;
	/** CTA label. */
	label?: string;
	className?: string;
};

/**
 * Mobile sticky cart bar. Hidden (off-canvas + inert) while the cart is empty.
 * By default reads item count and subtotal straight from the zustand cart
 * store (same selectors as CartSlideOver); itemCount/total props override for
 * testing or contexts outside the menu flow.
 *
 * Mount inside the root of any page with cart actions — Phase 3 integration.
 */
function StickyCartBar({
	itemCount,
	total,
	href = '/cart',
	onCta,
	label = 'عرض السلة',
	className,
}: StickyCartBarProps) {
	const storeCount = useCart((s) => s.totalItems());
	const storeSubtotal = useCart((s) => s.subtotal());

	const count = itemCount ?? storeCount;
	const amount = total ?? storeSubtotal;
	const isVisible = count > 0;

	return (
		<div
			data-slot="sticky-cart-bar"
			aria-hidden={!isVisible}
			inert={!isVisible}
			className={cn(
				'fixed inset-x-0 bottom-0 z-30',
				'transition-[transform,translate,scale,rotate,opacity] duration-300 ease-out motion-reduce:transition-none',
				isVisible
					? 'translate-y-0 opacity-100'
					: 'pointer-events-none translate-y-full opacity-0',
				className
			)}
		>
			<div
				style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
				className="border-t border-border/60 bg-popover/95 shadow-lg shadow-black/10 backdrop-blur-md"
			>
				<div className="mx-auto flex max-w-xl items-center gap-3 p-3">
					<div className="flex flex-1 items-center gap-2">
						<ShoppingCartIcon aria-hidden className="size-5 shrink-0 text-orange" />
						<div className="flex min-w-0 flex-col leading-tight">
							<span aria-live="polite" className="truncate text-xs font-bold text-foreground">
								{cartCountLabel(count)}
							</span>
							<span className="text-xs text-muted-foreground">{formatPrice(amount)}</span>
						</div>
					</div>
					{onCta ? (
						<button
							type="button"
							onClick={onCta}
							tabIndex={isVisible ? 0 : -1}
							className="inline-flex min-h-11 items-center justify-center rounded-md border-0 bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))] px-5 text-sm font-bold whitespace-nowrap text-flame-ink shadow-lg shadow-orange/25 transition-[filter,transform,translate,scale,rotate] hover:brightness-110 active:scale-[0.97]"
						>
							{label}
						</button>
					) : (
						<Link
							href={href}
							tabIndex={isVisible ? undefined : -1}
							className="inline-flex min-h-11 items-center justify-center rounded-md border-0 bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))] px-5 text-sm font-bold whitespace-nowrap text-flame-ink shadow-lg shadow-orange/25 transition-[filter,transform,translate,scale,rotate] hover:brightness-110 active:scale-[0.97]"
						>
							{label}
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}

export { StickyCartBar };
