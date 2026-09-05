/**
 * round86-D4 — the pure callback-data helpers extracted from the Telegram
 * webhook route. The previous unit test re-implemented these inline (testing
 * a COPY — drift between the copy and the route was invisible). The route and
 * the test now share this single source.
 */

/** Parse `action:paymentId` callback data; null when malformed. */
export function parseCallbackData(
        data: string
): { action: string; paymentId: number } | null {
        const colonIdx = data.indexOf(':');
        if (colonIdx === -1) return null;
        const action = data.slice(0, colonIdx);
        const paymentId = Number(data.slice(colonIdx + 1));
        if (!Number.isFinite(paymentId) || paymentId <= 0) return null;
        return { action, paymentId };
}

/** Map a callback action to a payment decision; null when unknown. */
export function resolveDecision(action: string): 'verified' | 'cancelled' | null {
        if (action === 'sub_app') return 'verified';
        if (action === 'sub_rej') return 'cancelled';
        return null;
}

/** Allowlist check: is this Telegram user id an admin? */
export function checkAdminPermission(fromId: number, adminIds: number[]): boolean {
        return adminIds.includes(fromId);
}
