'use client';
import { useEffect } from 'react';
import { useCart } from '@/store/cart';

export function CartHydrator() {
	useEffect(() => {
		// Round-76 (cart agent): don't clobber in-memory state (user quick-added
		// an item during mount/hydration) with a stale/empty localStorage snapshot.
		const current = useCart.getState();
		if (current.items.length === 0) {
			useCart.persist.rehydrate();
		}
		// Cross-tab sync: another tab updating the cart should rehydrate this one.
		const onStorage = (e: StorageEvent) => {
			if (e.key === 'cart-storage' && e.newValue) {
				useCart.persist.rehydrate();
			}
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);
	return null;
}
