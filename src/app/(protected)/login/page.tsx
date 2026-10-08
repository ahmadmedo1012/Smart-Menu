import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { LoginForm } from './LoginForm';

/**
 * Login page — server component (r113-F114).
 *
 * WHY: the page used to be a client component that rendered a small centered
 * loader, fired `GET /api/auth/me`, and only then swapped in the real card.
 * Measured consequences on every anonymous visit (r113 perf audit, mobile +
 * desktop, consistent across runs):
 *   - CLS 0.457-0.471 — the loader→card swap is a full-viewport layout change
 *     (a fixed background layer is torn down and re-created in the swap).
 *   - A 401 console error on every load (the anonymous /me probe).
 *   - The form waited a full network round-trip before appearing.
 * The session is now resolved on the server with the same requireAuth() the
 * API routes use: already-authenticated users are redirected before the form
 * streams, and anonymous users get the form in the FIRST paint (no swap, no
 * probe, no console noise). The old "resurrected session" logout race is
 * structurally gone — the document request itself arrives after the logout
 * POST has cleared the cookie.
 *
 * NOTE: cookies() inside requireAuth() opts this route into dynamic
 * rendering — the login page is intentionally no longer ISR-cached (it is a
 * per-user page; ~0.4s dynamic response, same class as the pre-fix page's
 * real render time because the loader ALSO waited on /me).
 */

export const metadata = {
        // r121-L-4: the hardcoded brand suffix is stripped — the root template
        // appends the unified brand suffix «الربط الذكي» (r127-F3; the page
        // title used to double the brand).
        title: 'تسجيل الدخول',
        description: 'سجّل دخولك إلى لوحة تحكم مطعمك على منصة الربط الذكي',
};

function safeRedirectTarget(value: string | null | undefined): string | null {
        // r118-A4-P3: '/\evil.com' passes the old '/… but not //' guard, yet
        // WHATWG URL parsing treats '\' as '/' in the Location header → the
        // browser lands on '//evil.com' (network-path redirect). Reject it.
        if (!value || !value.startsWith('/') || value.startsWith('//') || value[1] === '\\') return null;
        return value;
}

export default async function LoginPage({
        searchParams,
}: {
        searchParams: Promise<{ redirect?: string }>;
}) {
        // Parallel: session resolution + searchParams are independent awaits.
        const [auth, params] = await Promise.all([requireAuth(), searchParams]);
        const redirectParam = typeof params.redirect === 'string' ? params.redirect : null;

        if (auth.authorized) {
                const safe = safeRedirectTarget(redirectParam);
                const target =
                        auth.role === 'owner'
                                ? // Owner must never land on /admin — a leftover redirect param from an
                                  // admin-area visit defaults back to /owner (same rule as LoginForm).
                                  safe?.startsWith('/owner')
                                        ? safe
                                        : '/owner'
                                : ['super_admin', 'sub_admin', 'admin'].includes(auth.role)
                                        ? safe || '/admin'
                                        : '/subscribe';
                redirect(target);
        }

        return <LoginForm redirectParam={redirectParam} />;
}
