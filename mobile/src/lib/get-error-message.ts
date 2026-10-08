/**
 * round85-C4 — type-safe client-side catch handler.
 *
 * 18 catch-sites used `catch (e: any)` + `e.message`, which is both a type
 * hole and a UX risk: non-Error throwables (strings, response objects,
 * undefined) surface as "undefined" in Arabic UIs, and the pattern invites
 * raw internals into user-facing copy. This is the client twin of the
 * server's api-helpers error mapping: extract a message when one exists,
 * otherwise fall back to a friendly Arabic string.
 */
export function getErrorMessage(e: unknown, fallback = 'تعذّر تحميل البيانات'): string {
        if (e instanceof Error && e.message) {
                // server envelopes already localize their messages (api-helpers)
                return e.message;
        }
        if (typeof e === 'string' && e.trim()) {
                return e;
        }
        return fallback;
}
