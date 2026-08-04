'use client';

import { useEffect, useRef } from 'react';

/**
 * ReferralHandler — processes ?ref=<CODE> on public menu pages.
 * Registers the referral (server-side, idempotent per phone/session) and
 * stores it so the order flow can apply the discount.
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
