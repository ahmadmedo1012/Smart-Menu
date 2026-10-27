import { CartGate } from '@/components/menu/CartGate';
import { MotionProvider } from '@/components/shared/MotionProvider';

// round87-B4: server layout (was 'use client' solely to host CartSlideOver).
// The interactive cart now mounts through CartGate — a tiny client island that
// dynamically imports the Sheet only after the first add-to-cart.
//
// P27-C2 fix (the CI-caught regression): MotionProvider lives HERE now — the
// menu experience family (StickyMenuHeader, CategoryTabs + its LayoutMotion
// active pill, MenuItemCard, ReviewSheet, CartSlideOver via CartGate,
// LoyaltyWidget, the m.* icon family) are LazyMotion m.* consumers; when the
// provider retired from the (public) root layout (the landing's chunk-graph
// diet) their enter animations died — ReviewSheet stayed translated off-screen
// and the round87 E2E review journey timed out on «4 من 5 نجوم» (element
// outside of the viewport, 3×1.5m retries). The provider now mounts at every
// public route segment that actually consumes m.*: menu (this file), pricing,
// privacy, terms — the landing/not-found/[...notfound] segments stay
// motion-free (the CSS twins carry their animation), so the ~45KB motion
// engine still never loads on the landing page.
export default function MenuLayout({ children }: { children: React.ReactNode }) {
	return (
		<MotionProvider>
			<div className="min-h-dvh">
				{children}
				<CartGate />
			</div>
		</MotionProvider>
	);
}
