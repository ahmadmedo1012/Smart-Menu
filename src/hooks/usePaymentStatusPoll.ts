'use client';

import { useEffect, useRef } from 'react';
import { usePollWhenVisible } from '@/hooks/usePollWhenVisible';
import { premiumToast } from '@/lib/premium-toast';

/**
 * round87-C7 — the payment-status poll extracted from PaymentDialog (was a
 * 60-line hand-rolled interval + visibility + failure-cap machine inline in
 * the 768-line dialog). Semantics preserved:
 *   - polls /api/subscriptions/status every 5s while `active`
 *   - a non-2xx (e.g. session-expired 401) counts as a FAILURE instead of
 *     parsing a garbage body forever (round86-C8)
 *   - 3 consecutive failures → ONE warn toast, then keeps polling silently
 *   - verified → onApproved(); cancelled → onRejected(server message)
 *   - first check happens after one interval (the payment was just created)
 */
export function usePaymentStatusPoll(opts: {
        active: boolean;
        paymentId: number | null;
        onApproved: () => void;
        onRejected: (message?: string) => void;
        intervalMs?: number;
}): void {
        const { active, paymentId, onApproved, onRejected, intervalMs = 5000 } = opts;
        const failuresRef = useRef(0);
        const warnedRef = useRef(false);
        // Callbacks through a ref so the poll body never restarts on their identity
        const cbRef = useRef({ onApproved, onRejected });
        useEffect(() => {
                cbRef.current = { onApproved, onRejected };
        }, [onApproved, onRejected]);

        usePollWhenVisible(
                async () => {
                        if (paymentId == null) return;
                        try {
                                const res = await fetch(`/api/subscriptions/status?id=${paymentId}`);
                                // round86-C8: a non-2xx (e.g. session-expired 401) previously
                                // parsed as JSON with no data and polled forever, silently
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const json = await res.json();
                                failuresRef.current = 0;
                                if (json.data?.status === 'verified') cbRef.current.onApproved();
                                if (json.data?.status === 'cancelled') cbRef.current.onRejected(json.data?.message);
                        } catch {
                                failuresRef.current++;
                                if (failuresRef.current >= 3 && !warnedRef.current) {
                                        warnedRef.current = true;
                                        premiumToast('error', 'تعذر الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
                                }
                        }
                },
                intervalMs,
                [active, paymentId],
                { enabled: active && paymentId != null, immediate: false, inFlightGuard: true }
        );
}
