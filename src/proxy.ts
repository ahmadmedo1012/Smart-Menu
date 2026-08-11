// ponytail: cookie-presence check only — full DB-backed validation in requireAuth()
// Edge runtime cannot access Prisma, so we block missing/stale sessions at the network edge
// and let route handlers do the authoritative session check.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { assertSameOrigin, CSRF_COOKIE } from '@/lib/csrf';

const SESSION_COOKIE = 'smart-menu-session';

const PROTECTED_ROOTS = ['/admin', '/owner'];

// Per-request CSP nonce stamping: Next.js streams its hydration/flight scripts
// inline (no src) and does NOT add nonce attributes on its own, so a nonce-only
// script-src must rewrite the HTML to tag every inline <script> — otherwise the
// browser blocks hydration and the app hangs on the loading shell.
// Lookaheads skip external scripts (<script src=...>) and already-tagged ones.
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)(?![^>]*\snonce=)/gi;

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtected = PROTECTED_ROOTS.some(
		(root) => pathname === root || pathname.startsWith(`${root}/`)
	);
	const isApiRoute = pathname.startsWith('/api/');
	const isStatic = pathname.startsWith('/_next/');
	if (isStatic) return NextResponse.next();

	let resp = NextResponse.next();

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

	// CSP: API gets strict script-src; pages get per-request nonce (no 'unsafe-inline')
	if (isApiRoute) {
		resp.headers.set(
			'Content-Security-Policy',
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.telegram.org; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; worker-src 'self' blob:"
		);
	} else {
		const nonce = crypto.randomUUID().replace(/-/g, '');
		const csp = [
			`default-src 'self'`,
			`script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`,
			`style-src 'self' 'unsafe-inline'`,
			`style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com`,
			`img-src 'self' data: blob: https:`,
			`font-src 'self' data: https://fonts.gstatic.com`,
			`connect-src 'self' https://va.vercel-scripts.com https://api.telegram.org`,
			`frame-src 'none'`,
			`object-src 'none'`,
			`base-uri 'self'`,
			`form-action 'self'`,
			`worker-src 'self' blob:`,
			`manifest-src 'self' blob:`,
			`upgrade-insecure-requests`,
		].join('; ');
		resp.headers.set('Content-Security-Policy', csp);

		// Buffer HTML pages to stamp the nonce onto Next's inline scripts.
		// Only text/html, non-API, non-data: bodies. Streaming is collapsed for
		// HTML responses only; API/static/data responses pass through untouched.
		// NOTE: buffering delays the response until the server stream finishes,
		// which disables progressive HTML streaming (Suspense/loading.tsx).
		const contentType = resp.headers.get('content-type') ?? '';
		if (contentType.startsWith('text/html')) {
			const html = await resp.text();
			if (html.length > 0 && !html.startsWith('data:')) {
				const stamped = html.replace(INLINE_SCRIPT, `<script nonce="${nonce}"`);
				resp = new NextResponse(stamped, resp);
			}
		}
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
	if (!isProtected) return resp;

	const session = request.cookies.get(SESSION_COOKIE)?.value;
	if (!session || session.length < 32) {
		const login = new URL('/login', request.url);
		login.searchParams.set('redirect', pathname);
		const redirect = NextResponse.redirect(login);
		// carry security headers onto the redirect too
		resp.headers.forEach((value, key) => redirect.headers.set(key, value));
		return redirect;
	}

	return resp;
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon\\.png|sitemap\\.xml|robots\\.txt|manifest\\.json|\\.png|\\.jpg|\\.jpeg|\\.webp|\\.avif).*)',
	],
};