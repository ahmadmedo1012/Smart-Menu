'use client';

import { useEffect, useRef } from 'react';

/**
 * ReferralHandler — processes ?ref=<CODE> on public menu pages.
 * Registers the referral (server-side, idempotent per phone/session) and
 * stores it so the order flow can link it (round88-C4: the cart checkout
 * sends the stored code with the order — the server attaches the
 * customer's phone to this session's pending claim referral; the reward
 * is granted when the order completes. No discount is ever applied from
 * the client — round-77 guard).
 */
export function ReferralHandler() {
        const handled = useRef(false);

        useEffect(() => {
                if (handled.current) return;
                handled.current = true;

                const params = new URLSearchParams(window.location.search);
                const code = params.get('ref');
                if (!code) return;

                // Store locally so the loyalty widget / checkout can show the discount
                try {
                        localStorage.setItem('smartmenu_referral', code);
                } catch {
                        /* noop */
                }

                // Register server-side (creates a pending Referral row keyed to this session)
                import('@/lib/csrf-client')
                        .then(({ csrfFetch }) =>
                                csrfFetch('/api/referrals/claim', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ code }),
                                })
                        )
                        .then((r) => r.json().catch(() => ({})))
                        .then((j) => {
                                if (j?.success) {
                                        window.dispatchEvent(new CustomEvent('smartmenu:referral-active', { detail: j.data }));
                                }
                        })
                        .catch(() => {
                                /* silent — referral is a progressive enhancement */
                        });
        }, []);

        return null;
}
