/**
 * round89-B1/B2 — proxy matcher + security-header layer tests.
 *
 * Part 1 (matcher, dx-4 #4 — the confirmed live defect): compiles the REAL
 * matcher string exported by src/proxy.ts with the same path-to-regexp engine
 * Next.js 16 uses for matchers (next/dist/compiled/path-to-regexp), then
 * asserts the exclusion matrix: static assets MUST be skipped (the old
 * `\.png`-style entries never excluded anything — the lookahead only matched
 * paths that START with ".png"), pages/API MUST still run the proxy.
 * /manifest.json (literal) was already correctly excluded and must stay so.
 *
 * Part 2 (headers, dx-4 #5): invokes the proxy() function directly with
 * NextRequest fixtures and asserts the three CSP layers all carry
 * frame-ancestors 'none' plus the new COOP/CORP headers, the CSRF cookie is
 * minted exactly where the design says (API + non-cacheable pages, never on
 * cacheable public pages), and the Origin gate 403s foreign origins.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
// The exact engine Next 16 uses to compile matcher strings at build time
// (build/analysis → tryToParsePath → compiled path-to-regexp).
const { pathToRegexp } = require_('next/dist/compiled/path-to-regexp') as {
        pathToRegexp: (path: string) => RegExp;
};

import { proxy, config } from '@/proxy';

function matches(pathname: string): boolean {
        const source = config.matcher[0];
        const re = pathToRegexp(source as string);
        return re.test(pathname);
}

// ── Part 1: matcher exclusion matrix ────────────────────────────────────

describe('proxy matcher — static assets are actually excluded (B-1)', () => {
        const SKIPPED = [
                '/fonts/cairo-arabic.woff2',
                '/fonts/readex-pro.woff',
                '/fonts/fonts.css',
                // round94-W3: promo.mp4 was deleted (dead weight, reports A+F) — the
                // path stays as a matcher-regex sample only: what's under test is the
                // .mp4 EXTENSION exclusion, not the file's existence. promo-poster.webp
                // (still present, pending owner decision) keeps /video/ real.
                '/video/promo.mp4',
                '/video/promo-poster.webp',
                '/icon-192.png',
                '/icon-512.png',
                '/og-default.png',
                '/apple-touch-icon.png',
                '/brand-icon.png',
                '/main21.webp',
                '/hero-phone.webp',
                '/favicon.ico',
                // literals that were already correctly excluded — must stay excluded
                '/manifest.json',
                '/sw.js',
                '/offline.html',
                '/robots.txt',
                '/sitemap.xml',
                '/favicon.png',
                // Next internals
                '/_next/static/chunks/x.js',
                '/_next/image?url=%2Flogo.png',
        ];

        it.each(SKIPPED)('static path %s is NOT run through the proxy', (p) => {
                expect(matches(p)).toBe(false);
        });

        const RUN = [
                '/',
                '/api/health',
                '/api/auth/login',
                '/api/orders?status=new',
                '/api/stats',
                '/api/telegram/webhook',
                '/login',
                '/admin/orders',
                '/owner',
                '/menu/demo-restaurant',
                '/pricing',
                '/subscribe',
                '/cart',
                '/order-confirmed',
                '/demo',
        ];

        it.each(RUN)('app path %s IS run through the proxy', (p) => {
                expect(matches(p)).toBe(true);
        });

        it('the matcher still contains the manifest.json literal (kept exclusion)', () => {
                expect(config.matcher[0]).toContain('manifest\\.json');
        });

        it('extension entries are END-anchored (the official docs form), not bare \\.(png|...)', () => {
                // the old broken form: `\.png` matched only paths starting with ".png"
                expect(config.matcher[0]).toMatch(/\.\*\\\.\(\?:png\|/);
                expect(config.matcher[0]).not.toMatch(/[^.*]\|\\\.(png)\|/);
        });
});

// ── Part 2: proxy() header layers (B-2) ─────────────────────────────────

function call(method: string, path: string, headers: Record<string, string> = {}) {
        return proxy(
                new NextRequest(`http://localhost${path}`, { method, headers })
        );
}

describe('proxy() — security headers on the three CSP layers (B-2)', () => {
        it('API responses: strict CSP + frame-ancestors none + COOP/CORP + csrf cookie minted', () => {
                const res = call('GET', '/api/health');
                const csp = res.headers.get('content-security-policy') ?? '';
                expect(csp).toContain("script-src 'self'");
                expect(csp).not.toContain('nonce-');
                expect(csp).toContain("frame-ancestors 'none'");
                expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
                expect(res.headers.get('cross-origin-resource-policy')).toBe('same-origin');
                expect(res.headers.get('x-content-type-options')).toBe('nosniff');
                // double-submit cookie is minted on first visit (API is not cacheable)
                expect(res.cookies.get('csrf-token')?.value).toMatch(/^[0-9a-f]{32}$/);
        });

        it('cacheable public pages: static CSP (unsafe-inline, no nonce) + frame-ancestors none + NO set-cookie', () => {
                const res = call('GET', '/');
                const csp = res.headers.get('content-security-policy') ?? '';
                expect(csp).toContain("'unsafe-inline'");
                expect(csp).not.toContain('nonce-');
                expect(csp).toContain("frame-ancestors 'none'");
                expect(res.headers.get('cache-control')).toContain('public');
                // set-cookie would bust CDN/ISR caching — never on cacheable pages
                expect(res.headers.get('set-cookie')).toBeNull();
                expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
                expect(res.headers.get('cross-origin-resource-policy')).toBe('same-origin');
        });

        it('dynamic pages: nonce CSP with strict-dynamic + frame-ancestors none', () => {
                const res = call('GET', '/login');
                const csp = res.headers.get('content-security-policy') ?? '';
                expect(csp).toMatch(/'nonce-[0-9a-f]{32}'/);
                expect(csp).toContain("'strict-dynamic'");
                expect(csp).toContain("frame-ancestors 'none'");
                expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
                expect(res.headers.get('cross-origin-resource-policy')).toBe('same-origin');
                // CSRF cookie IS minted for auth pages (mutating forms live there)
                expect(res.headers.get('set-cookie')).toContain('csrf-token=');
        });
});

// ── Part 2b: CSRF Origin gate still enforced by the proxy ───────────────

describe('proxy() — Origin gate (regression after B-5 timing-safe switch)', () => {
        it('POST to API with foreign origin → 403 before any route logic', () => {
                const res = call('POST', '/api/auth/login', { origin: 'https://evil.example' });
                expect(res.status).toBe(403);
        });

        it('POST with same origin + matching double-submit tokens → passes', () => {
                const res = call('POST', '/api/auth/login', {
                        origin: 'http://localhost',
                        cookie: 'csrf-token=0123456789abcdef0123456789abcdef',
                        'x-csrf-token': '0123456789abcdef0123456789abcdef',
                });
                expect(res.status).toBe(200);
        });

        it('GET requests never hit the Origin gate', () => {
                const res = call('GET', '/api/health', { origin: 'https://evil.example' });
                expect(res.status).toBe(200);
        });
});
