'use client';

import { useEffect, useState } from 'react';

export type AccessGateMe = {
	role: string | null;
	permissions: string[];
};

export type AccessGateStatus = 'checking' | 'allowed' | 'denied';

/**
 * round87-C1: eleven admin pages each re-implemented the /api/auth/me role
 * gate (~15 lines each) with drift between copies — the users page read a
 * response shape that /api/auth/me never returns (its gate denied EVERYONE,
 * page dead) and swallowed fetch errors fail-open. This hook is the single
 * source of truth: fail-closed on any transport/shape error, one predicate
 * per page preserving that page's original allow-semantics.
 *
 * Status starts at 'checking' so data fetches boot immediately (identical to
 * the previous render-then-deny flash); pages early-return only on 'denied'.
 */
export function useAccessGate(allow: (me: AccessGateMe) => boolean): AccessGateStatus {
	const [status, setStatus] = useState<AccessGateStatus>('checking');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch('/api/auth/me');
				const body = await res.json().catch(() => null);
				if (cancelled) return;
				if (!res.ok || !body?.success || !body?.data) {
					setStatus('denied');
					return;
				}
				const me: AccessGateMe = {
					role: body.data.role ?? null,
					permissions: Array.isArray(body.data.permissions) ? body.data.permissions : [],
				};
				setStatus(allow(me) ? 'allowed' : 'denied');
			} catch {
				if (!cancelled) setStatus('denied');
			}
		})();
		return () => {
			cancelled = true;
		};
		// The predicate is a per-page policy constant (module-scope or inline);
		// it never legitimately changes across renders.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return status;
}

/** Common predicate: named roles always pass, otherwise the permission. */
export function allowRolesOrPermission(roles: string[], permission: string) {
	return (me: AccessGateMe) => roles.includes(me.role ?? '') || me.permissions.includes(permission);
}
