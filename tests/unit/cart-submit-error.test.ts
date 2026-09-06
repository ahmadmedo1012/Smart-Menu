/**
 * round90-F4 (M1 — QA live) — unit coverage for the cart submit-error
 * mapping (src/app/(protected)/cart/submit-error.ts).
 *
 * The cart page's catch used to flatten EVERY failure into «أعد المحاولة» —
 * misleading exactly where retrying can never succeed:
 *   - 403 plan ceiling (the only JSON 403 POST /api/orders produces —
 *     PlanLimitError): the customer must learn it is the RESTAURANT's cap
 *     (adapted copy, NOT the owner-directed server message).
 *   - 403 without a JSON envelope = the proxy's CSRF rejection (plain-text
 *     body) — reload advice is the honest fix there, so the two 403s must
 *     NOT share copy.
 *   - 429 rate limit → "wait", not "retry".
 *   - other statuses (422 validation / 500) surface the server's localized
 *     error; missing/garbage bodies fall back to the general copy.
 */
import { describe, it, expect } from 'vitest';
import {
        orderSubmitErrorMessage,
        ORDER_SUBMIT_FALLBACK,
        PLAN_CAP_MESSAGE,
        CSRF_RETRY_MESSAGE,
        RATE_LIMIT_MESSAGE,
} from '@/app/(protected)/cart/submit-error';

describe('orderSubmitErrorMessage — status → customer toast copy', () => {
        it('403 WITH a server envelope → customer-adapted plan-cap copy, not the owner-directed server text', () => {
                const serverCopy = 'لقد وصلت للحد الأقصى للطلبات (500) في خطتك. قم بترقية خطتك لإضافة المزيد.';
                const msg = orderSubmitErrorMessage(403, serverCopy);
                expect(msg).toBe(PLAN_CAP_MESSAGE);
                // the owner-directed copy must NOT leak to the customer
                expect(msg).not.toContain('ترقية');
                expect(msg).toContain('المطعم');
                expect(msg).toContain('الحد الأقصى');
        });

        it('403 WITHOUT an envelope (proxy CSRF, plain-text body) → reload advice, distinct from plan-cap copy', () => {
                expect(orderSubmitErrorMessage(403, undefined)).toBe(CSRF_RETRY_MESSAGE);
                expect(orderSubmitErrorMessage(403, null)).toBe(CSRF_RETRY_MESSAGE);
                // a non-JSON body parsed to a garbage field is also "no envelope"
                expect(orderSubmitErrorMessage(403, '')).toBe(CSRF_RETRY_MESSAGE);
        });

        it('429 → wait copy (retrying immediately can never succeed)', () => {
                const msg = orderSubmitErrorMessage(429, 'محاولات كثيرة جداً. حاول لاحقاً.');
                expect(msg).toBe(RATE_LIMIT_MESSAGE);
                // deterministic even without a body (edge/proxy 429)
                expect(orderSubmitErrorMessage(429, undefined)).toBe(RATE_LIMIT_MESSAGE);
        });

        it('422 with a server envelope → the server message wins (validation copy is customer-meaningful)', () => {
                expect(orderSubmitErrorMessage(422, 'رقم هاتف غير صالح')).toBe('رقم هاتف غير صالح');
        });

        it('5xx with a server envelope → server message surfaced instead of a flat "retry"', () => {
                expect(orderSubmitErrorMessage(500, 'خطأ داخلي في الخادم')).toBe('خطأ داخلي في الخادم');
        });

        it('any other status without a usable envelope → the general fallback', () => {
                expect(orderSubmitErrorMessage(500, undefined)).toBe(ORDER_SUBMIT_FALLBACK);
                expect(orderSubmitErrorMessage(502, '')).toBe(ORDER_SUBMIT_FALLBACK);
                expect(orderSubmitErrorMessage(502, '   ')).toBe(ORDER_SUBMIT_FALLBACK);
                expect(orderSubmitErrorMessage(422, { not: 'a string' })).toBe(ORDER_SUBMIT_FALLBACK);
        });

        it('403 plan-cap copy stays distinct from the CSRF and general copies', () => {
                const distinct = new Set([PLAN_CAP_MESSAGE, CSRF_RETRY_MESSAGE, RATE_LIMIT_MESSAGE, ORDER_SUBMIT_FALLBACK]);
                expect(distinct.size).toBe(4);
        });
});
