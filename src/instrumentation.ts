// Edge runtime guard — process.on() not available on Vercel Edge
// Catch-block in middleware.ts handles unhandled middleware errors
// Next.js server runtime has its own uncaught exception handling

export function register() {
  // no-op: instrumentation loaded on Edge, use middleware catch instead
}
