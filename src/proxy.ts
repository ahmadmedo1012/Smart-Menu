// ponytail: cookie-presence check only — full DB-backed validation in requireAuth()
// Edge runtime cannot access Prisma, so we block missing/stale sessions at the network edge
// and let route handlers do the authoritative session check.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { assertSameOrigin, CSRF_COOKIE } from '@/lib/csrf';

const SESSION_COOKIE = 'smart-menu-session';

const PROTECTED_ROOTS = ['/admin', '/owner'];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtected = PROTECTED_ROOTS.some(
		(root) => pathname === root || pathname.startsWith(`${root}/`)
	);
	const isApiRoute = pathname.startsWith('/api/');
	const isStatic = pathname.startsWith('/_next/');
	if (isStatic) return NextResponse.next();

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
	resp.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	resp.headers.set('X-Content-Type-Options', 'nosniff');
	resp.headers.set('X-Frame-Options', 'DENY');
	resp.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// CSP with per-request nonce (pages only; API gets strict CSP)
	if (isApiRoute) {
		resp.headers.set(
			'Content-Security-Policy',
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.telegram.org; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self' blob:"
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
			"upgrade-insecure-requests",
		].join('; ');
		resp.headers.set('Content-Security-Policy', csp);
		// Cacheable pages: no CSRF cookie is minted above (no set-cookie), so
		// the response can be cached by CDN/ISR.
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
			"upgrade-insecure-requests",
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
		'/((?!_next/static|_next/image|favicon\\.png|sitemap\\.xml|robots\\.txt|manifest\\.json|\\.png|\\.jpg|\\.jpeg|\\.webp|\\.avif).*)',
	],
};
