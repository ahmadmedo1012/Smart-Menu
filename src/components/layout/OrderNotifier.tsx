'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {} from 'lucide-react';
import AnimatedCart from '@/components/ui/shopping-cart-icon';;

/** Play a gentle notification chime using Web Audio API */
function playOrderSound() {
	try {
		const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
		[523.25, 659.25, 783.99].forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.type = 'sine';
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
			osc.start(ctx.currentTime + i * 0.12);
			osc.stop(ctx.currentTime + i * 0.12 + 0.3);
		});
	} catch {}
}

function showOrderToast(newOrders: number) {
	playOrderSound();
	toast(
		<div className="flex items-center gap-3" role="status" aria-live="polite">
			<div className="size-10 rounded-full bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center">
				<AnimatedCart className="size-5 text-white" />
			</div>
			<div>
				<p className="font-bold text-sm">طلب جديد!</p>
				<p className="text-xs text-muted-foreground">لديك {newOrders} طلب جديد</p>
			</div>
		</div>,
		{ duration: 5000, position: 'top-center' }
	);
}

export function useOrderNotifier(restaurantId?: number) {
	const hasNotified = useRef(false);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
	const lastOrderCountRef = useRef(0);

	// ponytail: client polling — Vercel kills SSE streams at 300s.
	useEffect(() => {
		if (!restaurantId) return;

		const poll = async () => {
			try {
				const res = await fetch(`/api/orders?status=new&restaurantId=${restaurantId}`);
				if (!res.ok) return;
				const json = await res.json();
				const count = Array.isArray(json) ? json.length : (json?.data?.length ?? 0);
				if (count > lastOrderCountRef.current && !hasNotified.current) {
					showOrderToast(count - lastOrderCountRef.current);
					hasNotified.current = true;
					setTimeout(() => {
						hasNotified.current = false;
					}, 30000);
				}
				lastOrderCountRef.current = count;
			} catch {
				/* poll failed */
			}
		};
		poll();
		pollIntervalRef.current = setInterval(poll, 5000);

		return () => {
			if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
		};
	}, [restaurantId]);
}
