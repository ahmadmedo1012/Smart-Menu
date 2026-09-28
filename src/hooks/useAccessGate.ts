'use client';

import { createElement, createContext, useContext, useEffect, useState } from 'react';

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
 *
 * r121-B-2/A-2: the (protected) admin layout is now a SERVER component that
 * gates the route with requireAuth() (the r113-F114 login pattern) and feeds
 * the resolved {role, permissions} down through this context. When a provider
 * is present the gate resolves SYNCHRONOUSLY from the server-resolved session
 * — zero /api/auth/me probes per page (previously 12 admin pages + the layout
 * + AdminSidebar each fetched /me independently on every cold load). The
 * fetch fallback below stays for standalone use outside the provider (tests,
 * future surfaces) and keeps its fail-closed semantics.
 */
export const AccessGateMeContext = createContext<AccessGateMe | null>(null);

export function AccessGateMeProvider({
        value,
        children,
}: {
        value: AccessGateMe;
        children?: React.ReactNode;
}) {
        // createElement (not JSX) keeps this a .ts file — the hook module's path
        // is imported by 12 admin pages and must not churn.
        return createElement(AccessGateMeContext.Provider, { value }, children);
}

export function useAccessGate(allow: (me: AccessGateMe) => boolean): AccessGateStatus {
        const provided = useContext(AccessGateMeContext);
        const [status, setStatus] = useState<AccessGateStatus>(() =>
                provided ? (allow(provided) ? 'allowed' : 'denied') : 'checking'
        );

        useEffect(() => {
                // Server-gated surface: the layout already resolved the session
                // (role-aware redirect happened before this tree rendered).
                if (provided) return;
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
