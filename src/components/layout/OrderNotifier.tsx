'use client';

import { useEffect, useRef } from 'react';
import { usePollWhenVisible } from '@/hooks/usePollWhenVisible';
import { playChime } from '@/lib/chime';
import { toast } from 'sonner';
import AnimatedCart from '@/components/ui/shopping-cart-icon';

function showOrderToast(newOrders: number) {
        playChime(); // round86-C3: shared chime (was a local copy)
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

const POLL_MS = 5000;

export function useOrderNotifier(restaurantId?: number) {
        const hasNotified = useRef(false);
        const resetNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
        const lastOrderCountRef = useRef(0);

        // ponytail: client polling — Vercel kills SSE streams at 300s.
        // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
        usePollWhenVisible(async () => {
                try {
                        // round85-B3: count endpoint instead of the full order list —
                        // one COUNT query server-side, one tiny payload per 5s poll
                        // (was: full rows with items + restaurant includes).
                        const res = await fetch(`/api/orders/count?restaurantId=${restaurantId}`);
                        if (!res.ok) return;
                        const json = await res.json();
                        const count = Number(json?.data?.count ?? 0);
                        if (count > lastOrderCountRef.current && !hasNotified.current) {
                                showOrderToast(count - lastOrderCountRef.current);
                                hasNotified.current = true;
                                // Store the timer id so a late fire after unmount can't reset the flag
                                resetNotifyTimerRef.current = setTimeout(() => {
                                        hasNotified.current = false;
                                }, 30000);
                        }
                        lastOrderCountRef.current = count;
                } catch {
                        /* poll failed */
                }
        }, POLL_MS, [restaurantId]);

        // unmount cleanup for the notify-reset timer
        useEffect(
                () => () => {
                        if (resetNotifyTimerRef.current) {
                                clearTimeout(resetNotifyTimerRef.current);
                                resetNotifyTimerRef.current = undefined;
                        }
                },
                []
        );
}
