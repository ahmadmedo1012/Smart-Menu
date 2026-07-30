// ponytail: cookie-presence check only — full DB-backed validation in requireAuth()
// Edge runtime cannot access Prisma, so we block missing/stale sessions at the network edge
// and let route handlers do the authoritative session check.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/csrf';

const SESSION_COOKIE = 'smart-menu-session';

const PROTECTED_ROOTS = ['/admin', '/owner'];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtected = PROTECTED_ROOTS.some(
		(root) => pathname === root || pathname.startsWith(`${root}/`)
	);
	const isApiRoute = pathname.startsWith('/api/');
	const isStatic = pathname.startsWith('/_next/');
	if (isStatic) return NextResponse.next();

	const resp = NextResponse.next();

	// Security headers
	resp.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	resp.headers.set('X-Content-Type-Options', 'nosniff');
	resp.headers.set('X-Frame-Options', 'DENY');
	resp.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// CSP with per-request nonce (pages only; API gets strict CSP)
	if (isApiRoute) {
		resp.headers.set(
			'Content-Security-Policy',
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
		);
	} else {
		const nonce = crypto.randomUUID();
		const csp = [
			"default-src 'self'",
			`script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`,
			"style-src 'self' 'unsafe-inline'",
			"style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"img-src 'self' data: blob: https:",
			"font-src 'self' data: https://fonts.gstatic.com",
			"connect-src 'self' https:",
			"frame-src 'none'",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"worker-src 'self'",
			"manifest-src 'self' blob:",
		].join('; ');
		resp.headers.set('Content-Security-Policy', csp);
		resp.headers.set('x-nonce', nonce);
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
		return NextResponse.redirect(login);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon\\.png|sitemap\\.xml|robots\\.txt|manifest\\.json|\\.png|\\.jpg|\\.jpeg|\\.webp|\\.avif).*)',
	],
};
