// Edge runtime guard — process.on() not available on Vercel Edge
// Catch-block in middleware.ts handles unhandled middleware errors
// Next.js server runtime has its own uncaught exception handling
//
// round86-D3: error-tracking seam. Sentry (or any provider) hooks in here —
// see docs/ops-runbook.md §6. The DSN is deliberately env-gated so the seam
// is inert without a key and no dependency was added prematurely:
//
//   if (process.env.SENTRY_DSN) {
//     await import('./sentry.server.config').then(m => m.init?.());
//   }
export function register() {
  // no-op: instrumentation loaded on Edge, use middleware catch instead
}
