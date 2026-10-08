'use client';

import { useEffect, useRef } from 'react';
import { usePollWhenVisible } from '@/hooks/usePollWhenVisible';
import { playChime } from '@/lib/chime';
/* r131-F4 (fleet "one toast language" ruling, SB v8-C3 twin): the new-order
   notification joins the branded card — premiumToast("cart", …) carries the
   28px pastel well + status hairline + RTL + close button + role=status;
   the old raw sonner toast() rendered a second, unbranded card language
   (JSX inside sonner's default wrapper, its own top-center position). */
import { premiumToast } from '@/lib/premium-toast';

function showOrderToast(newOrders: number) {
        playChime(); // round86-C3: shared chime (was a local copy)
        premiumToast(
                'cart',
                'طلب جديد!',
                `لديك ${newOrders} طلب جديد`,
                // round90-F4 (M3): explicit dismiss affordance — 5s auto-dismiss
                // kept for this transient notification (non-error kind) + the
                // branded card's own close button.
                { duration: 5000, anim: true }
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
