'use client';

import { playBeep } from '@/lib/chime';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
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
        // round90-F4 (M3 — QA live 13-owner-orders): the fixed bar sat over the
        // last order card with no way to dismiss it, reading as "stuck". The
        // owner can now close it for the current batch; a GENUINELY new batch
        // (count grew) re-opens it, so new arrivals are never silently hidden.
        const [dismissed, setDismissed] = useState(false);
        const hasPlayedSound = useRef(false);
        const prevCountRef = useRef(0);

        const newCount = newOrderIds.length;
        // Only show bar for truly new orders that aren't being moved by the user yet
        const visible =
                newCount > 0 &&
                !dismissed &&
                !Object.values(pendingStatus).includes('preparing') &&
                !Object.values(pendingStatus).includes('ready');

        // Re-open on new arrivals only (a shrinking count — the user accepted
        // via the cards — must NOT resurrect a dismissed bar).
        useEffect(() => {
                if (newCount > prevCountRef.current) setDismissed(false);
                prevCountRef.current = newCount;
        }, [newCount]);

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
                <>
                        {/* round90-F4 (M3): reserve the layout space the fixed bar occupies
                            (at the scroll bottom) so the last order card / the load-more
                            button are never permanently hidden behind it. */}
                        <div className="h-20" aria-hidden="true" />
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

                                        {/* round90-F4 (M3): explicit close — the bar previously had
                                            no dismiss affordance at all. */}
                                        <button
                                                type="button"
                                                onClick={() => setDismissed(true)}
                                                aria-label="إخفاء شريط الطلبات الجديدة"
                                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                        >
                                                <X className="size-4" aria-hidden="true" />
                                        </button>
                                </div>
                        </div>
                </>
        );
}
