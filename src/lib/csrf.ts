// ponytail: Origin + double-submit CSRF protection.
// Edge middleware validates Origin for mutating methods.
// Route handlers can additionally verify x-csrf-token for elevated operations.
export const CSRF_COOKIE = 'csrf-token';
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_EXEMPT = new Set([
	'/api/telegram/webhook',
	'/api/health',
	// Pre-flight validation runs before signup and has no side effects — the
	// signup POSTs themselves still require the token.
	'/api/subscriptions/validate',
]);
// Prefix exemptions: server-originated callers that can never carry a browser
// Origin/CSRF cookie, so Origin+token enforcement would break them.
//  - /api/cron/* — scheduled jobs (Vercel Cron) authenticate via Bearer
//    CRON_SECRET, never via session cookie. CSRF is meaningless there.
// Exact-match entries above stay exact on purpose: a sub-path of an exempt
// route (e.g. /api/telegram/webhook/extra) must NOT inherit the exemption.
const CSRF_EXEMPT_PREFIXES = ['/api/cron/'];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Hosts we accept as same-origin. Anchored to platform truth, not to
 * sender-controlled headers:
 *  - new URL(request.url).host — Vercel builds the request URL from the
 *    real Host, so this is the actual deployment host (production domain,
 *    *.vercel.app, preview deploys all work with zero env config).
 *  - NEXT_PUBLIC_DOMAIN — the canonical app domain.
 * x-forwarded-host / Host headers are deliberately NOT trusted: they are
 * sender-controlled, so comparing Origin against them would reduce CSRF
 * protection to a self-consistency check.
 */
export function getExpectedHosts(request: Request): string[] {
	const hosts = new Set<string>();
	try {
		const urlHost = new URL(request.url).host;
		if (urlHost) hosts.add(urlHost);
	} catch {
		/* fall through to env anchor */
	}
	const envHost = process.env.NEXT_PUBLIC_DOMAIN;
	if (envHost) {
		try {
			hosts.add(new URL(envHost).host);
		} catch {
			/* malformed env — ignore */
		}
	}
	return [...hosts];
}

export function assertSameOrigin(request: Request): void {
	if (!MUTATING.has(request.method)) return;
	const pathname = new URL(request.url).pathname;
	if (CSRF_EXEMPT.has(pathname)) return;
	if (CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

	const origin = request.headers.get('origin');
	if (!origin) {
		throw new Error('CSRF check failed: missing Origin');
	}
	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		throw new Error('CSRF check failed: Origin mismatch');
	}
	const expectedHosts = getExpectedHosts(request);
	if (expectedHosts.length === 0) {
		throw new Error('CSRF check failed: host not resolvable');
	}
	if (!expectedHosts.includes(originHost)) {
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
