// ponytail: SameSite=Lax on session cookie provides CSRF protection.
// Client-side csrfFetch() is kept as a thin fetch wrapper for forward compat.
export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";
