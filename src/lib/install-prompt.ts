/**
 * r143 (Phase-4 W1, finding D7) — install-pill dismissal memory.
 *
 * The floating «تثبيت التطبيق» pill had no way out: no close control, no
 * persistence — it re-appeared on every full page load and sat at
 * z-index 9999 over scrolling content. The dismissal contract:
 *
 *  - the × control writes the dismissal timestamp to localStorage;
 *  - the pill stays hidden for 7 days (a cool-off, not a ban — the offer
 *    returns for visitors who never install);
 *  - a corrupt/stored-garbage value counts as NOT dismissed (fail visible —
 *    a broken storage entry must not permanently bury the install offer);
 *  - every read/write is guarded: private-mode browsers throw on
 *    localStorage access and must not crash the host page.
 *
 * Pure helpers live in lib (not the component) so the 7-day window math is
 * unit-testable in the node-only vitest environment.
 */
export const INSTALL_DISMISS_KEY = 'smartmenu.install.dismissedAt';

/** The cool-off window: ~7 days, matching the Phase-4 brief (W1 #3). */
export const INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Was the pill dismissed within the cool-off window?
 * `raw` is the verbatim localStorage value (string | null).
 */
export function isInstallDismissed(raw: string | null | undefined, now: number = Date.now()): boolean {
        if (!raw) return false;
        const dismissedAt = Number(raw);
        // NaN/0/negative/garbage → treat as not dismissed (fail visible)
        if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return false;
        return now - dismissedAt < INSTALL_DISMISS_MS;
}

/** Record the dismissal (timestamp now). Never throws. */
export function dismissInstallPrompt(now: number = Date.now()): void {
        try {
                localStorage.setItem(INSTALL_DISMISS_KEY, String(now));
        } catch {
                /* private mode / storage blocked — dismissal is session-only then */
        }
}

/** Read the stored dismissal value. Never throws (blocked storage → null). */
export function readInstallDismissal(): string | null {
        try {
                return localStorage.getItem(INSTALL_DISMISS_KEY);
        } catch {
                return null;
        }
}
