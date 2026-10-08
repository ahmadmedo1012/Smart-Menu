'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import AnimatedCart from '@/components/ui/shopping-cart-icon';
import { MotionPlus } from '@/components/ui/motion-icons';

interface CartEmptyStateProps {
	restaurantId: number;
	restaurantSlug: string | null;
	restaurantName: string;
}

/** Empty-cart view — verbatim extraction from the cart page (round89-G1).
 *
 * r131 (A2 P2-8 + A9 §2): the hand-rolled 64px orange-gradient tile is
 * retired — the shared EmptyState primitive (F4 owns its internals; fleet
 * ruling: 56px grey family well / 18-600 title / 13-42ch description) is
 * the single empty-state grammar. */
export function CartEmptyState({ restaurantId, restaurantSlug, restaurantName }: CartEmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center animate-fade-in">
			<EmptyState
				icon={ShoppingCart}
				title="السلة فارغة"
				description="أضف بعض الأصناف إلى السلة"
				className="py-8"
				action={
					<div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
						{/* r97-X1: العودة الأساسية توجّه لمنيو المطعم نفسه عندما يُعرف
							الـ slug (كانت /menu العامة — دليل كل المطاعم). الاحتياط يبقى
							الدليل عندما لا يُعرف المطعم. */}
						<Link href={restaurantSlug ? `/menu/${restaurantSlug}` : '/menu'}>
							<Button size="lg" className="px-8 gap-2">
								{/* r121 (J-2): سهم «العودة إلى القائمة» كان
									MotionArrowLeft — في RTL سهم العودة يشير
									يميناً (اتفاقية print/page.tsx:150). */}
								<MotionArrowRight className="size-4" />
								العودة إلى القائمة
							</Button>
						</Link>
						{/* Secondary CTA — دليل منيو المطاعم العام */}
						<Link href="/menu">
							<Button size="lg" variant="outline" className="px-8 gap-2">
								<AnimatedCart className="size-4" />
								تصفح المنيو
							</Button>
						</Link>
					</div>
				}
			/>
			{/* Back-to-menu shortcut for empty carts — honest label, correct
				restaurant. Rendered only once we know the real slug. */}
			{restaurantId && restaurantSlug ? (
				<div className="mt-6 w-full max-w-md">
					<Link
						href={`/menu/${restaurantSlug}`}
						className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/70 px-4 py-2.5 text-sm font-arabic shadow-sm hover:border-orange/40 hover:bg-orange-muted/30 hover:shadow-md transition-[color,background-color,border-color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
					>
						<MotionPlus className="size-3.5 text-orange" />
						متابعة التسوق من {restaurantName || 'قائمة المطعم'}
					</Link>
				</div>
			) : null}
		</div>
	);
}
