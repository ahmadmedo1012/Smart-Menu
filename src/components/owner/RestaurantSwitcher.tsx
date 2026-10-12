'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {ChevronsUpDown, Store} from 'lucide-react';
import { MotionPlus } from '@/components/ui/motion-icons';
import { MotionCheck } from '@/components/ui/motion-icons';
import { cn } from '@/lib/utils';

export const ACTIVE_RESTAURANT_KEY = 'smartmenu_active_restaurant';

type RestaurantInfo = {
	id: number;
	name: string;
	slug: string;
	isPrimary: boolean;
	_count?: { categories: number; orders: number };
};

export function RestaurantSwitcher() {
	const router = useRouter();
	const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([]);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [open, setOpen] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await fetch('/api/owner/restaurants');
			const json = await res.json();
			// Array.isArray guard: a 401 error body is an object — assigning it
			// crashed render with "restaurants.find is not a function" and the
			// error boundary blocked the post-logout redirect to /login.
			const list: RestaurantInfo[] = Array.isArray(json.data) ? json.data : [];
			setRestaurants(list);
			// Resolve active: localStorage override, else primary, else first
			const stored = Number(localStorage.getItem(ACTIVE_RESTAURANT_KEY));
			const valid = list.find((r) => r.id === stored);
			const active = valid ?? list.find((r) => r.isPrimary) ?? list[0] ?? null;
			if (active) {
				setActiveId(active.id);
				localStorage.setItem(ACTIVE_RESTAURANT_KEY, String(active.id));
			}
		} catch {
			/* transient */
		} finally {
			setLoaded(true);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const active = restaurants.find((r) => r.id === activeId) ?? null;

	const switchTo = (id: number) => {
		setActiveId(id);
		localStorage.setItem(ACTIVE_RESTAURANT_KEY, String(id));
		// Notify pages (orders/dashboard/qr) that the active restaurant changed —
		// they re-resolve via useActiveRestaurant and refetch their data.
		window.dispatchEvent(new Event('smartmenu:restaurant-change'));
		setOpen(false);
		router.refresh();
	};

	if (!loaded) return null;
	if (restaurants.length === 0) return null;

	return (
		<div className="relative z-20 px-3 pt-2">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-start transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
				aria-expanded={open}
			>
				<Store className="size-4 shrink-0 text-primary" />
				<span className="flex-1 truncate text-sm font-medium">
					{active?.name ?? 'اختر المنيو'}
				</span>
				<ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
			</button>

			{open && (
				<div className="absolute z-30 mt-1 w-[calc(100%-24px)] overflow-hidden rounded-lg border border-border/70 bg-popover shadow-lg">
					{restaurants.map((r) => (
						<button
							key={r.id}
							type="button"
							onClick={() => switchTo(r.id)}
							className={cn(
								'flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
								r.id === activeId && 'bg-accent/40'
							)}
						>
							<span className="flex-1 truncate">{r.name}</span>
							{/* r148 (CROSS R2): شارة «الأساسي» كانت text-primary — 11px تحت سقف
							   AA للنص الصغير في الفاتح مع النحاس؛ الداكن نفس الذهب حرفيًا. */}
							{r.isPrimary && (
								<span className="text-3xs bg-primary/10 text-accent-foreground px-1.5 py-0.5 rounded-full shrink-0">
									الأساسي
								</span>
							)}
							{r.id === activeId && <MotionCheck className="size-3.5 text-primary shrink-0" />}
						</button>
					))}
					<div className="border-t border-border/20 p-1">
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								router.push('/owner/restaurants');
							}}
							className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-accent-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
						>
							<MotionPlus className="size-3.5" /> إدارة المنيوهات
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
