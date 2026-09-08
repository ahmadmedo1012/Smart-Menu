// ponytail: cookie-presence check only — full DB-backed validation in requireAuth()
// Edge runtime cannot access Prisma, so we block missing/stale sessions at the network edge
// and let route handlers do the authoritative session check.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { assertSameOrigin, CSRF_COOKIE } from '@/lib/csrf';

const SESSION_COOKIE = 'smart-menu-session';

const PROTECTED_ROOTS = ['/admin', '/owner'];

export function proxy(request: NextRequest) {
        // round86-D6: real request correlation — the logger reads
        // globalThis.__requestId and previously always fell back to a fresh
        // random id per log line (correlation was fake). One id per request
        // now ties all its log lines together.
        (globalThis as Record<string, unknown>).__requestId =
                request.headers.get('x-request-id') ?? crypto.randomUUID().slice(0, 8);
        const { pathname } = request.nextUrl;

        const isProtected = PROTECTED_ROOTS.some(
                (root) => pathname === root || pathname.startsWith(`${root}/`)
        );
        const isApiRoute = pathname.startsWith('/api/');
        const isStatic = pathname.startsWith('/_next/');
        if (isStatic) return NextResponse.next();
        // https detection must survive TLS-terminating reverse proxies: the upstream
        // request arrives as plain http, and x-forwarded-proto carries the real
        // client scheme. Fall back to it when the direct protocol is http.
        const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
        const isSecure =
                request.nextUrl.protocol === 'https:' || forwardedProto === 'https';

        const resp = NextResponse.next();
        // Forwarded to the app for nonce-based CSP (pages only, set below)
        const requestHeaders = new Headers(request.headers);

        // Pages that are fully public and never mutate: skip CSRF cookie minting
        // so responses stay cacheable (set-cookie would bust CDN/ISR caching).
        // Everything else (API, subscribe, cart, login, owner, admin) still gets
        // the CSRF cookie + Origin check.
        const isCacheablePage =
                pathname === '/' ||
                pathname.startsWith('/menu/') ||
                pathname === '/pricing' ||
                pathname === '/pricing/' ||
                pathname.startsWith('/landing');

        // Double-submit CSRF: mint the token cookie on first visit so the client can
        // echo it in X-CSRF-Token on mutating requests. Never reject just for a
        // missing cookie — that would break first-visit POSTs (signup, subscribe).
        if (!isCacheablePage && !request.cookies.get(CSRF_COOKIE)?.value) {
                resp.cookies.set(CSRF_COOKIE, crypto.randomUUID().replace(/-/g, ''), {
                        httpOnly: false,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 60 * 60 * 24,
                });
        }

        // Security headers
        // HSTS only in production AND on https — in dev/plain-http it makes WebKit
        // upgrade subresources to https://localhost (plain HTTP) → all CSS/JS fail,
        // page never hydrates. isSecure also honors x-forwarded-proto so a
        // TLS-terminating proxy deployment keeps the header.
        if (process.env.NODE_ENV === 'production' && isSecure) {
                resp.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        resp.headers.set('X-Content-Type-Options', 'nosniff');
        resp.headers.set('X-Frame-Options', 'DENY');
        resp.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        // round89-B2 (dx-4 #5): COOP — isolates the document's window/opener from
        // cross-origin windows (blocks some XS-Leak / tab-nabbing vectors).
        // CORP — marks every response same-origin-only for cross-origin no-cors
        // embeds. next.config.ts headers() applies the same pair to static
        // assets (which no longer pass through this proxy — see B-1 matcher),
        // so every response is covered exactly once.
        resp.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        resp.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

        // CSP with per-request nonce (pages only; API gets strict CSP)
        if (isApiRoute) {
                // round94-W3 (A-MED3 residue): dropped `https://fonts.gstatic.com` from
                // font-src — /api/* routes serve JSON only (no HTML, no fonts at all)
                // and every font in the app is self-hosted from /fonts/*; the external
                // origin was a leftover of the pre-self-hosting policy. The HTML-serving
                // CSP branches below never listed it (font-src 'self' data:) — now the
                // API branch matches them and no CSP in the app grants a font origin it
                // cannot possibly use.
                resp.headers.set(
                        'Content-Security-Policy',
                        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.telegram.org; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self' blob:; frame-ancestors 'none'"
                );
        } else if (isCacheablePage) {
                // Public static pages (/, /menu/*, /pricing, /landing): FIXED CSP with
                // no nonce. These pages are statically prerendered — there is no
                // per-request context to mint a nonce into, so we use a static policy.
                // 'unsafe-inline' is the fallback that lets Next.js inline hydration
                // scripts run. NOTE: 'strict-dynamic' must NOT be present — per CSP3 it
                // nullifies 'self'/'unsafe-inline' and requires a nonce/hash root of
                // trust, which would block ALL scripts on nonce-less public pages
                // (Suspense never resolves, page stuck on skeleton).
                // No x-nonce request header is forwarded to the app.
                //
                // round92-A2/A8 (evaluated, decision: KEEP this branch for /menu/*):
                // the 1-a audit's "paradox" — menu pages were 100% dynamically rendered
                // yet got this static CSP — was a SYMPTOM of the dead ISR, not a CSP bug.
                // A2 fixed the root cause (generateStaticParams → on-demand ISR 60s in
                // menu/[slug]/page.tsx), so menu pages are now prerendered/ISR-cached
                // and this nonce-less policy is architecturally correct again (r86
                // trade-off: no per-request render context → no nonce to stamp).
                // Enabling the nonce flow below for ISR pages would break them: the
                // cached HTML is generated without a nonce and 'strict-dynamic' would
                // block every script on it. The proxy CANNOT branch on the response's
                // actual cache state (x-vercel-cache/x-nextjs-prerender are RESPONSE
                // headers — middleware runs before the render exists), so the
                // pathname-list branch stays the only implementable form; the A2 fix
                // is what keeps the list aligned with reality.
                const csp = [
                        "default-src 'self'",
                        "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
                        "style-src 'self' 'unsafe-inline'",
                        "style-src-elem 'self' 'unsafe-inline'",
                        "img-src 'self' data: blob: https:",
                        "font-src 'self' data:",
                        "connect-src 'self' https://va.vercel-scripts.com https://api.telegram.org",
                        "frame-src 'none'",
                        "object-src 'none'",
                        "base-uri 'self'",
                        "form-action 'self'",
                        "worker-src 'self' blob:",
                        "manifest-src 'self' blob:",
                        "frame-ancestors 'none'",
                        ...(isSecure ? ["upgrade-insecure-requests"] : []),
                ].join('; ');
                resp.headers.set('Content-Security-Policy', csp);
                // Cacheable pages: no CSRF cookie is minted above (no set-cookie), so
                // the response can be cached by CDN/ISR.
                // round92-A2 (header precedence, live-verified): on Vercel this header
                // does NOT control the final caching of a DYNAMICALLY rendered page —
                // the platform answers with private,no-cache,no-store for those (1-a
                // saw exactly that on /menu/* despite this rule). For prerendered/ISR
                // pages it aligns with the route's own s-maxage=60. Self-hosted note:
                // Next's sendRenderResult refuses to override an already-set
                // Cache-Control (server/send-payload.js), so this value sticks there.
                resp.headers.set(
                        'Cache-Control',
                        'public, max-age=60, s-maxage=60, stale-while-revalidate=86400'
                );
        } else {
                // Official Next.js 16 nonce flow (docs: content-security-policy guide):
                // 1. generate nonce here, put it in the CSP response header AND forward it
                //    to the app via the x-nonce request header;
                // 2. Next.js extracts the nonce from the request's CSP header during SSR
                //    (server/app-render/get-script-nonce-from-header.js) and stamps every
                //    inline script/style with nonce="..." automatically.
                // No body rewriting — NextResponse.next() has no upstream body
                // (next/dist/server/web/spec-extension/response.js: NextResponse.next()
                // returns new NextResponse(null, ...)), and the nonce must be applied
                // during SSR, not after the fact.
                // Requires dynamic rendering: layout.tsx calls connection() to opt pages
                // out of static prerendering (static HTML is built with no request
                // headers, hence no nonce).
                const nonce = crypto.randomUUID().replace(/-/g, '');
                const isDev = process.env.NODE_ENV === 'development';
                const csp = [
                        "default-src 'self'",
                        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
                        "style-src 'self' 'unsafe-inline'",
                        "style-src-elem 'self' 'unsafe-inline'",
                        "img-src 'self' data: blob: https:",
                        "font-src 'self' data:",
                        "connect-src 'self' https://va.vercel-scripts.com https://api.telegram.org",
                        "frame-src 'none'",
                        "object-src 'none'",
                        "base-uri 'self'",
                        "form-action 'self'",
                        "worker-src 'self' blob:",
                        "manifest-src 'self' blob:",
                        "frame-ancestors 'none'",
                        ...(isSecure ? ["upgrade-insecure-requests"] : []),
                ].join('; ');
                resp.headers.set('Content-Security-Policy', csp);
                // Forward the nonce to the app so SSR can stamp inline scripts
                requestHeaders.set('x-nonce', nonce);
        }

        // CSRF: validate Origin on mutating requests (API + protected pages)
        if (isApiRoute || isProtected) {
                try {
                        assertSameOrigin(request);
                } catch {
                        return new NextResponse('CSRF validation failed', { status: 403 });
                }
        }

        // Session check only for protected page routes
        if (!isProtected) {
                if (isApiRoute) return resp;
                // Pages: forward x-nonce request header so Next.js SSR can stamp inline
                // scripts with the nonce (official nonce flow, see CSP comment above).
                return NextResponse.next({
                        request: { headers: requestHeaders },
                        headers: resp.headers,
                });
        }

        const session = request.cookies.get(SESSION_COOKIE)?.value;
        if (!session || session.length < 32) {
                const login = new URL('/login', request.url);
                login.searchParams.set('redirect', pathname);
                const redirect = NextResponse.redirect(login);
                // carry security headers onto the redirect too
                resp.headers.forEach((value, key) => redirect.headers.set(key, value));
                return redirect;
        }

        // Protected page with valid session: forward nonce + headers
        return NextResponse.next({
                request: { headers: requestHeaders },
                headers: resp.headers,
        });
}

export const config = {
        matcher: [
                // round89-B1 (dx-4 #4 — confirmed live defect): the old extension
                // entries (\.png, \.woff2? …) never excluded anything. The negative
                // lookahead is evaluated right after the leading '/', so `\.png`
                // only matched a path that STARTS with ".png" — /fonts/*.woff2,
                // /video/*.mp4 and /icon-192.png all still ran the proxy (live
                // evidence: set-cookie csrf + CSP nonce on font/video responses,
                // which also defeats the round85-B11 immutable-asset goal).
                // Official Next.js 16 form (node_modules/next/dist/docs/…/proxy.md
                // → Matcher): each extension is written `.*\.ext$` so it anchors
                // at the END of the path. The literal names (manifest.json, sw.js,
                // offline.html, robots.txt, sitemap.xml, favicon.png) keep working
                // exactly as before — verified against the REAL build-time compiler
                // (next/dist/build/analysis/get-page-static-info.js getMiddlewareMatchers):
                // static assets → skip, pages/API/transport (.rsc) → proxy runs.
                // .css/.txt/.xml/.json cover the remaining public files
                // (/fonts/fonts.css) — no app route ends in any of these.
                '/((?!_next/static|_next/image|favicon\\.png|sitemap\\.xml|robots\\.txt|manifest\\.json|sw\\.js|offline\\.html|.*\\.(?:png|jpe?g|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm|lottie|css|txt|xml|json)$).*)',
        ],
};
