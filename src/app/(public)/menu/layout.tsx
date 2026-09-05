import { CartGate } from '@/components/menu/CartGate';

// round87-B4: server layout (was 'use client' solely to host CartSlideOver).
// The interactive cart now mounts through CartGate — a tiny client island that
// dynamically imports the Sheet only after the first add-to-cart.
export default function MenuLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-dvh">
			{children}
			<CartGate />
		</div>
	);
}
