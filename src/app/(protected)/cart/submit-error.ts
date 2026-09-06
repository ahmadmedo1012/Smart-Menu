/**
 * round90-F4 (M1 — QA live) — status → customer-facing toast copy for a
 * failed POST /api/orders.
 *
 * The cart page's old catch swallowed the server's error body and always
 * showed «فشل تقديم الطلب. يرجى المحاولة مرة أخرى» — misleading for the two
 * failures where retrying can NEVER succeed:
 *   - 403 plan ceiling: the RESTAURANT reached its plan's order cap (the only
 *     JSON-envelope 403 POST /api/orders produces — PlanLimitError). The
 *     server copy targets the plan owner («قم بترقية خطتك»), so the customer
 *     gets adapted copy directing them to the restaurant.
 *   - 429 rate limit: needs "wait", not "retry".
 *
 * Pure function (no DOM) so the mapping is unit-testable in the Node vitest
 * environment — same extraction reason as ./use-cart-totals.
 */

/** General fallback — matches the toast copy the page always used. */
export const ORDER_SUBMIT_FALLBACK = 'فشل تقديم الطلب. يرجى المحاولة مرة أخرى';

/** 403 with a JSON envelope → plan-cap family → honest customer copy. */
export const PLAN_CAP_MESSAGE =
        'وصل المطعم الحد الأقصى لطلبات خطته حاليًا — يُرجى التواصل مع المطعم مباشرة';

/** 403 without a JSON body → proxy-level CSRF 403 → a refresh re-issues the
 *  csrf-token cookie, so reload advice is honest here. */
export const CSRF_RETRY_MESSAGE = 'تعذر إرسال الطلب — حدّث الصفحة ثم أعد المحاولة';

export const RATE_LIMIT_MESSAGE = 'محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة';

function isNonEmptyString(v: unknown): v is string {
        return typeof v === 'string' && v.trim().length > 0;
}

/**
 * @param status HTTP status of the failed response.
 * @param serverError the `error` field of the JSON envelope when the body was
 *        JSON (api-helpers localizes these); undefined for non-JSON bodies.
 */
export function orderSubmitErrorMessage(status: number, serverError?: unknown): string {
        if (status === 403) {
                // With an envelope it is the route's PlanLimitError (plan cap) —
                // never retriable from the customer side. Without one it is the
                // proxy's CSRF rejection (plain-text body) — reload + retry is
                // the correct advice there, so the two 403s must NOT share copy.
                return isNonEmptyString(serverError) ? PLAN_CAP_MESSAGE : CSRF_RETRY_MESSAGE;
        }
        if (status === 429) {
                return RATE_LIMIT_MESSAGE;
        }
        if (isNonEmptyString(serverError)) {
                // Other statuses (422 validation, 500…) — the server envelope is
                // Arabic and meaningful to the customer; surface it instead of
                // flattening it into "retry".
                return serverError;
        }
        return ORDER_SUBMIT_FALLBACK;
}
