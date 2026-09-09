'use client';

import { useCallback, useRef } from 'react';
import { usePollWhenVisible } from '@/hooks/usePollWhenVisible';
import { premiumToast } from '@/lib/premium-toast';

/** Honest cadence shown in the live indicator — keep both in sync. */
const POLL_INTERVAL_MS = 15_000;

type FetchOrdersFn = (
        status: string,
        pageNum?: number,
        append?: boolean,
        dateF?: string,
        dateT?: string
) => Promise<void>;

interface UseOrdersPollingArgs {
        filter: string;
        activeId?: number | null;
        fetchOrders: FetchOrdersFn;
}

/** round87-B1 probe-then-refetch polling, extracted verbatim from the owner
 * orders page (round89-G2) — same 15s cadence, same probe signature, same
 * refetch + toast on change. resetProbe() replaces the page's old inline
 * `probeRef.current = null` (called from its [filter, fetchOrders] effect). */
export function useOrdersPolling({ filter, activeId, fetchOrders }: UseOrdersPollingArgs) {
        // round87-B1: probe signature for the 15s poll
        const probeRef = useRef<string | null>(null);

        // Auto-refresh — client polling replaces SSE (Vercel kills streams at 300s).
        // Honest UX: the indicator reflects the real cadence and pauses when the tab
        // is hidden to save network + battery.
        // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
        usePollWhenVisible(
                async () => {
                        try {
                                // round87-B1: probe-then-refetch — the old poll downloaded the
                                // full first page (~8.2KB) every 15s while the steady-state diff
                                // is "nothing changed". The probe fetches ONE row and compares
                                // (total, top id, top updatedAt) ≈ 0.6KB — a ~92% cut.
                                const params = new URLSearchParams();
                                if (filter) params.set('status', filter);
                                params.set('page', '1');
                                params.set('pageSize', '1');
                                if (activeId) params.set('restaurantId', String(activeId));
                                const res = await fetch(`/api/orders?${params.toString()}`);
                                if (res.status === 401) {
                                        // r97: تحميل كامل عمدًا (نفس عقد صفحة الطلبات أعلاه).
                                        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                                        window.location.href = '/login';
                                        return;
                                }
                                if (!res.ok) return;
                                const json = await res.json();
                                const top = Array.isArray(json.data) ? json.data[0] : undefined;
                                const sig = `${json.meta?.total ?? json.total ?? '?'}:${top?.id ?? '-'}:${top?.updatedAt ?? '-'}`;
                                if (probeRef.current === null) {
                                        probeRef.current = sig; // baseline only — mount effect loads page 1
                                        return;
                                }
                                if (sig === probeRef.current) return;
                                probeRef.current = sig;
                                fetchOrders(filter, 1, false);
                                premiumToast('success', '📦 تحديث الطلبات', undefined, {
                                        duration: 3000,
                                });
                        } catch {
                                /* transient — next tick retries */
                        }
                },
                POLL_INTERVAL_MS,
                [filter, fetchOrders, activeId]
        );

        // Page calls this from its [filter, fetchOrders] effect — resets the probe
        // baseline exactly where the old inline `probeRef.current = null` lived.
        const resetProbe = useCallback(() => {
                probeRef.current = null;
        }, []);

        return { resetProbe };
}
