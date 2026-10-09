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
// r132-F2b (A10 #5, porting web r120-U5 F-5): raw network-failure engine
// strings must never surface in the Arabic UI. Web maps the fetch-family
// trio (Chromium "Failed to fetch", Firefox "NetworkError…", Safari "Load
// failed"); the MOBILE addition is "Network request failed" — exactly what
// RN's fetch throws — which previously surfaced verbatim in the Arabic UI
// on every offline order attempt. Retry stays safe: the checkout
// idempotency key is reused until a confirmed success.
const NETWORK_ERROR_ARABIC =
        'تعذّر الاتصال بالشبكة — تحقّق من اتصالك بالإنترنت وحاول مرة أخرى';

export function getErrorMessage(e: unknown, fallback = 'تعذّر تحميل البيانات'): string {
        if (e instanceof Error && e.message) {
                const msg = e.message.trim();
                if (
                        /^failed to fetch$/i.test(msg) ||
                        /^networkerror\b/i.test(msg) ||
                        /^load failed$/i.test(msg) ||
                        /^network request failed$/i.test(msg)
                ) {
                        return NETWORK_ERROR_ARABIC;
                }
                // server envelopes already localize their messages (api-helpers)
                return e.message;
        }
        if (typeof e === 'string' && e.trim()) {
                return e;
        }
        return fallback;
}
