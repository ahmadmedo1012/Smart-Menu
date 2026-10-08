/**
 * Mobile app constants — polling intervals + magic numbers.
 *
 * Pure values, no runtime deps. Imported by screens.
 *
 * r126-M9: pruned to the constants that actually have consumers (6 of 7
 * exports were dead — STRINGS, SPLASH_FADE_MS, TOAST_DURATION_MS,
 * DEFAULT_PAGE_SIZE, SECURE_STORE_USER_KEY, ROOT_ROUTES had zero importers).
 */

/** Polling interval for the owner orders query (15s, background-paused
 *  via the React Query focusManager wiring in providers.tsx). */
export const ORDERS_POLL_INTERVAL_MS = 15_000;
