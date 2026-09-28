/**
 * r121 (G-1 — ROOT CAUSE, deviating one file outside IMPL-2's stated scope;
 * see the worklog): the ~127KB-gz crypto-browserify/bn.js/Buffer polyfill
 * chunk that shipped eagerly on 28 routes was NOT caused by SelfHostedQR's
 * static `qrcode` import (G-1/X1's hypothesis — disproven by rebuild: the
 * dynamic-import fix left the chunk byte-identical). The real chain:
 *
 *   csrf-client.ts ("use client", 28 routes)
 *     → ./csrf  (for CSRF_COOKIE/CSRF_HEADER — two string constants)
 *     → @/lib/secure-compare (timingSafeEqualStrings for the PROXY's
 *       double-submit check — server-only usage)
 *     → node "crypto"  → Turbopack resolves it in the CLIENT graph to
 *       next/dist/compiled/crypto-browserify → bn.js/elliptic/asn1/
 *       browserify-aes → buffer/stream polyfills — all registered into the
 *       same shared chunk as csrfFetch (dead at runtime: nothing in the
 *       browser graph ever calls them, but registered = transferred+parsed).
 *
 * Fix: this leaf module holds the two constants with ZERO imports, so the
 * client graph (csrf-client) never reaches node:crypto. `csrf.ts` re-exports
 * them (every server consumer — proxy.ts, api routes, tests — is unchanged)
 * and keeps its secure-compare import, which is native on the server graph.
 */
export const CSRF_COOKIE = 'csrf-token';
export const CSRF_HEADER = 'x-csrf-token';
