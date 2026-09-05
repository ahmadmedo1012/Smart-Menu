'use client';

import { playBeep } from '@/lib/chime';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toArabicNumber } from '@/lib/format';
import { premiumToast } from '@/lib/premium-toast';
import { cn } from '@/lib/utils';

interface NewOrdersBarProps {
	/** Callback to refresh the full orders list after bulk advance. */
	onOrdersRefresh: () => void;
	/** Current visible new orders — the bar appears when this grows. */
	newOrderIds: number[];
	/** Optimistic status map so the bar hides if all new orders are already in-flight. */
	pendingStatus: Record<number, string>;
	/** Advance a single order to 'preparing'. Returns after the API call. */
	updateStatus: (orderId: number, newStatus: string) => Promise<void>;
}

export function NewOrdersBar({
	newOrderIds,
	pendingStatus,
	onOrdersRefresh,
	updateStatus,
}: NewOrdersBarProps) {
	const [accepting, setAccepting] = useState(false);
	const hasPlayedSound = useRef(false);

	const newCount = newOrderIds.length;
	// Only show bar for truly new orders that aren't being moved by the user yet
	const visible =
		newCount > 0 &&
		!Object.values(pendingStatus).includes('preparing') &&
		!Object.values(pendingStatus).includes('ready');

	// Play one audible alert on first new order arrival
	useEffect(() => {
		if (newCount === 0) {
			hasPlayedSound.current = false;
			return;
		}
		if (hasPlayedSound.current) return;
		hasPlayedSound.current = true;
		// round86-C3: shared chime (was a local copy)
		playBeep(880, 0.18);
		setTimeout(() => playBeep(1175, 0.22), 190);
	}, [newCount]);

	const handleAcceptAll = useCallback(async () => {
		if (accepting || newOrderIds.length === 0) return;
		setAccepting(true);
		try {
			await Promise.all(newOrderIds.map((id) => updateStatus(id, 'preparing')));
			premiumToast('save', `تم قبول ${toArabicNumber(newOrderIds.length)} طلبات`);
			onOrdersRefresh();
		} catch {
			premiumToast('error', 'فشل قبول بعض الطلبات');
		} finally {
			setAccepting(false);
		}
	}, [accepting, newOrderIds, updateStatus, onOrdersRefresh]);

	if (!visible) return null;

	return (
		<div
			className={cn(
				'fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-50',
				'animate-ticket-drop'
			)}
			role="region"
			aria-label="طلبات جديدة"
		>
			<div className="glass-strong rounded-2xl px-5 py-3 flex items-center gap-4">
				<div className="flex items-center gap-2.5">
					<span className="relative flex size-8 shrink-0">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-orange opacity-40 motion-reduce:hidden" />
						<span className="relative inline-flex size-8 items-center justify-center rounded-full bg-orange text-orange-foreground">
							<Bell className="size-4" aria-hidden="true" />
						</span>
					</span>
					<div className="text-sm">
						<p className="font-bold leading-tight">
							{toArabicNumber(newCount)} طلب{' '}
							{newCount === 1 ? 'جديد' : 'جديدة'}
						</p>
					</div>
				</div>

				<div className="w-px h-7 bg-border/50 shrink-0" aria-hidden="true" />

				<Button
					size="sm"
					variant="orange"
					className="gap-1.5 shrink-0"
					onClick={handleAcceptAll}
					disabled={accepting}
					aria-label={`قبول كل الطلبات الجديدة (${newCount})`}
				>
					{accepting ? (
						<Loader2 className="size-3.5 animate-spin motion-reduce:hidden" />
					) : (
						<CheckCheck className="size-3.5" aria-hidden="true" />
					)}
					قبول الكل
				</Button>
			</div>
		</div>
	);
}

