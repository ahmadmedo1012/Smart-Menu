import { Analytics } from '@vercel/analytics/react';

/**
 * r121 (Q-1): `@vercel/analytics` injects `/_vercel/insights/script.js` in
 * every production build, but the endpoint only exists ON Vercel — every
 * standalone local/e2e serving logged a guaranteed console 404 per page
 * (Q measured it on all 19 audited loads; three e2e specs already carry
 * filters that ignore exactly this URL). Gate the mount on Vercel's own env
 * markers (same pattern as next.config.ts:16 `process.env.VERCEL ? …`):
 *
 *   - `VERCEL=1` — set in every Vercel build/runtime (server-side check).
 *   - `NEXT_PUBLIC_VERCEL_ENV` — production/preview/development deploys;
 *     NEXT_PUBLIC_ prefix keeps it inlinable if this is ever mounted from
 *     a client component.
 *
 * This is a pure server component (no hooks) — when mounted from a server
 * layout the gate is evaluated at build/SSR time, so the script tag never
 * reaches non-Vercel HTML at all. Both layouts mount it since r121
 * ((public)/layout.tsx:189 + (protected)/layout.tsx:178).
 */
export function VercelAnalytics() {
        if (!process.env.VERCEL && !process.env.NEXT_PUBLIC_VERCEL_ENV) return null;
        return <Analytics />;
}
