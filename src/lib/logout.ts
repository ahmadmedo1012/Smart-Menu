import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';

/**
 * round87-C1: the admin sidebar, admin layout and owner layout each carried a
 * copy of the logout flow (one with toast, two without). Unified here.
 *
 * `window.location.replace` avoids the router.push + router.refresh race (a
 * refresh re-validates the still-set session cookie and bounces the user
 * back into the dashboard while the push is in flight). The
 * `just-logged-out` sessionStorage flag tells /login to suppress its
 * auto-redirect race.
 */
export async function performLogout(opts: { toast?: 'owner' | 'none' } = { toast: 'none' }) {
	try {
		const res = await csrfFetch('/api/auth/logout', { method: 'POST' });
		try {
			sessionStorage.setItem('just-logged-out', '1');
		} catch {
			/* private mode */
		}
		if (res.ok) {
			if (opts.toast === 'owner') premiumToast('logout', 'تم تسجيل الخروج');
			window.location.replace('/login');
		}
	} catch {
		if (opts.toast === 'owner') premiumToast('error', 'تعذّر تسجيل الخروج');
	}
}
