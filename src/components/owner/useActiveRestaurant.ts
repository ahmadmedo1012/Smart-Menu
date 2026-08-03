'use client';

import { useEffect, useState } from 'react';
import { ACTIVE_RESTAURANT_KEY } from '@/components/owner/RestaurantSwitcher';

type ActiveRestaurant = {
	id: number;
	name: string;
	slug: string;
} | null;

/**
 * Unified hook for owner pages: resolves the ACTIVE restaurant
 * (localStorage override → primary from /api/owner/restaurants → /api/auth/me).
 * Pages should pass the returned id as `restaurantId` in API calls.
 */
export function useActiveRestaurant(): {
	activeRestaurant: ActiveRestaurant;
	activeId: number | null;
	loaded: boolean;
} {
	const [activeRestaurant, setActiveRestaurant] = useState<ActiveRestaurant>(null);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function resolve() {
			try {
				// 1. localStorage override
				const stored = Number(localStorage.getItem(ACTIVE_RESTAURANT_KEY));
				// 2. Owner's restaurants list (validates ownership + gives name/slug)
				const res = await fetch('/api/owner/restaurants');
				const json = await res.json();
				const list = (json.data ?? json ?? []) as { id: number; name: string; slug: string; isPrimary: boolean }[];

				if (list.length === 0) {
					if (!cancelled) setLoaded(true);
					return;
				}

				const match = list.find((r) => r.id === stored);
				const active = match ?? list.find((r) => r.isPrimary) ?? list[0];
				if (active && !cancelled) {
					setActiveRestaurant({ id: active.id, name: active.name, slug: active.slug });
					setActiveId(active.id);
					// Persist so the switcher stays in sync
					localStorage.setItem(ACTIVE_RESTAURANT_KEY, String(active.id));
				}
			} catch {
				// Fallback: /api/auth/me primary
				try {
					const meRes = await fetch('/api/auth/me');
					const meJson = await meRes.json();
					const rid = meJson.data?.restaurantId;
					if (rid && !cancelled) {
						setActiveId(rid);
						setActiveRestaurant({ id: rid, name: '', slug: '' });
					}
				} catch {
					/* noop */
				}
			} finally {
				if (!cancelled) setLoaded(true);
			}
		}

		resolve();
		return () => {
			cancelled = true;
		};
	}, []);

	return { activeRestaurant, activeId, loaded };
}
