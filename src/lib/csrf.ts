// ponytail: Origin + double-submit CSRF protection.
// Edge middleware validates Origin for mutating methods.
// Route handlers can additionally verify x-csrf-token for elevated operations.
export const CSRF_COOKIE = 'csrf-token';
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_EXEMPT = new Set([
	'/api/telegram/webhook',
	'/api/health',
	'/api/auth/login',
	'/api/auth/register',
	// Pre-flight validation runs before signup and has no side effects — the
	// signup POSTs themselves still require the token.
	'/api/subscriptions/validate',
]);
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function assertSameOrigin(request: Request): void {
	if (!MUTATING.has(request.method)) return;
	const pathname = new URL(request.url).pathname;
	if (CSRF_EXEMPT.has(pathname)) return;

	const origin = request.headers.get('origin');
	if (!origin) {
		throw new Error('CSRF check failed: missing Origin');
	}
	const expectedOrigin = process.env.NEXT_PUBLIC_DOMAIN;
	if (!expectedOrigin) {
		throw new Error('CSRF check failed: NEXT_PUBLIC_DOMAIN not configured');
	}
	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		throw new Error('CSRF check failed: Origin mismatch');
	}
	const expectedHost = new URL(expectedOrigin).host;
	if (originHost !== expectedHost) {
		throw new Error('CSRF check failed: Origin mismatch');
	}

	// Double-submit token: mutating requests must carry X-CSRF-Token matching the
	// csrf-token cookie. Origin alone is spoofable (attacker-controlled server can
	// send any Origin); a cross-site attacker cannot read this cookie to forge the
	// header. Public review/loyalty POSTs are still CSRF-safe without auth.
	const cookie = request.headers.get('cookie') ?? '';
	const cookieToken = cookie
		.split(';')
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${CSRF_COOKIE}=`))
		?.slice(CSRF_COOKIE.length + 1);
	const headerToken = request.headers.get(CSRF_HEADER);
	if (!cookieToken || !headerToken || cookieToken !== headerToken) {
		throw new Error('CSRF check failed: token mismatch');
	}
}
