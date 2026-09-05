'use client';

import dynamic from 'next/dynamic';
import { useCart } from '@/store/cart';

/**
 * round87-B4: the cart Sheet (CartSlideOver + its @base-ui dialog tree,
 * ~15.6KB gz) used to be statically imported by menu/layout.tsx — it shipped
 * on EVERY QR menu page even though it renders null until the customer adds
 * a first item. This gate loads the component only once the cart is
 * non-empty; until then the QR critical path carries none of it.
 */
const CartSlideOver = dynamic(
	() => import('@/components/menu/CartSlideOver').then((m) => m.CartSlideOver),
	{ ssr: false }
);

export function CartGate() {
	const hasItems = useCart((s) => s.totalItems() > 0);
	if (!hasItems) return null;
	return <CartSlideOver />;
}
